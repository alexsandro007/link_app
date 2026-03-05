-- =====================================================
-- Storage: create 'card-images' bucket
-- =====================================================
-- Run this in Supabase SQL Editor ONCE.
-- =====================================================

-- 1. Create public bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'card-images',
  'card-images',
  true,
  5242880,   -- 5 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies for the bucket
---------------------------------------------------------------------------
-- Allow authenticated users to upload into their own folder (/{user_id}/…)
---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'card-images: owner upload'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "card-images: owner upload"
        ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = 'card-images'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $policy$;
  END IF;
END $$;

---------------------------------------------------------------------------
-- Allow authenticated users to read/download their own images
---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'card-images: owner read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "card-images: owner read"
        ON storage.objects
        FOR SELECT TO authenticated
        USING (
          bucket_id = 'card-images'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $policy$;
  END IF;
END $$;

---------------------------------------------------------------------------
-- Allow anonymous (public) read for shared / public cards
---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'card-images: public read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "card-images: public read"
        ON storage.objects
        FOR SELECT TO anon
        USING (bucket_id = 'card-images');
    $policy$;
  END IF;
END $$;

---------------------------------------------------------------------------
-- Allow authenticated users to delete their own images
---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'card-images: owner delete'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "card-images: owner delete"
        ON storage.objects
        FOR DELETE TO authenticated
        USING (
          bucket_id = 'card-images'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $policy$;
  END IF;
END $$;
