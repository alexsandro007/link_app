'use client';

import {
  Box,
  Container,
  Title,
  Text,
  Stack,
  Paper,
  Group,
  Avatar,
  rem,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import { IconStar } from '@tabler/icons-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { TESTIMONIALS } from '@/lib/landing-data';

function StarRating({ count }: { count: number }) {
  return (
    <Group gap={2}>
      {Array.from({ length: count }).map((_, i) => (
        <IconStar
          key={i}
          size={14}
          fill="var(--mantine-color-yellow-5)"
          color="var(--mantine-color-yellow-5)"
        />
      ))}
    </Group>
  );
}

export function TestimonialsSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <Box
      py={80}
      style={{ background: 'var(--mantine-color-gray-0, var(--mantine-color-dark-8))' }}
    >
      <Container size="lg">
        <Stack gap={48}>
          <Stack align="center" ta="center" gap="sm">
            <Title order={2} style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
              Что говорят пользователи
            </Title>
            <Text size="md" c="dimmed" maw={480}>
              Реальные сценарии — как люди используют Linkery каждый день.
            </Text>
          </Stack>

          <Box
            ref={ref}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            <Carousel
              withIndicators
              withControls
              slideSize={{ base: '100%', sm: '50%', md: '33.333%' }}
              slideGap="md"
              styles={{
                indicator: {
                  width: rem(8),
                  height: rem(8),
                  background: 'var(--mantine-color-blue-3)',
                  '&[dataActive]': {
                    background: 'var(--mantine-color-blue-6)',
                    width: rem(20),
                  },
                },
                indicators: { bottom: -32 },
              }}
            >
              {TESTIMONIALS.map((t) => (
                <Carousel.Slide key={t.name}>
                  <Paper
                    withBorder
                    p="lg"
                    radius="md"
                    h="100%"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <StarRating count={t.rating} />
                    <Text size="sm" lh={1.7} style={{ flex: 1 }}>
                      &ldquo;{t.text}&rdquo;
                    </Text>
                    <Group gap="sm" mt="auto">
                      <Avatar size={36} color={t.color} radius="xl">
                        {t.avatar}
                      </Avatar>
                      <Stack gap={0}>
                        <Text size="sm" fw={600}>
                          {t.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {t.role}
                        </Text>
                      </Stack>
                    </Group>
                  </Paper>
                </Carousel.Slide>
              ))}
            </Carousel>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
