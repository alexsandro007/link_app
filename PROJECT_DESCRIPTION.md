# Описание проекта Linkery (link_app) для AI-ассистента

---

## Общее описание

**Linkery** — персональный менеджер закладок и находок ("Коллекция находок"). Веб-приложение позволяет пользователю сохранять ссылки, товары, статьи и интернет-находки в виде структурированных карточек, организовывать их по категориям, искать, фильтровать и экспортировать. Интерфейс полностью на русском языке.

---

## Технологический стек

| Слой | Технологии |
|---|---|
| **Фреймворк** | Next.js 16.1.6 (App Router), React 19, TypeScript 5 |
| **UI-библиотека** | Mantine v8 (`@mantine/core`, `form`, `hooks`, `notifications`, `dropzone`) + Tabler Icons |
| **База данных** | Supabase (PostgreSQL) + Row Level Security |
| **Аутентификация** | Supabase Auth (email/password) через `@supabase/ssr` |
| **Валидация** | Zod v4 (формы), ручная валидация в API-роутах |
| **Виртуализация** | `@tanstack/react-virtual` (виртуализированный грид карточек) |
| **API-документация** | Scalar (`@scalar/nextjs-api-reference`) + OpenAPI 3.1.0 |
| **Стилизация** | Mantine (основная) + Tailwind CSS v4 (минимально, только базовые стили) |
| **Шрифты** | Geist / Geist Mono (через `next/font/google`) |
| **Тестирование** | Vitest, Playwright, Storybook 10 |
| **Хранилище файлов** | Supabase Storage (бакет `card-images`) |

---

## Схема базы данных

**Таблица `cards`:**
- `id`, `user_id`, `category_id`, `title`, `url`, `place`, `price`, `currency`
- `description`, `notes`, `image_url`, `favicon_url`
- `tags TEXT[]`, `is_public`, `is_archived`, `click_count`
- `created_at`, `updated_at` (auto-trigger)

**Таблица `categories`:**
- `id`, `user_id`, `name`, `color`, `slug`, `description`, `icon`, `is_public`

**Таблица `images`:**
- `id`, `card_id`, `user_id`, `original_url`, `storage_path`, `file_size`, `mime_type`, `width`, `height`, `alt_text`

**RLS:** каждый пользователь видит только свои данные. Публичные карточки (`is_public=true`) доступны без аутентификации.

**Full-text search:** PostgreSQL функция `cards_tsvector()` с весами A/B/C (title/place/notes), индекс GIN, поддержка `websearch_to_tsquery`, язык `russian`.

---

## Аутентификация

- Двухуровневая защита маршрутов:
  1. **Server middleware** (`src/proxy.ts`) — перехватывает защищённые роуты (`/dashboard`, `/settings`, `/profile`) и редиректит неаутентифицированных
  2. **Client HOC** `withAuth()` (`ProtectedRoute.tsx`) — клиентский guard, показывает лоадер пока резолвится сессия
- **AuthContext** — React Context с `user`, `session`, `signIn()`, `signUp()`, `signOut()`
- Полный цикл: регистрация → подтверждение email (callback) → вход → смена пароля (forgot/reset)
- Supabase client разделён: `client.ts` (браузер, singleton) и `server.ts` (фабрика для API-роутов и middleware)

---

## API-маршруты

| Метод | Роут | Описание |
|---|---|---|
| GET | `/api/cards` | Список карточек: пагинация, поиск (`ilike`), фильтр по категории/тегу/архиву, сортировка |
| POST | `/api/cards` | Создать карточку |
| GET | `/api/cards/[id]` | Одна карточка |
| PUT | `/api/cards/[id]` | Обновить (whitelist полей, автоочистка Storage при смене изображения) |
| DELETE | `/api/cards/[id]` | Удалить (+ удаление файла из Storage) |
| GET | `/api/categories` | Список категорий |
| POST | `/api/categories` | Создать категорию (автогенерация `slug`) |
| GET | `/api/categories/[id]` | Одна категория |
| PUT | `/api/categories/[id]` | Обновить категорию |
| DELETE | `/api/categories/[id]` | Удалить (карточки получают `category_id = NULL`) |
| GET | `/api/export` | Полный JSON-архив (все карточки + категории + изображения, батчи по 1000) |
| GET | `/api/docs` | Scalar интерактивная документация API |

---

## Страницы

| Маршрут | Описание |
|---|---|
| `/` | Лендинг (публичный): hero, 6 feature-карточек, CTA. Авторизованных — редирект на dashboard |
| `/dashboard` | Главный список карточек: поиск, фильтры, сортировка, инфинит-скролл, CRUD |
| `/categories` | Два панели: список категорий (CRUD слева) + карточки выбранной категории (справа) |
| `/settings` | Экспорт (JSON / CSV) + выбор акцентного цвета темы |
| `/auth/signin` | Вход |
| `/auth/signup` | Регистрация |
| `/auth/forgot-password` | Запрос письма сброса пароля |
| `/auth/reset-password` | Установка нового пароля (через Supabase `PASSWORD_RECOVERY` event) |
| `/api/docs` | Интерактивная документация |

