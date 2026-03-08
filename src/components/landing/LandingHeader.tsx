'use client';

import Link from 'next/link';
import {
  Box,
  Container,
  Group,
  Text,
  Button,
  ActionIcon,
} from '@mantine/core';
import { IconBookmarks, IconSun, IconMoon } from '@tabler/icons-react';
import { useComputedColorScheme, useMantineColorScheme } from '@mantine/core';

export function LandingHeader() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  });

  return (
    <Box
      component="header"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        position: 'sticky',
        top: 0,
        background: 'var(--mantine-color-body)',
        zIndex: 100,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Container size="lg">
        <Group h={60} justify="space-between">
          <Group gap={8}>
            <IconBookmarks size={22} stroke={1.8} color="var(--mantine-color-blue-6)" />
            <Text fw={700} size="lg" style={{ letterSpacing: -0.3 }}>
              Linkery
            </Text>
          </Group>
          <Group gap={4}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              aria-label="Переключить тему"
              onClick={() =>
                setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark')
              }
            >
              {computedColorScheme === 'dark' ? (
                <IconSun size={20} />
              ) : (
                <IconMoon size={20} />
              )}
            </ActionIcon>
            <Button variant="outline" component={Link} href="/auth/signin" size="sm">
              Войти
            </Button>
            <Button component={Link} href="/auth/signup" size="sm">
              Регистрация
            </Button>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
