# Развёрнутое описание проекта

## 1. Общее резюме

**Название (рабочее):** Keepify
**Стек:** Next.js + TypeScript, Mantine UI, Supabase (Postgres + Auth + Storage), Storybook (UI), Swagger / OpenAPI (API), Vercel (деплой)
**Идея:** удобное, приватное и современное приложение для быстрой фиксации «находок»: товаров, обзоров, ссылок, скриншотов, заметок. Пользователь создаёт карточки (card) с полями `title`, `link`, `place`, `price`, `notes`, `images`, присваивает категории/теги, фильтрует и организует коллекции.

Ценность: минимальное время на «сохранить и вернуться», хорошая организация, мобильность и безопасность данных (всё онлайн — Supabase).

---

## 2. Цели проекта

* UX: обеспечить сохранение информации в 1–3 клика.
* Организация: гибкая система категорий и тегов.
* Доступность: мобильная адаптация и доступность (a11y).
* Документация: Swagger для API, Storybook для UI.
* Надёжность: безопасная авторизация, хранение файлов, экспорт/импорт.
* Развиваемость: лёгкое добавление фичей (публичные коллекции, рекомендации, PWA).

---

## 3. Целевая аудитория

* активные онлайн-покупатели;
* люди, собирающие референсы (гейминг, техника, дизайн);
* профессионалы (фриланс, исследователи), которым важно сохранять ссылки/ресурсы;
* все, кто хочет хранить «избранное» структурированно.

---

## 4. Ключевые пользовательские сценарии (User Journeys)

1. Регистрация → создать категорию «Игры» → добавить карточку с ссылкой на обзор и скриншотом.
2. Быстрое сохранение: пользователь копирует ссылку из браузера → ctrl+v в форму → сохранить.
3. Поиск: поиск по названию/заметке/тегу → фильтрация по категории/цене/дате.
4. Экспорт: выгрузить все карточки в JSON/CSV.
5. Поделиться (опция): сделать коллекцию публичной и выдать ссылку.

---

## 5. Функциональные требования (полный список)

### Базовый (MVP)

* Регистрация/вход (Supabase Auth).
* Создание/просмотр/редактирование/удаление карточки (CRUD).
* Поля карточки: `title`, `link`, `place`, `price` (amount + currency), `notes`, `images[]`, `tags[]`, `category_id`.
* Загрузка изображений в Supabase Storage с предпросмотром и прогрессом.
* CRUD категорий (user-scoped).
* Список карточек: пагинация / бесконечный скролл / сортировка (по дате, цене, title).
* Поиск (full-text по title/notes) и фильтры (категория, теги, цена, дата).
* Swagger / OpenAPI документация маршрутов API.
* Storybook с историями (stories) для всех ключевых UI-компонентов.
* CI: линт, тесты, билд; деплой в Vercel.

### Расширенные (после MVP)

* OAuth (Google, GitHub) через Supabase.
* Поделиться коллекцией (public read-only link).
* Drag & drop упорядочивание карточек.
* Автоматический парсер метаданных по ссылке (og:title, price, image).
* PWA / офлайн-кеш.
* История изменений карточки (audit log).
* Уведомления / напоминания.

---

## 6. Нефункциональные требования

* Производительность: ответы API для основных операций — быстрые (оптимизация запросов, индексы).
* Масштабируемость: данные в облаке (Supabase) — нет зависимости от локальных машин.
* Безопасность: RLS в Supabase, HTTPS, ограничение типов/размеров файлов, шифрование секретов.
* Доступность: соответствие базовым правилам WCAG (семантика, фокус, контраст).
* Тестируемость: unit, integration, e2e, визуальные тесты Storybook.

---

## 7. Архитектура (высокоуровнево)

* **Frontend:** Next.js (App Router), TypeScript, Mantine UI; UI-компоненты в Storybook.
* **Backend / DB:** Supabase (Postgres) + Supabase Auth + Storage; API через Next.js API routes или server-side calls к Supabase.
* **Документация:** OpenAPI (swagger.json) генерируется и доступна на `/api/docs`.
* **CI/CD:** GitHub Actions (tests + linters + build) → Vercel (деплой).
* **Monitoring/Logging:** Sentry (опция), серверные логи в Vercel.

---

