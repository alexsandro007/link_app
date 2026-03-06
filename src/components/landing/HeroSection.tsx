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
  ThemeIcon,
  Avatar,
  SimpleGrid,
  rem,
} from '@mantine/core';
import {
  IconArrowRight,
  IconStar,
  IconLink,
  IconTag,
  IconPhoto,
  IconBookmark,
} from '@tabler/icons-react';

// Мок-дашборд: несколько карточек внутри стилизованного фрейма
function DashboardMockup() {
  const MOCK_CARDS = [
    {
      title: 'Apple AirPods Pro (2-го поколения)',
      site: 'apple.com',
      category: 'Гаджеты',
      categoryColor: 'blue',
      price: '19 990 ₽',
      tags: ['избранное', 'подарок'],
      bg: '#e3f2fd',
      fg: '#1565c0',
    },
    {
      title: 'Диван угловой Лагом IKEA',
      site: 'ikea.com',
      category: 'Дом',
      categoryColor: 'teal',
      price: '54 990 ₽',
      tags: ['мебель', 'отложено'],
      bg: '#e8f5e9',
      fg: '#1b5e20',
    },
    {
      title: 'React — документация по хукам',
      site: 'react.dev',
      category: 'Разработка',
      categoryColor: 'grape',
      price: null,
      tags: ['обучение', 'react'],
      bg: '#f3e5f5',
      fg: '#4a148c',
    },
  ];

  return (
    <Paper
      radius="xl"
      withBorder
      style={{
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
        transition: 'transform 0.3s ease',
      }}
      className="dashboard-mockup"
    >
      {/* Строка "браузера" */}
      <Box
        style={{
          background: 'var(--mantine-color-default-hover)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Box
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#ff5f57',
          }}
        />
        <Box
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#febc2e',
          }}
        />
        <Box
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#28c840',
          }}
        />
        <Box
          style={{
            flex: 1,
            marginLeft: 8,
            background: 'var(--mantine-color-body)',
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: 11,
            color: 'var(--mantine-color-dimmed)',
          }}
        >
          linkery.app/dashboard
        </Box>
      </Box>

      {/* Контент дашборда */}
      <Box p="md" style={{ background: 'var(--mantine-color-body)' }}>
        {/* Поиск-строка */}
        <Box
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <IconLink size={14} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed">
            Поиск по карточкам...
          </Text>
        </Box>
        <SimpleGrid cols={3} spacing={10}>
          {MOCK_CARDS.map((card) => (
            <Paper
              key={card.title}
              withBorder
              radius="md"
              style={{ overflow: 'hidden', fontSize: 11 }}
            >
              {/* Цветной плейсхолдер */}
              <Box
                h={60}
                style={{
                  background: `linear-gradient(135deg, ${card.bg} 0%, ${card.bg}cc 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconBookmark
                  size={20}
                  stroke={1.2}
                  style={{ color: card.fg, opacity: 0.4 }}
                />
              </Box>
              <Box p={8}>
                <Badge
                  size="xs"
                  variant="light"
                  color={card.categoryColor}
                  mb={4}
                >
                  {card.category}
                </Badge>
                <Text
                  size="xs"
                  fw={600}
                  lineClamp={2}
                  style={{ lineHeight: 1.3, marginBottom: 4 }}
                >
                  {card.title}
                </Text>
                <Text size="xs" c="dimmed">
                  {card.site}
                </Text>
                {card.price && (
                  <Text size="xs" fw={700} c="teal" mt={2}>
                    {card.price}
                  </Text>
                )}
                <Group gap={3} mt={4}>
                  {card.tags.map((t) => (
                    <Badge
                      key={t}
                      size="xs"
                      variant="dot"
                      color="gray"
                      style={{ fontSize: 9 }}
                    >
                      {t}
                    </Badge>
                  ))}
                </Group>
              </Box>
            </Paper>
          ))}
        </SimpleGrid>
      </Box>
    </Paper>
  );
}

export function HeroSection() {
  return (
    <Box
      py={{ base: 60, md: 80 }}
      style={{
        background:
          'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-body) 60%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Container size="lg">
        <Group gap={48} wrap="wrap" justify="space-between" align="center">
          {/* Левая часть — текст */}
          <Stack gap="xl" style={{ flex: '1 1 320px', maxWidth: 520 }}>
            <Badge
              size="lg"
              variant="light"
              leftSection={<IconStar size={13} />}
            >
              Бесплатно · Приватно · Всегда под рукой
            </Badge>

            <Title
              order={1}
              style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)', lineHeight: 1.15 }}
            >
              Запоминайте.{' '}
              <Text component="span" c="blue" inherit>
                Организуйте.
              </Text>{' '}
              Находите.
            </Title>

            <Text size="lg" c="dimmed" lh={1.7}>
              Сохраняйте товары, ссылки и статьи с ценами, фото и тегами.
              Быстрый поиск. Полная приватность. Экспорт в CSV и JSON.
            </Text>

            <Stack gap="xs">
              <Group gap="md">
                <Button
                  size="lg"
                  rightSection={<IconArrowRight size={18} />}
                  component={Link}
                  href="/auth/signup"
                >
                  Начать бесплатно
                </Button>
                <Button
                  size="lg"
                  variant="default"
                  component={Link}
                  href="/auth/signin"
                >
                  Войти
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                Никакой кредитной карты. Только email и пароль.
              </Text>
            </Stack>

            {/* Мини-фичи */}
            <Group gap="lg" wrap="wrap">
              {[
                { icon: IconTag, text: 'Категории и теги' },
                { icon: IconPhoto, text: 'Фото-карусель' },
                { icon: IconLink, text: 'Быстрый поиск' },
              ].map(({ icon: Icon, text }) => (
                <Group key={text} gap={6}>
                  <ThemeIcon size={20} radius="xl" color="blue" variant="light">
                    <Icon size={12} />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed">
                    {text}
                  </Text>
                </Group>
              ))}
            </Group>
          </Stack>

          {/* Правая часть — мок-дашборд */}
          <Box
            style={{
              flex: '1 1 340px',
              maxWidth: 600,
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            <DashboardMockup />

            {/* Плавающие бейджи поверх */}
            <Box
              style={{
                position: 'absolute',
                bottom: rem(80),
                right: rem(-12),
                display: 'none', // показывать только на md+
              }}
            >
              <Paper
                shadow="md"
                p="xs"
                radius="md"
                withBorder
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Avatar size="sm" color="green" radius="xl">
                  ✓
                </Avatar>
                <Text size="xs" fw={600}>
                  3 карточки добавлено
                </Text>
              </Paper>
            </Box>
          </Box>
        </Group>
      </Container>
    </Box>
  );
}
