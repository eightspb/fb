-- This script is a helper to check speaker photo sizes
-- The actual migration is done by migrate-speaker-photos.js

SELECT
  c.id,
  c.slug,
  c.title,
  jsonb_array_length(c.speakers) as speaker_count,
  length(c.speakers::text) as speakers_json_size,
  (SELECT count(*) FROM jsonb_array_elements(c.speakers) s WHERE s->>'photo' LIKE 'data:%') as base64_photo_count
FROM conferences c
WHERE jsonb_array_length(c.speakers) > 0;
