import { supabase } from './client';

// ── Константы ──────────────────────────────────────────────────────────────────

/** Имя bucket в Supabase Storage */
const BUCKET = 'card-images';

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

// ── Server-proxied upload ──────────────────────────────────────────────────────

/**
 * Загружает изображение через `POST /api/upload` с серверной валидацией magic bytes.
 */
export async function uploadViaServer(
  file: File,
  opts: { cardId?: string } = {},
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  if (opts.cardId) form.append('cardId', opts.cardId);

  let res: Response;
  try {
    res = await fetch('/api/upload', { method: 'POST', body: form });
  } catch {
    return { ok: false, code: 'STORAGE_ERROR', message: 'Ошибка сети при загрузке файла.' };
  }

  if (res.status === 401) return { ok: false, code: 'UNAUTHENTICATED', message: 'Требуется авторизация.' };

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const code =
      res.status === 413 ? 'FILE_TOO_LARGE' as const :
      res.status === 415 ? 'INVALID_MIME_TYPE' as const :
      'STORAGE_ERROR' as const;
    return { ok: false, code, message: json.error ?? `Ошибка загрузки (${res.status})` };
  }

  return { ok: true, path: json.path, publicUrl: json.publicUrl };
}

