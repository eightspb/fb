-- Migration 017: Add case-insensitive indexes for crm_emails to speed up email lookup by contact
-- These functional indexes allow queries using LOWER(column) = LOWER($1) to use indexes instead of seq scan

CREATE INDEX IF NOT EXISTS idx_crm_emails_contact_email_lower
  ON crm_emails (LOWER(contact_email));

CREATE INDEX IF NOT EXISTS idx_crm_emails_from_address_lower
  ON crm_emails (LOWER(from_address));

-- Composite index for the most common query pattern: lookup by contact_email + sort by sent_at
CREATE INDEX IF NOT EXISTS idx_crm_emails_contact_email_lower_sent_at
  ON crm_emails (LOWER(contact_email), sent_at DESC);
