import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiError, ProfileResponse, UpdateProfileBody } from '@/types/database';

// ── Admin client (service_role — обходит RLS) ─────────────────────────────────

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase admin credentials');
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ── GET /api/profile ──────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  // Данные профиля
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    return NextResponse.json<ApiError>({ error: profileError.message }, { status: 500 });
  }

  // Статистика (один запрос через функцию count)
  const [
    { count: totalCards },
    { count: archivedCards },
    { count: publicCards },
    { count: totalCategories },
    { data: lastCardRow },
  ] = await Promise.all([
    supabase.from('cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_archived', true),
    supabase.from('cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_public', true),
    supabase.from('categories').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('cards').select('updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1),
  ]);

  const response: ProfileResponse = {
    id: user.id,
    email: user.email ?? '',
    nickname: profile?.nickname ?? null,
    avatar_url: profile?.avatar_url ?? null,
    avatar_type: profile?.avatar_type ?? null,
    avatar_preset_id: profile?.avatar_preset_id ?? null,
    phone: profile?.phone ?? null,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at ?? null,
    stats: {
      total_cards: totalCards ?? 0,
      archived_cards: archivedCards ?? 0,
      public_cards: publicCards ?? 0,
      total_categories: totalCategories ?? 0,
      last_activity: lastCardRow?.[0]?.updated_at ?? null,
    },
  };

  return NextResponse.json(response);
}

// ── PUT /api/profile ──────────────────────────────────────────────────────────

const ALLOWED_FIELDS = ['nickname', 'phone', 'avatar_url', 'avatar_type', 'avatar_preset_id'] as const;

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: UpdateProfileBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Разрешаем только whitelist-поля
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = (body as Record<string, unknown>)[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json<ApiError>({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Валидация nickname
  if (updates.nickname !== undefined && updates.nickname !== null) {
    if (typeof updates.nickname !== 'string' || (updates.nickname as string).length > 50) {
      return NextResponse.json<ApiError>({ error: 'Nickname must be a string of max 50 characters' }, { status: 422 });
    }
    updates.nickname = (updates.nickname as string).trim() || null;
  }

  // Валидация phone
  if (updates.phone !== undefined && updates.phone !== null) {
    if (typeof updates.phone !== 'string' || (updates.phone as string).length > 30) {
      return NextResponse.json<ApiError>({ error: 'Phone must be a string of max 30 characters' }, { status: 422 });
    }
  }

  // Валидация avatar_type
  if (updates.avatar_type !== undefined && !['upload', 'preset', null].includes(updates.avatar_type as string | null)) {
    return NextResponse.json<ApiError>({ error: 'avatar_type must be "upload" or "preset"' }, { status: 422 });
  }

  updates.updated_at = new Date().toISOString();

  // Используем обычный server-клиент: RLS-политики «update own» и «insert own»
  // уже разрешают пользователю обновлять/создавать свою строку.
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...updates })
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiError>({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ── DELETE /api/profile — удаление аккаунта ───────────────────────────────────

export async function DELETE(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // 1. Удаляем файлы из Storage (bucket card-images)
  try {
    const { data: storageFiles } = await supabase.storage.from('card-images').list(userId, { limit: 1000 });
    if (storageFiles && storageFiles.length > 0) {
      const paths = storageFiles.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from('card-images').remove(paths);
    }

    // Удаляем аватар если загружен
    const { data: avatarFiles } = await supabase.storage.from('avatars').list(userId, { limit: 100 }).catch(() => ({ data: null }));
    if (avatarFiles && avatarFiles.length > 0) {
      const avatarPaths = avatarFiles.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from('avatars').remove(avatarPaths);
    }
  } catch {
    // Storage cleanup failure — продолжаем удаление аккаунта
  }

  // 2. Данные в БД удалятся каскадно (cards, categories, profiles — все имеют ON DELETE CASCADE)
  // 3. Удаляем пользователя из auth.users через Admin API
  try {
    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return NextResponse.json<ApiError>({ error: `Failed to delete user: ${deleteError.message}` }, { status: 500 });
    }
  } catch {
    return NextResponse.json<ApiError>({ error: 'Admin client unavailable' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
