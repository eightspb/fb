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

// GET /api/admin/contacts — list with search, tag filter, pagination
export async function GET(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search   = searchParams.get('search') || '';
  const tag      = searchParams.get('tag') || '';
  const status   = searchParams.get('status') || '';
  const city     = searchParams.get('city') || '';
  const sortBy   = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';
  const pageRaw  = parseInt(searchParams.get('page') || '1');
  const limitRaw = parseInt(searchParams.get('limit') || '50');
  const page     = Math.max(1, isNaN(pageRaw) ? 1 : pageRaw);
  const limit    = Math.min(100, isNaN(limitRaw) ? 50 : limitRaw);
  const offset   = (page - 1) * limit;

  const client = await pool.connect();
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(
        LOWER(full_name) LIKE LOWER($${idx}) OR
        LOWER(email)     LIKE LOWER($${idx}) OR
        phone            LIKE $${idx} OR
        LOWER(institution) LIKE LOWER($${idx}) OR
        LOWER(city)      LIKE LOWER($${idx}) OR
        LOWER(speciality) LIKE LOWER($${idx})
      )`);
      params.push(`%${search}%`);
      idx++;
    }

    if (tag) {
      conditions.push(`$${idx} = ANY(tags)`);
      params.push(tag);
      idx++;
    }

    if (status) {
      conditions.push(`status = $${idx}`);
      params.push(status);
      idx++;
    }

    if (city) {
      conditions.push(`LOWER(city) = LOWER($${idx})`);
      params.push(city);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSort = ['created_at', 'full_name', 'email', 'city', 'status', 'speciality'];
    const safeSort  = allowedSort.includes(sortBy) ? sortBy : 'created_at';
    const safeOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const [countRes, statsRes, rowsRes] = await Promise.all([
      client.query(`SELECT COUNT(*) FROM contacts ${where}`, params),
      client.query(`
        SELECT
          COUNT(*)                                   AS total_count,
          COUNT(*) FILTER (WHERE status = 'new')      AS new_count,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
          COUNT(*) FILTER (WHERE status = 'processed') AS processed_count,
          COUNT(*) FILTER (WHERE status = 'archived') AS archived_count
        FROM contacts
      `),
      client.query(
        `SELECT * FROM contacts ${where}
         ORDER BY ${safeSort} ${safeOrder}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
    ]);

    const totalCount = parseInt(countRes.rows[0].count);

    return NextResponse.json({
      contacts: rowsRes.rows,
      pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) },
      stats: statsRes.rows[0],
    });
  } finally {
    client.release();
  }
}

// POST /api/admin/contacts — create a new contact manually
export async function POST(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { full_name, email, phone, city, institution, speciality, tags, status, notes } = body;

  if (!full_name?.trim()) {
    return NextResponse.json({ error: 'full_name is required' }, { status: 400 });
  }

  const allowedStatuses = ['new', 'in_progress', 'processed', 'archived'];
  if (status && !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
  }
  if (tags !== undefined && !Array.isArray(tags)) {
    return NextResponse.json({ error: 'tags must be an array' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO contacts (full_name, email, phone, city, institution, speciality, tags, status, notes, import_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'manual')
       RETURNING *`,
      [
        full_name.trim(),
        email?.trim() || null,
        phone?.trim() || null,
        city?.trim() || null,
        institution?.trim() || null,
        speciality?.trim() || null,
        tags || [],
        status || 'new',
        notes?.trim() || null,
      ]
    );
    const newContact = result.rows[0];

    // Запускаем AI-исследование в фоне, не блокируя ответ
    if (newContact.full_name?.trim()) {
      void triggerBackgroundResearch(newContact);
    }

    return NextResponse.json(newContact, { status: 201 });
  } finally {
    client.release();
  }
}

async function triggerBackgroundResearch(contact: {
  id: string; full_name: string; city?: string | null;
  institution?: string | null; speciality?: string | null;
  phone?: string | null; email?: string | null;
}) {
  try {
    const researchResult = await researchContactWithAI({
      full_name: contact.full_name,
      city: contact.city,
      institution: contact.institution,
      speciality: contact.speciality,
      phone: contact.phone,
      email: contact.email,
    });

    const now = new Date().toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const client = await pool.connect();
    try {
      // Delete previous ai_research notes (replace, not duplicate)
      await client.query(
        `DELETE FROM contact_notes WHERE contact_id = $1 AND source = 'ai_research'`,
        [contact.id]
      );
      const noteResult = await client.query(
        `INSERT INTO contact_notes (contact_id, title, content, source, metadata)
         VALUES ($1, $2, $3, 'ai_research', $4)
         RETURNING id`,
        [
          contact.id,
          `AI Исследование (${now})`,
          researchResult,
          JSON.stringify({ model: 'perplexity/sonar-pro', auto: true, timestamp: new Date().toISOString() }),
        ]
      );

      // Fire-and-forget embedding indexing
      const noteId = noteResult.rows[0].id;
      void indexNoteEmbedding(noteId, researchResult, contact.id);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`[AutoResearch] Ошибка для контакта ${contact.id}:`, err);
  }
}

// PATCH /api/admin/contacts — bulk tag update
export async function PATCH(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { ids, tags_add, tags_remove, status } = body;

  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  }

  const allowedStatuses = ['new', 'in_progress', 'processed', 'archived'];
  if (status && !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
  }
  if (tags_add !== undefined && (!Array.isArray(tags_add) || tags_add.some((t: unknown) => typeof t !== 'string'))) {
    return NextResponse.json({ error: 'tags_add must be an array of strings' }, { status: 400 });
  }
  if (tags_remove !== undefined && (!Array.isArray(tags_remove) || tags_remove.some((t: unknown) => typeof t !== 'string'))) {
    return NextResponse.json({ error: 'tags_remove must be an array of strings' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    if (status) {
      await client.query(
        `UPDATE contacts SET status = $2, updated_at = NOW() WHERE id = ANY($1)`,
        [ids, status]
      );
    }

    if (Array.isArray(tags_add) && tags_add.length) {
      await client.query(
        `UPDATE contacts
         SET tags = ARRAY(SELECT DISTINCT unnest(tags || $2::text[])), updated_at = NOW()
         WHERE id = ANY($1)`,
        [ids, tags_add]
      );
    }

    if (Array.isArray(tags_remove) && tags_remove.length) {
      await client.query(
        `UPDATE contacts
         SET tags = ARRAY(SELECT unnest(tags) EXCEPT SELECT unnest($2::text[])), updated_at = NOW()
         WHERE id = ANY($1)`,
        [ids, tags_remove]
      );
    }

    return NextResponse.json({ updated: ids.length });
  } finally {
    client.release();
  }
}

// DELETE /api/admin/contacts — bulk delete
export async function DELETE(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { ids } = body;

  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM contacts WHERE id = ANY($1) RETURNING id`,
      [ids]
    );
    return NextResponse.json({ deleted: result.rowCount });
  } finally {
    client.release();
  }
}
