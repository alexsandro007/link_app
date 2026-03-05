import type { Card } from '@/types/database';

// ── Типы ──────────────────────────────────────────────────────────────────────

export interface CsvOptions {
  /** Разделитель столбцов. По умолчанию — запятая (RFC 4180). */
  delimiter?: ',' | ';' | '\t';
  /** Перенос строк: CRLF (Windows, RFC 4180) или LF (Unix). */
  lineEnding?: '\r\n' | '\n';
  /** Разделитель внутри поля `tags`. По умолчанию `|`. */
  tagsSeparator?: string;
  /** Включить BOM (нужен для корректного открытия в Excel). По умолчанию `true`. */
  bom?: boolean;
}

// ── Константы ─────────────────────────────────────────────────────────────────

/** Заголовки столбцов в том же порядке, что и COLUMNS. */
const HEADERS = [
  'id',
  'title',
  'url',
  'place',
  'price',
  'currency',
  'description',
  'notes',
  'tags',
  'category_id',
  'image_url',
  'favicon_url',
  'is_public',
  'is_archived',
  'click_count',
  'created_at',
  'updated_at',
] as const;

type Column = (typeof HEADERS)[number];

// ── Вспомогательные функции ───────────────────────────────────────────────────

/**
 * Экранирует значение поля по правилам RFC 4180:
 * — если значение содержит разделитель, кавычки или переносы строк — оборачивает в `"…"`.
 * — внутренние `"` удваиваются: `"` → `""`.
 * — `null` / `undefined` → пустая строка.
 */
function escapeField(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // Нужно ли оборачивать в кавычки?
  const needsQuoting =
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r');

  if (!needsQuoting) return str;

  // Удвоение внутренних кавычек + обёртка
  return '"' + str.replace(/"/g, '""') + '"';
}

/**
 * Преобразует массив тегов в строку.
 * Если сам тег содержит разделитель тегов — экранирует его обратным слешем.
 */
function escapeTags(tags: string[], tagsSep: string): string {
  return tags
    .map((t) => t.replace(tagsSep, '\\' + tagsSep))
    .join(tagsSep);
}

/** Возвращает значение нужного столбца для карточки. */
function getColumnValue(card: Card, col: Column, tagsSep: string): unknown {
  switch (col) {
    case 'tags':
      return escapeTags(card.tags ?? [], tagsSep);
    case 'is_public':
      return card.is_public ? 'true' : 'false';
    case 'is_archived':
      return card.is_archived ? 'true' : 'false';
    default:
      return card[col as keyof Card] ?? '';
  }
}

// ── Основная функция ──────────────────────────────────────────────────────────

/**
 * Конвертирует массив карточек в строку CSV.
 *
 * @example
 * const csv = convertCardsToCSV(cards);
 * // Скачать в браузере:
 * const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
 * const url = URL.createObjectURL(blob);
 *
 * @example
 * // Точка с запятой (Excel на русской локали), без BOM:
 * const csv = convertCardsToCSV(cards, { delimiter: ';', bom: false });
 */
export function convertCardsToCSV(cards: Card[], options: CsvOptions = {}): string {
  const {
    delimiter = ',',
    lineEnding = '\r\n',
    tagsSeparator = '|',
    bom = true,
  } = options;

  const rows: string[] = [];

  // Строка заголовков
  rows.push(HEADERS.map((h) => escapeField(h, delimiter)).join(delimiter));

  // Строки данных
  for (const card of cards) {
    const row = HEADERS.map((col) =>
      escapeField(getColumnValue(card, col, tagsSeparator), delimiter),
    ).join(delimiter);
    rows.push(row);
  }

  const body = rows.join(lineEnding);

  // UTF-8 BOM нужен для корректного открытия в Excel без потери кириллицы
  return bom ? '\uFEFF' + body : body;
}

// ── Утилита для скачивания в браузере ─────────────────────────────────────────

/**
 * Инициирует скачивание CSV-файла в браузере.
 * Вызывать только в клиентском коде (не на сервере).
 *
 * @example
 * downloadCardsAsCsv(cards, 'linkery-export-2026-03-04.csv');
 */
export function downloadCardsAsCsv(
  cards: Card[],
  filename = 'linkery-cards.csv',
  options?: CsvOptions,
): void {
  const csv = convertCardsToCSV(cards, options);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Освободить память через небольшую задержку
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