---

## Компоненты

- **`CardForm`** — форма создания/редактирования карточки: поля title, url, place, price+currency (8 валют), notes, tags (`TagsInput`), category (`Select`), is_public, загрузка изображений через `Dropzone`
- **`CardItem`** — карточка: изображение, title, URL (hostname), badge категории, теги, место, цена через `Intl.NumberFormat` (ru-RU), dot-menu (edit/copy/archive/delete)
- **`CardList`** — виртуализированный адаптивный грид (responsive columns, `useVirtualizer`), IntersectionObserver для инфинит-скролла
- **`AppLayout`** — `AppShell` с sidebar навигацией, header (logo + dark/light toggle + email + выход), мобильный hamburger
- **`ThemeProvider`** — управление акцентным цветом (13 цветов Mantine), сохранение в `localStorage`

---

## Custom Hooks

- **`useCards(filters)`** — инфинит-скролл пагинация карточек, защита от race conditions через `fetchIdRef`
- **`useCardsSearch(params)`** — классическая пагинация (номер страницы), встроенный debounce 300мс
- **`useCategories()`** — загрузка всех категорий (до 200), возвращает массив и `categoriesMap` (id → Category)

---

## Ключевые реализованные фичи

1. **CRUD карточек и категорий** — полный
2. **Поиск** — debounced, по title/description
3. **Фильтрация** — по категории, тегам, архивному статусу
4. **Сортировка** — по 4 полям, asc/desc
5. **Инфинит-скролл** + **виртуализация** для больших коллекций
6. **Загрузка изображений** — drag-and-drop, preview, Supabase Storage, автоочистка при удалении
7. **Архивация** — мягкое удаление карточек
8. **Экспорт JSON** — полный архив через API
9. **Экспорт CSV** — клиентский, RFC 4180, настройки delimiter/encoding, BOM для Excel
10. **Тёмная/светлая тема** — следует OS, ручное переключение
11. **Акцентный цвет** — 13 вариантов, localStorage
12. **API-документация** — Scalar UI + OpenAPI 3.1.0 спецификация
13. **Полный auth-флоу** — регистрация, вход, забытый пароль, сброс пароля

---

## Архитектурные особенности

- **Нет глобального стейт-менеджера** — только React Context (auth + theme) и локальный state в хуках
- **API-роуты** — тонкий безопасный прокси: auth verify → whitelist-валидация полей → Supabase query с `user_id` scoping
- **Defense-in-depth**: RLS на уровне БД + проверка `user_id` в API + middleware + client HOC
- **Whitelist approach** в PUT-роутах — только явно разрешённые поля попадают в UPDATE
- **Миграции** — 6 файлов в `supabase/migrations/`, отслеживают эволюцию схемы

---

## Структура проекта

```
src/
├── app/
│   ├── layout.tsx          ← Root layout: ThemeProvider → AuthProvider
│   ├── page.tsx            ← Публичный лендинг
│   ├── globals.css         ← Tailwind v4 base + CSS custom properties
│   ├── dashboard/          ← Главный список карточек
│   ├── categories/         ← Менеджер категорий
│   ├── settings/           ← Экспорт + выбор темы
│   ├── auth/               ← signin, signup, forgot-password, reset-password, callback
│   └── api/
│       ├── cards/          ← GET/POST + [id] GET/PUT/DELETE
│       ├── categories/     ← GET/POST + [id] GET/PUT/DELETE
│       ├── export/         ← GET (JSON архив)
│       └── docs/           ← GET (Scalar API UI)
├── components/
│   ├── cards/              ← CardForm, CardItem, CardList
│   ├── layout/             ← AppLayout (AppShell)
│   ├── providers/          ← ThemeProvider
│   └── ProtectedRoute.tsx  ← withAuth HOC
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   ├── useCards.ts         ← Инфинит-скролл
│   ├── useCardsSearch.ts   ← Классическая пагинация
│   └── useCategories.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts       ← Браузер singleton
│   │   ├── server.ts       ← Серверная фабрика
│   │   └── storage.ts      ← uploadImageToSupabase()
│   └── export/
│       └── csv.ts          ← RFC 4180 CSV генератор
├── types/
│   └── database.ts         ← Card, Category, Image, типы запросов
└── proxy.ts                ← Next.js 16 middleware (защита маршрутов)
supabase/migrations/
├── 001_initial_schema.sql  ← Таблицы, RLS, триггеры
├── 002_indexes.sql         ← GIN индексы
├── 003_search_function.sql ← FTS функция + is_archived/click_count
├── 004_cards_schema_fix.sql ← link→url, description/image_url/favicon_url
├── 005_storage_bucket.sql  ← Бакет card-images + Storage RLS
└── 006_categories_schema_fix.sql ← slug/description/icon/is_public
public/
└── openapi.json            ← OpenAPI 3.1.0 спецификация (статичный файл)
```
