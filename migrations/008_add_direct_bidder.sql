-- Миграция: Добавление таблиц для автоброкера Яндекс.Директ
-- Дата: 2026-03-03

CREATE TABLE IF NOT EXISTS direct_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  max_bid NUMERIC(10, 2) NOT NULL CHECK (max_bid >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_direct_campaigns_updated_at ON direct_campaigns;
CREATE TRIGGER update_direct_campaigns_updated_at
  BEFORE UPDATE ON direct_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_direct_campaigns_is_active ON direct_campaigns(is_active);

CREATE TABLE IF NOT EXISTS direct_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR(64) NOT NULL REFERENCES direct_campaigns(campaign_id) ON DELETE CASCADE,
  keyword_id VARCHAR(64),
  old_bid NUMERIC(10, 2),
  new_bid NUMERIC(10, 2),
  status VARCHAR(16) NOT NULL CHECK (status IN ('success', 'error')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_logs_campaign_id ON direct_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_direct_logs_created_at ON direct_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_logs_status ON direct_logs(status);
