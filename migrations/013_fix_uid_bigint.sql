-- UID в IMAP может превышать integer (2.1 млрд), используем bigint
ALTER TABLE crm_imap_sync_state ALTER COLUMN last_uid_validity TYPE bigint;
ALTER TABLE crm_imap_sync_state ALTER COLUMN last_synced_uid TYPE bigint;
