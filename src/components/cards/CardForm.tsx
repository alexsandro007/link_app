'use client';

import {
  TextInput,
  Textarea,
  NumberInput,
  Select,
  TagsInput,
  Switch,
  Button,
  Group,
  Stack,
  Text,
  Image,
  ActionIcon,
  SimpleGrid,
  Paper,
  Divider,
  LoadingOverlay,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Dropzone, IMAGE_MIME_TYPE, FileWithPath } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX, IconTrash } from '@tabler/icons-react';
import { useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { z } from 'zod';
import type { Category } from '@/types/database';

// ── Zod Schema ────────────────────────────────────────────────────────────────

export const cardSchema = z.object({
  title: z
    .string()
    .min(1, 'Название обязательно')
    .max(500, 'Не более 500 символов'),
  url: z
    .union([z.string().url('Введите корректный URL'), z.literal('')])
    .optional(),
  place: z.string().max(200, 'Не более 200 символов').optional(),
  price: z
    .number()
    .nonnegative('Цена не может быть отрицательной')
    .optional()
    .nullable(),
  currency: z.string().default('USD'),
  notes: z.string().max(5000, 'Не более 5000 символов').optional(),
  tags: z.array(z.string()).default([]),
  category_id: z.string().uuid('Некорректный ID категории').optional().nullable(),
  is_public: z.boolean().default(false),
});

export type CardFormValues = z.infer<typeof cardSchema>;

// ── Helper: zod field validator ───────────────────────────────────────────────
// Валидирует одно поле через соответствующую zod-схему.
// Возвращает undefined (OK) или строку с ошибкой — формат Mantine.
function makeFieldValidator<K extends keyof CardFormValues>(key: K) {
  return (value: CardFormValues[K]): string | undefined => {
    const result = cardSchema.safeParse({ ...emptyValues, [key]: value });
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === key);
      return issue?.message;
    }
    return undefined;
  };
}

// Пустые значения для контекста при частичной валидации
const emptyValues: CardFormValues = {
  title: '',
  url: '',
  place: '',
  price: null,
  currency: 'USD',
  notes: '',
  tags: [],
  category_id: null,
  is_public: false,
};

// ── Preview item ──────────────────────────────────────────────────────────────

