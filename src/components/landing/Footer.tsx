'use client';

import Link from 'next/link';
import {
  Box,
  Container,
  Divider,
  Group,
  Text,
  Stack,
  SimpleGrid,
} from '@mantine/core';
import { IconBookmarks } from '@tabler/icons-react';

const FOOTER_LINKS = [
  {
    title: 'Продукт',
    links: [
      { label: 'Дашборд', href: '/dashboard' },
      { label: 'Категории', href: '/categories' },
      { label: 'API', href: '/api/docs' },
    ],
  },
  {
    title: 'Аккаунт',
    links: [
      { label: 'Войти', href: '/auth/signin' },
      { label: 'Регистрация', href: '/auth/signup' },
      { label: 'Настройки', href: '/settings' },
    ],
  },
  {
    title: 'Правовые',
    links: [
      { label: 'Политика конфиденциальности', href: '#' },
      { label: 'Условия использования', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <Box component="footer">
      <Divider />
      <Container size="lg" py={48}>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing={32} mb={40}>
          {/* Бренд */}
          <Stack gap="sm">
            <Group gap={8}>
              <IconBookmarks
                size={20}
                stroke={1.8}
                color="var(--mantine-color-blue-6)"
              />
              <Text fw={700} size="md" style={{ letterSpacing: -0.3 }}>
                Linkery
              </Text>
            </Group>
            <Text size="sm" c="dimmed" lh={1.6}>
              Ваша приватная коллекция находок из интернета.
            </Text>
          </Stack>

          {/* Колонки ссылок */}
          {FOOTER_LINKS.map((col) => (
            <Stack key={col.title} gap={8}>
              <Text size="sm" fw={600} mb={4}>
                {col.title}
              </Text>
              {col.links.map((link) => (
                <Text
                  key={link.label}
                  component={Link}
                  href={link.href}
                  size="sm"
                  c="dimmed"
                  style={{ textDecoration: 'none' }}
                >
                  {link.label}
                </Text>
              ))}
            </Stack>
          ))}
        </SimpleGrid>

        <Divider mb="md" />
        <Group justify="space-between" wrap="wrap">
          <Text size="xs" c="dimmed">
            © {new Date().getFullYear()} Linkery. Все права защищены.
          </Text>
          <Text size="xs" c="dimmed">
            Сделано с ♥ на Next.js + Mantine + Supabase
          </Text>
        </Group>
      </Container>
    </Box>
  );
}
