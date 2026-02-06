-- Migration 004: Add videos field to conferences table
-- This migration adds the videos JSONB column to store conference videos

-- Add videos column if it doesn't exist
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]'::jsonb;

-- Add index for videos field (optional, for faster queries)
CREATE INDEX IF NOT EXISTS idx_conferences_videos ON conferences USING GIN (videos);

-- Update existing conferences to have empty videos array if NULL
UPDATE conferences SET videos = '[]'::jsonb WHERE videos IS NULL;

-- Add comment to the column
COMMENT ON COLUMN conferences.videos IS 'Array of video objects with id, title, video_url, duration, and order';
