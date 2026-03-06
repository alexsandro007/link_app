import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateImageFileServer, MAX_FILE_SIZE } from '@/lib/validateImageFile';
import type { ApiError } from '@/types/database';

// ── Constants ─────────────────────────────────────────────────────────────────

const BUCKET = 'card-images';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name
    .replace(/\.[^/.]+$/, '')          // strip extension
    .replace(/[^a-z0-9._-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
    .slice(0, 80);
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/gif':  'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

// ── POST /api/upload ──────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/upload:
 *   post:
 *     summary: Upload a card image
 *     description: >
 *       Accepts multipart/form-data with a single `file` field.
 *       Server validates size, MIME type and magic bytes before uploading
 *       to Supabase Storage.
 *     tags:
 *       - Upload
 *     security:
 *       - supabaseAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               cardId:
 *                 type: string
 *                 description: Optional card UUID used as path prefix in Storage
 *     responses:
 *       201:
 *         description: Upload success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 path:
 *                   type: string
 *                 publicUrl:
 *                   type: string
 *       400:
 *         description: Missing file or validation error
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 *       415:
 *         description: Unsupported media type / magic bytes mismatch
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse multipart/form-data ───────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json<ApiError>({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const fileEntry = formData.get('file');
  if (!(fileEntry instanceof File)) {
    return NextResponse.json<ApiError>({ error: 'Missing "file" field' }, { status: 400 });
  }

  const cardId = formData.get('cardId');
  const cardIdStr = typeof cardId === 'string' && cardId ? cardId : undefined;

  // ── Reject oversized before reading into memory ─────────────────────────────
  // Content-Length can be spoofed but this stops accidental large uploads early
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_FILE_SIZE + 8192 /* form overhead */) {
    return NextResponse.json<ApiError>({ error: 'File too large' }, { status: 413 });
  }

  // ── Read file bytes ─────────────────────────────────────────────────────────
  const arrayBuffer = await fileEntry.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // ── Server-side file validation (magic bytes) ───────────────────────────────
  const validation = validateImageFileServer(buffer, fileEntry.type, fileEntry.size);

  if (!validation.ok) {
    const status =
      validation.error.code === 'FILE_TOO_LARGE'        ? 413 :
      validation.error.code === 'INVALID_MIME_TYPE'     ? 415 :
      validation.error.code === 'MAGIC_BYTES_MISMATCH'  ? 415 : 400;

    return NextResponse.json<ApiError>({ error: validation.error.message }, { status });
  }

  // ── Build storage path ──────────────────────────────────────────────────────
  const ext      = EXT[validation.detectedMime];
  const safeName = sanitizeFilename(fileEntry.name);
  const filename = `${Date.now()}_${safeName}.${ext}`;
  const parts    = [user.id, cardIdStr, filename].filter(Boolean) as string[];
  const storagePath = parts.join('/');

  // ── Upload to Supabase Storage ──────────────────────────────────────────────
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: validation.detectedMime,
      upsert: false,
      cacheControl: '3600',
    });

  if (uploadError) {
    return NextResponse.json<ApiError>(
      { error: `Storage error: ${uploadError.message}` },
      { status: 500 },
    );
  }

  // ── Public URL ──────────────────────────────────────────────────────────────
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  if (!urlData?.publicUrl) {
    return NextResponse.json<ApiError>({ error: 'Uploaded but failed to get public URL' }, { status: 500 });
  }

  return NextResponse.json({ path: storagePath, publicUrl: urlData.publicUrl }, { status: 201 });
}
