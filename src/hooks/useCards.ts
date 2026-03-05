import { useState, useCallback, useRef, useEffect } from 'react';
import type { Card } from '@/types/database';

// ── Типы ──────────────────────────────────────────────────────────────────────

export type SortField = 'created_at' | 'updated_at' | 'title' | 'price';
export type SortOrder = 'asc' | 'desc';

export interface UseCardsFilters {
  q?: string;
  categoryId?: string | null;
  tags?: string[];
  sortBy?: SortField;
  sortOrder?: SortOrder;
  archived?: boolean;
  limit?: number;
}

export interface UseCardsResult {
  cards: Card[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  loadMore: () => void;
  refresh: () => void;
}

// ── Утилиты ───────────────────────────────────────────────────────────────────

function buildQuery(filters: UseCardsFilters, page: number): string {
  const params = new URLSearchParams();

  params.set('page', String(page));
  params.set('limit', String(filters.limit ?? 20));

  if (filters.q)          params.set('search', filters.q);
  if (filters.categoryId) params.set('category_id', filters.categoryId);
  if (filters.archived !== undefined) params.set('archived', String(filters.archived));
  if (filters.tags?.length) params.set('tag', filters.tags[0]);
  if (filters.sortBy)    params.set('sort_by', filters.sortBy);
  if (filters.sortOrder) params.set('sort_order', filters.sortOrder);

  return `/api/cards?${params.toString()}`;
}

// ── Хук ───────────────────────────────────────────────────────────────────────

/**
 * Хук для загрузки карточек с поддержкой infinite scroll.
 *
 * @example
 * const { cards, loading, hasMore, loadMore } = useCards({ q: 'next.js', limit: 24 });
 */
export function useCards(filters: UseCardsFilters = {}): UseCardsResult {
  const [cards, setCards]           = useState<Card[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Сохраняем ссылку на текущие фильтры (без ре-рендера при изменении)
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Флаг для предотвращения race conditions
  const fetchIdRef = useRef(0);

  const fetchPage = useCallback(async (targetPage: number, reset: boolean) => {
    const fetchId = ++fetchIdRef.current;

    if (reset) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const url = buildQuery(filtersRef.current, targetPage);
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const json = await res.json() as { data: Card[]; count: number; page: number; limit: number };

      // Игнорируем устаревший запрос
      if (fetchId !== fetchIdRef.current) return;

      const limit = filtersRef.current.limit ?? 20;

      setTotal(json.count);
      setPage(targetPage);
      setHasMore(json.data.length === limit && targetPage * limit < json.count);
      setCards((prev) => reset ? json.data : [...prev, ...json.data]);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  const refresh = useCallback(() => {
    setCards([]);
    fetchPage(1, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    fetchPage(page + 1, false);
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  // ── Авто-рефетч при изменении фильтров ────────────────────────────────────
  // Сравниваем сериализованные фильтры — сбрасываем и перезагружаем с 1 страницы
  const prevFiltersKey = useRef<string>('');

  useEffect(() => {
    const key = JSON.stringify({
      q:          filters.q,
      categoryId: filters.categoryId,
      tags:       filters.tags,
      sortBy:     filters.sortBy,
      sortOrder:  filters.sortOrder,
      archived:   filters.archived,
      limit:      filters.limit,
    });

    if (key === prevFiltersKey.current) return;
    prevFiltersKey.current = key;

    setCards([]);
    setPage(1);
    fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.q,
    filters.categoryId,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(filters.tags),
    filters.sortBy,
    filters.sortOrder,
    filters.archived,
    filters.limit,
  ]);

  return { cards, loading, loadingMore, error, hasMore, total, loadMore, refresh };
}
