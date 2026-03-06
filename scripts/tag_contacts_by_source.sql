-- Назначение тегов контактам на основе source_urls
-- Запускать после импорта контактов

-- sms → sms2024apr
UPDATE contacts
SET tags = array_append(tags, 'sms2024apr')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/sms([?#]|$|/)'
)
AND NOT ('sms2024apr' = ANY(tags));

-- sms2 → sms2025apr
UPDATE contacts
SET tags = array_append(tags, 'sms2025apr')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/sms2([?#]|$|/)'
)
AND NOT ('sms2025apr' = ANY(tags));

-- sms3 → sms2026apr
UPDATE contacts
SET tags = array_append(tags, 'sms2026apr')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/sms3([?#]|$|/)'
)
AND NOT ('sms2026apr' = ANY(tags));

-- sim/1 → sim2016nov
UPDATE contacts
SET tags = array_append(tags, 'sim2016nov')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/sim/1([?#/]|$)'
)
AND NOT ('sim2016nov' = ANY(tags));

-- sim/2 → sim2017apr
UPDATE contacts
SET tags = array_append(tags, 'sim2017apr')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/sim/2([?#/]|$)'
)
AND NOT ('sim2017apr' = ANY(tags));

-- sim/3 → sim2017oct
UPDATE contacts
SET tags = array_append(tags, 'sim2017oct')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/sim/3([?#/]|$)'
)
AND NOT ('sim2017oct' = ANY(tags));

-- sim/4 → sim2018nov
UPDATE contacts
SET tags = array_append(tags, 'sim2018nov')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/sim/4([?#/]|$)'
)
AND NOT ('sim2018nov' = ANY(tags));

-- sim4 (без слеша) → sim2018mar
UPDATE contacts
SET tags = array_append(tags, 'sim2018mar')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/sim4([?#/]|$)'
)
AND NOT ('sim2018mar' = ANY(tags));

-- usmd → usm2017apr
UPDATE contacts
SET tags = array_append(tags, 'usm2017apr')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/usmd([?#/]|$)'
)
AND NOT ('usm2017apr' = ANY(tags));

-- usdm → usm2018may
UPDATE contacts
SET tags = array_append(tags, 'usm2018may')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/usdm([?#/]|$)'
)
AND NOT ('usm2018may' = ANY(tags));

-- usm/2 → usm2017oct
UPDATE contacts
SET tags = array_append(tags, 'usm2017oct')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/usm/2([?#/]|$)'
)
AND NOT ('usm2017oct' = ANY(tags));

-- usd_mt → usm2017nov
UPDATE contacts
SET tags = array_append(tags, 'usm2017nov')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/usd_mt([?#/]|$)'
)
AND NOT ('usm2017nov' = ANY(tags));

-- program → vab36
UPDATE contacts
SET tags = array_append(tags, 'vab36')
WHERE EXISTS (
  SELECT 1 FROM unnest(source_urls) AS url
  WHERE url ~ '/program([?#/]|$)'
)
AND NOT ('vab36' = ANY(tags));

-- Проверка результатов
SELECT
  unnest(ARRAY['sms2024apr','sms2025apr','sms2026apr',
               'sim2016nov','sim2017apr','sim2017oct','sim2018nov','sim2018mar',
               'usm2017apr','usm2018may','usm2017oct','usm2017nov','vab36']) AS tag,
  count(*) FILTER (WHERE tag = ANY(tags)) AS contacts_count
FROM contacts
GROUP BY 1
ORDER BY 1;
