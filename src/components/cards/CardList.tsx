'use client';

import {
  Box,
  Text,
  Center,
  Stack,
  Button,
  Alert,
  SimpleGrid,
  Loader,
  Group,
} from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { IconAlertCircle, IconBookmarkOff } from '@tabler/icons-react';
import { CardItem, CardItemSkeleton } from './CardItem';
import type { UseCardsFilters } from '@/hooks/useCards';
import type { Card, Category } from '@/types/database';

// ── Константы ─────────────────────────────────────────────────────────────────

const CARD_GAP = 12;         // px между карточками
const CARD_MIN_WIDTH = 260;  // минимальная ширина карточки
const CARD_HEIGHT = 280;     // ориентировочная высота строки (используется виртуализатором)
const SKELETON_COUNT = 8;    // кол-во скелетонов при первой загрузке

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CardListProps {
  /** Уже загруженные карточки — позволяет управлять данными снаружи */
  cards: Card[];
  /** Идёт первая загрузка */
  loading: boolean;
  /** Идёт подгрузка следующей страницы */
  loadingMore: boolean;
  /** Текст ошибки */
  error: string | null;
  /** Есть ли ещё страницы */
  hasMore: boolean;
  /** Описание активных фильтров (для пустого состояния) */
  filters?: UseCardsFilters;
  /** Карта категорий id→Category для отображения бейджа */
  categoriesMap?: Record<string, Category>;
  /** Колбэки действий */
  onEdit?: (card: Card) => void;
  onDelete?: (card: Card) => void;
  onArchive?: (card: Card) => void;
  /** Вызывается, когда нужно загрузить следующую страницу */
  onLoadMore: () => void;
  /** Вызывается при нажатии «Повторить» после ошибки */
  onRetry: () => void;
}

// ── Вычисление количества колонок ─────────────────────────────────────────────

function calcColumns(containerWidth: number): number {
  if (containerWidth <= 0) return 1;
  return Math.max(1, Math.floor((containerWidth + CARD_GAP) / (CARD_MIN_WIDTH + CARD_GAP)));
}

// ── Пустое состояние ──────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Center py={80}>
      <Stack align="center" gap="sm">
        <IconBookmarkOff size={48} color="var(--mantine-color-dimmed)" stroke={1.2} />
        <Text fw={500} c="dimmed">
          {hasFilters ? 'Ничего не найдено' : 'У вас пока нет карточек'}
        </Text>
        <Text size="sm" c="dimmed" ta="center" maw={300}>
          {hasFilters
            ? 'Попробуйте изменить фильтры или поисковый запрос.'
            : 'Нажмите «Создать карточку», чтобы добавить первую ссылку.'}
        </Text>
      </Stack>
    </Center>
  );
}

// ── Основной компонент ────────────────────────────────────────────────────────

