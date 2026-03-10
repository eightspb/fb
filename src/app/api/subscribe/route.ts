import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { upsertContact } from '@/lib/contact-upsert';
import { withApiLogging } from '@/lib/api-logger';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export const POST = withApiLogging('/api/subscribe', async (request: NextRequest) => {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Неверный формат email' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const contactId = await upsertContact(client, {
        fullName: email.trim(),
        email: email.trim(),
        tag: 'newsletter',
        sourceUrl: request.headers.get('referer') || undefined,
      });

      await client.query(
        `INSERT INTO form_submissions (form_type, name, email, phone, message, status, page_url, contact_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7::text, $8::uuid)`,
        ['newsletter', email.trim(), email.trim(), '', 'Подписка на новости', 'new', request.headers.get('referer') || null, contactId]
      );
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Subscribe API] Error:', error);
    return NextResponse.json({ error: 'Произошла ошибка. Попробуйте позже.' }, { status: 500 });
  }
});