## 8. Модель данных (Supabase / PostgreSQL) — схема таблиц (SQL)

Ниже — рекомендованные таблицы и поля.

**categories**

```sql
id uuid primary key default gen_random_uuid();
user_id uuid references auth.users(id) not null;
name text not null;
color text default '#CCCCCC';
created_at timestamptz default now();
updated_at timestamptz default now();
```

**cards**

```sql
id uuid primary key default gen_random_uuid();
user_id uuid references auth.users(id) not null;
category_id uuid references categories(id);
title text not null;
link text;
place text;
price numeric; -- хранить в минимальном виде; currency отдельно при необходимости
currency text default 'USD';
notes text;
tags text[] default '{}';
is_public boolean default false;
created_at timestamptz default now();
updated_at timestamptz default now();
```

**images**

```sql
id uuid primary key default gen_random_uuid();
card_id uuid references cards(id) on delete cascade;
user_id uuid references auth.users(id);
path text not null; -- путь в Supabase Storage
filename text;
width int;
height int;
size int;
created_at timestamptz default now();
```

Добавь необходимые индексы:

* `CREATE INDEX ON cards (user_id);`
* `CREATE INDEX ON cards USING gin (tags);`
* `CREATE INDEX ON cards USING gin (to_tsvector('russian', title || ' ' || coalesce(notes, '')));`

Рекомендация: включи RLS (Row Level Security) и политики, позволяющие пользователю видеть/редактировать только свои записи.

---

## 9. REST API (основные эндпойнты и контракт)

Документируй в OpenAPI/Swagger — ниже примеры маршрутов и краткое описание.

* `POST /api/auth/signup` — регистрация (или использовать Supabase Auth прямо на фронтенде).
* `POST /api/auth/login` — (если нужен кастом).
* `GET /api/cards` — список карточек (query: q, category, tags, sort, page, limit).
* `POST /api/cards` — создать карточку (multipart/form-data для изображений / или сначала загрузить в Storage и передать path).
* `GET /api/cards/{id}` — получить карточку.
* `PUT /api/cards/{id}` — обновить.
* `DELETE /api/cards/{id}` — удалить.
* `GET /api/categories` — список категорий.
* `POST /api/categories` — создать.
* `PUT /api/categories/{id}` — обновить.
* `DELETE /api/categories/{id}` — удалить.

Все эндпойнты защищены — доступ только после аутентификации (RLS + Supabase session).

---

## 10. Swagger / OpenAPI

* Храни `openapi.json` в репозитории или генерируй автоматически.
* Подключи `swagger-ui` на `/api/docs`.
* Описывай схемы `Card`, `Category`, `Image`, `User`.
* Пиши примеры запросов и ответов, указывай коды ошибок.
* Подключи возможность «Try it out» — это удобно для тестов и демонстрации.

---

## 11. Storybook (UI-документация)

* Настрой Storybook с поддержкой Next.js и Mantine (themes).
* Для каждого визуального компонента делай 3–5 stories: базовое состояние, заполненное, loading, error, пустое.
* Подключи addon-ы: Controls, Docs, Accessibility, Storybook Test Runner.
* Запусти визуальные тесты (snapshots / Chromatic — опционально).

---

## 12. Безопасность и RLS (Supabase)

* Включи Row Level Security на таблицах `cards`, `categories`, `images`.
* Политики: `allow select/insert/update/delete where auth.uid() = user_id`.
* Ограничь публичный доступ: изображения могут иметь публичные или приватные bucket-пути — реши политику.
* Ограничение загрузок: проверка mime-type и размера на фронте и бэке.

---

## 13. Тестирование

* Unit tests: Jest + React Testing Library для компонентов.
* Integration tests: проверка поведения форм, API-интеграция с моками Supabase.
* E2E: Cypress — сценарии регистрации, создания карточки, загрузки изображения, фильтрации.
* Storybook Test Runner для визуальной регрессии.
* CI: запуск тестов и линтера в GitHub Actions.

---

## 14. Деплой и CI/CD

* Настроить Vercel: подключить репозиторий, задать переменные окружения: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (только для серверных задач, не в клиенте).
* GitHub Actions: on push — run lint, tests, build; на merge в main — Vercel автоматически деплоит.
* Настроить backup/exports в Supabase (periodic export DB or SQL dump — опция).

