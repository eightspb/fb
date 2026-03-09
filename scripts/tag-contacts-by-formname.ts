/**
 * Tag contacts by formname from a CSV export file.
 *
 * Reads a CSV file with columns: id, email, ..., referer, formname
 * Looks up each contact in the DB by email, then adds tags:
 *   - formname contains "sms2reg"                   → sms2025apr
 *   - formname contains "smsreg"                    → sms2024apr
 *   - formname contains "Коммерческое предложение"  → form-cp
 *   - formname contains "Запись на обучение"         → form-training
 *
 * Usage (from project root):
 *   bun scripts/tag-contacts-by-formname.ts [--dry-run] [path/to/file.csv]
 *
 * Default CSV path: scripts/export_names_fixed.csv
 *
 * Requires DATABASE_URL env var (set in .env.local or pass directly).
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

// ── CSV parser ────────────────────────────────────────────────────────────────
// Simple RFC-4180 parser (handles quoted fields with commas/newlines)

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n');
  if (lines.length === 0) return [];

  // Parse a single CSV line respecting quoted fields
  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let i = 0;
    while (i <= line.length) {
      if (line[i] === '"') {
        // Quoted field
        i++;
        let val = '';
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            val += '"';
            i += 2;
          } else if (line[i] === '"') {
            i++;
            break;
          } else {
            val += line[i++];
          }
        }
        fields.push(val);
        if (line[i] === ',') i++;
      } else {
        // Unquoted field
        const end = line.indexOf(',', i);
        if (end === -1) {
          fields.push(line.slice(i).trimEnd());
          break;
        }
        fields.push(line.slice(i, end));
        i = end + 1;
      }
    }
    return fields;
  }

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const line = lines[r].trimEnd();
    if (!line) continue;
    const values = parseLine(line);
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c].trim()] = (values[c] ?? '').trim();
    }
    rows.push(row);
  }

  return rows;
}

// ── tag rules ─────────────────────────────────────────────────────────────────

function tagsForFormname(formname: string): string[] {
  const tags: string[] = [];
  if (!formname) return tags;

  // Check "sms2reg" before "smsreg" (sms2reg contains "smsreg" as substring)
  if (formname.includes('sms2reg')) {
    tags.push('sms2025apr');
  } else if (formname.includes('smsreg')) {
    tags.push('sms2024apr');
  }

  if (formname.includes('Коммерческое предложение')) {
    tags.push('form-cp');
  }

  if (formname.includes('Запись на обучение')) {
    tags.push('form-training');
  }

  return tags;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const csvArg = args.find(a => !a.startsWith('--'));
  const csvPath = csvArg
    ? path.resolve(csvArg)
    : path.resolve('scripts/export_names_fixed.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`Reading CSV: ${csvPath}`);
  if (dryRun) console.log('DRY RUN — no DB changes will be made\n');

  const raw = fs.readFileSync(csvPath);
  // Strip UTF-8 BOM if present
  const content = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf
    ? raw.slice(3).toString('utf-8')
    : raw.toString('utf-8');

  const records = parseCSV(content);
  console.log(`Parsed ${records.length} rows from CSV\n`);

  // Build map: normalised_email → Set<tag>
  const emailTagMap = new Map<string, Set<string>>();

  for (const row of records) {
    const email = (row['email'] || '').trim().toLowerCase();
    const formname = (row['formname'] || '').trim();

    if (!email) continue;

    const tags = tagsForFormname(formname);
    if (tags.length === 0) continue;

    if (!emailTagMap.has(email)) {
      emailTagMap.set(email, new Set());
    }
    for (const tag of tags) {
      emailTagMap.get(email)!.add(tag);
    }
  }

  console.log(`Unique emails with tags to add: ${emailTagMap.size}`);

  // Preview
  for (const [email, tags] of emailTagMap) {
    console.log(`  ${email} → [${[...tags].join(', ')}]`);
  }
  console.log();

  if (dryRun) {
    console.log('Dry run complete. No DB changes made.');
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL env var is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [email, tags] of emailTagMap) {
    const tagsArr = [...tags];

    const findRes = await pool.query(
      `SELECT id, tags FROM contacts WHERE LOWER(email) = $1`,
      [email]
    );

    if (findRes.rows.length === 0) {
      console.warn(`NOT FOUND in DB: ${email}`);
      notFound++;
      continue;
    }

    const { id, tags: existingTags } = findRes.rows[0];
    const existing: string[] = existingTags || [];
    const toAdd = tagsArr.filter(t => !existing.includes(t));

    if (toAdd.length === 0) {
      console.log(`SKIP (already tagged): ${email} id=${id}`);
      skipped++;
      continue;
    }

    await pool.query(
      `UPDATE contacts
       SET tags = ARRAY(SELECT DISTINCT unnest(tags || $2::text[]))
       WHERE id = $1`,
      [id, toAdd]
    );

    console.log(`UPDATED: ${email} id=${id} added=[${toAdd.join(', ')}]`);
    updated++;
  }

  await pool.end();

  console.log(`\nDone. Updated: ${updated}, Skipped (already tagged): ${skipped}, Not found in DB: ${notFound}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
