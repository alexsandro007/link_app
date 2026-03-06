import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizeOptional, sanitizeTags } from '@/lib/sanitize';
import type { CreateCardBody, ApiError, PaginatedResponse, Card } from '@/types/database';

// ── Validation ────────────────────────────────────────────────────────────────

function validateCreateCard(body: unknown): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const b = body as Record<string, unknown>;

  if (b.url !== undefined && b.url !== null && b.url !== '') {
    if (typeof b.url !== 'string') {
      errors.url = 'URL must be a string';
    } else {
      try {
        new URL(b.url);
      } catch {
        errors.url = 'URL must be a valid URL';
      }
    }
  }

  if (!b.title || typeof b.title !== 'string') {
    errors.title = 'Title is required';
  } else if ((b.title as string).trim().length < 1) {
    errors.title = 'Title cannot be empty';
  } else if ((b.title as string).length > 500) {
    errors.title = 'Title must be 500 characters or less';
  }

  if (b.description !== undefined && b.description !== null && typeof b.description !== 'string') {
    errors.description = 'Description must be a string';
  }

  if (b.notes !== undefined && b.notes !== null && typeof b.notes !== 'string') {
    errors.notes = 'Notes must be a string';
  }

  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags)) {
      errors.tags = 'Tags must be an array';
    } else if ((b.tags as unknown[]).some((t) => typeof t !== 'string')) {
      errors.tags = 'Each tag must be a string';
    }
  }

  if (b.is_public !== undefined && typeof b.is_public !== 'boolean') {
    errors.is_public = 'is_public must be a boolean';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ── GET /api/cards ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const offset = (page - 1) * limit;
  const categoryId = searchParams.get('category_id');
  const archived = searchParams.get('archived');
  const search = searchParams.get('search');
  const tag = searchParams.get('tag');
  const allowedSortFields = ['created_at', 'updated_at', 'title', 'price'] as const;
  type SortField = typeof allowedSortFields[number];
  const rawSortBy = searchParams.get('sort_by') ?? 'created_at';
  const sortBy: SortField = (allowedSortFields as readonly string[]).includes(rawSortBy)
    ? (rawSortBy as SortField)
    : 'created_at';
  const ascending = searchParams.get('sort_order') === 'asc';

  let query = supabase
    .from('cards')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order(sortBy, { ascending, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (categoryId) query = query.eq('category_id', categoryId);
  if (archived !== null) query = query.eq('is_archived', archived === 'true');
  else query = query.eq('is_archived', false);
  if (tag) query = query.contains('tags', [tag]);
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json<ApiError>({ error: 'Failed to fetch cards', details: error.message }, { status: 500 });
  }

  return NextResponse.json<PaginatedResponse<Card>>({
    data: data ?? [],
    count: count ?? 0,
    page,
    limit,
  });
}

// ── POST /api/cards ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const { valid, errors } = validateCreateCard(body);
  if (!valid) {
    return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 422 });
  }

  const {
    url,
    title,
    description,
    notes,
    place,
    price,
    currency,
    image_url,
    image_urls,
    favicon_url,
    tags,
    category_id,
    is_public,
  } = body as CreateCardBody;

  // Итоговый массив и первичный URL
  const resolvedImageUrls: string[] = Array.isArray(image_urls) ? image_urls : (image_url ? [image_url] : []);
  const resolvedImageUrl = resolvedImageUrls[0] ?? null;

  // Verify category belongs to user if provided
  if (category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', category_id)
      .eq('user_id', user.id)
      .single();

    if (!cat) {
      return NextResponse.json<ApiError>({ error: 'Category not found' }, { status: 404 });
    }
  }

  const { data, error } = await supabase
    .from('cards')
    .insert({
      user_id: user.id,
      url: url || null,
      title: sanitizeText(title),
      description: sanitizeOptional(description),
      notes: sanitizeOptional(notes),
      place: sanitizeOptional(place),
      price: price ?? null,
      currency: currency ?? 'USD',
      image_url: resolvedImageUrl,
      image_urls: resolvedImageUrls,
      favicon_url: favicon_url ?? null,
      tags: tags ? sanitizeTags(tags) : [],
      category_id: category_id ?? null,
      is_public: is_public ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiError>({ error: 'Failed to create card', details: error.message }, { status: 500 });
  }

  return NextResponse.json<Card>(data, { status: 201 });
}
