-- Run this SQL in the Supabase SQL Editor to create the required table and storage

-- 1. Create the audiobooks table
CREATE TABLE IF NOT EXISTS audiobooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Unknown',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  cover_url TEXT,
  duration DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_position DOUBLE PRECISION NOT NULL DEFAULT 0,
  chapters JSONB NOT NULL DEFAULT '[]'::jsonb,
  bookmarks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE audiobooks ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies so users can only access their own data
CREATE POLICY "Users can view their own audiobooks"
  ON audiobooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audiobooks"
  ON audiobooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audiobooks"
  ON audiobooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audiobooks"
  ON audiobooks FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Create index for faster queries
CREATE INDEX idx_audiobooks_user_id ON audiobooks(user_id);

-- 5. Create storage bucket for audiobook files
-- (Do this in the Supabase Dashboard: Storage > New Bucket > Name: "audiobooks", Public: true)
-- Then add the following storage policy in the SQL editor:

INSERT INTO storage.buckets (id, name, public) VALUES ('audiobooks', 'audiobooks', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload audiobooks"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audiobooks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their audiobooks"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audiobooks');

CREATE POLICY "Users can delete their audiobooks"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'audiobooks' AND auth.uid()::text = (storage.foldername(name))[1]);
