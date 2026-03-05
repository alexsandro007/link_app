import { supabase } from './client';

// ── Константы ──────────────────────────────────────────────────────────────────

/** Имя bucket в Supabase Storage */
const BUCKET = 'card-images';

/** Максимальный размер файла: 5 МБ */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Разрешённые MIME-типы */
const ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
];

// ── Типы результата ────────────────────────────────────────────────────────────

export interface UploadSuccess {
  ok: true;
  /** Путь внутри bucket, например `abc123/1234567890_photo.jpg` */
  path: string;
  /** Публичный URL изображения */
  publicUrl: string;
}

export interface UploadError {
  ok: false;
  /** Код ошибки для программной обработки */
  code:
    | 'FILE_TOO_LARGE'
    | 'INVALID_MIME_TYPE'
    | 'UNAUTHENTICATED'
    | 'STORAGE_ERROR'
    | 'URL_ERROR';
  /** Человекочитаемое сообщение */
  message: string;
}

export type UploadResult = UploadSuccess | UploadError;

/**
 * Параметры загрузки.
 */
export interface UploadOptions {
  /**
   * ID карточки — используется как префикс пути.
   * Если не передан, используется только user_id.
   */
  cardId?: string;
  /**
   * Максимальный размер файла (байт). По умолчанию — 5 МБ.
   */
  maxSize?: number;
}

// ── Вспомогательные функции ────────────────────────────────────────────────────

/**
 * Возвращает расширение файла по MIME-типу.
 */
function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
  };
  return map[mime] ?? 'bin';
}

/**
 * Sanitize filename — оставляет только безопасные символы.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9._-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
    .slice(0, 80);
}

// ── Основная функция ───────────────────────────────────────────────────────────

/**
 * Загружает изображение `file` в Supabase Storage.
 *
 * Путь в bucket: `{userId}/{cardId?/}{timestamp}_{sanitizedName}.{ext}`
 *
 * @example
 * ```ts
 * const result = await uploadImageToSupabase(file, { cardId: card.id });
 * if (result.ok) {
 *   console.log(result.publicUrl); // https://...supabase.co/storage/v1/object/public/...
 * } else {
 *   console.error(result.code, result.message);
 * }
 * ```
 */
export async function uploadImageToSupabase(
  file: File,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const { cardId, maxSize = MAX_FILE_SIZE } = options;

  // ── Валидация размера ────────────────────────────────────────────────────────
  if (file.size > maxSize) {
    const limitMb = (maxSize / (1024 * 1024)).toFixed(0);
    const fileMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      ok: false,
      code: 'FILE_TOO_LARGE',
      message: `Файл слишком большой: ${fileMb} МБ. Максимальный размер — ${limitMb} МБ.`,
    };
  }

  // ── Валидация типа ───────────────────────────────────────────────────────────
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      ok: false,
      code: 'INVALID_MIME_TYPE',
      message: `Недопустимый тип файла: «${file.type}». Разрешены: JPEG, PNG, GIF, WebP, AVIF.`,
    };
  }

  // ── Проверка аутентификации ─────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      code: 'UNAUTHENTICATED',
      message: 'Требуется авторизация для загрузки файлов.',
    };
  }

  // ── Формирование пути ────────────────────────────────────────────────────────
  const timestamp = Date.now();
  const ext = extFromMime(file.type);
  const safeName = sanitizeFilename(
    // убираем расширение из оригинального имени — оно будет взято из MIME
    file.name.replace(/\.[^/.]+$/, ''),
  );
  const filename = `${timestamp}_${safeName}.${ext}`;
  const pathParts = [user.id, cardId, filename].filter(Boolean);
  const storagePath = pathParts.join('/');

  // ── Загрузка ─────────────────────────────────────────────────────────────────
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,       // не перезаписываем (путь уникален за счёт timestamp)
      cacheControl: '3600',
    });

  if (uploadError) {
    return {
      ok: false,
      code: 'STORAGE_ERROR',
      message: `Ошибка загрузки: ${uploadError.message}`,
    };
  }

  // ── Получение публичного URL ─────────────────────────────────────────────────
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  if (!urlData?.publicUrl) {
    return {
      ok: false,
      code: 'URL_ERROR',
      message: 'Файл загружен, но не удалось получить публичный URL.',
    };
  }

  return {
    ok: true,
    path: storagePath,
    publicUrl: urlData.publicUrl,
  };
}

// ── Удаление файла ────────────────────────────────────────────────────────────

export interface DeleteResult {
  ok: boolean;
  message?: string;
}

/**
 * Удаляет файл из Supabase Storage по его пути (`path` из `UploadSuccess`).
 */
export async function deleteImageFromSupabase(
  storagePath: string,
): Promise<DeleteResult> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);

  if (error) {
    return { ok: false, message: `Ошибка удаления: ${error.message}` };
  }

  return { ok: true };
}

// ── Хелпер для batch-удаления ──────────────────────────────────────────────────

/**
 * Удаляет несколько файлов за один запрос.
 * Возвращает пути, которые не удалось удалить (пустой массив = всё OK).
 */
export async function deleteImagesFromSupabase(
  storagePaths: string[],
): Promise<string[]> {
  if (storagePaths.length === 0) return [];

  const { error } = await supabase.storage.from(BUCKET).remove(storagePaths);

  if (error) {
    // Считаем, что все не удалились
    return storagePaths;
  }

  return [];
}
