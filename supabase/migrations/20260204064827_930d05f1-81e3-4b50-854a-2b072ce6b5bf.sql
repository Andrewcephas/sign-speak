-- Create storage bucket for recorded videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow anyone to view recordings
CREATE POLICY "Anyone can view recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'recordings');

-- Create policy to allow anyone to upload recordings (since no auth)
CREATE POLICY "Anyone can upload recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recordings');

-- Create policy to allow anyone to delete their recordings
CREATE POLICY "Anyone can delete recordings"
ON storage.objects FOR DELETE
USING (bucket_id = 'recordings');

-- Create a table to track recordings metadata
CREATE TABLE public.recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view recordings
CREATE POLICY "Anyone can view recordings"
ON public.recordings FOR SELECT
USING (true);

-- Allow anyone to insert recordings
CREATE POLICY "Anyone can insert recordings"
ON public.recordings FOR INSERT
WITH CHECK (true);

-- Allow anyone to delete recordings
CREATE POLICY "Anyone can delete recordings"
ON public.recordings FOR DELETE
USING (true);