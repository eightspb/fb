/**
 * Import script: Tilda contacts → contacts table
 *
 * Usage (from project root):
 *   npx tsx scripts/import-tilda-contacts.ts [--dry-run] [--output=contacts.sql]
 *
 * What it does:
 *  1. Reads tildacontacts.txt (UTF-8)
 *  2. Normalises phones, builds full_name, merges speciality
 *  3. Deduplicates within the file per the rules below
 *  4. Prints a SQL file ready to run on the server
 *
 * Deduplication rules applied (per user instructions):
 *  - Keep dgaldava@belroza.ru  (+7 905 741-44-88, Галдава Давид)
 *  - Keep arabachyanmariam@mail.ru (+7 910 116-92-08, Арабачян Мариам)
 *  - Keep doctor.gadiatti@gmail.com (+7 916 497-79-77, Гадиати Тина)
 *  - Keep dr.Mokshina@mail.ru  (+7 925 311-89-36) — drop dr.Mokshina@yandex.ru
 *  - Keep benonico@mail.ru (lower-case) — drop BENONICO@mail.ru
 *  - Keep Vanalen@rambler.ru — drop Vanalen@ranbler.ru (typo)
 *  - DROP both entries for +7 962 408-55-86 (Евгений, duplicate noise)
 *  - DROP both entries for +998909847777 (Зухра, duplicate noise)
 */

import * as fs from 'fs';
import * as path from 'path';

// ── helpers ──────────────────────────────────────────────────────────────────

function normalisePhone(raw: string): string {
  // strip everything except digits and leading +
  let s = raw.trim().replace(/[\s\-().]/g, '');
  // some rows have two phones separated by |; keep first
  s = s.split('|')[0].trim();
  return s;
}

function escSql(v: string | null | undefined): string {
  if (v == null || v === '') return 'NULL';
  return `'${v.replace(/'/g, "''")}'`;
}

function sqlArray(arr: string[]): string {
  if (!arr.length) return "'{}'";
  const items = arr.map(s => s.replace(/'/g, "''")).join("','");
  return `'{${items}}'`;
}

// ── types ─────────────────────────────────────────────────────────────────────

interface RawRow {
  email: string;
  name: string;
  phone: string;
  source: string;
  city: string;
  company: string;
  requestId: string;
  spec: string;
  speciality: string;
  surname: string;
}

interface Contact {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  institution: string;
  speciality: string;
  source_urls: string[];
  tilda_request_ids: string[];
  tags: string[];
  status: string;
  import_source: string;
}

// ── hard-coded dedup rules (per user) ────────────────────────────────────────

/**
 * Emails to drop entirely (matched after lower-casing the raw email).
 * NOTE: benonico@mail.ru is NOT here — it's the canonical form we KEEP.
 * BENONICO@mail.ru normalises to benonico@mail.ru and will also be kept
 * (since both are identical after lower-casing and dedup merges them).
 * If the file contains both variants, dedup() will merge them into one record.
 */
const DROP_EMAILS = new Set([
  'dg@belroza.ru',               // dup of dgaldava@belroza.ru
  'arabachyanm@mail.ru',         // dup of arabachyanmariam@mail.ru
  'larisa.yurina2012@yandex.ru', // dup of doctor.gadiatti@gmail.com
  'dr.mokshina@yandex.ru',       // dup of dr.mokshina@mail.ru
  'eu.89614085586@yandex.ru',    // noise — drop both Евгений entries
  'onkodental@mail.ru',          // noise — drop both Евгений entries
  'zuhra91_17@icloud.com',       // noise — drop both Зухра entries
  'zuhra91_17@inbox.ru',         // noise — drop both Зухра entries
  'vanalen@ranbler.ru',          // typo — dup of vanalen@rambler.ru
]);

// ── parse CSV ─────────────────────────────────────────────────────────────────

async function parseCSV(filePath: string): Promise<RawRow[]> {
  const content = fs.readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, ''); // strip BOM

  const lines = content.split('\n').map(l => l.trimEnd());
  const rows: RawRow[] = [];

  // skip header (first line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const parts = line.split(';');
    // CSV has exactly 10 columns; pad if short
    while (parts.length < 10) parts.push('');

    rows.push({
      email:      parts[0].trim(),
      name:       parts[1].trim(),
      phone:      parts[2].trim(),
      source:     parts[3].trim(),
      city:       parts[4].trim(),
      company:    parts[5].trim(),
      requestId:  parts[6].trim(),
      spec:       parts[7].trim(),
      speciality: parts[8].trim(),
      surname:    parts[9].trim(),
    });
  }

  return rows;
}

