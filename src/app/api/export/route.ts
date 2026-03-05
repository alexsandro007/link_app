import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ApiError, Card, Category, Image } from '@/types/database';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExportArchive {
  meta: {
    exported_at: string;
    app: string;
    version: string;
    user_id: string;
    counts: {
      categories: number;
      cards: number;
      images: number;
    };
  };
  categories: Category[];
  cards: Card[];
  images: Image[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fetch all rows from a paginated Supabase query without a limit cap. */
async function fetchAll<T>(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  table: 'cards' | 'categories' | 'images',
  userId: string,
): Promise<T[]> {
  const PAGE = 1000;
  const result: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      throw new Error(`Failed to fetch ${table}: ${error.message}`);
    }

    if (!data || data.length === 0) break;

    result.push(...(data as T[]));

    if (data.length < PAGE) break;
    from += PAGE;
  }

  return result;
}

// ── GET /api/export ───────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/export:
 *   get:
 *     summary: Export all user data as a JSON archive
 *     description: >
 *       Returns a downloadable JSON file containing all cards, categories and
 *       images belonging to the authenticated user. The response includes a
 *       `Content-Disposition` header so browsers trigger a file download.
 *     tags:
 *       - Export
 *     security:
 *       - supabaseAuth: []
 *     responses:
 *       200:
 *         description: JSON archive file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meta:
 *                   type: object
 *                 categories:
 *                   type: array
 *                 cards:
 *                   type: array
 *                 images:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();

  // ── Auth check ──────────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Fetch all user data ─────────────────────────────────────────────────────
  let categories: Category[];
  let cards: Card[];
  let images: Image[];

  try {
    [categories, cards, images] = await Promise.all([
      fetchAll<Category>(supabase, 'categories', user.id),
      fetchAll<Card>(supabase, 'cards', user.id),
      fetchAll<Image>(supabase, 'images', user.id),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json<ApiError>({ error: message }, { status: 500 });
  }

  // ── Build archive ───────────────────────────────────────────────────────────
  const archive: ExportArchive = {
    meta: {
      exported_at: new Date().toISOString(),
      app: 'Linkery',
      version: '1.0',
      user_id: user.id,
      counts: {
        categories: categories.length,
        cards: cards.length,
        images: images.length,
      },
    },
    categories,
    cards,
    images,
  };

  // ── Respond with download headers ───────────────────────────────────────────
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `linkery-export-${date}.json`;

  return new NextResponse(JSON.stringify(archive, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Prevent proxies / CDNs from caching personal data
      'Cache-Control': 'no-store',
    },
  });
}
