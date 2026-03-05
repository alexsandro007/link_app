'use client';

import {
  Card,
  Image,
  Text,
  Badge,
  Group,
  Stack,
  ActionIcon,
  Anchor,
  Tooltip,
  Menu,
  Skeleton,
} from '@mantine/core';
import {
  IconExternalLink,
  IconEdit,
  IconTrash,
  IconArchive,
  IconArchiveOff,
  IconDots,
  IconLink,
  IconTag,
  IconMapPin,
} from '@tabler/icons-react';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { Card as CardType, Category } from '@/types/database';

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CardItemProps {
  card: CardType;
  category?: Category | null;
  onEdit?: (card: CardType) => void;
  onDelete?: (card: CardType) => void;
  onArchive?: (card: CardType) => void;
}

// ── Утилита форматирования цены ───────────────────────────────────────────────

function formatPrice(price: number | null, currency: string): string | null {
  if (price === null) return null;
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(price);
}

// ── Компонент карточки ────────────────────────────────────────────────────────

export function CardItem({ card, category, onEdit, onDelete, onArchive }: CardItemProps) {
  const clipboard = useClipboard({ timeout: 1500 });

  const handleCopyLink = () => {
    clipboard.copy(card.url);
    notifications.show({ message: 'Ссылка скопирована', color: 'teal', autoClose: 2000 });
  };

  const priceLabel = formatPrice(card.price, card.currency ?? 'USD');

  return (
    <Card
      shadow="sm"
      padding="sm"
      radius="md"
      withBorder
      style={{
        opacity: card.is_archived ? 0.6 : 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Превью изображения */}
      {card.image_url && (
        <Card.Section>
          <Image
            src={card.image_url}
            alt={card.title}
            h={140}
            fit="cover"
            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f1f3f5'/%3E%3C/svg%3E"
          />
        </Card.Section>
      )}

      <Stack gap={6} mt={card.image_url ? 'sm' : 0} style={{ flex: 1 }}>
        {/* Верхняя строка: категория + меню действий */}
        <Group justify="space-between" wrap="nowrap" gap={4}>
          <Group gap={4} wrap="nowrap" style={{ overflow: 'hidden', flex: 1 }}>
            {category && (
              <Badge
                size="xs"
                variant="light"
                color={category.color ?? 'gray'}
                style={{ flexShrink: 0 }}
              >
                {category.name}
              </Badge>
            )}
            {card.is_archived && (
              <Badge size="xs" color="gray" variant="outline" style={{ flexShrink: 0 }}>
                архив
              </Badge>
            )}
          </Group>

          <Menu shadow="md" position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Действия">
                <IconDots size={14} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {onEdit && (
                <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEdit(card)}>
                  Редактировать
                </Menu.Item>
              )}
              <Menu.Item leftSection={<IconLink size={14} />} onClick={handleCopyLink}>
                Копировать ссылку
              </Menu.Item>
              {onArchive && (
                <Menu.Item
                  leftSection={card.is_archived ? <IconArchiveOff size={14} /> : <IconArchive size={14} />}
                  onClick={() => onArchive(card)}
                >
                  {card.is_archived ? 'Разархивировать' : 'В архив'}
                </Menu.Item>
              )}
              {onDelete && (
                <>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => onDelete(card)}
                  >
                    Удалить
                  </Menu.Item>
                </>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Заголовок */}
        <Text fw={600} size="sm" lineClamp={2} style={{ lineHeight: 1.4 }}>
          {card.title}
        </Text>

        {/* URL */}
        {card.url && (
          <Group gap={4} wrap="nowrap">
            {card.favicon_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.favicon_url} alt="" width={12} height={12} style={{ flexShrink: 0 }} />
            )}
            <Tooltip label={card.url} position="bottom" withArrow openDelay={500}>
              <Anchor
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                c="dimmed"
                truncate
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                <Group gap={2} wrap="nowrap">
                  <IconExternalLink size={10} style={{ flexShrink: 0 }} />
                  {getHostname(card.url)}
                </Group>
              </Anchor>
            </Tooltip>
          </Group>
        )}

        {/* Место / цена */}
        {(card.place || priceLabel) && (
          <Group gap={6} wrap="nowrap">
            {card.place && (
              <Group gap={2} wrap="nowrap">
                <IconMapPin size={12} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                <Text size="xs" c="dimmed" truncate>
                  {card.place}
                </Text>
              </Group>
            )}
            {priceLabel && (
              <Text size="sm" fw={700} c="teal" ml="auto" style={{ whiteSpace: 'nowrap' }}>
                {priceLabel}
              </Text>
            )}
          </Group>
        )}

        {/* Заметки */}
        {card.notes && (
          <Text size="xs" c="dimmed" lineClamp={2} style={{ flex: 1 }}>
            {card.notes}
          </Text>
        )}

        {/* Теги */}
        {card.tags.length > 0 && (
          <Group gap={4} mt="auto">
            <IconTag size={10} color="var(--mantine-color-dimmed)" />
            {card.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} size="xs" variant="dot" color="gray">
                {tag}
              </Badge>
            ))}
            {card.tags.length > 4 && (
              <Text size="xs" c="dimmed">+{card.tags.length - 4}</Text>
            )}
          </Group>
        )}
      </Stack>
    </Card>
  );
}

// ── Skeleton-заглушка ─────────────────────────────────────────────────────────

export function CardItemSkeleton() {
  return (
    <Card shadow="sm" padding="sm" radius="md" withBorder>
      <Skeleton height={140} mb="sm" radius="sm" />
      <Stack gap={8}>
        <Skeleton height={12} width="40%" radius="xl" />
        <Skeleton height={16} radius="xl" />
        <Skeleton height={16} width="80%" radius="xl" />
        <Skeleton height={10} width="50%" radius="xl" />
        <Group gap={4} mt={4}>
          <Skeleton height={18} width={50} radius="xl" />
          <Skeleton height={18} width={50} radius="xl" />
        </Group>
      </Stack>
    </Card>
  );
}
