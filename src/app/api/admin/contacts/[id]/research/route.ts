import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { researchContactWithAI } from '@/lib/openrouter';

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

const AI_RESEARCH_HEADER = '── AI Исследование';

// POST /api/admin/contacts/[id]/research
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await pool.connect();

  try {
    // Загружаем контакт
    const contactResult = await client.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (!contactResult.rows.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const contact = contactResult.rows[0];

    // Проверяем, что есть достаточно данных для поиска
    if (!contact.full_name || contact.full_name.trim().length === 0) {
      return NextResponse.json({ error: 'У контакта не указано ФИО' }, { status: 400 });
    }

    // Вызываем AI исследование
    const researchResult = await researchContactWithAI({
      full_name: contact.full_name,
      city: contact.city,
      institution: contact.institution,
      speciality: contact.speciality,
      phone: contact.phone,
      email: contact.email,
    });

    // Формируем блок AI-исследования с датой
    const now = new Date().toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const aiBlock = `${AI_RESEARCH_HEADER} (${now}) ──\n${researchResult}\n── конец исследования ──`;

    // Собираем новые заметки: AI-блок в начало, ручные заметки после
    let existingNotes = contact.notes || '';

    // Если уже есть AI-блок — удаляем его (для перезапуска)
    const aiBlockRegex = /── AI Исследование \([^)]+\) ──[\s\S]*?── конец исследования ──\n*/;
    existingNotes = existingNotes.replace(aiBlockRegex, '').trim();

    const newNotes = existingNotes
      ? `${aiBlock}\n\n${existingNotes}`
      : aiBlock;

    // Сохраняем в БД
    const updateResult = await client.query(
      'UPDATE contacts SET notes = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newNotes, id]
    );

    return NextResponse.json(updateResult.rows[0]);
  } catch (error) {
    console.error('[Research API] Error:', error);
    const message = error instanceof Error ? error.message : 'Ошибка при исследовании контакта';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