export function CardList({
  cards,
  loading,
  loadingMore,
  error,
  hasMore,
  filters = {},
  categoriesMap = {},
  onEdit,
  onDelete,
  onArchive,
  onLoadMore,
  onRetry,
}: CardListProps) {
  // Следим за шириной контейнера для адаптивного числа колонок
  const { ref: containerRef, width: containerWidth } = useElementSize<HTMLDivElement>();

  const columns = calcColumns(containerWidth);

  // Группируем карточки по строкам для виртуализации
  const rows = useMemo(() => {
    const result: Card[][] = [];
    for (let i = 0; i < cards.length; i += columns) {
      result.push(cards.slice(i, i + columns));
    }
    return result;
  }, [cards, columns]);

  // ── Виртуализатор строк ────────────────────────────────────────────────────
  // Родительский элемент — сам контейнер (window-scroll)
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + CARD_GAP,
    overscan: 3,          // рендерим ±3 строки за пределами вьюпорта
  });

  const totalHeight = virtualizer.getTotalSize();

  // ── IntersectionObserver — infinite scroll ─────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasMore && !loadingMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loadingMore, loading, onLoadMore],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  // ── Состояние: первая загрузка ─────────────────────────────────────────────
  if (loading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={CARD_GAP}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <CardItemSkeleton key={i} />
        ))}
      </SimpleGrid>
    );
  }

  // ── Состояние: ошибка ──────────────────────────────────────────────────────
  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" title="Ошибка загрузки">
        <Stack gap="sm">
          <Text size="sm">{error}</Text>
          <Button size="xs" variant="light" color="red" onClick={onRetry}>
            Повторить
          </Button>
        </Stack>
      </Alert>
    );
  }

  // ── Состояние: пусто ───────────────────────────────────────────────────────
  if (cards.length === 0) {
    const hasFilters = !!(filters.q || filters.categoryId || filters.tags?.length);
    return <EmptyState hasFilters={hasFilters} />;
  }

  // ── Основной рендер с виртуализацией ──────────────────────────────────────
  return (
    <Box ref={containerRef}>
      {/* Скролл-контейнер — overflow:auto со своей высотой */}
      <Box
        ref={parentRef}
        style={{ height: '100vh', overflowY: 'auto', position: 'relative' }}
      >
        {/* Виртуальная «полная» высота — чтобы скроллбар работал корректно */}
        <Box style={{ height: totalHeight, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;

            return (
              <Box
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: virtualRow.start,
                  left: 0,
                  right: 0,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: CARD_GAP,
                  paddingBottom: CARD_GAP,
                }}
              >
                {row.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    category={card.category_id ? categoriesMap[card.category_id] : null}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onArchive={onArchive}
                  />
                ))}

                {/* Заполняем пустые ячейки последней строки */}
                {row.length < columns &&
                  Array.from({ length: columns - row.length }).map((_, i) => (
                    <Box key={`empty-${i}`} />
                  ))}
              </Box>
            );
          })}
        </Box>

        {/* Sentinel для IntersectionObserver */}
        <Box ref={sentinelRef} style={{ height: 1 }} />

        {/* Индикатор подгрузки следующей страницы */}
        {loadingMore && (
          <Group justify="center" py="md">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Загружаем ещё...</Text>
          </Group>
        )}

        {/* Конец списка */}
        {!hasMore && cards.length > 0 && (
          <Text ta="center" size="xs" c="dimmed" py="md">
            Показаны все карточки ({cards.length})
          </Text>
        )}
      </Box>
    </Box>
  );
}

// ── Версия без скролл-контейнера (window scroll) ──────────────────────────────
// Используй, когда нужен скролл всей страницы, а не внутри блока.

export interface CardListWindowProps extends Omit<CardListProps, 'onLoadMore' | 'onRetry'> {
  onLoadMore: () => void;
  onRetry: () => void;
}

export function CardListWindow(props: CardListWindowProps) {
  const { cards, loading, loadingMore, error, hasMore, onLoadMore, onRetry, filters = {}, categoriesMap = {}, onEdit, onDelete, onArchive } = props;

  const { ref: containerRef, width: containerWidth } = useElementSize<HTMLDivElement>();
  const columns = calcColumns(containerWidth);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasMore && !loadingMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loadingMore, loading, onLoadMore],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleIntersect, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  if (loading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={CARD_GAP}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => <CardItemSkeleton key={i} />)}
      </SimpleGrid>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" title="Ошибка загрузки">
        <Stack gap="sm">
          <Text size="sm">{error}</Text>
          <Button size="xs" variant="light" color="red" onClick={onRetry}>Повторить</Button>
        </Stack>
      </Alert>
    );
  }

  if (cards.length === 0) {
    const hasFilters = !!(filters.q || filters.categoryId || filters.tags?.length);
    return <EmptyState hasFilters={hasFilters} />;
  }

  return (
    <Box ref={containerRef}>
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: CARD_GAP,
        }}
      >
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            category={card.category_id ? categoriesMap[card.category_id] : null}
            onEdit={onEdit}
            onDelete={onDelete}
            onArchive={onArchive}
          />
        ))}
      </Box>

      {/* Sentinel */}
      <Box ref={sentinelRef} style={{ height: 1, marginTop: CARD_GAP }} />

      {loadingMore && (
        <Group justify="center" py="md">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">Загружаем ещё...</Text>
        </Group>
      )}

      {!hasMore && cards.length > 0 && (
        <Text ta="center" size="xs" c="dimmed" py="md">
          Показаны все карточки ({cards.length})
        </Text>
      )}
    </Box>
  );
}
