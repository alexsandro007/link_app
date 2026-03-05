'use client';

import {
  AppShell,
  Group,
  Title,
  NavLink,
  Button,
  Text,
  Burger,
  ActionIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconCards, IconSettings, IconLogout, IconBookmarks, IconCategory, IconSun, IconMoon } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/signin');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 210,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      {/* ── Шапка ───────────────────────────────────────────────────── */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Group gap={6}>
              <IconBookmarks size={22} stroke={1.8} />
              <Title order={4} style={{ letterSpacing: -0.3 }}>
                Linkery
              </Title>
            </Group>
          </Link>
          </Group>

          <Group gap="xs">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark')}
              aria-label="Переключить тему"
              size="sm"
            >
              {computedColorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
            </ActionIcon>
            <Text size="sm" c="dimmed" visibleFrom="sm">
              {user?.email}
            </Text>
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconLogout size={15} />}
              onClick={handleSignOut}
              size="xs"
            >
              Выйти
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      {/* ── Боковое меню ────────────────────────────────────────────── */}
      <AppShell.Navbar p="xs">
        <NavLink
          component={Link}
          href="/dashboard"
          label="Карточки"
          leftSection={<IconCards size={16} />}
          active={pathname === '/dashboard'}
          style={{ borderRadius: 6 }}
        />
        <NavLink
          component={Link}
          href="/categories"
          label="Категории"
          leftSection={<IconCategory size={16} />}
          active={pathname.startsWith('/categories')}
          style={{ borderRadius: 6 }}
        />
        <NavLink
          component={Link}
          href="/settings"
          label="Настройки"
          leftSection={<IconSettings size={16} />}
          active={pathname === '/settings'}
          style={{ borderRadius: 6 }}
        />
      </AppShell.Navbar>

      {/* ── Основной контент ─────────────────────────────────────────── */}
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
