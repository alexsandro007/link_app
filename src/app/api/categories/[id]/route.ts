import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeUpdatePayload } from '@/lib/sanitize';
import type { UpdateCategoryBody, ApiError, Category } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/categories/[id] ──────────────────────────────────────────────────

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
    .from('categories')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json<ApiError>({ error: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json<Category>(data);
}

// ── PUT /api/categories/[id] ──────────────────────────────────────────────────

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

  const b = body as UpdateCategoryBody;

  // Validate slug if provided
  if (b.slug !== undefined) {
    if (!/^[a-z0-9-]+$/.test(b.slug)) {
      return NextResponse.json(
        { error: 'Validation failed', fields: { slug: 'Slug may only contain lowercase letters, numbers, and hyphens' } },
        { status: 422 }
      );
    }

    // Check uniqueness (excluding current record)
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('slug', b.slug)
      .neq('id', id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Validation failed', fields: { slug: 'Slug already exists' } }, { status: 422 });
    }
  }

  // Validate color if provided
  if (b.color !== undefined && b.color !== null) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(b.color)) {
      return NextResponse.json(
        { error: 'Validation failed', fields: { color: 'Color must be a valid hex code (e.g. #ff5733)' } },
        { status: 422 }
      );
    }
  }

  // Build update payload
  const updates: Record<string, unknown> = {};
  const allowed: (keyof UpdateCategoryBody)[] = ['name', 'slug', 'description', 'color', 'icon', 'is_public'];
  for (const key of allowed) {
    if (b[key] !== undefined) updates[key] = b[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json<ApiError>({ error: 'No fields to update' }, { status: 400 });
  }

  sanitizeUpdatePayload(updates, ['name', 'description', 'icon']);

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json<ApiError>({ error: 'Category not found or update failed', details: error?.message }, { status: 404 });
  }

  return NextResponse.json<Category>(data);
}

// ── DELETE /api/categories/[id] ───────────────────────────────────────────────

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

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json<ApiError>({ error: 'Failed to delete category', details: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
