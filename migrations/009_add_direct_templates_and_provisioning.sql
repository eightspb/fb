-- Миграция: Шаблоны и маппинг сущностей для автосоздания кампаний Яндекс.Директ
-- Дата: 2026-03-03

CREATE TABLE IF NOT EXISTS direct_campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL UNIQUE,
  campaign_name_pattern VARCHAR(255) NOT NULL,
  ad_group_name VARCHAR(255) NOT NULL DEFAULT 'Основная группа',
  default_max_bid NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (default_max_bid >= 0),
  is_active_by_default BOOLEAN NOT NULL DEFAULT false,
  campaign_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ad_group_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  minus_keywords TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_direct_campaign_templates_updated_at ON direct_campaign_templates;
CREATE TRIGGER update_direct_campaign_templates_updated_at
  BEFORE UPDATE ON direct_campaign_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_direct_campaign_templates_created_at
  ON direct_campaign_templates(created_at DESC);

CREATE TABLE IF NOT EXISTS direct_keyword_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES direct_campaign_templates(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_direct_keyword_templates_template_id
  ON direct_keyword_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_direct_keyword_templates_priority
  ON direct_keyword_templates(priority);

CREATE TABLE IF NOT EXISTS direct_entities_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES direct_campaign_templates(id) ON DELETE CASCADE,
  campaign_id VARCHAR(64) NOT NULL,
  ad_group_id VARCHAR(64),
  keyword_id VARCHAR(64),
  entity_type VARCHAR(24) NOT NULL CHECK (entity_type IN ('campaign', 'ad_group', 'keyword')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_entities_map_template_id
  ON direct_entities_map(template_id);
CREATE INDEX IF NOT EXISTS idx_direct_entities_map_campaign_id
  ON direct_entities_map(campaign_id);
CREATE INDEX IF NOT EXISTS idx_direct_entities_map_entity_type
  ON direct_entities_map(entity_type);

