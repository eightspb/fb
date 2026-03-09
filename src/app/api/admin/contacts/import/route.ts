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

interface MappedContact {
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  institution: string | null;
  speciality: string | null;
  tags: string[];
  notes: string | null;
}

function mapHeaders(row: Record<string, string>, defaultTags: string[]): MappedContact | null {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.trim().toLowerCase();
    const field = FIELD_MAP[normalized];
    if (field && value) mapped[field] = value;
  }

  const full_name = mapped.full_name?.trim();
  const email = mapped.email?.trim() || null;

  // Skip rows without email
  if (!email) return null;
  // Skip rows without name
  if (!full_name) return null;

  const rowTags = mapped.tags
    ? mapped.tags.split(/[,;]/).map(t => t.trim()).filter(Boolean)
    : [];
  const tags = [...new Set([...rowTags, ...defaultTags])];

  return {
    full_name,
    email,
    phone: mapped.phone?.trim() || null,
    city: mapped.city?.trim() || null,
    institution: mapped.institution?.trim() || null,
    speciality: mapped.speciality?.trim() || null,
    tags,
    notes: mapped.notes?.trim() || null,
  };
}

interface ExistingContact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  institution: string | null;
  speciality: string | null;
  tags: string[];
  status: string;
  notes: string | null;
  import_source: string;
  created_at: string;
  updated_at: string;
}

interface ConflictItem {
  csv: MappedContact;
  existing: ExistingContact;
}

interface DryRunResult {
  newContacts: MappedContact[];
  conflicts: ConflictItem[];
  skipped: number; // rows without email or name
}

// POST /api/admin/contacts/import
// Two modes:
//   dry_run=true  → parse CSV, detect conflicts by email, return preview (no DB writes)
//   dry_run=false → apply import: insert new + apply resolved conflicts
export async function POST(request: NextRequest) {
  if (!await verifyAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';

  // ── Dry run: multipart form with file ────────────────────────────────────────
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const defaultTags = (formData.get('tags') as string || '')
      .split(',').map(t => t.trim()).filter(Boolean);
    const defaultStatus = (formData.get('status') as string) || 'archived';
    const importSource = (formData.get('import_source') as string) || 'csv';
    const dryRun = formData.get('dry_run') === 'true';

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

    // Map all rows, skip those without email
    let skipped = 0;
    const mapped: MappedContact[] = [];
    for (const row of rows) {
      const contact = mapHeaders(row, defaultTags);
      if (!contact) { skipped++; continue; }
      mapped.push(contact);
    }

    if (mapped.length === 0) {
      return NextResponse.json({
        error: `Нет строк с email для импорта. Пропущено: ${skipped}`,
      }, { status: 400 });
    }

    // Find existing contacts by email (batch query)
    const emails = mapped.map(c => c.email).filter(Boolean) as string[];
    const client = await pool.connect();
    try {
      const existingRes = await client.query<ExistingContact>(
        `SELECT id, full_name, email, phone, city, institution, speciality, tags, status, notes, import_source, created_at, updated_at
         FROM contacts WHERE email = ANY($1)`,
        [emails]
      );
      const existingByEmail = new Map<string, ExistingContact>();
      for (const row of existingRes.rows) {
        if (row.email) existingByEmail.set(row.email.toLowerCase(), row);
      }

      if (dryRun) {
        // Return preview: split into new vs conflicts
        const result: DryRunResult = { newContacts: [], conflicts: [], skipped };
        for (const c of mapped) {
          const existing = existingByEmail.get(c.email!.toLowerCase());
          if (existing) {
            result.conflicts.push({ csv: c, existing });
          } else {
            result.newContacts.push(c);
          }
        }
        return NextResponse.json({ ...result, defaultStatus, importSource });
      }

      // Non-dry-run from multipart = old behavior (insert all without conflict resolution)
      // This path is kept for backward compat but shouldn't normally be used anymore
      await client.query('BEGIN');
      let imported = 0;
      const errors: string[] = [];
      for (let i = 0; i < mapped.length; i++) {
        const c = mapped[i];
        try {
          await client.query(
            `INSERT INTO contacts (full_name, email, phone, city, institution, speciality, tags, status, notes, import_source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT DO NOTHING`,
            [c.full_name, c.email, c.phone, c.city, c.institution, c.speciality, c.tags, defaultStatus, c.notes, importSource]
          );
          imported++;
        } catch (err) {
          errors.push(`Строка ${i + 2}: ${err instanceof Error ? err.message : String(err)}`);
          skipped++;
        }
      }
      await client.query('COMMIT');
      return NextResponse.json({ imported, skipped, total: rows.length, errors: errors.slice(0, 20) });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Apply import: JSON body with resolved conflicts ──────────────────────────
  if (contentType.includes('application/json')) {
    const body = await request.json() as {
      newContacts: MappedContact[];
      resolvedConflicts: Array<{
        existingId: string;
        merged: Partial<MappedContact> & { status?: string };
      }>;
      defaultStatus: string;
      importSource: string;
    };

    const { newContacts, resolvedConflicts, defaultStatus, importSource } = body;
    const allowedStatuses = ['new', 'in_progress', 'processed', 'archived'];
    if (!allowedStatuses.includes(defaultStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let imported = 0;
      let updated = 0;
      const errors: string[] = [];

      // Insert new contacts
      for (const c of newContacts) {
        try {
          await client.query(
            `INSERT INTO contacts (full_name, email, phone, city, institution, speciality, tags, status, notes, import_source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [c.full_name, c.email, c.phone, c.city, c.institution, c.speciality, c.tags, defaultStatus, c.notes, importSource]
          );
          imported++;
        } catch (err) {
          errors.push(`Новый ${c.email}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Apply resolved conflicts (update existing records)
      for (const { existingId, merged } of resolvedConflicts) {
        try {
          await client.query(
            `UPDATE contacts SET
               full_name = $1, email = $2, phone = $3, city = $4,
               institution = $5, speciality = $6, tags = $7,
               notes = $8, updated_at = NOW()
             WHERE id = $9`,
            [
              merged.full_name, merged.email, merged.phone, merged.city,
              merged.institution, merged.speciality, merged.tags,
              merged.notes, existingId,
            ]
          );
          updated++;
        } catch (err) {
          errors.push(`Обновление ${existingId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ imported, updated, errors: errors.slice(0, 20) });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
}
