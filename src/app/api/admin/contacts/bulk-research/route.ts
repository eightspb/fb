import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { researchContactWithAI } from '@/lib/openrouter';
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

// In-memory job store (lives as long as the Node.js process)
export interface BulkResearchJob {
  id: string;
  status: 'running' | 'done' | 'error';
  total: number;
  done: number;
  skipped: number;
  succeeded: number;
  failed: number;
  errors: string[];
  startedAt: string;
  finishedAt?: string;
}

const jobs = new Map<string, BulkResearchJob>();

// Auto-cleanup: remove finished jobs after 10 minutes
const CLEANUP_TTL_MS = 10 * 60 * 1000;

function scheduleCleanup(jobId: string) {
  setTimeout(() => {
    const job = jobs.get(jobId);
    if (job && job.status !== 'running') {
      jobs.delete(jobId);
    }
  }, CLEANUP_TTL_MS);
}

function makeJobId() {
  return `brj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// POST /api/admin/contacts/bulk-research
// Body: { ids?: string[], filters?: { status?, tag?, city?, no_notes?: boolean } }
export async function POST(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { ids, filters, dry_run } = body as {
    ids?: string[];
    filters?: { status?: string; tag?: string; city?: string; no_notes?: boolean };
    dry_run?: boolean;
  };

  if (!Array.isArray(ids) && !filters) {
    return NextResponse.json({ error: 'Provide ids array or filters object' }, { status: 400 });
  }

  const client = await pool.connect();
  let contactIds: string[];
  try {
    if (Array.isArray(ids) && ids.length > 0) {
      const res = await client.query(
        `SELECT DISTINCT c.id FROM contacts c
         WHERE c.id = ANY($1)
           AND c.full_name IS NOT NULL AND c.full_name <> ''`,
        [ids]
      );
      contactIds = res.rows.map((r: { id: string }) => r.id);
    } else {
      const conditions: string[] = [`c.full_name IS NOT NULL AND c.full_name <> ''`];
      const params: unknown[] = [];
      let idx = 1;

      if (filters?.status) {
        conditions.push(`c.status = $${idx}`);
        params.push(filters.status);
        idx++;
      }
      if (filters?.tag) {
        conditions.push(`$${idx} = ANY(c.tags)`);
        params.push(filters.tag);
        idx++;
      }
      if (filters?.city) {
        conditions.push(`LOWER(c.city) = LOWER($${idx})`);
        params.push(filters.city);
        idx++;
      }
      if (filters?.no_notes) {
        conditions.push(`NOT EXISTS (
          SELECT 1 FROM contact_notes cn
          WHERE cn.contact_id = c.id
            AND cn.source IN ('ai_research', 'ai_deep_research')
        )`);
      }

      const where = `WHERE ${conditions.join(' AND ')}`;
      const res = await client.query(
        `SELECT c.id FROM contacts c ${where} ORDER BY c.created_at DESC`,
        params
      );
      contactIds = res.rows.map((r: { id: string }) => r.id);
    }
  } finally {
    client.release();
  }

  if (contactIds.length === 0) {
    return NextResponse.json({ error: 'Нет подходящих контактов для исследования' }, { status: 400 });
  }

  // Dry run — just return count without starting a job
  if (dry_run) {
    return NextResponse.json({ total: contactIds.length });
  }

  const jobId = makeJobId();
  const job: BulkResearchJob = {
    id: jobId,
    status: 'running',
    total: contactIds.length,
    done: 0,
    skipped: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
    startedAt: new Date().toISOString(),
  };
  jobs.set(jobId, job);

  // Fire-and-forget background processing
  void runBulkResearch(job, contactIds);

  return NextResponse.json({ jobId, total: contactIds.length });
}

// GET /api/admin/contacts/bulk-research?jobId=xxx
export async function GET(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobId = new URL(request.url).searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(job);
}

async function runBulkResearch(job: BulkResearchJob, contactIds: string[]) {
  const CONCURRENCY = 3;
  const queue = [...contactIds];

  async function processOne(id: string) {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT * FROM contacts WHERE id = $1', [id]);
      if (!res.rows.length) { job.skipped++; return; }
      const contact = res.rows[0];

      const result = await researchContactWithAI({
        full_name: contact.full_name,
        city: contact.city,
        institution: contact.institution,
        speciality: contact.speciality,
        phone: contact.phone,
        email: contact.email,
      });

      // Delete previous ai_research notes for this contact (replace, not duplicate)
      await client.query(
        `DELETE FROM contact_notes WHERE contact_id = $1 AND source = 'ai_research'`,
        [id]
      );

      const now = new Date().toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const noteResult = await client.query(
        `INSERT INTO contact_notes (contact_id, title, content, source, metadata)
         VALUES ($1, $2, $3, 'ai_research', $4)
         RETURNING id`,
        [
          id,
          `AI Исследование (${now})`,
          result,
          JSON.stringify({ model: 'perplexity/sonar-pro', bulk: true, timestamp: new Date().toISOString() }),
        ]
      );
      await client.query('UPDATE contacts SET updated_at = NOW() WHERE id = $1', [id]);

      // Fire-and-forget embedding indexing
      const noteId = noteResult.rows[0].id;
      void indexNoteEmbedding(noteId, result, id);
      job.succeeded++;
    } catch (err) {
      job.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      if (job.errors.length < 20) job.errors.push(`[${id}] ${msg}`);
    } finally {
      client.release();
      job.done++;
    }
  }

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift()!;
      await processOne(id);
    }
  }

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    job.status = 'done';
  } catch {
    job.status = 'error';
  } finally {
    job.finishedAt = new Date().toISOString();
    scheduleCleanup(job.id);
  }
}
