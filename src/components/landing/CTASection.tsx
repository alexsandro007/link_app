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
} from '@mantine/core';
import { IconArrowRight, IconPlayerPlay } from '@tabler/icons-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export function CTASection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <Box
      py={80}
      style={{
        background:
          'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-body) 100%)',
      }}
    >
      <Container size="sm">
        <Stack
          ref={ref}
          align="center"
          ta="center"
          gap="xl"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <Title order={2} style={{ fontSize: 'clamp(1.5rem, 3vw, 2.4rem)' }}>
            Готовы навести порядок?
          </Title>
          <Text c="dimmed" size="md" maw={400}>
            Добавьте первую карточку прямо сейчас — займёт меньше минуты.
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
              leftSection={<IconPlayerPlay size={16} />}
              component={Link}
              href="/auth/signin"
            >
              Уже есть аккаунт
            </Button>
          </Group>

          <Text size="xs" c="dimmed">
            Никакой кредитной карты. 1 клик до регистрации.
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}