---

## 15. Acceptance Criteria — подробный чеклист (ничего не утаено)

* [ ] Регистрация и логин работают (email + password).
* [ ] Пользователь может создать категорию (name + color).
* [ ] Пользователь может создать карточку с минимум `title` и `link`.
* [ ] Можно загрузить изображение и оно сохраняется в Supabase Storage, привязано к карточке.
* [ ] Карточка видна только владельцу (RLS работает).
* [ ] Поиск по title/notes возвращает корректные результаты.
* [ ] Фильтры по категории/тегам/цене работают корректно.
* [ ] Swagger UI доступен и покрывает все публичные API.
* [ ] Storybook отображает все ключевые компоненты и состояния.
* [ ] Unit и e2e тесты для критичных сценариев проходят в CI.
* [ ] Приложение успешно деплоится в Vercel и работает по HTTPS.

---

# 16. Полный план разработки — шаги (по шагам, без времени)

Ниже шаги разработки — для каждого шага даю развёрнутое описание и **готовые промты для ИИ**, которые можно вставить в ChatGPT / Copilot / Codex, чтобы сгенерировать код, тесты, документацию или схемы.

> **Важно:** не запрашивай подтверждений — выполняй шаги последовательно. Если хочешь — можешь копировать промты в чат ИИ и сразу получать артефакты.

---

## Шаг 0 — Подготовка репозитория и окружения

**Описание:** инициализация репозитория, базовая конфигурация TypeScript, ESLint, Prettier, Husky (pre-commit), настройка .env.example, подключение Vercel + Supabase проект.

**Действия:**

* Создать репозиторий на GitHub.
* Инициализировать Next.js + TypeScript.
* Настроить ESLint + Prettier, Husky, lint-staged.
* Создать `.env.example` с переменными: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.
* Подключить проект в Vercel и Supabase (создать проект).

**Промты для ИИ:**

1. "Сгенерируй `package.json` и команды для проекта Next.js TypeScript с ESLint, Prettier и Husky. Укажи необходимые devDependencies и скрипты для lint, format и precommit."
2. "Напиши `README.md` секцию «Установка и запуск локально» для проекта Next.js + Supabase, включая настройку `.env` и команду для запуска."
3. "Сгенерируй конфигурацию ESLint и Prettier, подходящую для Next.js + TypeScript + React — включи правила для accessibility и best practices."

---

## Шаг 1 — Аутентификация (Supabase Auth) и базовая навигация

**Описание:** подключение Supabase Auth на фронтэнде, обработка сессий, защита маршрутов, базовый Layout (Header, Sidebar, Footer).

**Действия:**

* Установить `@supabase/supabase-js`.
* Реализовать провайдер `AuthProvider` (React Context) для сессий.
* Реализовать страницы SignUp / SignIn / ForgotPassword.
* Защитить маршруты (Redirect to /auth если не авторизован).
* Header: логин, профиль, кнопка «Создать карточку».

**Промты для ИИ:**

1. "Напиши React-контекст `AuthProvider` для Next.js на TypeScript, использующий `@supabase/supabase-js`, который хранит сессию, предоставляет `user`, `signIn`, `signOut`, `signUp` и автологин при загрузке страницы."
2. "Сгенерируй страницу `pages/auth/signin.tsx` с формой входа, валидацией zod и интеграцией Supabase Auth. Подключи Mantine UI компоненты."
3. "Напиши middleware/HighOrderComponent для защиты страниц — если пользователь не авторизован, перенаправить на /auth/signin."

---

## Шаг 2 — База данных и политика безопасности (Supabase RLS)

**Описание:** создание таблиц `cards`, `categories`, `images`; настройка RLS и политик; индексы для поиска.

**Действия:**

* Создать SQL-скрипты для таблиц (см. выше).
* Включить RLS и добавить политики: `SELECT/INSERT/UPDATE/DELETE` только для `auth.uid() = user_id`.
* Настроить индексы (GIN для tags, tsvector для поискового индекса).

**Промты для ИИ:**

1. "Сгенерируй SQL-скрипт для Supabase, который создаёт таблицы `categories`, `cards`, `images` с RLS и политиками, чтобы только владелец мог читать/писать свои записи. Добавь индексы для full-text поиска по title и notes."
2. "Напиши SQL-запрос для создания GIN-индекса по массиву тегов `tags` и tsvector индекса для поиска по `title || ' ' || COALESCE(notes, '')`."

