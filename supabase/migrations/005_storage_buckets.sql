-- ============================================
-- STORAGE BUCKETS FOR FILE UPLOADS
-- ============================================

-- Create storage bucket for center logos
INSERT INTO storage.buckets (id, name, file_size_limit, allowed_mime_types)
VALUES (
    'center-logos',
    'center-logos',
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Make center-logos bucket public
UPDATE storage.buckets SET public = true WHERE id = 'center-logos' AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'public'
);

-- Create storage bucket for general uploads (documents, etc.)
INSERT INTO storage.buckets (id, name, file_size_limit, allowed_mime_types)
VALUES (
    'uploads',
    'uploads',
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Policy: Anyone can view center logos (public bucket)
CREATE POLICY "Public can view center logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'center-logos');

-- Policy: Authenticated users can upload center logos
CREATE POLICY "Authenticated users can upload center logos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'center-logos'
    AND auth.role() = 'authenticated'
);

-- Policy: Super admins can delete center logos
CREATE POLICY "Super admins can delete center logos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'center-logos'
    AND is_super_admin()
);

-- Policy: Super admins can update center logos
CREATE POLICY "Super admins can update center logos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'center-logos'
    AND is_super_admin()
);
