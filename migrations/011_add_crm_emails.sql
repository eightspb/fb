-- =====================================================
-- CRM Email Integration: таблицы для хранения переписки
-- =====================================================

-- Таблица для хранения email-сообщений (входящие из IMAP + исходящие из админки)
CREATE TABLE IF NOT EXISTS crm_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE,                          -- RFC Message-ID (для дедупликации)
  in_reply_to TEXT,                                -- In-Reply-To header (для группировки в треды)
  references_header TEXT,                          -- References header (для группировки в треды)
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'telegram', 'phone')),
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  has_attachments BOOLEAN DEFAULT false,
  submission_id UUID REFERENCES form_submissions(id) ON DELETE SET NULL,
  contact_email TEXT NOT NULL,                     -- email клиента (для поиска переписки)
  sent_at TIMESTAMPTZ NOT NULL,                    -- дата письма
  synced_at TIMESTAMPTZ DEFAULT NOW(),             -- когда загружено из IMAP
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_crm_emails_contact_email ON crm_emails(contact_email);
CREATE INDEX IF NOT EXISTS idx_crm_emails_submission_id ON crm_emails(submission_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_message_id ON crm_emails(message_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_sent_at ON crm_emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_emails_direction ON crm_emails(direction);

-- RLS
ALTER TABLE crm_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for postgres on crm_emails" ON crm_emails;
CREATE POLICY "Allow all for postgres on crm_emails" ON crm_emails
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Таблица для вложений email
CREATE TABLE IF NOT EXISTS crm_email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES crm_emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  storage_key TEXT NOT NULL,                       -- путь к файлу на диске
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_email_attachments_email_id ON crm_email_attachments(email_id);

-- RLS
ALTER TABLE crm_email_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for postgres on crm_email_attachments" ON crm_email_attachments;
CREATE POLICY "Allow all for postgres on crm_email_attachments" ON crm_email_attachments
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Таблица для хранения состояния IMAP-синхронизации (по папке)
CREATE TABLE IF NOT EXISTS crm_imap_sync_state (
  id SERIAL PRIMARY KEY,
  folder_name TEXT NOT NULL UNIQUE,                -- INBOX, Sent, etc.
  last_uid_validity INTEGER,                       -- если сменился — полный ресинк
  last_synced_uid INTEGER DEFAULT 0,               -- последний обработанный UID
  last_sync_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Начальные записи для папок
INSERT INTO crm_imap_sync_state (folder_name) VALUES ('INBOX') ON CONFLICT (folder_name) DO NOTHING;
INSERT INTO crm_imap_sync_state (folder_name) VALUES ('Sent') ON CONFLICT (folder_name) DO NOTHING;

-- RLS
ALTER TABLE crm_imap_sync_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for postgres on crm_imap_sync_state" ON crm_imap_sync_state;
CREATE POLICY "Allow all for postgres on crm_imap_sync_state" ON crm_imap_sync_state
  FOR ALL TO postgres USING (true) WITH CHECK (true);
