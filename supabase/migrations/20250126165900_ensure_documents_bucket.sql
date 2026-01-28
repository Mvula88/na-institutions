-- Ensure the documents storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure storage policies exist for the documents bucket
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
  DROP POLICY IF EXISTS "documents_insert_policy" ON storage.objects;
  DROP POLICY IF EXISTS "documents_update_policy" ON storage.objects;
  DROP POLICY IF EXISTS "documents_delete_policy" ON storage.objects;
  DROP POLICY IF EXISTS "documents_select_policy" ON storage.objects;
END $$;

-- Allow authenticated users to upload files
CREATE POLICY "documents_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to update their own files
CREATE POLICY "documents_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete files
CREATE POLICY "documents_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Allow public read access (since bucket is public)
CREATE POLICY "documents_select_policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');
