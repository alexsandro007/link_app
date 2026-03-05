-- =====================================================
-- Migration 004: Fix cards table schema
-- =====================================================
-- Renames 'link' → 'url' and adds missing columns that
-- the TypeScript API layer expects.
-- =====================================================

-- 1. Rename 'link' to 'url' (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'cards'
      AND column_name  = 'link'
  ) THEN
    ALTER TABLE public.cards RENAME COLUMN link TO url;
  END IF;
END $$;

-- 2. Add missing columns (idempotent with IF NOT EXISTS)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image_url    TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url  TEXT,
  ADD COLUMN IF NOT EXISTS is_archived  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS click_count  INTEGER NOT NULL DEFAULT 0;

-- 3. Index for archive filter (used by dashboard "показать архив")
CREATE INDEX IF NOT EXISTS idx_cards_user_archived
  ON public.cards(user_id, is_archived);

-- 4. Update RLS policies to cover the new columns
-- (existing policies on cards already cover all columns via SELECT/INSERT/UPDATE)
