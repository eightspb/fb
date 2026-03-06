import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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

// Parse CSV text → array of objects
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  // Find header line (first non-empty line)
  const headerLine = lines.find(l => l.trim().length > 0);
  if (!headerLine) return [];
  const headerIdx = lines.indexOf(headerLine);

  const headers = parseRow(headerLine).map(h => h.trim().toLowerCase());

  const rows: Record<string, string>[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = (cells[j] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

// Map common column name variants to our field names
const FIELD_MAP: Record<string, string> = {
  // full_name
  'full_name': 'full_name', 'fullname': 'full_name', 'имя': 'full_name',
  'фио': 'full_name', 'ф.и.о': 'full_name', 'ф.и.о.': 'full_name',
  'имя и фамилия': 'full_name', 'name': 'full_name', 'имя фамилия': 'full_name',
  'имя фамилия отчество': 'full_name',
  // email
  'email': 'email', 'e-mail': 'email', 'почта': 'email', 'электронная почта': 'email',
  // phone
  'phone': 'phone', 'телефон': 'phone', 'тел': 'phone', 'тел.': 'phone', 'mobile': 'phone',
  // city
  'city': 'city', 'город': 'city', 'населённый пункт': 'city', 'населенный пункт': 'city',
  // institution
  'institution': 'institution', 'организация': 'institution', 'учреждение': 'institution',
  'медицинское учреждение': 'institution', 'клиника': 'institution', 'место работы': 'institution',
  'company': 'institution',
  // speciality
  'speciality': 'speciality', 'specialty': 'speciality', 'специальность': 'speciality',
  'специализация': 'speciality',
  // tags
  'tags': 'tags', 'теги': 'tags', 'тег': 'tags',
  // notes
  'notes': 'notes', 'заметки': 'notes', 'заметка': 'notes', 'примечание': 'notes',
  'комментарий': 'notes',
};

function mapHeaders(row: Record<string, string>): {
  full_name?: string; email?: string; phone?: string; city?: string;
  institution?: string; speciality?: string; tags?: string; notes?: string;
} {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.trim().toLowerCase();
    const field = FIELD_MAP[normalized];
    if (field && value) mapped[field] = value;
  }
  return mapped;
}

// POST /api/admin/contacts/import
// Accepts multipart/form-data with file (CSV) + optional tags (comma-separated)
export async function POST(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const defaultTags = (formData.get('tags') as string || '')
    .split(',').map(t => t.trim()).filter(Boolean);
  const defaultStatus = (formData.get('status') as string) || 'archived';
  const importSource = (formData.get('import_source') as string) || 'csv';

  const allowedStatuses = ['new', 'in_progress', 'processed', 'archived'];
  if (!allowedStatuses.includes(defaultStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
    return NextResponse.json(
      { error: 'Поддерживаются только CSV файлы (.csv, .txt)' },
      { status: 400 }
    );
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Файл пустой или содержит только заголовки' }, { status: 400 });
  }

  const client = await pool.connect();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const mapped = mapHeaders(raw);

      const full_name = mapped.full_name?.trim();
      if (!full_name) {
        skipped++;
        continue;
      }

      const email = mapped.email?.trim() || null;
      const phone = mapped.phone?.trim() || null;
      const city = mapped.city?.trim() || null;
      const institution = mapped.institution?.trim() || null;
      const speciality = mapped.speciality?.trim() || null;
      const notes = mapped.notes?.trim() || null;

      // Merge row-level tags + default tags
      const rowTags = mapped.tags
        ? mapped.tags.split(/[,;]/).map(t => t.trim()).filter(Boolean)
        : [];
      const tags = [...new Set([...rowTags, ...defaultTags])];

      try {
        await client.query(
          `INSERT INTO contacts
             (full_name, email, phone, city, institution, speciality, tags, status, notes, import_source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT DO NOTHING`,
          [full_name, email, phone, city, institution, speciality, tags, defaultStatus, notes, importSource]
        );
        imported++;
      } catch (err) {
        errors.push(`Строка ${i + 2}: ${err instanceof Error ? err.message : String(err)}`);
        skipped++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return NextResponse.json({
    imported,
    skipped,
    total: rows.length,
    errors: errors.slice(0, 20), // max 20 error messages
  });
}
