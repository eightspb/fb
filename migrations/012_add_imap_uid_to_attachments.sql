-- Добавляем поля для ленивой загрузки вложений из IMAP
-- imap_uid и imap_folder нужны чтобы скачать файл по требованию
-- storage_key теперь nullable (null = файл ещё не скачан)

ALTER TABLE crm_email_attachments
  ADD COLUMN IF NOT EXISTS imap_uid integer,
  ADD COLUMN IF NOT EXISTS imap_folder text,
  ALTER COLUMN storage_key DROP NOT NULL;