// ── transform row → contact ───────────────────────────────────────────────────

function rowToContact(row: RawRow): Contact {
  // full_name: prefer Surname + Name when both present and distinct
  let full_name: string;
  const namePart    = row.name.trim();
  const surnamePart = row.surname.trim();

  if (surnamePart && !namePart.toLowerCase().includes(surnamePart.toLowerCase())) {
    full_name = `${surnamePart} ${namePart}`.trim();
  } else {
    full_name = namePart;
  }

  // speciality: take Speciality, fall back to Spec
  const speciality = row.speciality.trim() || row.spec.trim();

  // source URLs: split by ' | '
  const source_urls = row.source
    ? row.source.split('|').map(s => s.trim()).filter(Boolean)
    : [];

  // tilda request IDs
  const tilda_request_ids = row.requestId
    ? row.requestId.split('|').map(s => s.trim()).filter(Boolean)
    : [];

  return {
    full_name,
    email:     row.email.trim().toLowerCase(),
    phone:     normalisePhone(row.phone),
    city:      row.city.trim(),
    institution: row.company.trim(),
    speciality,
    source_urls,
    tilda_request_ids,
    tags:          ['tilda-import'],
    status:        'archived',
    import_source: 'tilda',
  };
}

// ── dedup & merge ─────────────────────────────────────────────────────────────

function mergeContacts(a: Contact, b: Contact): Contact {
  return {
    full_name:  a.full_name || b.full_name,
    email:      a.email || b.email,
    phone:      a.phone || b.phone,
    city:       a.city || b.city,
    institution: a.institution || b.institution,
    speciality:  a.speciality || b.speciality,
    source_urls: [...new Set([...a.source_urls, ...b.source_urls])],
    tilda_request_ids: [...new Set([...a.tilda_request_ids, ...b.tilda_request_ids])],
    tags:          [...new Set([...a.tags, ...b.tags])],
    status:        'archived',
    import_source: 'tilda',
  };
}

function dedup(contacts: Contact[]): { kept: Contact[]; dropped: number } {
  const byEmail = new Map<string, Contact>();
  const byPhone = new Map<string, Contact>();
  let dropped = 0;

  for (const c of contacts) {
    const emailKey = c.email;
    const phoneKey = c.phone;

    const existByEmail = emailKey ? byEmail.get(emailKey) : undefined;
    const existByPhone = phoneKey ? byPhone.get(phoneKey) : undefined;

    if (existByEmail) {
      // merge into existing; update all keys that pointed to the old object
      const merged = mergeContacts(existByEmail, c);
      byEmail.set(emailKey, merged);
      if (phoneKey) byPhone.set(phoneKey, merged);
      // update any other email/phone keys that still point to the old object
      for (const [k, v] of byEmail) if (v === existByEmail) byEmail.set(k, merged);
      for (const [k, v] of byPhone) if (v === existByEmail) byPhone.set(k, merged);
      dropped++;
    } else if (existByPhone) {
      // same phone, different (or no) email — merge
      const merged = mergeContacts(existByPhone, c);
      if (emailKey) byEmail.set(emailKey, merged);
      byPhone.set(phoneKey, merged);
      // update any other keys that still point to the old object
      for (const [k, v] of byEmail) if (v === existByPhone) byEmail.set(k, merged);
      for (const [k, v] of byPhone) if (v === existByPhone) byPhone.set(k, merged);
      dropped++;
    } else {
      if (emailKey) byEmail.set(emailKey, c);
      if (phoneKey) byPhone.set(phoneKey, c);
    }
  }

  // collect unique contacts (by reference equality)
  const seen = new Set<Contact>();
  for (const c of byEmail.values()) seen.add(c);
  for (const c of byPhone.values()) seen.add(c);

  return { kept: [...seen], dropped };
}

