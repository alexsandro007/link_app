-- =====================================================
-- Дополнительные индексы для оптимизации поиска
-- =====================================================
-- Специализированные GIN и tsvector индексы
-- =====================================================

-- =====================================================
-- GIN-индекс для массива тегов
-- =====================================================
-- Этот индекс позволяет быстро искать карточки по тегам
-- Поддерживает операторы: @>, <@, &&, =

-- Если индекс уже существует, пропускаем
DROP INDEX IF EXISTS idx_cards_tags_gin;

-- Создаем GIN индекс для массива тегов
CREATE INDEX idx_cards_tags_gin 
ON public.cards 
USING GIN(tags);

-- Комментарий
COMMENT ON INDEX idx_cards_tags_gin IS 'GIN индекс для быстрого поиска по массиву тегов';

-- Примеры использования:
-- Найти карточки с конкретным тегом:
--   SELECT * FROM cards WHERE tags @> ARRAY['технологии'];
--
-- Найти карточки с любым из тегов:
--   SELECT * FROM cards WHERE tags && ARRAY['игры', 'обзоры'];
--
-- Найти карточки, у которых все теги входят в список:
--   SELECT * FROM cards WHERE tags <@ ARRAY['игры', 'обзоры', 'Steam'];

-- =====================================================
-- tsvector индекс для полнотекстового поиска
-- =====================================================
-- Индекс для поиска по title и notes с поддержкой русского языка

-- Если индекс уже существует, пропускаем
DROP INDEX IF EXISTS idx_cards_fulltext_search;

-- Создаем GIN индекс для полнотекстового поиска
CREATE INDEX idx_cards_fulltext_search 
ON public.cards 
USING GIN(
    to_tsvector('russian', title || ' ' || COALESCE(notes, ''))
);

-- Комментарий
COMMENT ON INDEX idx_cards_fulltext_search IS 'GIN tsvector индекс для полнотекстового поиска по title и notes';

-- Примеры использования:
-- Простой поиск:
--   SELECT * FROM cards 
--   WHERE to_tsvector('russian', title || ' ' || COALESCE(notes, '')) 
--         @@ plainto_tsquery('russian', 'игровая консоль');
--
-- Поиск с ранжированием:
--   SELECT *, 
--          ts_rank(
--              to_tsvector('russian', title || ' ' || COALESCE(notes, '')),
--              plainto_tsquery('russian', 'игровая консоль')
--          ) as rank
--   FROM cards 
--   WHERE to_tsvector('russian', title || ' ' || COALESCE(notes, '')) 
--         @@ plainto_tsquery('russian', 'игровая консоль')
--   ORDER BY rank DESC;

-- =====================================================
-- Составной индекс для поиска по пользователю и тегам
-- =====================================================
-- Оптимизация для частого запроса: карточки пользователя с определенными тегами

DROP INDEX IF EXISTS idx_cards_user_tags;

CREATE INDEX idx_cards_user_tags 
ON public.cards(user_id) 
INCLUDE (tags);

COMMENT ON INDEX idx_cards_user_tags IS 'Составной индекс для быстрого поиска карточек пользователя по тегам';

-- =====================================================
-- Частичный индекс для активных (не удаленных) карточек
-- =====================================================
-- Если в будущем добавится soft delete (deleted_at), этот индекс будет полезен

-- DROP INDEX IF EXISTS idx_cards_active;
-- CREATE INDEX idx_cards_active 
-- ON public.cards(user_id, created_at DESC) 
-- WHERE deleted_at IS NULL;

-- =====================================================
-- Индекс для поиска по категории и тегам одновременно
-- =====================================================

DROP INDEX IF EXISTS idx_cards_category_tags;

CREATE INDEX idx_cards_category_tags 
ON public.cards(category_id, user_id) 
WHERE category_id IS NOT NULL;

COMMENT ON INDEX idx_cards_category_tags IS 'Индекс для фильтрации по категории и пользователю';

-- =====================================================
-- Функция для обновления поискового вектора
-- =====================================================
-- Если требуется материализованное представление для поиска

CREATE OR REPLACE FUNCTION cards_search_vector_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('russian', NEW.title || ' ' || COALESCE(NEW.notes, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Раскомментируйте, если добавите колонку search_vector:
-- ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS search_vector tsvector;
-- 
-- CREATE TRIGGER cards_search_vector_update
--     BEFORE INSERT OR UPDATE ON public.cards
--     FOR EACH ROW
--     EXECUTE FUNCTION cards_search_vector_trigger();
-- 
-- CREATE INDEX idx_cards_search_vector 
-- ON public.cards USING GIN(search_vector);
-- 
-- -- Первоначальное заполнение
-- UPDATE public.cards 
-- SET search_vector = to_tsvector('russian', title || ' ' || COALESCE(notes, ''));

-- =====================================================
-- СТАТИСТИКА И АНАЛИЗ
-- =====================================================
-- Обновляем статистику для оптимизатора запросов

ANALYZE public.categories;
ANALYZE public.cards;
ANALYZE public.images;

-- =====================================================
-- ПРОВЕРКА СОЗДАННЫХ ИНДЕКСОВ
-- =====================================================
-- Запрос для просмотра всех индексов на таблице cards:
-- 
-- SELECT
--     tablename,
--     indexname,
--     indexdef
-- FROM
--     pg_indexes
-- WHERE
--     schemaname = 'public'
--     AND tablename = 'cards';

-- =====================================================
-- ГОТОВО!
-- =====================================================
-- Дополнительные индексы созданы:
-- 1. GIN индекс для массива тегов (idx_cards_tags_gin)
-- 2. tsvector индекс для полнотекстового поиска (idx_cards_fulltext_search)
-- 3. Составные индексы для оптимизации частых запросов
-- =====================================================
