-- Migration 003: Restructure conferences for new design
-- This migration documents the new JSONB structure for conferences table
-- No actual schema changes needed - only JSONB field structure changes

-- ============================================================================
-- OVERVIEW
-- ============================================================================
-- This migration updates the structure of JSONB fields in the conferences table:
-- 1. speakers: Add new fields (institution, is_presidium, order), remove report_title/report_time
-- 2. program: Change from string[] to structured ProgramItem[]
-- 3. videos: Add new field for conference videos

-- ============================================================================
-- NEW STRUCTURE: speakers (JSONB)
-- ============================================================================
-- Old structure:
-- {
--   "id": "string",
--   "name": "string",
--   "photo": "string",
--   "credentials": "string",
--   "report_title": "string",    -- REMOVED (moved to program)
--   "report_time": "string"      -- REMOVED (moved to program)
-- }

-- New structure:
-- {
--   "id": "string",
--   "name": "string",
--   "photo": "string",
--   "credentials": "string",
--   "institution": "string",     -- NEW: organization/city
--   "is_speaker": boolean,       -- NEW: flag for speakers (gives talks) - default: true
--   "is_presidium": boolean,     -- NEW: flag for presidium members - default: false
--   "order": number              -- NEW: display order
-- }
--
-- IMPORTANT: A person can be:
-- - Only a speaker (is_speaker: true, is_presidium: false)
-- - Only a presidium member (is_speaker: false, is_presidium: true)
-- - Both speaker and presidium (is_speaker: true, is_presidium: true)

-- ============================================================================
-- NEW STRUCTURE: program (JSONB)
-- ============================================================================
-- Old structure: Simple array of strings
-- ["Регистрация участников", "Доклад 1", "Перерыв", ...]

-- New structure: Array of structured program items
-- [
--   {
--     "id": "string",
--     "time_start": "10:00",
--     "time_end": "10:30",
--     "speaker_id": "string | null",      -- Link to speaker (one speaker can have multiple talks)
--     "speaker_name": "string | null",    -- Speaker name if not in speakers list
--     "title": "string",                  -- Talk/event title
--     "description": "string | null",     -- Optional description
--     "type": "talk | break | other",     -- Event type
--     "order": number                     -- Display order
--   }
-- ]

-- ============================================================================
-- NEW STRUCTURE: videos (JSONB)
-- ============================================================================
-- New field for conference videos (stored on server, not YouTube/Vimeo)
-- [
--   {
--     "id": "string",
--     "title": "string",                  -- Video title
--     "video_url": "string",              -- Path to video file (e.g., /videos/conferences/sms3_video1.mp4)
--     "duration": "string | null",        -- Optional duration (e.g., "5:30")
--     "order": number                     -- Display order
--   }
-- ]

-- ============================================================================
-- BACKWARD COMPATIBILITY
-- ============================================================================
-- The application code will handle backward compatibility:
-- 1. Old speakers with report_title/report_time will still work
-- 2. Missing is_presidium defaults to false
-- 3. Missing institution shows nothing
-- 4. Old program format (string[]) will be supported as fallback
-- 5. Missing videos field or empty array will hide the video section

-- ============================================================================
-- EXAMPLE DATA
-- ============================================================================

-- Example: Conference with new structure
/*
INSERT INTO conferences (
  slug,
  title,
  date,
  date_end,
  description,
  type,
  location,
  cme_hours,
  status,
  cover_image,
  speakers,
  program,
  videos,
  organizer_contacts,
  additional_info
) VALUES (
  'sms3',
  'III Научно-практическая конференция Xishan-Зенит',
  '2026-04-25',
  '2026-04-25',
  'Приглашаем вас на третью международную конференцию по Малоинвазивной хирургии молочной железы...',
  'Конференция',
  'Московский Клинический научный центр им. Логинова, Москва',
  8,
  'published',
  '/images/conferences/sms3_cover.jpg',
  '[
    {
      "id": "speaker-1",
      "name": "Одинцов Владислав Александрович",
      "photo": "/images/speakers/odintsov.jpg",
      "credentials": "Д.м.н., профессор, главный врач Клиники доктора Одинцова",
      "institution": "Клиника Одинцова, г. Санкт-Петербург",
      "is_speaker": true,
      "is_presidium": true,
      "order": 1
    },
    {
      "id": "speaker-2",
      "name": "Прокопенко Сергей Павлович",
      "photo": "/images/speakers/prokopenko.jpg",
      "credentials": "к.м.н., заведующий отделением",
      "institution": "МНИОИ им. П.А. Герцена, Москва",
      "is_speaker": true,
      "is_presidium": false,
      "order": 2
    },
    {
      "id": "speaker-3",
      "name": "Иванов Иван Иванович",
      "photo": "/images/speakers/ivanov.jpg",
      "credentials": "к.м.н., профессор",
      "institution": "НИИ Онкологии, Москва",
      "is_speaker": false,
      "is_presidium": true,
      "order": 3
    }
  ]'::jsonb,
  '[
    {
      "id": "prog-1",
      "time_start": "09:00",
      "time_end": "10:00",
      "speaker_id": null,
      "speaker_name": null,
      "title": "Регистрация участников",
      "description": null,
      "type": "other",
      "order": 1
    },
    {
      "id": "prog-2",
      "time_start": "10:00",
      "time_end": "10:15",
      "speaker_id": "speaker-1",
      "speaker_name": null,
      "title": "Приветственное слово",
      "description": null,
      "type": "talk",
      "order": 2
    },
    {
      "id": "prog-3",
      "time_start": "10:15",
      "time_end": "10:35",
      "speaker_id": "speaker-2",
      "speaker_name": null,
      "title": "Тема доклада уточняется",
      "description": null,
      "type": "talk",
      "order": 3
    },
    {
      "id": "prog-4",
      "time_start": "12:15",
      "time_end": "12:40",
      "speaker_id": null,
      "speaker_name": null,
      "title": "Перерыв на кофе",
      "description": "25 минут",
      "type": "break",
      "order": 4
    },
    {
      "id": "prog-5",
      "time_start": "13:40",
      "time_end": "14:00",
      "speaker_id": "speaker-1",
      "speaker_name": null,
      "title": "Анализ международных рекомендаций выполнения биопсии молочных желёз",
      "description": "Практические выводы",
      "type": "talk",
      "order": 5
    }
  ]'::jsonb,
  '[
    {
      "id": "video-1",
      "title": "Отчетное видео с конференции 2025",
      "video_url": "/videos/conferences/sms2_report.mp4",
      "duration": "8:45",
      "order": 1
    },
    {
      "id": "video-2",
      "title": "Основные моменты конференции 2024",
      "video_url": "/videos/conferences/sms1_highlights.mp4",
      "duration": "5:30",
      "order": 2
    }
  ]'::jsonb,
  '{
    "name": "Юлия Игоревна Борисенкова",
    "phone": "+7 812 748 22 13",
    "email": "info@zenitmed.ru",
    "additional": ""
  }'::jsonb,
  'Участие в конференции бесплатное. Количество мест ограничено.'
);
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. One speaker can have multiple talks in the program (multiple program items with same speaker_id)
-- 2. Videos are stored as files on the server in public/videos/conferences/
-- 3. The VideoPlayer component from src/components/VideoPlayer.tsx will be used for display
-- 4. All changes are backward compatible - old data will continue to work
