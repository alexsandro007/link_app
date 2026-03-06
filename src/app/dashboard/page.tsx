'use client';

import {
  Stack,
  Group,
  Title,
  Button,
  TextInput,
  Select,
  Badge,
  Modal,
  ActionIcon,
  Tooltip,
  Text,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconSearch,
  IconRefresh,
  IconArchive,
  IconArchiveOff,
  IconSortAscending,
  IconSortDescending,
} from '@tabler/icons-react';
import { useState, useCallback } from 'react';
import type { FileWithPath } from '@mantine/dropzone';

import { withAuth } from '@/components/ProtectedRoute';
import { CardForm, type CardFormValues } from '@/components/cards/CardForm';
import { CardList } from '@/components/cards/CardList';
import { useCards, type UseCardsFilters, type SortField } from '@/hooks/useCards';
import { useCategories } from '@/hooks/useCategories';
import { uploadViaServer } from '@/lib/supabase/storage';
import type { Card } from '@/types/database';

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardPage() {
  /* ── Фильтры ───────────────────────────────────────────────────────────── */
  const [searchRaw, setSearchRaw] = useState('');
  const [debouncedQ] = useDebouncedValue(searchRaw, 300);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDesc, setSortDesc] = useState(true);

  const filters: UseCardsFilters = {
    q: debouncedQ || undefined,
    categoryId,
    archived,
    sortBy,
    sortOrder: sortDesc ? 'desc' : 'asc',
    limit: 24,
  };

  /* ── Данные ────────────────────────────────────────────────────────────── */
  const { cards, loading, loadingMore, error, hasMore, total, loadMore, refresh } =
    useCards(filters);

  const { categories, categoriesMap } = useCategories();

  /* ── Модалка создания / редактирования ─────────────────────────────────── */
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const handleCreateClick = useCallback(() => {
    setEditingCard(null);
    openForm();
  }, [openForm]);

  const handleEditClick = useCallback(
    (card: Card) => {
      setEditingCard(card);
      openForm();
    },
    [openForm],
  );

  /* ── Submit формы ──────────────────────────────────────────────────────── */
  const handleFormSubmit = useCallback(
    async (values: CardFormValues, newFiles: FileWithPath[], removedUrls: string[]) => {
      // Определяем уже существующие URL (те что остались после удалений)
      const existingUrls: string[] = editingCard?.image_urls?.length
        ? editingCard.image_urls.filter((u) => !removedUrls.includes(u))
        : editingCard?.image_url && !removedUrls.includes(editingCard.image_url)
        ? [editingCard.image_url]
        : [];

      // Загружаем все новые файлы параллельно
      const uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        const results = await Promise.all(
          newFiles.map((file) => uploadViaServer(file, { cardId: editingCard?.id }))
        );
        for (const result of results) {
          if (result.ok) {
            uploadedUrls.push(result.publicUrl);
          } else {
            notifications.show({
              message: `Не удалось загрузить изображение: ${result.message}`,
              color: 'orange',
              autoClose: 4000,
            });
          }
        }
      }

      const image_urls = [...existingUrls, ...uploadedUrls];
      const image_url = image_urls[0] ?? null;

      const body = { ...values, image_url, image_urls };
      const url = editingCard ? `/api/cards/${editingCard.id}` : '/api/cards';
      const method = editingCard ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Неизвестная ошибка' }));
        throw new Error(err.error ?? 'Ошибка сервера');
      }

      notifications.show({
        message: editingCard ? 'Карточка обновлена' : 'Карточка создана',
        color: 'teal',
        autoClose: 2500,
      });

      closeForm();
      setEditingCard(null);
      refresh();
    },
    [editingCard, closeForm, refresh],
  );

  /* ── Удаление ──────────────────────────────────────────────────────────── */
  const [deleteCard, setDeleteCard] = useState<Card | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteClick = useCallback((card: Card) => setDeleteCard(card), []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteCard) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/cards/${deleteCard.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      notifications.show({ message: 'Карточка удалена', color: 'red', autoClose: 2500 });
      setDeleteCard(null);
      refresh();
    } catch {
      notifications.show({ message: 'Не удалось удалить карточку', color: 'red' });
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteCard, refresh]);

  /* ── Архивирование ─────────────────────────────────────────────────────── */
  const handleArchiveClick = useCallback(
    async (card: Card) => {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: !card.is_archived }),
      });
      if (res.ok) {
        notifications.show({
          message: card.is_archived ? 'Восстановлено из архива' : 'Перемещено в архив',
          color: 'teal',
          autoClose: 2000,
        });
        refresh();
      }
    },
    [refresh],
  );

  /* ── Опции для Select-ов ───────────────────────────────────────────────── */
  const categoryOptions = [
    { value: '', label: 'Все категории' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const sortOptions: { value: SortField; label: string }[] = [
    { value: 'created_at', label: 'По дате добавления' },
    { value: 'updated_at', label: 'По дате изменения' },
    { value: 'title', label: 'По названию' },
    { value: 'price', label: 'По цене' },
  ];

  const formInitialValues: Partial<CardFormValues> | undefined = editingCard
    ? {
        title: editingCard.title,
        url: editingCard.url ?? '',
        place: editingCard.place ?? '',
        price: editingCard.price,
        currency: editingCard.currency ?? 'USD',
        notes: editingCard.notes ?? '',
        tags: editingCard.tags ?? [],
        category_id: editingCard.category_id,
        is_public: editingCard.is_public,
      }
    : undefined;

  // ── Рендер ──────────────────────────────────────────────────────────────
  return (
    <Stack gap="md">
      {/* Заголовок */}
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <Title order={2}>Мои карточки</Title>
          {!loading && (
            <Badge variant="light" radius="sm" p="xs" size="xl" mt="4">
              {total}
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          <Tooltip label="Обновить">
            <ActionIcon variant="light" onClick={refresh} size="lg">
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreateClick}>
            Добавить
          </Button>
        </Group>
      </Group>

      {/* Панель фильтров */}
      <Group gap="sm" wrap="wrap">
        <TextInput
          placeholder="Поиск по названию, заметкам..."
          leftSection={<IconSearch size={16} />}
          value={searchRaw}
          onChange={(e) => setSearchRaw(e.currentTarget.value)}
          style={{ flex: '1 1 220px', minWidth: 180 }}
        />
        <Select
          placeholder="Все категории"
          data={categoryOptions}
          value={categoryId ?? ''}
          onChange={(v) => setCategoryId(v || null)}
          clearable
          style={{ flex: '1 1 180px', minWidth: 150 }}
        />
        <Select
          data={sortOptions}
          value={sortBy}
          onChange={(v) => v && setSortBy(v as SortField)}
          style={{ flex: '1 1 190px', minWidth: 160 }}
        />
        <Tooltip label={sortDesc ? 'По убыванию' : 'По возрастанию'}>
          <ActionIcon variant="light" size="lg" onClick={() => setSortDesc((v) => !v)}>
            {sortDesc ? <IconSortDescending size={16} /> : <IconSortAscending size={16} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label={archived ? 'Скрыть архив' : 'Показать архив'}>
          <ActionIcon
            variant={archived ? 'filled' : 'light'}
            color={archived ? 'orange' : 'gray'}
            size="lg"
            onClick={() => setArchived((v) => !v)}
          >
            {archived ? <IconArchiveOff size={16} /> : <IconArchive size={16} />}
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Список карточек */}
      <CardList
        cards={cards}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        hasMore={hasMore}
        filters={filters}
        categoriesMap={categoriesMap}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onArchive={handleArchiveClick}
        onLoadMore={loadMore}
        onRetry={refresh}
      />

      {/* Модалка создания / редактирования */}
      <Modal
        opened={formOpened}
        onClose={() => { closeForm(); setEditingCard(null); }}
        title={editingCard ? 'Редактировать карточку' : 'Новая карточка'}
        size="lg"
        centered
        overlayProps={{ blur: 3 }}
      >
        <CardForm
          key={editingCard?.id ?? 'new'}
          initialValues={formInitialValues}
          initialImages={
            editingCard?.image_urls?.length
              ? editingCard.image_urls
              : editingCard?.image_url
              ? [editingCard.image_url]
              : []
          }
          categories={categories}
          mode={editingCard ? 'edit' : 'create'}
          onSubmit={handleFormSubmit}
          onCancel={() => { closeForm(); setEditingCard(null); }}
        />
      </Modal>

      {/* Модалка подтверждения удаления */}
      <Modal
        opened={!!deleteCard}
        onClose={() => setDeleteCard(null)}
        title="Удалить карточку?"
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            «<b>{deleteCard?.title}</b>» будет удалена без возможности восстановления.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteCard(null)}>
              Отмена
            </Button>
            <Button color="red" loading={deleteLoading} onClick={handleDeleteConfirm}>
              Удалить
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

export default withAuth(DashboardPage);
