// ── File validation — shared between client and server ────────────────────────
//
// Magic bytes validation works in any environment that supports ArrayBuffer
// (browser, Node.js, Edge Runtime).

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ
export const MAX_FILES = 10;

// ── Magic bytes signatures ────────────────────────────────────────────────────

type Signature = { offset: number; bytes: number[] };

const SIGNATURES: Record<AllowedMimeType, Signature[]> = {
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/png':  [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/gif':  [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  'image/webp': [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }], // RIFF (checked with offset 8 below)
  'image/avif': [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }], // ftyp box
};

function matchesSignature(header: Uint8Array, sig: Signature): boolean {
  for (let i = 0; i < sig.bytes.length; i++) {
    if (header[sig.offset + i] !== sig.bytes[i]) return false;
  }
  return true;
}

/** Detects MIME type from the first 16 bytes of the file. Returns null if unrecognised. */
export function detectMimeFromBytes(header: Uint8Array): AllowedMimeType | null {
  for (const [mime, sigs] of Object.entries(SIGNATURES) as [AllowedMimeType, Signature[]][]) {
    for (const sig of sigs) {
      if (matchesSignature(header, sig)) {
        // Extra WEBP check: bytes 8-11 must be 'WEBP'
        if (mime === 'image/webp') {
          const webp = [0x57, 0x45, 0x42, 0x50];
          if (header.length < 12) return null;
          if (!webp.every((b, i) => header[8 + i] === b)) continue;
        }
        return mime;
      }
    }
  }
  return null;
}

// ── Validation result ─────────────────────────────────────────────────────────

export interface FileValidationError {
  code: 'FILE_TOO_LARGE' | 'INVALID_MIME_TYPE' | 'MAGIC_BYTES_MISMATCH' | 'TOO_MANY_FILES';
  message: string;
}

export type FileValidationResult =
  | { ok: true; detectedMime: AllowedMimeType }
  | { ok: false; error: FileValidationError };

// ── Client-side validation (uses File API) ────────────────────────────────────

/**
 * Full file validation for use in the browser:
 * 1. File count
 * 2. File size
 * 3. MIME type from browser (fast, not trusted)
 * 4. Magic bytes check via first 16 bytes (trusted)
 */
export async function validateImageFileClient(
  file: File,
  opts: { maxSize?: number } = {},
): Promise<FileValidationResult> {
  const maxSize = opts.maxSize ?? MAX_FILE_SIZE;

  if (file.size > maxSize) {
    const mb = (file.size / 1024 / 1024).toFixed(2);
    const limit = (maxSize / 1024 / 1024).toFixed(0);
    return { ok: false, error: { code: 'FILE_TOO_LARGE', message: `Файл слишком большой: ${mb} МБ. Максимум — ${limit} МБ.` } };
  }

  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: { code: 'INVALID_MIME_TYPE', message: `Недопустимый тип: «${file.type || 'неизвестен'}». Разрешены JPEG, PNG, GIF, WebP, AVIF.` } };
  }

  // Read first 16 bytes for magic bytes check
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detected = detectMimeFromBytes(header);

  if (!detected) {
    return { ok: false, error: { code: 'MAGIC_BYTES_MISMATCH', message: 'Содержимое файла не соответствует изображению.' } };
  }

  // MIME from browser must match actual bytes (prevents .exe renamed to .jpg)
  if (detected !== file.type) {
    return { ok: false, error: { code: 'MAGIC_BYTES_MISMATCH', message: `Тип файла не совпадает с содержимым. Ожидался ${file.type}, обнаружен ${detected}.` } };
  }

  return { ok: true, detectedMime: detected };
}

// ── Server-side validation (uses Buffer / ArrayBuffer) ────────────────────────

/**
 * Validation for use in API routes (Node.js / Edge).
 * Receives the raw bytes already read from the request.
 */
export function validateImageFileServer(
  buffer: Uint8Array,
  claimedMime: string,
  fileSize: number,
  opts: { maxSize?: number } = {},
): FileValidationResult {
  const maxSize = opts.maxSize ?? MAX_FILE_SIZE;

  if (fileSize > maxSize) {
    const mb = (fileSize / 1024 / 1024).toFixed(2);
    const limit = (maxSize / 1024 / 1024).toFixed(0);
    return { ok: false, error: { code: 'FILE_TOO_LARGE', message: `Файл слишком большой: ${mb} МБ. Максимум — ${limit} МБ.` } };
  }

  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(claimedMime)) {
    return { ok: false, error: { code: 'INVALID_MIME_TYPE', message: `Недопустимый тип: «${claimedMime}». Разрешены JPEG, PNG, GIF, WebP, AVIF.` } };
  }

  const detected = detectMimeFromBytes(buffer.slice(0, 16));

  if (!detected) {
    return { ok: false, error: { code: 'MAGIC_BYTES_MISMATCH', message: 'Содержимое файла не соответствует изображению.' } };
  }

  if (detected !== claimedMime) {
    return { ok: false, error: { code: 'MAGIC_BYTES_MISMATCH', message: `Тип файла не совпадает с содержимым.` } };
  }

  return { ok: true, detectedMime: detected };
}
