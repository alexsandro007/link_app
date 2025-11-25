-- =====================================================
-- Linkery Database Schema
-- =====================================================
-- Создание таблиц для приложения Linkery
-- Включает RLS (Row Level Security) и политики доступа
-- =====================================================

-- Включаем расширение для UUID (если не включено)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ТАБЛИЦА: categories
-- =====================================================
-- Категории для организации карточек
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#CCCCCC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT categories_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT categories_user_name_unique UNIQUE (user_id, name)
);

-- Индекс для быстрого поиска категорий пользователя
CREATE INDEX idx_categories_user_id ON public.categories(user_id);

-- Комментарии к таблице
COMMENT ON TABLE public.categories IS 'Категории карточек, принадлежащие пользователям';
COMMENT ON COLUMN public.categories.color IS 'Цвет категории в формате HEX (#RRGGBB)';

-- =====================================================
-- ТАБЛИЦА: cards
-- =====================================================
-- Основная таблица карточек с ссылками и метаданными
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    link TEXT,
    place TEXT,
    price NUMERIC(12, 2), -- Поддержка больших сумм с 2 знаками после запятой
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT cards_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT cards_price_positive CHECK (price IS NULL OR price >= 0)
);

-- Индекс для быстрого поиска карточек пользователя
CREATE INDEX idx_cards_user_id ON public.cards(user_id);

-- Индекс для поиска по категории
CREATE INDEX idx_cards_category_id ON public.cards(category_id);

-- Индекс для фильтрации публичных карточек
CREATE INDEX idx_cards_is_public ON public.cards(is_public) WHERE is_public = TRUE;

-- Индекс для сортировки по дате создания
CREATE INDEX idx_cards_created_at ON public.cards(created_at DESC);

-- Индекс для сортировки по цене
CREATE INDEX idx_cards_price ON public.cards(price) WHERE price IS NOT NULL;

-- GIN индекс для поиска по массиву тегов
CREATE INDEX idx_cards_tags ON public.cards USING GIN(tags);

-- Full-text search индекс для поиска по title и notes
CREATE INDEX idx_cards_search ON public.cards 
USING GIN(to_tsvector('russian', title || ' ' || COALESCE(notes, '')));

-- Комментарии к таблице
COMMENT ON TABLE public.cards IS 'Карточки с ссылками, заметками и метаданными';
COMMENT ON COLUMN public.cards.tags IS 'Массив тегов для категоризации';
COMMENT ON COLUMN public.cards.is_public IS 'Публичный доступ к карточке';
COMMENT ON COLUMN public.cards.currency IS 'Код валюты (USD, EUR, RUB и т.д.)';

-- =====================================================
-- ТАБЛИЦА: images
-- =====================================================
-- Изображения, привязанные к карточкам
CREATE TABLE IF NOT EXISTS public.images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    path TEXT NOT NULL, -- Путь в Supabase Storage
    filename TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    size INTEGER, -- Размер в байтах
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT images_path_not_empty CHECK (length(trim(path)) > 0),
    CONSTRAINT images_filename_not_empty CHECK (length(trim(filename)) > 0),
    CONSTRAINT images_dimensions_positive CHECK (
        (width IS NULL OR width > 0) AND 
        (height IS NULL OR height > 0)
    ),
    CONSTRAINT images_size_positive CHECK (size IS NULL OR size > 0)
);

-- Индекс для быстрого поиска изображений карточки
CREATE INDEX idx_images_card_id ON public.images(card_id);

-- Индекс для поиска изображений пользователя
CREATE INDEX idx_images_user_id ON public.images(user_id);

-- Комментарии к таблице
COMMENT ON TABLE public.images IS 'Изображения, прикрепленные к карточкам';
COMMENT ON COLUMN public.images.path IS 'Путь к файлу в Supabase Storage';
COMMENT ON COLUMN public.images.size IS 'Размер файла в байтах';

-- =====================================================
-- ФУНКЦИЯ: Автоматическое обновление updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для categories
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Триггер для cards
CREATE TRIGGER update_cards_updated_at
    BEFORE UPDATE ON public.cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Включаем RLS для всех таблиц
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ПОЛИТИКИ для categories
-- =====================================================

-- Пользователь может просматривать только свои категории
CREATE POLICY "Users can view their own categories"
    ON public.categories
    FOR SELECT
    USING (auth.uid() = user_id);

-- Пользователь может создавать категории
CREATE POLICY "Users can create their own categories"
    ON public.categories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Пользователь может обновлять свои категории
CREATE POLICY "Users can update their own categories"
    ON public.categories
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Пользователь может удалять свои категории
CREATE POLICY "Users can delete their own categories"
    ON public.categories
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- ПОЛИТИКИ для cards
-- =====================================================

-- Пользователь может просматривать свои карточки или публичные
CREATE POLICY "Users can view their own cards or public cards"
    ON public.cards
    FOR SELECT
    USING (
        auth.uid() = user_id OR 
        is_public = TRUE
    );

-- Пользователь может создавать карточки
CREATE POLICY "Users can create their own cards"
    ON public.cards
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Пользователь может обновлять свои карточки
CREATE POLICY "Users can update their own cards"
    ON public.cards
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Пользователь может удалять свои карточки
CREATE POLICY "Users can delete their own cards"
    ON public.cards
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- ПОЛИТИКИ для images
-- =====================================================

-- Пользователь может просматривать изображения своих карточек
-- или изображения публичных карточек
CREATE POLICY "Users can view images of accessible cards"
    ON public.images
    FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.cards 
            WHERE cards.id = images.card_id 
            AND cards.is_public = TRUE
        )
    );

-- Пользователь может загружать изображения к своим карточкам
CREATE POLICY "Users can upload images to their own cards"
    ON public.images
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.cards 
            WHERE cards.id = card_id 
            AND cards.user_id = auth.uid()
        )
    );

-- Пользователь может удалять свои изображения
CREATE POLICY "Users can delete their own images"
    ON public.images
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- ФУНКЦИЯ: Полнотекстовый поиск карточек
-- =====================================================
CREATE OR REPLACE FUNCTION search_cards(
    search_query TEXT,
    search_user_id UUID
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    link TEXT,
    notes TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.link,
        c.notes,
        ts_rank(
            to_tsvector('russian', c.title || ' ' || COALESCE(c.notes, '')),
            plainto_tsquery('russian', search_query)
        ) as rank
    FROM public.cards c
    WHERE 
        c.user_id = search_user_id
        AND to_tsvector('russian', c.title || ' ' || COALESCE(c.notes, '')) 
            @@ plainto_tsquery('russian', search_query)
    ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION search_cards IS 'Полнотекстовый поиск по карточкам пользователя с ранжированием';

-- =====================================================
-- ГОТОВО!
-- =====================================================
-- Миграция выполнена успешно
-- 
-- Созданные объекты:
-- - 3 таблицы: categories, cards, images
-- - 10+ индексов для оптимизации запросов
-- - RLS и политики доступа для безопасности
-- - Триггеры для автоматического обновления updated_at
-- - Функция полнотекстового поиска
-- =====================================================
