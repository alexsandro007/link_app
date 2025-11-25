# Authentication Setup - Linkery

## Обзор

Реализована полная система аутентификации с использованием:
- **Next.js 16** (App Router)
- **Supabase Auth** (@supabase/supabase-js)
- **TypeScript**
- **Mantine UI** (компоненты интерфейса + встроенная валидация форм)

## Структура файлов

```
src/
├── lib/
│   └── supabase/
│       ├── client.ts          # Клиентский Supabase client
│       └── server.ts          # Серверный Supabase client
├── contexts/
│   └── AuthContext.tsx        # React Context для аутентификации
├── components/
│   ├── Providers.tsx          # Mantine и Auth провайдеры
│   └── ProtectedRoute.tsx     # HOC для защиты страниц
├── app/
│   ├── layout.tsx             # Root layout с провайдерами
│   ├── page.tsx               # Главная страница
│   ├── auth/
│   │   ├── signin/
│   │   │   └── page.tsx       # Страница входа
│   │   └── signup/
│   │       └── page.tsx       # Страница регистрации
│   └── dashboard/
│       └── page.tsx           # Защищенная страница (пример)
└── proxy.ts                   # Next.js proxy (ранее middleware) для защиты маршрутов
```

## Настройка

### 1. Установка зависимостей

Все необходимые пакеты уже установлены:
```bash
npm install @supabase/supabase-js @mantine/core @mantine/hooks @mantine/form @mantine/notifications
```

### 2. Переменные окружения

Создайте файл `.env.local` на основе `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key (опционально)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Получите эти значения в [Supabase Dashboard](https://app.supabase.com/):
1. Создайте новый проект
2. Перейдите в Settings → API
3. Скопируйте `URL` и `anon public` ключ

### 3. Настройка Supabase Auth

В Supabase Dashboard:
1. Перейдите в Authentication → Settings
2. Настройте Email Auth (включен по умолчанию)
3. Опционально: добавьте OAuth провайдеры (Google, GitHub и т.д.)
4. Настройте Redirect URLs: добавьте `http://localhost:3000/auth/callback` для локальной разработки

## Компоненты

### AuthProvider

**Файл:** `src/contexts/AuthContext.tsx`

React Context, который управляет состоянием аутентификации:

```typescript
const { user, session, loading, signIn, signUp, signOut } = useAuth();
```

**Возможности:**
- `user` - текущий пользователь (User | null)
- `session` - текущая сессия (Session | null)
- `loading` - состояние загрузки (boolean)
- `signIn(email, password)` - вход в систему
- `signUp(email, password, metadata?)` - регистрация
- `signOut()` - выход из системы
- Автоматическая загрузка сессии при старте приложения
- Подписка на изменения состояния аутентификации

### Страницы аутентификации

#### Sign In (`/auth/signin`)
- Форма входа с встроенной валидацией Mantine
- Mantine UI компоненты
- Обработка ошибок с понятными сообщениями
- Ссылки на регистрацию и восстановление пароля

#### Sign Up (`/auth/signup`)
- Форма регистрации с подтверждением пароля
- Валидация email (минимум 2 символа + домен с точкой)
- Валидация пароля (минимум 6 символов, буквы + цифры)
- Проверка совпадения паролей
- Уведомление об успешной регистрации
- Автоматическое перенаправление после регистрации

### Защита маршрутов

#### HOC `withAuth`

**Файл:** `src/components/ProtectedRoute.tsx`

Используйте для защиты отдельных страниц:

```typescript
// Защищенная страница - требует авторизации
export default withAuth(DashboardPage);

// Страница только для неавторизованных
export default withAuth(SignInPage, { requireAuth: false });

// Кастомное перенаправление
export default withAuth(ProfilePage, { redirectTo: '/custom-signin' });
```

#### Proxy (Next.js 16)

**Файл:** `src/proxy.ts`

⚠️ **Важно:** В Next.js 16 `middleware.ts` переименован в `proxy.ts`

Защищает целые группы маршрутов на уровне сервера:

