# Миграции базы данных Supabase

Этот каталог содержит SQL-миграции для настройки базы данных Linkery в Supabase.

## Структура миграций

```
supabase/migrations/
├── 001_initial_schema.sql    # Основные таблицы, RLS, политики
├── 002_indexes.sql            # Дополнительные индексы для оптимизации
└── README.md                  # Эта инструкция
```

## Как применить миграции

### Вариант 1: Через Supabase Dashboard (рекомендуется для начала)

1. Откройте [Supabase Dashboard](https://app.supabase.com/)
2. Выберите ваш проект: `oopaipmwlnrlkhjybaas`
3. Перейдите в **SQL Editor**
4. Создайте новый запрос
5. Скопируйте содержимое `001_initial_schema.sql`
6. Нажмите **Run** (или F5)
7. Повторите для `002_indexes.sql`

### Вариант 2: Через Supabase CLI

```bash
# Установите Supabase CLI (если еще не установлен)
npm install -g supabase

# Войдите в Supabase
supabase login

# Свяжите локальный проект с удаленным
supabase link --project-ref oopaipmwlnrlkhjybaas

# Примените все миграции
supabase db push
```

### Вариант 3: Через psql (если есть прямой доступ)

```bash
# Замените YOUR_CONNECTION_STRING на строку подключения из Supabase Dashboard
psql YOUR_CONNECTION_STRING -f supabase/migrations/001_initial_schema.sql
psql YOUR_CONNECTION_STRING -f supabase/migrations/002_indexes.sql
```

## Что создается

### 001_initial_schema.sql

**Таблицы:**
- `categories` - категории карточек
- `cards` - основная таблица карточек
- `images` - изображения для карточек

**Функции:**
- `update_updated_at_column()` - автообновление `updated_at`
- `search_cards()` - полнотекстовый поиск

**Триггеры:**
- Автообновление `updated_at` для `categories` и `cards`

**RLS и политики:**
- Пользователи видят только свои данные
- Публичные карточки видны всем
- Полная изоляция данных между пользователями

### 002_indexes.sql

**Индексы:**
- GIN индекс для поиска по тегам
- tsvector индекс для полнотекстового поиска
- Составные индексы для частых запросов

## Проверка применения миграций

После применения миграций выполните эти запросы для проверки:

```sql
-- Проверить существование таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('categories', 'cards', 'images');

-- Проверить индексы на таблице cards
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'cards';

-- Проверить политики RLS
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Проверить включен ли RLS
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('categories', 'cards', 'images');
```

## Тестовые данные

Создайте тестовые данные для проверки:

```sql
-- Создать категорию (замените YOUR_USER_ID на ваш auth.uid())
INSERT INTO public.categories (user_id, name, color)
VALUES ('YOUR_USER_ID', 'Технологии', '#3B82F6');

-- Создать карточку
INSERT INTO public.cards (user_id, category_id, title, link, notes, tags)
VALUES (
    'YOUR_USER_ID',
    (SELECT id FROM categories WHERE name = 'Технологии' LIMIT 1),
    'Next.js 16 Released',
    'https://nextjs.org',
    'Новая версия с улучшениями производительности',
    ARRAY['nextjs', 'react', 'javascript']
);

-- Проверить полнотекстовый поиск
SELECT * FROM search_cards('Next.js', 'YOUR_USER_ID');

-- Поиск по тегам
SELECT title, tags 
FROM public.cards 
WHERE tags @> ARRAY['nextjs'];
```

## Откат миграций

Если нужно откатить изменения:

```sql
-- Удалить все созданные объекты
DROP TABLE IF EXISTS public.images CASCADE;
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS search_cards(TEXT, UUID) CASCADE;
```

## Оптимизация и мониторинг

### Проверка использования индексов

```sql
-- Статистика использования индексов
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Анализ размера таблиц

```sql
-- Размер таблиц и индексов
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Примеры запросов

### Поиск карточек

```sql
-- Полнотекстовый поиск с ранжированием
SELECT 
    c.id,
    c.title,
    c.notes,
    ts_rank(
        to_tsvector('russian', c.title || ' ' || COALESCE(c.notes, '')),
        plainto_tsquery('russian', 'игровая приставка')
    ) as relevance
FROM public.cards c
WHERE 
    c.user_id = auth.uid()
    AND to_tsvector('russian', c.title || ' ' || COALESCE(c.notes, ''))
        @@ plainto_tsquery('russian', 'игровая приставка')
ORDER BY relevance DESC;

-- Поиск по тегам
SELECT * FROM public.cards
WHERE user_id = auth.uid()
AND tags && ARRAY['технологии', 'javascript'];

-- Фильтрация по категории и цене
SELECT c.*, cat.name as category_name
FROM public.cards c
LEFT JOIN public.categories cat ON c.category_id = cat.id
WHERE c.user_id = auth.uid()
AND c.category_id = 'CATEGORY_UUID'
AND c.price BETWEEN 1000 AND 50000
ORDER BY c.price ASC;
```

## Troubleshooting

### Ошибка "permission denied"
→ Убедитесь, что вы вошли как суперпользователь или используете service_role key

### Ошибка "relation already exists"
→ Таблица уже существует, используйте `IF NOT EXISTS` или удалите старые таблицы

### RLS блокирует запросы
→ Проверьте, что `auth.uid()` возвращает правильный UUID пользователя
→ Временно отключите RLS для отладки: `ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;`

### Медленные запросы
→ Проверьте использование индексов с помощью `EXPLAIN ANALYZE`
→ Обновите статистику: `ANALYZE table_name;`

## Следующие шаги

После применения миграций:

1. ✅ Настройте Supabase Storage bucket для изображений
2. ✅ Добавьте политики Storage для загрузки файлов
3. ✅ Протестируйте RLS с реальными пользователями
4. ✅ Настройте backup в Supabase Dashboard
5. ✅ Добавьте мониторинг производительности

## Ресурсы

- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [GIN Indexes](https://www.postgresql.org/docs/current/gin-intro.html)
