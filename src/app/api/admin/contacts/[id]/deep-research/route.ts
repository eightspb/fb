import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { deepResearchContactWithAI } from '@/lib/openrouter';
import { researchJobs, type ResearchJob } from '@/lib/research-jobs';
import { indexNoteEmbedding } from '@/lib/embedding-utils';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const COOKIE_NAME = 'admin-session';

async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

// POST /api/admin/contacts/[id]/deep-research — starts async job, returns immediately
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Check if there's already a running job for this contact
  const existing = researchJobs.getActiveJob(id);
  if (existing) {
    return NextResponse.json({
      error: `Исследование уже запущено (${existing.type === 'deep' ? 'Deep Research' : 'AI Исследование'})`,
      jobId: existing.id,
    }, { status: 409 });
  }

  const client = await pool.connect();
  try {
    const contactResult = await client.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (!contactResult.rows.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const contact = contactResult.rows[0];

    if (!contact.full_name || contact.full_name.trim().length === 0) {
      return NextResponse.json({ error: 'У контакта не указано ФИО' }, { status: 400 });
    }

    // Create job and return immediately
    const job: ResearchJob = researchJobs.create(id, 'deep');

    // Fire-and-forget
    void runDeepResearch(job, contact);

    return NextResponse.json({ jobId: job.id, status: job.status });
  } catch (error) {
    console.error('[Deep Research API] Error:', error);
    const message = error instanceof Error ? error.message : 'Ошибка при глубоком исследовании';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}

// GET /api/admin/contacts/[id]/deep-research?jobId=xxx — poll job status
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const jobId = req.nextUrl.searchParams.get('jobId');

  if (jobId) {
    const job = researchJobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json(job);
  }

  // Return active job for this contact (if any)
  const active = researchJobs.getActiveJob(id);
  if (active) {
    return NextResponse.json(active);
  }

  return NextResponse.json({ status: 'idle' });
}

async function runDeepResearch(job: ResearchJob, contact: { full_name: string; city?: string | null; institution?: string | null; speciality?: string | null; phone?: string | null; email?: string | null }) {
  try {
    researchJobs.updateStage(job.id, 'Поиск информации (Perplexity Deep Research)...');

    const result = await deepResearchContactWithAI({
      full_name: contact.full_name,
      city: contact.city,
      institution: contact.institution,
      speciality: contact.speciality,
      phone: contact.phone,
      email: contact.email,
    });

    researchJobs.updateStage(job.id, 'Сохранение результатов...');

    const client = await pool.connect();
    try {
      // Delete previous deep research notes for this contact (replace, not duplicate)
      await client.query(
        `DELETE FROM contact_notes WHERE contact_id = $1 AND source = 'ai_deep_research'`,
        [job.contactId]
      );

      const now = new Date().toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const noteResult = await client.query(
        `INSERT INTO contact_notes (contact_id, title, content, source, metadata)
         VALUES ($1, $2, $3, 'ai_deep_research', $4)
         RETURNING id`,
        [
          job.contactId,
          `Deep Research (${now})`,
          result.summary,
          JSON.stringify({
            structured: result.structured,
            searchModel: result.searchModel,
            verifyModel: result.verifyModel,
            confidence: result.structured.matched_identity_confidence,
            timestamp: new Date().toISOString(),
          }),
        ]
      );

      await client.query('UPDATE contacts SET updated_at = NOW() WHERE id = $1', [job.contactId]);

      // Fire-and-forget embedding indexing
      const noteId = noteResult.rows[0].id;
      void indexNoteEmbedding(noteId, result.summary, job.contactId);
    } finally {
      client.release();
    }

    researchJobs.complete(job.id);
  } catch (error) {
    console.error('[Deep Research Job] Error:', error);
    const message = error instanceof Error ? error.message : 'Ошибка при глубоком исследовании';
    researchJobs.fail(job.id, message);
  }
}
