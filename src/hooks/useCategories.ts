import { useState, useCallback, useEffect } from 'react';
import type { Category, PaginatedResponse } from '@/types/database';

export interface UseCategoriesResult {
  categories: Category[];
  categoriesMap: Record<string, Category>;
  loading: boolean;
  reload: () => void;
}

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories?limit=200');
      if (!res.ok) return;
      const json: PaginatedResponse<Category> = await res.json();
      setCategories(json.data ?? []);
    } catch {
      // Некритично — список будет пустым
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categoriesMap: Record<string, Category> = Object.fromEntries(
    categories.map((c) => [c.id, c]),
  );

  return { categories, categoriesMap, loading, reload: load };
}
