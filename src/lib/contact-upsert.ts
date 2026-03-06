import { PoolClient } from 'pg';

export interface ContactFormData {
  fullName: string;
  email?: string;
  phone?: string;
  city?: string;
  institution?: string;
  tag: string;         // e.g. 'form-contact', 'form-cp', 'form-conference'
  sourceUrl?: string;
}

/**
 * Finds or creates a CRM contact by email (primary) or phone+name (fallback).
 * Soft-updates: only fills empty fields, appends tags, never overwrites existing data.
 * Returns the contact UUID.
 */
export async function upsertContact(
  client: PoolClient,
  data: ContactFormData
): Promise<string> {
  const { fullName, email, phone, city, institution, tag, sourceUrl } = data;

  // 1. Try to find existing contact
  let existing: { id: string } | null = null;

  if (email) {
    const res = await client.query<{ id: string }>(
      `SELECT id FROM contacts WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    existing = res.rows[0] ?? null;
  }

  if (!existing && phone) {
    const res = await client.query<{ id: string }>(
      `SELECT id FROM contacts WHERE phone = $1 LIMIT 1`,
      [phone.trim()]
    );
    existing = res.rows[0] ?? null;
  }

  if (existing) {
    // 2a. Update: fill only empty fields, append tag and source_url
    await client.query(
      `UPDATE contacts SET
        email       = COALESCE(NULLIF(email, ''),       $2),
        phone       = COALESCE(NULLIF(phone, ''),       $3),
        city        = COALESCE(NULLIF(city, ''),        $4),
        institution = COALESCE(NULLIF(institution, ''), $5),
        tags        = CASE WHEN $6 = ANY(tags) THEN tags ELSE array_append(tags, $6) END,
        source_urls = CASE WHEN $7 IS NULL OR $7 = ANY(source_urls) THEN source_urls
                          ELSE array_append(source_urls, $7) END,
        import_source = CASE WHEN import_source = 'tilda' THEN 'form' ELSE import_source END,
        updated_at  = NOW()
       WHERE id = $1`,
      [
        existing.id,
        email ? email.toLowerCase().trim() : null,
        phone ? phone.trim() : null,
        city || null,
        institution || null,
        tag,
        sourceUrl || null,
      ]
    );
    return existing.id;
  }

  // 2b. Insert new contact
  const res = await client.query<{ id: string }>(
    `INSERT INTO contacts
       (full_name, email, phone, city, institution, tags, status, import_source, source_urls)
     VALUES ($1, $2, $3, $4, $5, $6, 'new', 'form', $7)
     RETURNING id`,
    [
      fullName.trim(),
      email ? email.toLowerCase().trim() : null,
      phone ? phone.trim() : null,
      city || null,
      institution || null,
      [tag],
      sourceUrl ? [sourceUrl] : [],
    ]
  );
  return res.rows[0].id;
}
