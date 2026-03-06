-- Backfill: create contacts from historical form_submissions and link them back
-- Run once on the server after deploying migration 015.
-- Safe to re-run: INSERTs use NOT EXISTS guard, UPDATEs use WHERE contact_id IS NULL.

BEGIN;

-- Step 1: Insert contacts from form_submissions that don't exist yet (match by email)
INSERT INTO contacts (full_name, email, phone, city, institution, tags, status, import_source, source_urls)
SELECT DISTINCT ON (LOWER(TRIM(fs.email)))
  fs.name,
  LOWER(TRIM(fs.email)),
  TRIM(fs.phone),
  fs.city,
  fs.institution,
  ARRAY[
    CASE fs.form_type
      WHEN 'contact'                 THEN 'form-contact'
      WHEN 'cp'                      THEN 'form-cp'
      WHEN 'conference_registration' THEN 'form-conference'
      WHEN 'training'                THEN 'form-training'
      ELSE 'form-other'
    END
  ],
  'new',
  'form',
  CASE WHEN fs.page_url IS NOT NULL AND fs.page_url <> '' THEN ARRAY[fs.page_url] ELSE '{}' END
FROM form_submissions fs
WHERE fs.email IS NOT NULL AND TRIM(fs.email) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM contacts c WHERE LOWER(TRIM(c.email)) = LOWER(TRIM(fs.email))
  )
ORDER BY LOWER(TRIM(fs.email)), fs.created_at ASC;

-- Step 2: For submissions without email, insert by phone (if no match by phone exists yet)
INSERT INTO contacts (full_name, phone, city, institution, tags, status, import_source, source_urls)
SELECT DISTINCT ON (TRIM(fs.phone))
  fs.name,
  TRIM(fs.phone),
  fs.city,
  fs.institution,
  ARRAY[
    CASE fs.form_type
      WHEN 'contact'                 THEN 'form-contact'
      WHEN 'cp'                      THEN 'form-cp'
      WHEN 'conference_registration' THEN 'form-conference'
      WHEN 'training'                THEN 'form-training'
      ELSE 'form-other'
    END
  ],
  'new',
  'form',
  CASE WHEN fs.page_url IS NOT NULL AND fs.page_url <> '' THEN ARRAY[fs.page_url] ELSE '{}' END
FROM form_submissions fs
WHERE (fs.email IS NULL OR TRIM(fs.email) = '')
  AND fs.phone IS NOT NULL AND TRIM(fs.phone) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM contacts c WHERE TRIM(c.phone) = TRIM(fs.phone)
  )
ORDER BY TRIM(fs.phone), fs.created_at ASC;

-- Step 3: Link form_submissions.contact_id to the matched contact (by email)
UPDATE form_submissions fs
SET contact_id = c.id
FROM contacts c
WHERE fs.contact_id IS NULL
  AND fs.email IS NOT NULL AND TRIM(fs.email) <> ''
  AND LOWER(TRIM(fs.email)) = LOWER(TRIM(c.email));

-- Step 4: Link remaining submissions (no email) by phone
UPDATE form_submissions fs
SET contact_id = c.id
FROM contacts c
WHERE fs.contact_id IS NULL
  AND (fs.email IS NULL OR TRIM(fs.email) = '')
  AND fs.phone IS NOT NULL AND TRIM(fs.phone) <> ''
  AND TRIM(fs.phone) = TRIM(c.phone);

-- Report
SELECT
  COUNT(*) FILTER (WHERE contact_id IS NOT NULL) AS linked,
  COUNT(*) FILTER (WHERE contact_id IS NULL)     AS unlinked,
  COUNT(*)                                        AS total
FROM form_submissions;

COMMIT;
