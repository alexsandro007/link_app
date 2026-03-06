import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeUpdatePayload } from '@/lib/sanitize';
import type { UpdateCardBody, ApiError, Card } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

type RouteContext = { params: Promise<{ id: string }> };

// ── Storage helpers ───────────────────────────────────────────────────────────

const BUCKET = 'card-images';

/**
 * Извлекает путь внутри bucket из публичного Storage URL.
 * Формат URL: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
function extractStoragePath(publicUrl: string): string | null {
  try {
    const marker = `/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(publicUrl.slice(idx + marker.length));
  } catch {
    return null;
  }
}

/** Удаляет файл из Storage. Ошибки не бросает — логирует. */
async function deleteStorageFile(supabase: SupabaseClient, publicUrl: string): Promise<void> {
  const path = extractStoragePath(publicUrl);
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error('Storage delete error:', error.message);
}

// ── GET /api/cards/[id] ───────────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json<ApiError>({ error: 'Card not found' }, { status: 404 });
  }

  return NextResponse.json<Card>(data);
}

// ── PUT /api/cards/[id] ───────────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const b = body as UpdateCardBody;

  // Validate URL if provided and non-empty
  if (b.url !== undefined && b.url !== null && b.url !== '') {
    try {
      new URL(b.url);
    } catch {
      return NextResponse.json({ error: 'Validation failed', fields: { url: 'Must be a valid URL' } }, { status: 422 });
    }
  }

  // Verify category belongs to user if provided
  if (b.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', b.category_id)
      .eq('user_id', user.id)
      .single();

    if (!cat) {
      return NextResponse.json<ApiError>({ error: 'Category not found' }, { status: 404 });
    }
  }

  // Build update payload — only include defined fields
  const updates: Record<string, unknown> = {};
  const allowed: (keyof UpdateCardBody)[] = [
    'url', 'title', 'description', 'notes', 'place', 'price', 'currency',
    'image_url', 'image_urls', 'favicon_url', 'tags', 'category_id', 'is_public', 'is_archived',
  ];
  for (const key of allowed) {
    if (b[key] !== undefined) updates[key] = b[key];
  }

  // Синхронизируем image_url ↔ image_urls
  if ('image_urls' in updates) {
    const urls = updates.image_urls as string[];
    updates.image_url = urls[0] ?? null;
  } else if ('image_url' in updates) {
    // Если передан только image_url — перестраиваем массив
    const single = updates.image_url as string | null;
    updates.image_urls = single ? [single] : [];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json<ApiError>({ error: 'No fields to update' }, { status: 400 });
  }

  sanitizeUpdatePayload(updates, ['title', 'description', 'notes', 'place']);

  // Читаем старые URLs до обновления
  const { data: oldCard } = await supabase
    .from('cards')
    .select('image_url, image_urls')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  const { data, error } = await supabase
    .from('cards')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json<ApiError>({ error: 'Card not found or update failed', details: error?.message }, { status: 404 });
  }

  // Удаляем из Storage URL-ы, которых больше нет в новом массиве
  if (oldCard && 'image_urls' in updates) {
    const newUrls = new Set((updates.image_urls as string[]) ?? []);
    const removed = (oldCard.image_urls ?? (oldCard.image_url ? [oldCard.image_url] : [])).filter(
      (u: string) => !newUrls.has(u)
    );
    for (const url of removed) await deleteStorageFile(supabase, url);
  } else if (
    oldCard?.image_url &&
    'image_url' in updates &&
    oldCard.image_url !== (data as Card).image_url
  ) {
    await deleteStorageFile(supabase, oldCard.image_url);
  }

  return NextResponse.json<Card>(data);
}

// ── DELETE /api/cards/[id] ────────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  // Удаляем все изображения из Storage при удалении карточки
  const { data: cardToDelete, error: fetchError } = await supabase
    .from('cards')
    .select('image_url, image_urls')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !cardToDelete) {
    return NextResponse.json<ApiError>({ error: 'Card not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json<ApiError>({ error: 'Failed to delete card', details: error.message }, { status: 500 });
  }

  // Удаляем все изображения из Storage
  const allUrls: string[] = cardToDelete.image_urls?.length
    ? cardToDelete.image_urls
    : cardToDelete.image_url
    ? [cardToDelete.image_url]
    : [];
  for (const fileUrl of allUrls) await deleteStorageFile(supabase, fileUrl);

  return new NextResponse(null, { status: 204 });
}
