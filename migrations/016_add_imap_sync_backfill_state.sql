-- Migration: 016_add_imap_sync_backfill_state
-- Description: Add IMAP UID dedupe fields and incremental backfill cursor for CRM email sync
-- Date: 2026-03-07

BEGIN;

ALTER TABLE crm_emails
  ADD COLUMN IF NOT EXISTS imap_uid BIGINT,
  ADD COLUMN IF NOT EXISTS imap_folder TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_emails_imap_folder_uid
  ON crm_emails (imap_folder, imap_uid)
  WHERE imap_folder IS NOT NULL AND imap_uid IS NOT NULL;

ALTER TABLE crm_imap_sync_state
  ADD COLUMN IF NOT EXISTS backfill_seq_cursor INTEGER,
  ADD COLUMN IF NOT EXISTS backfill_completed BOOLEAN NOT NULL DEFAULT false;

COMMIT;
