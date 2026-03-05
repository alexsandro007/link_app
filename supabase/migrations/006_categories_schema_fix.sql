-- =====================================================
-- Migration 006: Fix categories table — add missing columns
-- =====================================================
-- The TypeScript API layer expects: slug, description, icon, is_public.
-- Add them if not present.
-- =====================================================

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS slug        TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon        TEXT,
  ADD COLUMN IF NOT EXISTS is_public   BOOLEAN NOT NULL DEFAULT FALSE;

-- Fill slug for any existing rows that have no slug yet
UPDATE public.categories
SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Remove duplicate slugs per user (keep the first created)
-- (safe no-op if table is empty)
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id, slug ORDER BY created_at) AS rn
  FROM public.categories
  WHERE slug IS NOT NULL
)
UPDATE public.categories c
SET slug = c.slug || '-' || c.id::text
FROM ranked r
WHERE c.id = r.id AND r.rn > 1;

-- Now make slug NOT NULL and add unique constraint
ALTER TABLE public.categories
  ALTER COLUMN slug SET NOT NULL;

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_user_slug_unique;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_user_slug_unique UNIQUE (user_id, slug);
