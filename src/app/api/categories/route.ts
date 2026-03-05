import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { CreateCategoryBody, ApiError, PaginatedResponse, Category } from '@/types/database';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Генерирует slug из произвольного текста. */
function generateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яёa-z]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'category';
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateCreateCategory(body: unknown): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const b = body as Record<string, unknown>;

  if (!b.name || typeof b.name !== 'string') {
    errors.name = 'Name is required';
  } else if ((b.name as string).trim().length < 1) {
    errors.name = 'Name cannot be empty';
  } else if ((b.name as string).length > 100) {
    errors.name = 'Name must be 100 characters or less';
  }

  if (b.color !== undefined && b.color !== null) {
    if (typeof b.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(b.color as string)) {
      errors.color = 'Color must be a valid hex code (e.g. #ff5733)';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ── GET /api/categories ───────────────────────────────────────────────────────

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
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('categories')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json<ApiError>({ error: 'Failed to fetch categories', details: error.message }, { status: 500 });
  }

  return NextResponse.json<PaginatedResponse<Category>>({
    data: data ?? [],
    count: count ?? 0,
    page,
    limit,
  });
}

// ── POST /api/categories ──────────────────────────────────────────────────────

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

  const { valid, errors } = validateCreateCategory(body);
  if (!valid) {
    return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 422 });
  }

  const { name, description, color, icon, is_public } = body as CreateCategoryBody;

  // Auto-generate unique slug from name
  const base = generateSlug(name);
  let slug = base;
  let attempt = 0;
  while (true) {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    attempt++;
    slug = `${base}-${attempt}`;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      name: name.trim(),
      slug,
      description: description ?? null,
      color: color ?? null,
      icon: icon ?? null,
      is_public: is_public ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiError>({ error: 'Failed to create category', details: error.message }, { status: 500 });
  }

  return NextResponse.json<Category>(data, { status: 201 });
}
