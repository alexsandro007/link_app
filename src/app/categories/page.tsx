'use client';

import {
  Stack,
  Group,
  Title,
  Button,
  Text,
  ActionIcon,
  Modal,
  TextInput,
  ColorInput,
  Badge,
  Paper,
  ScrollArea,
  Center,
  Loader,
  Tooltip,
  Box,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconTrash,
  IconCategory,
  IconCards,
  IconEdit,
  IconChevronLeft,
} from '@tabler/icons-react';
import { useState, useCallback } from 'react';

import { withAuth } from '@/components/ProtectedRoute';
import { CardList } from '@/components/cards/CardList';
import { useCards } from '@/hooks/useCards';
import { useCategories } from '@/hooks/useCategories';
import type { Category } from '@/types/database';

// ── Страница Категорий ────────────────────────────────────────────────────────

function CategoriesPage() {
  const { categories, loading: catLoading, reload: reloadCats } = useCategories();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedCategory = categories.find((c) => c.id === selectedId) ?? null;
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  // On mobile: show cards panel when a category is selected
  const showCards = !isMobile || selectedId !== null;

  /* ── Создание категории ──────────────────────────────────────────────────── */
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#4dabf7');
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: newColor }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Ошибка' }));
        notifications.show({ message: err.error ?? 'Ошибка создания', color: 'red' });
        return;
      }
      notifications.show({ message: `Категория «${name}» создана`, color: 'teal', autoClose: 2500 });
      setNewName('');
      setNewColor('#4dabf7');
      closeCreate();
      reloadCats();
    } finally {
      setCreating(false);
    }
  }, [newName, newColor, closeCreate, reloadCats]);

  /* ── Переименование категории ────────────────────────────────────────────── */
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#4dabf7');
  const [editSaving, setEditSaving] = useState(false);

  const handleEditClick = useCallback((cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCat(cat);
    setEditName(cat.name);
    setEditColor(cat.color ?? '#4dabf7');
    openEdit();
  }, [openEdit]);

  const handleEditSave = useCallback(async () => {
    if (!editingCat || !editName.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/categories/${editingCat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Ошибка' }));
        notifications.show({ message: err.error ?? 'Ошибка сохранения', color: 'red' });
        return;
      }
      notifications.show({ message: 'Категория обновлена', color: 'teal', autoClose: 2000 });
      closeEdit();
      setEditingCat(null);
      reloadCats();
    } finally {
      setEditSaving(false);
    }
  }, [editingCat, editName, editColor, closeEdit, reloadCats]);

  /* ── Удаление категории ──────────────────────────────────────────────────── */
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        notifications.show({ message: 'Не удалось удалить категорию', color: 'red' });
        return;
      }
      notifications.show({ message: `«${deleteTarget.name}» удалена`, color: 'orange', autoClose: 2500 });
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
      reloadCats();
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, selectedId, reloadCats]);

  /* ── Карточки выбранной категории ───────────────────────────────────────── */
  const { cards, loading: cardsLoading, loadingMore, error, hasMore, total, loadMore, refresh } =
    useCards({ categoryId: selectedId ?? undefined, limit: 24 });

  // ── Рендер ────────────────────────────────────────────────────────────────
  return (
    <Box style={{ display: 'flex', gap: 16, height: 'calc(100vh - 76px)', overflow: 'hidden' }}>

      {/* ── Левая панель: список категорий ─────────────────────────────────── */}
      {(!isMobile || !showCards) && (
      <Paper
        withBorder
        radius="md"
        style={{ width: isMobile ? '100%' : 260, minWidth: isMobile ? 0 : 220, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: isMobile ? 1 : undefined }}
      >
        {/* Заголовок + кнопка создания */}
        <Group p="sm" justify="space-between" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <Text fw={600} size="sm">Категории</Text>
          <Tooltip label="Новая категория">
            <ActionIcon size="sm" variant="light" onClick={openCreate}>
              <IconPlus size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* Список */}
        <ScrollArea flex={1} p="xs">
          {catLoading ? (
            <Center py="md"><Loader size="sm" /></Center>
          ) : categories.length === 0 ? (
            <Stack align="center" gap="xs" py="xl">
              <IconCategory size={32} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed" ta="center">Нет категорий.<br />Нажмите «+» чтобы создать.</Text>
            </Stack>
          ) : (
            <Stack gap={2}>
              {categories.map((cat) => (
                <Box
                  key={cat.id}
                  component="div"
                  onClick={() => setSelectedId(cat.id === selectedId ? null : cat.id)}
                  style={{
                    borderRadius: 6,
                    padding: '6px 8px',
                    backgroundColor: cat.id === selectedId
                      ? 'var(--mantine-color-default-hover)'
                      : 'transparent',
                    transition: 'background 120ms',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                      <Box
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: cat.color ?? '#ccc',
                          flexShrink: 0,
                        }}
                      />
                      <Text size="sm" fw={cat.id === selectedId ? 600 : 400} truncate>
                        {cat.name}
                      </Text>
                    </Group>
                    <Group gap={2} wrap="nowrap">
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="gray"
                        onClick={(e) => handleEditClick(cat, e)}
                      >
                        <IconEdit size={11} />
                      </ActionIcon>
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(cat); }}
                      >
                        <IconTrash size={11} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Box>
              ))}
            </Stack>
          )}
        </ScrollArea>
      </Paper>
      )}

      {/* ── Правая панель: карточки выбранной категории ────────────────────── */}
      {showCards && (
      <Stack flex={1} gap="md" style={{ minWidth: 0, overflow: 'hidden' }}>
        {/* Заголовок правой панели */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            {isMobile && (
              <ActionIcon variant="subtle" color="gray" onClick={() => setSelectedId(null)} aria-label="Назад">
                <IconChevronLeft size={18} />
              </ActionIcon>
            )}
            <Title order={3}>
              {selectedCategory ? selectedCategory.name : 'Все карточки'}
            </Title>
            {!cardsLoading && selectedId && (
              <Badge variant="light" radius="sm" p="xs" size="xl" mt="4">
                {total}
              </Badge>
            )}
          </Group>
          {selectedId && !isMobile && (
            <Button size="xs" variant="subtle" color="gray" onClick={() => setSelectedId(null)}>
              Сбросить фильтр
            </Button>
          )}
        </Group>

        {/* Подсказка если категория не выбрана */}
        {!selectedId && categories.length > 0 && !catLoading && !isMobile && (
          <Paper withBorder radius="md" p="xl">
            <Center>
              <Stack align="center" gap="xs">
                <IconCards size={40} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed" size="sm" ta="center">
                  Выберите категорию слева, чтобы увидеть её карточки.
                </Text>
              </Stack>
            </Center>
          </Paper>
        )}

        {/* Список карточек */}
        {selectedId && (
          <ScrollArea style={{ flex: 1 }}>
            <CardList
              cards={cards}
              loading={cardsLoading}
              loadingMore={loadingMore}
              error={error}
              hasMore={hasMore}
              filters={{ categoryId: selectedId, limit: 24 }}
              categoriesMap={Object.fromEntries(categories.map((c) => [c.id, c]))}
              onEdit={() => {}}
              onDelete={() => {}}
              onArchive={() => {}}
              onLoadMore={loadMore}
              onRetry={refresh}
            />
          </ScrollArea>
        )}
      </Stack>
      )}

      {/* ── Модалка: создать категорию ──────────────────────────────────────── */}
      <Modal
        opened={createOpened}
        onClose={() => { closeCreate(); setNewName(''); setNewColor('#4dabf7'); }}
        title="Новая категория"
        size="sm"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Название"
            placeholder="Например, «Электроника»"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
            required
          />
          <ColorInput
            label="Цвет"
            value={newColor}
            onChange={setNewColor}
            format="hex"
            swatches={['#4dabf7','#74c0fc','#a9e34b','#ffd43b','#ff6b6b','#cc5de8','#fd7e14','#20c997']}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => { closeCreate(); setNewName(''); }}>
              Отмена
            </Button>
            <Button loading={creating} disabled={!newName.trim()} onClick={handleCreate}>
              Создать
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Модалка: редактировать категорию ───────────────────────────────── */}
      <Modal
        opened={editOpened}
        onClose={() => { closeEdit(); setEditingCat(null); }}
        title="Изменить категорию"
        size="sm"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Название"
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
            autoFocus
            required
          />
          <ColorInput
            label="Цвет"
            value={editColor}
            onChange={setEditColor}
            format="hex"
            swatches={['#4dabf7','#74c0fc','#a9e34b','#ffd43b','#ff6b6b','#cc5de8','#fd7e14','#20c997']}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => { closeEdit(); setEditingCat(null); }}>
              Отмена
            </Button>
            <Button loading={editSaving} disabled={!editName.trim()} onClick={handleEditSave}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Модалка: подтверждение удаления ────────────────────────────────── */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Удалить категорию?"
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Категория «<b>{deleteTarget?.name}</b>» будет удалена. Карточки в ней останутся, но потеряют категорию.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>Отмена</Button>
            <Button color="red" loading={deleteLoading} onClick={handleDeleteConfirm}>Удалить</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

export default withAuth(CategoriesPage);
