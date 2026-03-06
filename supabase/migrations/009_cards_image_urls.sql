-- ── 009_cards_image_urls.sql ──────────────────────────────────────────────────
-- Добавляет поддержку нескольких изображений на карточку.
-- Новое поле image_urls TEXT[] хранит массив публичных URL.
-- Поле image_url остаётся как "главное изображение" для обратной совместимости.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

-- Для уже существующих карточек с image_url — переносим в массив
UPDATE public.cards
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL
  AND array_length(image_urls, 1) IS NULL;

-- Индекс для быстрого поиска карточек с изображениями
CREATE INDEX IF NOT EXISTS idx_cards_has_images
  ON public.cards ((array_length(image_urls, 1) > 0))
  WHERE array_length(image_urls, 1) > 0;