---

## Шаг 3 — CRUD API для карточек и категорий + Swagger

**Описание:** API-эндпойнты (Next.js API Routes или server actions) для операций с карточками и категориями; генерация OpenAPI спецификации и Swagger UI.

**Действия:**

* Реализовать API-роуты: GET/POST/PUT/DELETE.
* Подключить серверную валидацию (zod).
* Создать `openapi.json` и endpoint `/api/docs` (swagger-ui-react).
* Сделать примеры запросов/ответов.

**Промты для ИИ:**

1. "Напиши Next.js API route `POST /api/cards` на TypeScript: валидация входа через zod, проверка сессии Supabase, сохранение записи в таблице `cards` и возврат созданной сущности."
2. "Сгенерируй `openapi.json` для основных маршрутов `cards` и `categories`, опиши схемы `Card`, `Category`, `Image` и добавь примеры запросов и ответов."
3. "Напиши компонент `/pages/api/docs.tsx`, который рендерит Swagger UI (`swagger-ui-react`) и подгружает `openapi.json`."

---

## Шаг 4 — UI: страницы и ключевые компоненты (Mantine + Storybook)

**Описание:** проектирование и реализация UI — список карточек, CardForm, CardDetail, CategoryManager, ImageUploader; интеграция в Storybook.

**Действия:**

* Создать дизайн-систему темы Mantine (light/dark).
* Реализовать компонент `CardForm` (создание/редактирование) с валидацией, превью изображений.
* Реализовать `CardList` с пагинацией/инфинит-скроллом.
* Сделать `CategorySidebar` — создание/фильтрация.
* Добавить все компоненты в Storybook с stories: basic, filled, loading, error.

**Промты для ИИ:**

1. "Сгенерируй компонент `CardForm.tsx` на React + TypeScript с Mantine: поля title, link, place, price, notes, tags input, upload images (drag & drop), превью и валидация через zod. Сделай форму пригодной для reuse в create/edit."
2. "Напиши story для `CardForm` в Storybook: story `Empty`, `Filled`, `WithImages`, `Loading`."
3. "Сгенерируй компонент `CardList` с виртуализированной отрисовкой (react-window или similar), карточной сеткой и поддержкой infinite scroll, используя Mantine Card."

---

## Шаг 5 — Загрузка файлов (Supabase Storage) и привязка к карточке

**Описание:** загрузка изображений в Supabase Storage, получение публичных/приватных URL, обработка ошибок и ограничений размера/типов.

**Действия:**

* Настроить bucket в Supabase (private/public решение).
* Реализовать upload на фронтенде с прогрессом.
* На бекенде (если нужно) создать превью или миниатюры (опция через edge function / serverless).
* Сохранить мета-инфу в таблицу `images`.

**Промты для ИИ:**

1. "Напиши функцию `uploadImageToSupabase(file)` на TypeScript, которая загружает файл в Supabase Storage, возвращает путь и publicURL. Обработай ошибки и лимит 5MB."
2. "Сгенерируй компонент `ImageUploader` с drag-and-drop, превью и индикатором прогресса загрузки."

---

## Шаг 6 — Поиск, фильтры, сортировка

**Описание:** реализовать полнотекстовый поиск и комбинированные фильтры.

**Действия:**

* На уровне Postgres настроить tsvector и функцию обновления (trigger) OR выполнять полнотекстовый запрос динамически.
* Реализовать UI-панель фильтров (категории, теги, price range, date).
* Добавить debounce в поисковую строку.

**Промты для ИИ:**

1. "Напиши SQL-запрос для поиска карточек по `q` (search term) с использованием `to_tsvector` и ранжированием результатов, с фильтром по `user_id`."
2. "Сгенерируй React-hook `useCards({ q, categoryId, tags, page, limit })`, который вызывает API и возвращает data, loading, error, hasMore."

---

## Шаг 7 — Экспорт/Импорт (JSON/CSV) и миграции данных

**Описание:** функционал экспорта базы пользователя в JSON/CSV и импорт данных (валидация).

**Действия:**

