'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  Container,
  Title,
  Text,
  Stack,
  Group,
  SimpleGrid,
  ThemeIcon,
  Paper,
  Box,
  Divider,
  Badge,
  Center,
  Loader,
} from '@mantine/core';
import {
  IconBookmarks,
  IconSearch,
  IconTag,
  IconPhoto,
  IconDownload,
  IconShieldLock,
  IconArrowRight,
  IconStar,
  IconLink,
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';

// ── Фичи ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: IconLink,
    color: 'blue',
    title: 'Сохраняйте ссылки',
    description:
      'Добавляйте ссылки на товары, статьи и ресурсы с названием, ценой и заметками — всё в одном месте.',
  },
  {
    icon: IconTag,
    color: 'grape',
    title: 'Категории и теги',
    description:
      'Организуйте карточки по категориям и тегам, чтобы быстро находить нужное.',
  },
  {
    icon: IconSearch,
    color: 'teal',
    title: 'Быстрый поиск',
    description:
      'Полнотекстовый поиск по названию и заметкам — результаты появляются мгновенно.',
  },
  {
    icon: IconPhoto,
    color: 'orange',
    title: 'Изображения',
    description:
      'Прикрепляйте фото товаров и скриншоты — перетащите файл или выберите с диска.',
  },
  {
    icon: IconDownload,
    color: 'green',
    title: 'Экспорт данных',
    description:
      'Скачайте все свои данные в JSON или CSV. Ваша информация всегда под вашим контролем.',
  },
  {
    icon: IconShieldLock,
    color: 'red',
    title: 'Только ваши данные',
    description:
      'Каждый пользователь видит только свои карточки. Безопасность обеспечивается на уровне базы данных.',
  },
];

// ── Компонент фичи ────────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  color,
  title,
  description,
}: (typeof FEATURES)[number]) {
  return (
    <Paper withBorder p="lg" radius="md">
      <Stack gap="sm">
        <ThemeIcon size={44} radius="md" color={color} variant="light">
          <Icon size={22} />
        </ThemeIcon>
        <Text fw={600} size="md">
          {title}
        </Text>
        <Text size="sm" c="dimmed" lh={1.6}>
          {description}
        </Text>
      </Stack>
    </Paper>
  );
}

// ── Главная страница ───────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Авторизованных пользователей сразу отправляем в дашборд
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // Пока проверяем сессию — показываем спиннер
  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  // Если уже авторизован — будет редирект, ничего не рендерим
  if (user) return null;

  return (
    <Box>
      {/* ── Шапка ───────────────────────────────────────────────────────── */}
      <Box
        component="header"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          position: 'sticky',
          top: 0,
          background: 'var(--mantine-color-body)',
          zIndex: 100,
        }}
      >
        <Container size="lg">
          <Group h={60} justify="space-between">
            <Group gap={8}>
              <IconBookmarks size={22} stroke={1.8} />
              <Text fw={700} size="lg" style={{ letterSpacing: -0.3 }}>
                Linkery
              </Text>
            </Group>
            <Group gap="sm">
              <Button variant="subtle" component={Link} href="/auth/signin" size="sm">
                Войти
              </Button>
              <Button component={Link} href="/auth/signup" size="sm">
                Регистрация
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <Box
        py={80}
        style={{
          background:
            'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-body) 60%)',
        }}
      >
        <Container size="md">
          <Stack align="center" gap="xl" ta="center">
            <Badge size="lg" variant="light" leftSection={<IconStar size={13} />}>
              Бесплатно · Приватно · Всегда под рукой
            </Badge>

            <Title
              order={1}
              style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.15 }}
            >
              Ваша личная база{' '}
              <Text component="span" c="blue" inherit>
                находок
              </Text>{' '}
              из интернета
            </Title>

            <Text size="lg" c="dimmed" maw={520} lh={1.7}>
              Сохраняйте товары, ссылки, ресурсы и обзоры. Добавляйте цены, заметки,
              изображения и теги. Находите за секунды.
            </Text>

            <Group gap="md" justify="center">
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
                Войти в аккаунт
              </Button>
            </Group>

            <Text size="xs" c="dimmed">
              Регистрация занимает меньше минуты — только email и пароль
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* ── Фичи ────────────────────────────────────────────────────────── */}
      <Container size="lg" py={80}>
        <Stack gap={48}>
          <Stack align="center" ta="center" gap="sm">
            <Title order={2}>Всё что нужно для организации находок</Title>
            <Text size="md" c="dimmed" maw={480}>
              Никаких лишних функций — только то, что реально помогает сохранять
              и находить нужное.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </SimpleGrid>
        </Stack>
      </Container>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <Box py={64} style={{ background: 'var(--mantine-color-blue-0)' }}>
        <Container size="sm">
          <Stack align="center" ta="center" gap="xl">
            <Title order={2}>Готовы начать?</Title>
            <Text c="dimmed" size="md">
              Создайте аккаунт и добавьте первую карточку уже сейчас.
            </Text>
            <Button
              size="lg"
              rightSection={<IconArrowRight size={18} />}
              component={Link}
              href="/auth/signup"
            >
              Зарегистрироваться бесплатно
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ── Футер ───────────────────────────────────────────────────────── */}
      <Divider />
      <Container size="lg" py="md">
        <Group justify="space-between" wrap="wrap">
          <Group gap={6}>
            <IconBookmarks size={16} />
            <Text size="sm" c="dimmed">
              Linkery — ваша приватная коллекция находок
            </Text>
          </Group>
          <Group gap="md">
            <Text
              component={Link}
              href="/auth/signin"
              size="sm"
              c="dimmed"
              style={{ textDecoration: 'none' }}
            >
              Войти
            </Text>
            <Text
              component={Link}
              href="/auth/signup"
              size="sm"
              c="dimmed"
              style={{ textDecoration: 'none' }}
            >
              Регистрация
            </Text>
            <Text
              component="a"
              href="/api/docs"
              size="sm"
              c="dimmed"
              style={{ textDecoration: 'none' }}
            >
              API
            </Text>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