interface PreviewItem {
  id: string;
  /** объект File (новый) или URL уже загруженного изображения */
  file?: FileWithPath;
  previewUrl: string;
  uploading?: boolean;
  error?: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CardFormProps {
  /** Начальные значения при редактировании */
  initialValues?: Partial<CardFormValues>;
  /** Уже загруженные изображения (URLs) при редактировании */
  initialImages?: string[];
  /** Список категорий для Select */
  categories?: Pick<Category, 'id' | 'name'>[];
  /** Вызывается при успешной отправке формы */
  onSubmit: (values: CardFormValues, newFiles: FileWithPath[], removedImageUrls: string[]) => Promise<void>;
  /** Режим формы */
  mode?: 'create' | 'edit';
  /** Кнопка «Отмена» */
  onCancel?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const CURRENCIES = ['USD', 'EUR', 'RUB', 'GBP', 'UAH', 'KZT', 'BYN', 'CNY'];
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGES = 10;

export function CardForm({
  initialValues,
  initialImages = [],
  categories = [],
  onSubmit,
  mode = 'create',
  onCancel,
}: CardFormProps) {
  const [loading, setLoading] = useState(false);

  // Previews: разделяем на уже загруженные (URL string) и новые (File)
  const [existingImages, setExistingImages] = useState<string[]>(initialImages);
  const [newPreviews, setNewPreviews] = useState<PreviewItem[]>([]);

  const form = useForm<CardFormValues>({
    initialValues: {
      title: initialValues?.title ?? '',
      url: initialValues?.url ?? '',
      place: initialValues?.place ?? '',
      price: initialValues?.price ?? null,
      currency: initialValues?.currency ?? 'USD',
      notes: initialValues?.notes ?? '',
      tags: initialValues?.tags ?? [],
      category_id: initialValues?.category_id ?? null,
      is_public: initialValues?.is_public ?? false,
    },
    validate: {
      title: makeFieldValidator('title'),
      url: makeFieldValidator('url'),
      place: makeFieldValidator('place'),
      price: makeFieldValidator('price'),
      notes: makeFieldValidator('notes'),
    },
  });

  // ── Image handlers ──────────────────────────────────────────────────────────

  const handleDrop = useCallback(
    (files: FileWithPath[]) => {
      const totalCount = existingImages.length + newPreviews.length + files.length;
      if (totalCount > MAX_IMAGES) {
        files = files.slice(0, MAX_IMAGES - existingImages.length - newPreviews.length);
      }

      const items: PreviewItem[] = files.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setNewPreviews((prev) => [...prev, ...items]);
    },
    [existingImages.length, newPreviews.length],
  );

  const removeNewPreview = useCallback((id: string) => {
    setNewPreviews((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const removeExistingImage = useCallback((url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    try {
      const removedUrls = initialImages.filter((u) => !existingImages.includes(u));
      const newFiles = newPreviews.map((p) => p.file!).filter(Boolean);
      await onSubmit(values, newFiles, removedUrls);
    } finally {
      setLoading(false);
    }
  });

  // ── Category options ────────────────────────────────────────────────────────

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  const totalImages = existingImages.length + newPreviews.length;

  return (
    <Box pos="relative">
      <LoadingOverlay visible={loading} zIndex={200} overlayProps={{ blur: 2 }} />

      <form onSubmit={handleSubmit}>
        <Stack gap="md">

          {/* ── Основные поля ── */}
          <TextInput
            label="Название"
            placeholder="Введите название"
            required
            {...form.getInputProps('title')}
          />

          <TextInput
            label="Ссылка (URL)"
            placeholder="https://example.com"
            type="url"
            {...form.getInputProps('url')}
          />

          <TextInput
            label="Место / Магазин"
            placeholder="Amazon, AliExpress, Steam..."
            {...form.getInputProps('place')}
          />

          {/* ── Цена + валюта ── */}
          <Group gap="sm" align="flex-start" grow>
            <NumberInput
              label="Цена"
              placeholder="0.00"
              min={0}
              decimalScale={2}
              {...form.getInputProps('price')}
            />
            <Select
              label="Валюта"
              data={CURRENCIES}
              allowDeselect={false}
              {...form.getInputProps('currency')}
            />
          </Group>

          {/* ── Категория ── */}
          {categories.length > 0 && (
            <Select
              label="Категория"
              placeholder="Выберите категорию"
              data={categoryOptions}
              clearable
              searchable
              {...form.getInputProps('category_id')}
            />
          )}

          {/* ── Теги ── */}
          <TagsInput
            label="Теги"
            placeholder="Введите тег и нажмите Enter"
            splitChars={[',', ' ', '|']}
            maxTags={20}
            {...form.getInputProps('tags')}
          />

          {/* ── Заметки ── */}
          <Textarea
            label="Заметки"
            placeholder="Дополнительные заметки..."
            autosize
            minRows={3}
            maxRows={10}
            {...form.getInputProps('notes')}
          />

          <Divider label="Изображения" labelPosition="left" />

          {/* ── Dropzone ── */}
          {totalImages < MAX_IMAGES && (
            <Dropzone
              onDrop={handleDrop}
              onReject={(files) => {
                files.forEach(({ file, errors }) => {
                  const first = errors[0];
                  const msg =
                    first?.code === 'file-too-large'
                      ? `«${file.name}» слишком большой. Максимум — ${MAX_IMAGE_SIZE_MB} МБ.`
                      : first?.code === 'file-invalid-type'
                      ? `«${file.name}» — недопустимый формат. Разрешены: PNG, JPG, WEBP, GIF, AVIF.`
                      : `«${file.name}» отклонён.`;
                  notifications.show({ message: msg, color: 'red', autoClose: 5000 });
                });
              }}
              maxSize={MAX_IMAGE_SIZE_MB * 1024 * 1024}
              accept={IMAGE_MIME_TYPE}
              multiple
              styles={{ root: { cursor: 'pointer' } }}
            >
              <Group justify="center" gap="xl" mih={80} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload size={32} stroke={1.5} color="var(--mantine-color-blue-6)" />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={32} stroke={1.5} color="var(--mantine-color-red-6)" />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconPhoto size={32} stroke={1.5} color="var(--mantine-color-dimmed)" />
                </Dropzone.Idle>

                <Stack gap={4} ta="center">
                  <Text size="sm" fw={500}>
                    Перетащите изображения или нажмите для выбора
                  </Text>
                  <Text size="xs" c="dimmed">
                    PNG, JPG, WEBP, GIF — до {MAX_IMAGE_SIZE_MB} МБ каждый
                    ({totalImages}/{MAX_IMAGES})
                  </Text>
                </Stack>
              </Group>
            </Dropzone>
          )}

          {/* ── Превью изображений ── */}
          {totalImages > 0 && (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
              {/* Уже загруженные */}
              {existingImages.map((url) => (
                <Paper key={url} withBorder radius="md" p={4} pos="relative">
                  <Image
                    src={url}
                    alt="Изображение"
                    radius="sm"
                    h={120}
                    fit="cover"
                  />
                  <ActionIcon
                    color="red"
                    variant="filled"
                    size="sm"
                    pos="absolute"
                    top={8}
                    right={8}
                    onClick={() => removeExistingImage(url)}
                    aria-label="Удалить изображение"
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                </Paper>
              ))}

              {/* Новые файлы (локальный preview) */}
              {newPreviews.map((item) => (
                <Paper key={item.id} withBorder radius="md" p={4} pos="relative">
                  <Image
                    src={item.previewUrl}
                    alt="Превью"
                    radius="sm"
                    h={120}
                    fit="cover"
                  />
                  <ActionIcon
                    color="red"
                    variant="filled"
                    size="sm"
                    pos="absolute"
                    top={8}
                    right={8}
                    onClick={() => removeNewPreview(item.id)}
                    aria-label="Удалить превью"
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                </Paper>
              ))}
            </SimpleGrid>
          )}

          {/* ── Публичность ── */}
          <Switch
            label="Сделать карточку публичной"
            description="Публичные карточки доступны по прямой ссылке без авторизации"
            {...form.getInputProps('is_public', { type: 'checkbox' })}
          />

          {/* ── Кнопки ── */}
          <Group justify="flex-end" mt="sm">
            {onCancel && (
              <Button variant="default" onClick={onCancel} disabled={loading}>
                Отмена
              </Button>
            )}
            <Button type="submit" loading={loading}>
              {mode === 'create' ? 'Создать карточку' : 'Сохранить изменения'}
            </Button>
          </Group>

        </Stack>
      </form>
    </Box>
  );
}
