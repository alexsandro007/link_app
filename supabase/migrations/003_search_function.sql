-- =====================================================
-- Linkery: Расширенный полнотекстовый поиск
-- Миграция 003 — заменяет базовую search_cards
-- =====================================================
--
-- ВОЗМОЖНОСТИ:
--   • Полнотекстовый поиск по title, notes, place
--   • websearch_to_tsquery: поддержка "фраз", AND, OR, NOT, -исключение
--   • Взвешенное ранжирование: title (A), place (B), notes (C)
--   • Фильтры: category_id, tags (ANY), price, дата
--   • Архивные карточки (опционально)
--   • Сортировка по rank, дате, цене, title
--   • Пагинация (limit / offset)
-- =====================================================

-- =====================================================
-- 0. ДОБАВЛЕНИЕ КОЛОНОК (если не существуют)
-- =====================================================
-- is_archived и click_count присутствуют в TypeScript-типах,
-- но могут отсутствовать в первой миграции.

ALTER TABLE public.cards
    ADD COLUMN IF NOT EXISTS is_archived  BOOLEAN  NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS click_count  INT      NOT NULL DEFAULT 0;

-- Индекс для фильтрации архивных карточек
CREATE INDEX IF NOT EXISTS idx_cards_is_archived
    ON public.cards(user_id, is_archived);

COMMENT ON COLUMN public.cards.is_archived IS 'Флаг архива — карточка скрыта, но не удалена';
COMMENT ON COLUMN public.cards.click_count IS 'Счётчик переходов по ссылке';

-- =====================================================
-- 1. ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: cards_tsvector
-- =====================================================
-- Создаём функцию ДО индекса — индекс ссылается на неё.
-- Единый способ построения tsvector гарантирует совпадение
-- индекса и WHERE-условия в запросах.

CREATE OR REPLACE FUNCTION cards_tsvector(
    p_title TEXT,
    p_place TEXT,
    p_notes TEXT
)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT
        setweight(to_tsvector('russian', COALESCE(p_title, '')), 'A') ||
        setweight(to_tsvector('russian', COALESCE(p_place, '')), 'B') ||
        setweight(to_tsvector('russian', COALESCE(p_notes, '')), 'C')
$$;

COMMENT ON FUNCTION cards_tsvector IS
    'Строит взвешенный tsvector для карточки. Используй везде вместо inline вычисления.';

-- =====================================================
-- 2. ОБНОВЛЕНИЕ ИНДЕКСА: расширяем FTS на place
-- =====================================================
-- Индекс строится через функцию cards_tsvector (обязательно — иначе
-- PostgreSQL не может использовать индекс для запросов через эту функцию).

DROP INDEX IF EXISTS idx_cards_fulltext_search;
DROP INDEX IF EXISTS idx_cards_search;

CREATE INDEX idx_cards_fulltext
ON public.cards
USING GIN(cards_tsvector(title, place, notes));

COMMENT ON INDEX idx_cards_fulltext
    IS 'Взвешенный GIN tsvector через cards_tsvector(): title(A) place(B) notes(C)';

-- =====================================================
-- 3. ОСНОВНАЯ ФУНКЦИЯ: search_cards (полная замена)
-- =====================================================
-- Удаляем старую версию с другой сигнатурой (из миграции 001),
-- иначе PostgreSQL видит две функции с одним именем и выдаёт ошибку 42725.
DROP FUNCTION IF EXISTS search_cards(text, uuid);
DROP FUNCTION IF EXISTS search_cards(uuid, text, uuid, text[], numeric, numeric, timestamptz, timestamptz, boolean, text, text, int, int);