* Экспорт: собираем данные user -> zip/JSON/CSV.
* Импорт: валидация структуры, мэппинг категорий/тегов.
* UI: страница Settings → Export / Import.

**Промты для ИИ:**

1. "Напиши API-роут `GET /api/export` который возвращает JSON-архив всех карточек и категорий пользователя. Подключи авторизацию и защиту."
2. "Сгенерируй функцию `convertCardsToCSV(cards)` на TypeScript, возвращающую строку CSV с корректной экранировкой."

---

## Шаг 8 — Тесты (unit / integration / e2e) и проверка качества

**Описание:** покрытие критичных сценариев тестами.

**Действия:**

* Unit: компоненты и утилиты (Jest).
* Integration: формы + серверная валидация (msw для моков).
* E2E: Cypress сценарии (регистрация -> создать карточку -> фильтр -> удалить).
* Storybook Test Runner для визуального контроля.

**Промты для ИИ:**

1. "Напиши Jest-тест для `CardForm` который проверяет: валидацию обязательного поля title, вызов onSubmit с корректными данными."
2. "Создай Cypress e2e тест: регистрируемся, создаём категорию, добавляем карточку с изображением, проверяем, что карточка отображается в списке."

---

## Шаг 9 — Документация: Swagger + Storybook + README

**Описание:** финализировать и опубликовать документации.

**Действия:**

* Обновить `openapi.json` и Swagger UI.
* Убедиться, что Storybook покрывает все компоненты.
* Написать подробный README: установка, env, деплой, описание архитектуры, ER-диаграмма, примеры запросов.

**Промты для ИИ:**

1. "Сгенерируй файл README.md для GitHub: описание проекта, стек, переменные окружения, инструкции по запуску локально, команды CI и деплоя на Vercel."
2. "Сгенерируй OpenAPI-подсхемы (YAML/JSON) для `Card` и `Category` с примерами и ошибками."

---

## Шаг 10 — Деплой и продакшн-готовность

**Описание:** финальные проверки перед публичным деплоем, мониторинг, резервные копии, политика бэкапа.

**Действия:**

* Настройки переменных окружения в Vercel.
* Проверка CORS, security headers.
* Настройка backup/export в Supabase.
* Настройка Sentry / performance мониторинга (опция).

**Промты для ИИ:**

1. "Напиши инструкцию для Vercel: какие env vars добавить и почему, как настроить Preview и Production."
2. "Подготовь checklist pre-deploy: security headers, CSP, RLS verification, max file sizes, backups."

---

# 17. Полезные шаблоны промтов (универсальные)

Можешь использовать эти промты как «шаблоны» для генерации кода/документации:

* Архитектурный / README промт:
  `"Составь подробный README для проекта Keepify (Next.js + TypeScript + Supabase + Mantine), включи архитектуру, env переменные, команды для разработки, тестирования и деплоя на Vercel. Отдельно — краткий FAQ."`

* Компонентный промт:
  `"Напиши компонент CardForm на TypeScript + React + Mantine с zod валидацией. Поддержка: title, link, price, notes, tags (input + suggestion), image uploader (drag&drop). Добавь prop types и пример использования."`

* API-промт:
  `"Сгенерируй Next.js API route POST /api/cards на TypeScript: проверка сессии Supabase, валидация zod, сохранение в таблицу cards, обработка загрузки изображений (если файл передан как path). Верни JSON с объектом карточки."`

* SQL-промт:
  `"Сгенерируй SQL-скрипт для Supabase: создание таблиц cards, categories, images с RLS и политиками, а также индексы (GIN для tags и tsvector для поиска). Включи triggers для updated_at."`

* Тестовый промт:
  `"Напиши Cypress e2e сценарий: register -> create category -> create card (with image) -> search by title -> delete card. Используй описательные комментарии."`

---

# 18. Итоговый чеклист запуска проекта (what to do before first release)

* [ ] Репозиторий и CI настроены.
* [ ] Supabase проект: таблицы, RLS, buckets созданы.
* [ ] Auth рабочий (email/password).
* [ ] CRUD карточек и категорий реализованы.
* [ ] Загрузка изображений работает.
* [ ] Swagger и Storybook доступны.
* [ ] Тесты проходят в CI.
* [ ] Деплой в Vercel проверен.
* [ ] README и документация обновлены.
