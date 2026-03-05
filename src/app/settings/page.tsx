'use client';

import {
  Stack,
  Title,
  Text,
  Button,
  Paper,
  Group,
  Divider,
  Badge,
  Alert,
  Anchor,
  ColorSwatch,
  SimpleGrid,
  Tooltip,
  CheckIcon,
  rem,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconDownload,
  IconCode,
  IconTable,
  IconDatabase,
  IconInfoCircle,
  IconPalette,
} from '@tabler/icons-react';
import { useState } from 'react';

import { withAuth } from '@/components/ProtectedRoute';
import { downloadCardsAsCsv } from '@/lib/export/csv';
import { useThemeColor, MANTINE_COLORS, type MantineColorName } from '@/components/providers/ThemeProvider';
import type { Card, PaginatedResponse } from '@/types/database';

// ── Утилита: скачать blob как файл ────────────────────────────────────────────

function saveBlobAs(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ── Утилита: загрузить ВСЕ карточки ──────────────────────────────────────────

async function fetchAllCards(): Promise<Card[]> {
  const all: Card[] = [];
  let page = 1;
  const limit = 200;

  while (true) {
    const res = await fetch(`/api/cards?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error('Ошибка загрузки карточек');
    const json: PaginatedResponse<Card> = await res.json();
    all.push(...(json.data ?? []));
    if (!json.data || json.data.length < limit) break;
    page++;
  }

  return all;
}

// ── Секция экспорта ───────────────────────────────────────────────────────────

function SettingsPage() {
  const [jsonLoading, setJsonLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const { primaryColor, setPrimaryColor } = useThemeColor();

  const today = new Date().toISOString().slice(0, 10);

  /* ── Экспорт JSON ──────────────────────────────────────────────────────── */
  const handleExportJson = async () => {
    setJsonLoading(true);
    try {
      const res = await fetch('/api/export');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Ошибка' }));
        throw new Error(err.error ?? 'Ошибка экспорта');
      }
      const blob = await res.blob();
      saveBlobAs(blob, `linkery-export-${today}.json`);
      notifications.show({ message: 'JSON-архив скачан', color: 'teal', autoClose: 3000 });
    } catch (e) {
      notifications.show({
        message: e instanceof Error ? e.message : 'Ошибка экспорта',
        color: 'red',
      });
    } finally {
      setJsonLoading(false);
    }
  };

  /* ── Экспорт CSV ───────────────────────────────────────────────────────── */
  const handleExportCsv = async () => {
    setCsvLoading(true);
    try {
      const cards = await fetchAllCards();
      downloadCardsAsCsv(cards, `linkery-cards-${today}.csv`);
      notifications.show({
        message: `CSV скачан (${cards.length} карточек)`,
        color: 'teal',
        autoClose: 3000,
      });
    } catch (e) {
      notifications.show({
        message: e instanceof Error ? e.message : 'Ошибка экспорта CSV',
        color: 'red',
      });
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <Stack gap="xl" maw={640}>
      <Title order={2}>Настройки</Title>

      {/* ── Цвет акцента ─────────────────────────────────────────────── */}
      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          <Group gap="sm">
            <IconPalette size={20} />
            <Title order={4}>Цвет темы</Title>
          </Group>

          <Text size="sm" c="dimmed">
            Выберите основной цвет интерфейса. Изменение применяется мгновенно и сохраняется в браузере.
          </Text>

          <SimpleGrid cols={7} spacing="xs">
            {MANTINE_COLORS.map((color) => (
              <Tooltip key={color} label={color} withArrow position="top">
                <ColorSwatch
                  color={`var(--mantine-color-${color}-6)`}
                  size={32}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setPrimaryColor(color as MantineColorName)}
                >
                  {primaryColor === color && (
                    <CheckIcon style={{ width: rem(12), height: rem(12), color: '#fff' }} />
                  )}
                </ColorSwatch>
              </Tooltip>
            ))}
          </SimpleGrid>
        </Stack>
      </Paper>

      {/* ── Экспорт данных ───────────────────────────────────────────────── */}
      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          <Group gap="sm">
            <IconDatabase size={20} />
            <Title order={4}>Экспорт данных</Title>
          </Group>

          <Text size="sm" c="dimmed">
            Скачайте все ваши карточки и категории в удобном формате. Данные принадлежат
            только вам.
          </Text>

          <Divider />

          {/* JSON */}
          <Group justify="space-between" wrap="nowrap">
            <Stack gap={2}>
              <Group gap="xs">
                <IconCode size={16} />
                <Text fw={500} size="sm">
                  JSON-архив
                </Text>
                <Badge size="xs" variant="light">
                  Полный
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                Карточки, категории и изображения — всё в одном файле. Подходит для
                резервной копии и импорта.
              </Text>
            </Stack>
            <Button
              leftSection={<IconDownload size={15} />}
              loading={jsonLoading}
              onClick={handleExportJson}
              variant="light"
              size="md"
              miw={180}
            >
              Скачать JSON
            </Button>
          </Group>

          <Divider variant="dashed" />

          {/* CSV */}
          <Group justify="space-between" wrap="nowrap">
            <Stack gap={2}>
              <Group gap="xs">
                <IconTable size={16} />
                <Text fw={500} size="sm">
                  CSV-таблица
                </Text>
                <Badge size="xs" variant="light" color="green">
                  Excel
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                Только карточки в табличном формате. Открывается в Excel, Google Sheets,
                Numbers.
              </Text>
            </Stack>
            <Button
              leftSection={<IconDownload size={15} />}
              loading={csvLoading}
              onClick={handleExportCsv}
              variant="light"
              color="green"
              size="md"
              miw={180}
            >
              Скачать CSV
            </Button>
          </Group>
        </Stack>
      </Paper>

      {/* ── Информация ──────────────────────────────────────────────────── */}
      <Alert
        icon={<IconInfoCircle size={16} />}
        title="API-документация"
        variant="light"
        color="blue"
      >
        <Text size="sm">
          Полное описание API доступно по адресу{' '}
          <Anchor href="/api/docs" target="_blank" size="sm">
            /api/docs
          </Anchor>
          . Там же можно протестировать все эндпоинты через Swagger UI.
        </Text>
      </Alert>
    </Stack>
  );
}

export default withAuth(SettingsPage);
