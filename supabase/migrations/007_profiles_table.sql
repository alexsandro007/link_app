-- ── 007_profiles_table.sql ────────────────────────────────────────────────────
-- Таблица профилей пользователей (расширение auth.users)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Таблица profiles ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nickname         TEXT        CHECK (char_length(nickname) <= 50),
  avatar_url       TEXT,
  avatar_type      TEXT        CHECK (avatar_type IN ('upload', 'preset')) DEFAULT 'preset',
  avatar_preset_id INTEGER,
  phone            TEXT        CHECK (char_length(phone) <= 30),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индекс для быстрого поиска по никнейму
CREATE INDEX IF NOT EXISTS profiles_nickname_idx ON public.profiles (nickname);

-- ── Триггерная функция: создаём профиль при регистрации ───────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── Триггер на auth.users ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свой профиль
CREATE POLICY "profiles: select own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Пользователь обновляет только свой профиль
CREATE POLICY "profiles: update own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Пользователь может вставить только свою строку (на случай если триггер не отработал для старых пользователей)
CREATE POLICY "profiles: insert own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Удаление происходит каскадно при удалении из auth.users (ON DELETE CASCADE)
-- RLS на DELETE не нужен, т.к. пользователь удаляется через Admin API
