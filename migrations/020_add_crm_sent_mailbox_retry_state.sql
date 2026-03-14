-- Migration 020: durable retry state for appending outbound CRM emails to IMAP Sent

ALTER TABLE crm_emails
  ADD COLUMN IF NOT EXISTS sent_mailbox_status TEXT NOT NULL DEFAULT 'legacy'
    CHECK (sent_mailbox_status IN ('legacy', 'pending', 'synced')),
  ADD COLUMN IF NOT EXISTS sent_mailbox_last_error TEXT,
  ADD COLUMN IF NOT EXISTS sent_mailbox_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_mailbox_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_mailbox_retry_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_crm_emails_sent_mailbox_status_sent_at
  ON crm_emails (sent_mailbox_status, sent_at DESC)
  WHERE direction = 'outbound';
