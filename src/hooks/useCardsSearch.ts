import { useState, useEffect, useCallback, useRef } from 'react';
import type { Card } from '@/types/database';

// ── Типы ──────────────────────────────────────────────────────────────────────

export interface UseCardsSearchParams {
  /** Поисковый запрос (debounced 300 мс) */
  q?: string;
  /** ID категории */
  categoryId?: string | null;
  /** Массив тегов. API принимает один тег — передаём первый. */
  tags?: string[];
  /** Текущая страница (1-based, управляется снаружи) */
  page?: number;
  /** Размер страницы */
  limit?: number;
  /** Сортировка */
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'price';
  sortOrder?: 'asc' | 'desc';
  /** Показывать архивные карточки */
  archived?: boolean;
  /** Пауза запросов (например, пока пользователь не залогинен) */
  enabled?: boolean;
  /** Задержка дебаунса для поля q (мс). По умолчанию 300. */
  debounceMs?: number;
}

export interface UseCardsSearchResult {
  /** Список карточек текущей страницы */
  data: Card[];
  /** Идёт первая загрузка (data пустая) */
  loading: boolean;
  /** Идёт перезагрузка при смене фильтров (data — предыдущие данные) */
  fetching: boolean;
  /** Текст ошибки */
  error: string | null;
  /** Есть ли следующая страница */
  hasMore: boolean;
  /** Общее число карточек по текущим фильтрам */
  total: number;
  /** Суммарное число страниц */
  pageCount: number;
  /** Принудительный рефетч без сброса данных */
  refetch: () => void;
}

// ── Вспомогательная: сборка URL ────────────────────────────────────────────────

interface QueryParams {
  q?: string;
  categoryId?: string | null;
  tags?: string[];
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: string;
  archived?: boolean;
}

function buildUrl(p: QueryParams): string {
  const params = new URLSearchParams();

  params.set('page', String(p.page));
  params.set('limit', String(p.limit));

  if (p.q && p.q.trim())          params.set('search', p.q.trim());
  if (p.categoryId)               params.set('category_id', p.categoryId);
  // API принимает один тег; передаём первый из массива
  if (p.tags && p.tags.length > 0) params.set('tag', p.tags[0]);
  if (p.sortBy)                   params.set('sort_by', p.sortBy);
  if (p.sortOrder)                params.set('sort_order', p.sortOrder);
  // По умолчанию скрываем архивные
  params.set('archived', String(p.archived ?? false));

  return `/api/cards?${params.toString()}`;
}

// ── Дефолты ───────────────────────────────────────────────────────────────────

const DEFAULT_PAGE    = 1;
const DEFAULT_LIMIT   = 20;
const DEFAULT_DEBOUNCE = 300;

// ── Хук ───────────────────────────────────────────────────────────────────────

/**
 * `useCardsSearch` — управляемая пагинация с авто-рефетчем при смене фильтров.
 *
 * Отличие от `useCards` (infinite scroll):
 * - `page` приходит снаружи и меняется вручную (кнопки «Назад»/«Вперёд»).
 * - При смене любого фильтра данные обновляются автоматически.
 * - Поле `q` дебаунсится, чтобы не слать запрос при каждом нажатии клавиши.
 *
 * @example
 * ```tsx
 * const [page, setPage] = useState(1);
 * const { data, loading, hasMore, total } = useCardsSearch({
 *   q: searchText,
 *   categoryId: selectedCategory,
 *   tags: selectedTags,
 *   page,
 *   limit: 24,
 * });
 * ```
 */
export function useCardsSearch({
  q,
  categoryId,
  tags,
  page        = DEFAULT_PAGE,
  limit       = DEFAULT_LIMIT,
  sortBy,
  sortOrder,
  archived,
  enabled     = true,
  debounceMs  = DEFAULT_DEBOUNCE,
}: UseCardsSearchParams = {}): UseCardsSearchResult {
  const [data, setData]       = useState<Card[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Дебаунсированное значение поискового запроса
  const [debouncedQ, setDebouncedQ] = useState(q);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), debounceMs);
    return () => clearTimeout(timer);
  }, [q, debounceMs]);

  // Флаг «первый запрос» — отличает начальную загрузку от рефетча
  const isFirstFetch = useRef(true);

  // AbortController для отмены in-flight запросов при быстрой смене параметров
  const abortRef = useRef<AbortController | null>(null);

  // Счётчик запросов — игнорируем ответы устаревших запросов
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Отменяем предыдущий запрос
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchId = ++fetchIdRef.current;

    if (isFirstFetch.current) {
      setLoading(true);
    } else {
      setFetching(true);
    }
    setError(null);

    try {
      const url = buildUrl({
        q: debouncedQ,
        categoryId,
        tags,
        page,
        limit,
        sortBy,
        sortOrder,
        archived,
      });

      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        data: Card[];
        count: number;
        page: number;
        limit: number;
      };

      // Пришёл устаревший ответ — игнорируем
      if (fetchId !== fetchIdRef.current) return;

      setData(json.data ?? []);
      setTotal(json.count ?? 0);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      if (fetchId !== fetchIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      setData([]);
      setTotal(0);
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
        setFetching(false);
        isFirstFetch.current = false;
      }
    }
  }, [enabled, debouncedQ, categoryId, tags, page, limit, sortBy, sortOrder, archived]);

  // Авто-рефетч при изменении любого параметра (включая дебаунсированный q)
  useEffect(() => {
    fetchData();
    // Явный список зависимостей — fetchData уже включает все параметры
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // Вычисляемые поля
  const hasMore    = total > page * limit;
  const pageCount  = Math.max(1, Math.ceil(total / limit));

  return {
    data,
    loading,
    fetching,
    error,
    hasMore,
    total,
    pageCount,
    refetch: fetchData,
  };
}