CREATE OR REPLACE FUNCTION search_cards(
    -- Обязательный параметр
    p_user_id       UUID,

    -- Поисковый запрос (NULL = не фильтровать по тексту)
    -- Поддерживает: "точная фраза", слово1 OR слово2, -исключение
    p_query         TEXT        DEFAULT NULL,

    -- Фильтры
    p_category_id   UUID        DEFAULT NULL,
    p_tags          TEXT[]      DEFAULT NULL,   -- ANY(tags): хотя бы один тег совпадает
    p_price_min     NUMERIC     DEFAULT NULL,
    p_price_max     NUMERIC     DEFAULT NULL,
    p_date_from     TIMESTAMPTZ DEFAULT NULL,
    p_date_to       TIMESTAMPTZ DEFAULT NULL,
    p_is_archived   BOOLEAN     DEFAULT FALSE,  -- FALSE = только активные, NULL = все, TRUE = только архивные

    -- Сортировка
    -- Значения: 'rank' | 'created_at' | 'updated_at' | 'title' | 'price'
    p_sort_by       TEXT        DEFAULT 'rank',
    -- Значения: 'desc' | 'asc'
    p_sort_order    TEXT        DEFAULT 'desc',

    -- Пагинация
    p_limit         INT         DEFAULT 20,
    p_offset        INT         DEFAULT 0
)
RETURNS TABLE (
    -- Все поля карточки
    id              UUID,
    user_id         UUID,
    category_id     UUID,
    title           TEXT,
    link            TEXT,
    place           TEXT,
    price           NUMERIC,
    currency        TEXT,
    notes           TEXT,
    tags            TEXT[],
    is_public       BOOLEAN,
    is_archived     BOOLEAN,
    click_count     INT,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ,
    -- Дополнительные метаданные поиска
    rank            REAL,           -- 0.0 – 1.0, NULL если p_query IS NULL
    headline        TEXT            -- HTML <b>...</b> фрагмент для подсветки совпадений
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_tsquery   tsquery;
    v_has_query BOOLEAN;
BEGIN
    -- Нормализуем строку поиска
    v_has_query := p_query IS NOT NULL AND trim(p_query) <> '';

    IF v_has_query THEN
        -- websearch_to_tsquery понимает:
        --   "точная фраза" → фразовый поиск
        --   слово1 OR слово2
        --   слово1 -исключить
        --   просто слова → все обязательны (AND)
        v_tsquery := websearch_to_tsquery('russian', p_query);
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        c.user_id,
        c.category_id,
        c.title,
        c.link,
        c.place,
        c.price,
        c.currency,
        c.notes,
        c.tags,
        c.is_public,
        c.is_archived,
        c.click_count,
        c.created_at,
        c.updated_at,

        -- Ранг: 0 если нет поискового запроса
        CASE WHEN v_has_query THEN
            ts_rank_cd(
                cards_tsvector(c.title, c.place, c.notes),
                v_tsquery,
                32  -- нормализация по длине документа
            )
        ELSE NULL
        END AS rank,

        -- Headline: фрагмент с подсвеченными совпадениями для UI
        CASE WHEN v_has_query THEN
            ts_headline(
                'russian',
                c.title || '. ' || COALESCE(c.notes, ''),
                v_tsquery,
                'MaxWords=20, MinWords=10, MaxFragments=2, FragmentDelimiter=" … "'
            )
        ELSE NULL
        END AS headline

    FROM public.cards c

    WHERE
        -- Всегда: только карточки данного пользователя (+ RLS дополнительная защита)
        c.user_id = p_user_id

        -- Полнотекстовый поиск (если передан запрос)
        AND (
            NOT v_has_query
            OR cards_tsvector(c.title, c.place, c.notes) @@ v_tsquery
        )

        -- Фильтр по категории
        AND (p_category_id IS NULL OR c.category_id = p_category_id)

        -- Фильтр по тегам: ANY — хотя бы один тег совпадает
        AND (p_tags IS NULL OR c.tags && p_tags)

        -- Фильтр по цене
        AND (p_price_min IS NULL OR c.price >= p_price_min)
        AND (p_price_max IS NULL OR c.price <= p_price_max)

        -- Фильтр по дате создания
        AND (p_date_from IS NULL OR c.created_at >= p_date_from)
        AND (p_date_to   IS NULL OR c.created_at <= p_date_to)

        -- Фильтр архива
        AND (
            p_is_archived IS NULL
            OR c.is_archived = p_is_archived
        )

    ORDER BY
        -- Динамическая сортировка через CASE
        CASE WHEN p_sort_by = 'rank'       AND p_sort_order = 'desc' THEN
            ts_rank_cd(cards_tsvector(c.title, c.place, c.notes), COALESCE(v_tsquery, to_tsquery('russian', 'a')))
        END  DESC NULLS LAST,
        CASE WHEN p_sort_by = 'rank'       AND p_sort_order = 'asc'  THEN
            ts_rank_cd(cards_tsvector(c.title, c.place, c.notes), COALESCE(v_tsquery, to_tsquery('russian', 'a')))
        END  ASC  NULLS LAST,
        CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN c.created_at END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc'  THEN c.created_at END ASC  NULLS LAST,
        CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'desc' THEN c.updated_at END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'asc'  THEN c.updated_at END ASC  NULLS LAST,
        CASE WHEN p_sort_by = 'title'      AND p_sort_order = 'desc' THEN c.title       END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'title'      AND p_sort_order = 'asc'  THEN c.title       END ASC  NULLS LAST,
        CASE WHEN p_sort_by = 'price'      AND p_sort_order = 'desc' THEN c.price       END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'price'      AND p_sort_order = 'asc'  THEN c.price       END ASC  NULLS LAST,
        -- Дефолтный tie-breaker
        c.created_at DESC

    LIMIT  LEAST(p_limit, 100)   -- жёсткий потолок 100 строк
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION search_cards IS
    'Расширенный FTS поиск карточек: websearch_to_tsquery, взвешенный rank, '
    'фильтры по категории / тегам / цене / дате / архиву, сортировка, пагинация.';

-- =====================================================
-- 4. ФУНКЦИЯ COUNT: search_cards_count
-- =====================================================
-- Возвращает общее число строк без LIMIT/OFFSET —
-- нужна для пагинации на фронтенде.

CREATE OR REPLACE FUNCTION search_cards_count(
    p_user_id       UUID,
    p_query         TEXT        DEFAULT NULL,
    p_category_id   UUID        DEFAULT NULL,
    p_tags          TEXT[]      DEFAULT NULL,
    p_price_min     NUMERIC     DEFAULT NULL,
    p_price_max     NUMERIC     DEFAULT NULL,
    p_date_from     TIMESTAMPTZ DEFAULT NULL,
    p_date_to       TIMESTAMPTZ DEFAULT NULL,
    p_is_archived   BOOLEAN     DEFAULT FALSE
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_tsquery   tsquery;
    v_has_query BOOLEAN;
    v_count     BIGINT;
BEGIN
    v_has_query := p_query IS NOT NULL AND trim(p_query) <> '';
    IF v_has_query THEN
        v_tsquery := websearch_to_tsquery('russian', p_query);
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.cards c
    WHERE
        c.user_id = p_user_id
        AND (NOT v_has_query OR cards_tsvector(c.title, c.place, c.notes) @@ v_tsquery)
        AND (p_category_id IS NULL OR c.category_id = p_category_id)
        AND (p_tags        IS NULL OR c.tags && p_tags)
        AND (p_price_min   IS NULL OR c.price >= p_price_min)
        AND (p_price_max   IS NULL OR c.price <= p_price_max)
        AND (p_date_from   IS NULL OR c.created_at >= p_date_from)
        AND (p_date_to     IS NULL OR c.created_at <= p_date_to)
        AND (p_is_archived IS NULL OR c.is_archived = p_is_archived);

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION search_cards_count IS
    'Возвращает количество карточек для тех же фильтров, что и search_cards (без LIMIT/OFFSET).';

-- =====================================================
-- 5. ПРИМЕРЫ ПРЯМЫХ SQL-ЗАПРОСОВ
-- =====================================================
-- Используй эти запросы если не хочешь вызывать функцию через RPC.

-- 5a. Базовый full-text поиск с ранжированием:
--
-- SELECT
--     c.*,
--     ts_rank_cd(
--         cards_tsvector(c.title, c.place, c.notes),
--         websearch_to_tsquery('russian', :q)
--     ) AS rank,
--     ts_headline(
--         'russian',
--         c.title || '. ' || COALESCE(c.notes, ''),
--         websearch_to_tsquery('russian', :q),
--         'MaxWords=15, MinWords=8, MaxFragments=1'
--     ) AS headline
-- FROM public.cards c
-- WHERE
--     c.user_id = :user_id
--     AND c.is_archived = FALSE
--     AND cards_tsvector(c.title, c.place, c.notes)
--         @@ websearch_to_tsquery('russian', :q)
-- ORDER BY rank DESC
-- LIMIT 20 OFFSET 0;

-- 5b. Поиск с комбинированными фильтрами:
--
-- SELECT c.*, ts_rank_cd(cards_tsvector(c.title, c.place, c.notes), q.tsq) AS rank
-- FROM public.cards c,
--      websearch_to_tsquery('russian', :q) AS q(tsq)
-- WHERE
--     c.user_id      = :user_id
--     AND c.is_archived = FALSE
--     AND cards_tsvector(c.title, c.place, c.notes) @@ q.tsq
--     AND (:category_id::uuid IS NULL OR c.category_id = :category_id)
--     AND (:tags::text[]     IS NULL OR c.tags && :tags)
--     AND (:price_min        IS NULL OR c.price >= :price_min)
--     AND (:price_max        IS NULL OR c.price <= :price_max)
-- ORDER BY rank DESC, c.created_at DESC
-- LIMIT :limit OFFSET :offset;

-- 5c. Вызов через Supabase RPC (JavaScript):
--
-- const { data, error } = await supabase.rpc('search_cards', {
--   p_user_id:     user.id,
--   p_query:       'sony наушники',
--   p_category_id: null,
--   p_tags:        ['ANC'],
--   p_price_min:   10000,
--   p_price_max:   50000,
--   p_is_archived: false,
--   p_sort_by:     'rank',
--   p_sort_order:  'desc',
--   p_limit:       20,
--   p_offset:      0,
-- });

-- =====================================================
-- ГОТОВО
-- =====================================================