// ── SQL generation ────────────────────────────────────────────────────────────

function toSQL(contacts: Contact[]): string {
  const lines: string[] = [
    '-- Auto-generated by scripts/import-tilda-contacts.ts',
    `-- Generated at: ${new Date().toISOString()}`,
    `-- Total contacts to insert: ${contacts.length}`,
    '',
    'BEGIN;',
    '',
  ];

  for (const c of contacts) {
    lines.push(
      `INSERT INTO contacts (full_name, email, phone, city, institution, speciality, tags, status, import_source, source_urls, tilda_request_ids)`,
      `VALUES (`,
      `  ${escSql(c.full_name)},`,
      `  ${escSql(c.email)},`,
      `  ${escSql(c.phone)},`,
      `  ${escSql(c.city)},`,
      `  ${escSql(c.institution)},`,
      `  ${escSql(c.speciality)},`,
      `  ${sqlArray(c.tags)},`,
      `  'archived',`,
      `  'tilda',`,
      `  ${sqlArray(c.source_urls)},`,
      `  ${sqlArray(c.tilda_request_ids)}`,
      `)`,
      // Skip if same email or phone already exists
      `ON CONFLICT DO NOTHING;`,
      '',
    );
  }

  lines.push('COMMIT;');
  return lines.join('\n');
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun   = args.includes('--dry-run');
  const outArg   = args.find(a => a.startsWith('--output='));
  const outFile  = outArg ? outArg.split('=')[1] : 'contacts-import.sql';

  const csvPath = path.resolve(process.cwd(), 'tildacontacts.txt');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌  File not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`📂  Reading ${csvPath} …`);
  const rows = await parseCSV(csvPath);
  console.log(`    Raw rows: ${rows.length}`);

  // Apply hard-coded drop list
  const afterDrop = rows.filter(r => {
    const emailLc = r.email.trim().toLowerCase();
    if (DROP_EMAILS.has(emailLc)) {
      console.log(`    🗑  Drop (rule): ${r.email}`);
      return false;
    }
    return true;
  });
  console.log(`    After hard drops: ${afterDrop.length}`);

  // Drop rows with no email AND no phone, or no name at all (useless)
  const withContact = afterDrop.filter(r => (r.email.trim() || r.phone.trim()) && (r.name.trim() || r.surname.trim()));
  const noContact = afterDrop.length - withContact.length;
  if (noContact) console.log(`    ⚠️  Dropped ${noContact} rows with no email/phone or no name`);

  // Transform
  const contacts = withContact.map(rowToContact);

  // Dedup
  const { kept, dropped } = dedup(contacts);
  console.log(`    After dedup: ${kept.length} unique contacts (merged ${dropped})`);

  const sql = toSQL(kept);

  if (dryRun) {
    console.log('\n--- DRY RUN — SQL preview (first 40 lines) ---');
    console.log(sql.split('\n').slice(0, 40).join('\n'));
    console.log('...');
  } else {
    const outPath = path.resolve(process.cwd(), outFile);
    fs.writeFileSync(outPath, sql, 'utf8');
    console.log(`\n✅  SQL written to: ${outPath}`);
    console.log(`    Run on server: psql $DATABASE_URL < ${outFile}`);
  }
}

main().catch(err => {
  console.error('❌  Error:', err);
  process.exit(1);
});
