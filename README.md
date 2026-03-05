# Linkery

Приложение для быстрого сохранения находок из интернета: товаров, ссылок, обзоров, заметок. Всё в одном месте, приватно и доступно с любого устройства.

**Стек:** Next.js 16 · TypeScript · Mantine UI · Supabase (Postgres + Auth + Storage) · Vercel

---

## Содержание

1. [Быстрый старт (локально)](#1-быстрый-старт-локально)
2. [Настройка Supabase](#2-настройка-supabase)
3. [Переменные окружения](#3-переменные-окружения)
4. [Деплой на Vercel](#4-деплой-на-vercel)
5. [Как пользоваться приложением](#5-как-пользоваться-приложением)
6. [Структура проекта](#6-структура-проекта)
7. [API-документация](#7-api-документация)
8. [Частые проблемы](#8-частые-проблемы)

---

## 1. Быстрый старт (локально)

### Что нужно установить

| Инструмент | Версия | Ссылка |
|---|---|---|
| Node.js | 18 или 20 LTS | https://nodejs.org |
| Git | любая | https://git-scm.com |

### Шаги

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/ВАШ_ЛОГИН/link_app.git
cd link_app

# 2. Установите зависимости
npm install --legacy-peer-deps

# 3. Создайте файл переменных окружения
cp .env.example .env
# Затем заполните .env (см. раздел 3)

# 4. Запустите сервер разработки
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) — приложение готово.

> **Важно:** без заполненного `.env` приложение не запустится — Supabase обязателен.

---

## 2. Настройка Supabase

Supabase — бесплатный облачный Postgres с авторизацией и хранилищем файлов.

### 2.1 Создайте проект

1. Зайдите на [supabase.com](https://supabase.com) → **Sign Up** (бесплатно).
2. Нажмите **New project**.
3. Заполните:
   - **Name** — например, `linkery`
   - **Database Password** — придумайте надёжный пароль (сохраните его)
   - **Region** — выберите ближайший к вам (например, `West EU`)
4. Дождитесь создания проекта (~1 мин).

### 2.2 Получите ключи

В Supabase: **Project Settings → API**

Скопируйте:
- `Project URL` → это `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → это `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` `secret` key → это `SUPABASE_SERVICE_ROLE_KEY` ⚠️ никому не показывайте

### 2.3 Создайте таблицы (миграции)

В Supabase: **SQL Editor → New query**

Выполните файлы по порядку — скопируйте содержимое каждого файла и нажмите **Run**:

| № | Файл | Что делает |
|---|---|---|
| 1 | `supabase/migrations/001_initial_schema.sql` | Создаёт таблицы `categories`, `cards`, `images`, включает RLS |
| 2 | `supabase/migrations/002_indexes.sql` | Добавляет индексы (GIN для тегов, tsvector для поиска) |
| 3 | `supabase/migrations/003_search_function.sql` | Создаёт функции полнотекстового поиска |

> Если видите ошибку `already exists` — это нормально при повторном запуске, все скрипты используют `IF NOT EXISTS`.

### 2.4 Настройте Storage (хранилище изображений)

В Supabase: **Storage → New bucket**

Создайте bucket:
- **Name:** `card-images`
- **Public bucket:** ✅ включить
- **File size limit:** `5 MB`
- **Allowed MIME types:** `image/jpeg, image/png, image/gif, image/webp, image/avif`

Затем добавьте политики доступа в **Storage → Policies → card-images → New policy**:

**Политика 1 — чтение (публичное):**
```sql
-- Policy name: Public read
-- Operation: SELECT
-- Target roles: public (anon)
true
```

**Политика 2 — загрузка (только авторизованные):**
```sql
-- Policy name: Authenticated upload
-- Operation: INSERT
-- Target roles: authenticated
(auth.uid() = (storage.foldername(name))[1]::uuid)
```

**Политика 3 — удаление (только свои файлы):**
```sql
-- Policy name: Owner delete
-- Operation: DELETE
-- Target roles: authenticated
(auth.uid() = (storage.foldername(name))[1]::uuid)
```

### 2.5 Настройте Auth

В Supabase: **Authentication → Providers**

- **Email** — включён по умолчанию ✅
- **Email confirmations** — можно отключить для локальной разработки: **Authentication → Settings → Enable email confirmations** → OFF

---

## 3. Переменные окружения

Создайте файл `.env` в корне проекта (скопируйте из `.env.example`):

```env
# Supabase — берёте из Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Service Role Key — только для серверных операций, НИКОГДА не в браузере
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# URL приложения (для редиректов после OAuth)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Что куда отправляется:**
> - `NEXT_PUBLIC_*` — доступны в браузере (anon ключ — это нормально, он публичный)
> - `SUPABASE_SERVICE_ROLE_KEY` — только на сервере, никогда не светите его во фронте

---

## 4. Деплой на Vercel

### 4.1 Подготовьте репозиторий на GitHub

```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ВАШ_ЛОГИН/link_app.git
git push -u origin main
```

### 4.2 Подключите к Vercel

1. Зайдите на [vercel.com](https://vercel.com) → **Sign Up with GitHub** (бесплатно).
2. **Add New Project → Import Git Repository** → выберите ваш репозиторий.
3. Vercel автоматически определит Next.js.
4. **Не нажимайте Deploy** пока не добавите переменные.

### 4.3 Добавьте переменные окружения

На странице конфигурации проекта в Vercel раскройте **Environment Variables** и добавьте:

| Переменная | Откуда брать | Окружения |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | URL вашего Vercel-домена (узнаете после деплоя) | Production |

### 4.4 Запустите деплой

Нажмите **Deploy**. Первый деплой занимает ~2 минуты.

После деплоя Vercel выдаст вам URL вида `https://link-app-xxx.vercel.app`.

**Обновите `NEXT_PUBLIC_APP_URL`:**  
Вернитесь в **Project Settings → Environment Variables** и укажите настоящий URL.

### 4.5 Настройте Supabase для продакшна

В Supabase: **Authentication → URL Configuration**

Добавьте ваш Vercel-домен:
- **Site URL:** `https://ваш-домен.vercel.app`
- **Redirect URLs:** `https://ваш-домен.vercel.app/auth/callback`

### 4.6 Деплой при каждом коммите

После настройки любой `git push origin main` автоматически деплоит обновления на Vercel.

---

## 5. Как пользоваться приложением

### Регистрация

1. Откройте приложение → нажмите **Регистрация**.
2. Введите email и пароль (минимум 6 символов).
3. Если включено подтверждение email — проверьте почту и нажмите ссылку.
4. После входа вы попадёте на главную страницу.

### Создание карточки

1. Нажмите кнопку **Добавить** (синяя кнопка, правый верхний угол).
2. Заполните поля:
   - **Название** — обязательное поле
   - **Ссылка** — URL на товар, статью, ресурс
   - **Место** — откуда товар (Ozon, AliExpress, любой текст)
   - **Цена** — сумма + выбор валюты
   - **Заметки** — любые пометки
   - **Теги** — введите тег и нажмите Enter
   - **Категория** — выберите из списка (нужно сначала создать)
   - **Изображение** — перетащите файл или кликните на зону загрузки
3. Нажмите **Создать**.

### Поиск и фильтры

На главной странице доступна панель фильтров:

| Фильтр | Что делает |
|---|---|
| Строка поиска | Полнотекстовый поиск по названию и заметкам |
| Выбор категории | Показывает только карточки выбранной категории |
| Сортировка | По дате добавления, изменения, названию или цене |
| Кнопка ↑↓ | Переключает порядок: убывание / возрастание |
| Кнопка архива | Переключает между активными и архивными карточками |

### Редактирование и удаление

На каждой карточке есть меню (⋯):
- **Редактировать** — откроет форму с заполненными данными
- **Удалить** — запросит подтверждение перед удалением
- **В архив / Восстановить** — убирает карточку из основного списка

### Экспорт данных

Перейдите в **Настройки** (боковое меню):
- **Скачать JSON** — полный архив всех карточек, категорий и изображений
- **Скачать CSV** — только карточки в табличном формате (открывается в Excel/Google Sheets)

---

## 6. Структура проекта

```
src/
├── app/
│   ├── api/
│   │   ├── cards/          # CRUD карточек
│   │   ├── categories/     # CRUD категорий
│   │   ├── export/         # GET /api/export → JSON-архив
│   │   └── docs/           # Swagger UI
│   ├── auth/
│   │   ├── signin/         # Страница входа
│   │   └── signup/         # Страница регистрации
│   ├── dashboard/          # Главная страница (карточки)
│   └── settings/           # Настройки и экспорт
├── components/
│   ├── cards/
│   │   ├── CardForm.tsx    # Форма создания/редактирования
│   │   ├── CardItem.tsx    # Отдельная карточка
│   │   └── CardList.tsx    # Список с виртуализацией
│   ├── layout/
│   │   └── AppLayout.tsx   # AppShell с шапкой и меню
│   └── upload/
│       └── ImageUploader.tsx  # Drag-and-drop загрузка изображений
├── contexts/
│   └── AuthContext.tsx     # Состояние авторизации
├── hooks/
│   ├── useCards.ts         # Загрузка карточек + infinite scroll
│   └── useCardsSearch.ts   # Управляемая пагинация с поиском
├── lib/
│   ├── export/
│   │   └── csv.ts          # convertCardsToCSV()
│   └── supabase/
│       ├── client.ts       # Клиент для браузера
│       ├── server.ts       # Клиент для API-роутов
│       └── storage.ts      # Загрузка/удаление изображений
└── types/
    └── database.ts         # TypeScript-типы (Card, Category, Image)

supabase/
└── migrations/
    ├── 001_initial_schema.sql   # Таблицы + RLS
    ├── 002_indexes.sql          # Индексы
    └── 003_search_function.sql  # Полнотекстовый поиск
```

---

## 7. API-документация

После запуска документация доступна по адресу:

- **Локально:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Продакшн:** `https://ваш-домен.vercel.app/api/docs`

Основные эндпоинты:

| Метод | URL | Описание |
|---|---|---|
| `GET` | `/api/cards` | Список карточек (поиск, фильтры, пагинация) |
| `POST` | `/api/cards` | Создать карточку |
| `GET` | `/api/cards/:id` | Получить карточку по ID |
| `PUT` | `/api/cards/:id` | Обновить карточку |
| `DELETE` | `/api/cards/:id` | Удалить карточку |
| `GET` | `/api/categories` | Список категорий |
| `POST` | `/api/categories` | Создать категорию |
| `PUT` | `/api/categories/:id` | Обновить категорию |
| `DELETE` | `/api/categories/:id` | Удалить категорию |
| `GET` | `/api/export` | Скачать JSON-архив всех данных |

Параметры `GET /api/cards`:

| Параметр | Тип | Описание |
|---|---|---|
| `page` | number | Страница (по умолчанию 1) |
| `limit` | number | Записей на странице (макс 100) |
| `search` | string | Полнотекстовый поиск |
| `category_id` | uuid | Фильтр по категории |
| `tag` | string | Фильтр по тегу |
| `archived` | boolean | true = только архивные |
| `sort` | string | Поле сортировки |
| `order` | asc/desc | Направление сортировки |

---

## 8. Частые проблемы

### `Missing Supabase environment variables`
Файл `.env` не создан или переменные не заполнены. Проверьте раздел [3](#3-переменные-окружения).

### Страница `/dashboard` перенаправляет на `/auth/signin`
Вы не вошли в систему. Нажмите **Войти** и введите данные.

### Изображения не загружаются
1. Проверьте, что bucket `card-images` создан в Supabase Storage.
2. Убедитесь, что bucket помечен как **Public**.
3. Проверьте наличие трёх политик доступа (раздел [2.4](#24-настройте-storage-хранилище-изображений)).

### При деплое на Vercel ошибка сборки
Проверьте, что все переменные окружения добавлены в Vercel (раздел [4.3](#43-добавьте-переменные-окружения)).

### Ошибка при регистрации: `Email not confirmed`
Отключите подтверждение email: Supabase → **Authentication → Settings → Enable email confirmations → OFF**.

### После `npm install` конфликты зависимостей
Используйте флаг:
```bash
npm install --legacy-peer-deps
```

### Ошибка SQL при запуске миграции
Убедитесь, что выполняете файлы в правильном порядке: `001` → `002` → `003`.

---

## Команды разработки

```bash
npm run dev          # Сервер разработки на localhost:3000
npm run build        # Сборка для продакшна
npm run start        # Запуск собранного проекта
npm run lint         # Проверка кода линтером
npm run storybook    # UI-компоненты в Storybook на localhost:6006
```

---

## Лицензия

MIT

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Storybook — UI-документация

Storybook используется в проекте для изолированной разработки, документирования и тестирования UI-компонентов.

### Запуск

```bash
npm run storybook
```

Storybook запустится на [http://localhost:6006](http://localhost:6006).  
Если порт занят — автоматически переключится на `6007`, `6008` и т.д.

### Сборка статической версии

```bash
npm run build-storybook
```

Результат будет в папке `storybook-static/` — готов для публикации (Chromatic, GitHub Pages, Vercel).

---

### Стек и конфигурация

| Параметр | Значение |
|---|---|
| Версия | Storybook 10 |
| Фреймворк | `@storybook/nextjs-vite` (Vite + Next.js) |
| Рендерер тестов | `@storybook/addon-vitest` |
| Аддоны | `addon-docs`, `addon-a11y`, `addon-onboarding`, `@chromatic-com/storybook` |

**Конфигурационные файлы:**

- `.storybook/main.ts` — настройка фреймворка, аддонов, путей к историям и статике
- `.storybook/preview.tsx` — глобальный декоратор: каждая история автоматически оборачивается в `MantineProvider` + `Notifications`; подключены стили `@mantine/core`, `@mantine/notifications`, `@mantine/dropzone`

---

### Где хранятся истории

Истории (`*.stories.tsx`) располагаются **рядом с компонентом** в `src/`:

```
src/
  components/
    cards/
      CardForm.tsx            ← компонент
      CardForm.stories.tsx    ← истории
  stories/                    ← дефолтные примеры Storybook (можно удалить)
```

Паттерн поиска: `src/**/*.stories.@(js|jsx|mjs|ts|tsx)` и `src/**/*.mdx`.

---

### Компоненты с историями

#### `Cards/CardForm`

Файл: `src/components/cards/CardForm.stories.tsx`

| История | Описание |
|---|---|
| **Empty** | Пустая форма создания карточки |
| **Filled** | Форма в режиме редактирования — все поля заполнены |
| **WithImages** | Форма с тремя загруженными изображениями (с кнопками удаления) |
| **Loading** | `play()` кликает Submit → кнопка переходит в спиннер (onSubmit висит бесконечно) |
| **WithValidationErrors** | `play()` кликает Submit на пустой форме → отображается ошибка «Название обязательно» |
| **NoCategories** | Список категорий пуст — блок Select скрыт |

---

### Как писать новые истории

1. Создай файл `ComponentName.stories.tsx` рядом с компонентом.
2. Используй импорты из `storybook/nextjs-vite` и `storybook/test`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within, expect } from 'storybook/test';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Section/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: { label: 'Кнопка' },
};

// С play-функцией (интерактивный тест):
export const Clicked: Story = {
  args: { label: 'Нажми' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    await expect(canvas.getByText('Нажато')).toBeInTheDocument();
  },
};
```

3. `MantineProvider` подключать не нужно — он уже добавлен глобально через `preview.tsx`.

---

### Запуск тестов (play-функции)

```bash
# Запусти Storybook в одном терминале:
npm run storybook

# В другом терминале запусти тесты:
npm run test-storybook
```

> `test-storybook` выполняет все `play()`-функции через Vitest + Playwright.