```typescript
// Защищенные маршруты (требуют авторизации)
const protectedRoutes = ['/dashboard', '/profile', '/settings'];

// Маршруты только для неавторизованных
const authRoutes = ['/auth/signin', '/auth/signup'];
```

**Поведение:**
- Неавторизованные пользователи → `/auth/signin`
- Авторизованные на страницах auth → `/`
- Сохранение целевого URL в query параметре `redirect`

## Использование

### Базовый пример

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@mantine/core';

export default function MyComponent() {
  const { user, signOut } = useAuth();

  if (!user) {
    return <div>Пожалуйста, войдите</div>;
  }

  return (
    <div>
      <p>Привет, {user.email}!</p>
      <Button onClick={() => signOut()}>Выйти</Button>
    </div>
  );
}
```

### Защищенная страница

```typescript
'use client';

import { withAuth } from '@/components/ProtectedRoute';

function ProfilePage() {
  return <div>Профиль пользователя</div>;
}

export default withAuth(ProfilePage);
```

### Серверный компонент

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ServerProtectedPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/signin');
  }

  return <div>Защищенный серверный компонент</div>;
}
```

## API Reference

### useAuth Hook

```typescript
interface AuthContextType {
  user: User | null;              // Текущий пользователь
  session: Session | null;         // Текущая сессия
  loading: boolean;                // Состояние загрузки
  
  // Вход (returns { error })
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  
  // Регистрация (returns { error })
  signUp: (
    email: string, 
    password: string, 
    metadata?: UserMetadata
  ) => Promise<{ error: AuthError | null }>;
  
  // Выход
  signOut: () => Promise<void>;
}
```

### withAuth Options

```typescript
interface WithAuthOptions {
  redirectTo?: string;      // Куда перенаправить (default: '/auth/signin')
  requireAuth?: boolean;    // Требуется ли авторизация (default: true)
}
```

## Тестирование

Для тестирования аутентификации:

1. Запустите dev сервер:
```bash
npm run dev
```

2. Откройте http://localhost:3000

3. Тестовый сценарий:
   - Перейдите на `/auth/signup` → зарегистрируйтесь
   - Проверьте email для подтверждения (если включено в Supabase)
   - Войдите через `/auth/signin`
   - Попробуйте зайти на `/dashboard` (защищенная страница)
   - Выйдите из системы

## Следующие шаги

- [ ] Добавить страницу восстановления пароля (`/auth/forgot-password`)
- [ ] Реализовать OAuth провайдеры (Google, GitHub)
- [ ] Добавить обновление профиля пользователя
- [ ] Настроить email templates в Supabase
- [ ] Добавить unit и e2e тесты
- [ ] Реализовать rate limiting для защиты от брутфорса

## Troubleshooting

### "Missing Supabase environment variables"
→ Проверьте `.env.local` и перезапустите dev сервер

### Ошибка при входе/регистрации
→ Проверьте настройки Auth в Supabase Dashboard
→ Убедитесь, что Email Auth включен

### Proxy не работает (Next.js 16)
→ Убедитесь, что используете `proxy.ts` (не `middleware.ts`)
→ Функция должна называться `proxy`, а не `middleware`
→ Проверьте, что `proxy.ts` находится в корне `src/`
→ Проверьте `config.matcher` в proxy

### Бесконечный редирект
→ Проверьте логику в middleware и withAuth
→ Убедитесь, что protectedRoutes и authRoutes не пересекаются

## Особенности реализации

### Валидация форм
Используется **встроенная валидация Mantine** (`@mantine/form`):
- Более легкий вес (нет дополнительных зависимостей)
- Нативная интеграция с компонентами Mantine
- Простая и понятная настройка
- Автоматическое отображение ошибок

### Next.js 16 изменения
- `middleware.ts` → `proxy.ts`
- Функция `middleware()` → `proxy()`
- Все остальное работает так же

## Ресурсы

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Proxy (Middleware)](https://nextjs.org/docs/messages/middleware-to-proxy)
- [Mantine UI](https://mantine.dev/)
- [Mantine Form Validation](https://mantine.dev/form/validation/)
