'use client';

import Link from 'next/link';
import {
  Box,
  Container,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Badge,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconBookmark,
  IconTag,
  IconLink,
  IconSearch,
  IconArrowRight,
} from '@tabler/icons-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const DEMO_CARDS = [
  {
    title: 'Sony WH-1000XM5 — наушники',
    site: 'sony.com',
    category: 'Гаджеты',
    categoryColor: 'blue',
    price: '23 990 ₽',
    tags: ['хочу купить', 'звук'],
    bg: '#e3f2fd',
    fg: '#1565c0',
  },
  {
    title: 'Японский минимализм — статья о дизайне',
    site: 'medium.com',
    category: 'Вдохновение',
    categoryColor: 'violet',
    price: null,
    tags: ['дизайн', 'прочитать'],
    bg: '#f3e5f5',
    fg: '#4a148c',
  },
  {
    title: 'Кресло Herman Miller Aeron',
    site: 'hermanmiller.com',
    category: 'Дом',
    categoryColor: 'teal',
    price: '89 000 ₽',
    tags: ['мебель', 'офис'],
    bg: '#e0f7fa',
    fg: '#006064',
  },
];

export function DemoSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <Box
      py={80}
      style={{
        background:
          'linear-gradient(135deg, var(--mantine-color-body) 0%, var(--mantine-color-blue-0) 100%)',
      }}
    >
      <Container size="lg">
        <Stack gap={48}>
          <Stack align="center" ta="center" gap="sm">
            <Title order={2} style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
              Вот как это выглядит
            </Title>
            <Text size="md" c="dimmed" maw={480}>
              Три демо-карточки — кликните, чтобы попробовать самому.
            </Text>
          </Stack>

          {/* Поле "поиска" для иллюстрации */}
          <Box maw={460} mx="auto" w="100%">
            <Paper
              withBorder
              p="sm"
              radius="md"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <IconSearch size={16} color="var(--mantine-color-dimmed)" />
              <Text size="sm" c="dimmed">
                Попробуйте поискать &laquo;наушники&raquo; или &laquo;дизайн&raquo;...
              </Text>
            </Paper>
          </Box>

          <SimpleGrid
            ref={ref}
            cols={{ base: 1, sm: 3 }}
            spacing="md"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            {DEMO_CARDS.map((card) => (
              <Tooltip
                key={card.title}
                label="Зарегистрируйтесь, чтобы добавлять свои карточки"
                position="top"
                withArrow
                multiline
                w={200}
              >
                <Paper
                  withBorder
                  radius="md"
                  style={{
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      'translateY(-4px)';
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      '0 8px 24px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                  }}
                >
                  {/* Цветной плейсхолдер */}
                  <Box
                    h={100}
                    style={{
                      background: `linear-gradient(135deg, ${card.bg} 0%, ${card.bg}cc 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconBookmark
                      size={28}
                      stroke={1.2}
                      style={{ color: card.fg, opacity: 0.4 }}
                    />
                  </Box>
                  <Stack gap={6} p="md">
                    <Group gap={4}>
                      <Badge size="xs" variant="light" color={card.categoryColor}>
                        {card.category}
                      </Badge>
                    </Group>
                    <Text fw={600} size="sm" lineClamp={2}>
                      {card.title}
                    </Text>
                    <Group gap={4} wrap="nowrap">
                      <IconLink size={11} color="var(--mantine-color-dimmed)" />
                      <Text size="xs" c="dimmed" truncate>
                        {card.site}
                      </Text>
                    </Group>
                    {card.price && (
                      <Text size="sm" fw={700} c="teal">
                        {card.price}
                      </Text>
                    )}
                    <Group gap={4} mt={4}>
                      <ThemeIcon size={16} variant="transparent" color="gray">
                        <IconTag size={10} />
                      </ThemeIcon>
                      {card.tags.map((t) => (
                        <Badge key={t} size="xs" variant="dot" color="gray">
                          {t}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Paper>
              </Tooltip>
            ))}
          </SimpleGrid>

          <Stack align="center" gap="xs">
            <Button
              size="md"
              rightSection={<IconArrowRight size={16} />}
              component={Link}
              href="/auth/signup"
            >
              Добавить свои карточки →
            </Button>
            <Text size="xs" c="dimmed">
              Бесплатно, без кредитной карты
            </Text>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
