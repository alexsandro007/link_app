'use client';

import {
  Box,
  Container,
  Title,
  Text,
  Stack,
  Group,
  ThemeIcon,
  Paper,
  rem,
} from '@mantine/core';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { HOW_IT_WORKS } from '@/lib/landing-data';

export function HowItWorksSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <Container size="lg" py={80}>
      <Stack gap={56}>
        <Stack align="center" ta="center" gap="sm">
          <Title order={2} style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
            Как это работает?
          </Title>
          <Text size="md" c="dimmed" maw={480}>
            Четыре простых шага — от хаоса в закладках до удобной коллекции.
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
          {/* Desktop: горизонтальная лента */}
          <Group
            align="flex-start"
            gap={0}
            wrap="nowrap"
            visibleFrom="sm"
            style={{ position: 'relative' }}
          >
            {/* Соединительная линия */}
            <Box
              style={{
                position: 'absolute',
                top: rem(28),
                left: '12.5%',
                right: '12.5%',
                height: 2,
                background:
                  'linear-gradient(to right, var(--mantine-color-blue-3), var(--mantine-color-green-3))',
                zIndex: 0,
              }}
            />
            {HOW_IT_WORKS.map((step, idx) => (
              <Stack
                key={step.step}
                align="center"
                ta="center"
                gap="sm"
                style={{
                  flex: 1,
                  position: 'relative',
                  zIndex: 1,
                  transitionDelay: `${idx * 0.1}s`,
                }}
              >
                <ThemeIcon
                  size={56}
                  radius="xl"
                  color={step.color}
                  variant="filled"
                  style={{
                    border: '3px solid var(--mantine-color-body)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  }}
                >
                  <step.icon size={24} />
                </ThemeIcon>
                <Stack gap={4}>
                  <Text fw={700} size="sm">
                    {step.step}. {step.title}
                  </Text>
                  <Text size="xs" c="dimmed" maw={150} mx="auto" lh={1.5}>
                    {step.description}
                  </Text>
                </Stack>
              </Stack>
            ))}
          </Group>

          {/* Mobile: вертикальный список */}
          <Stack gap="md" hiddenFrom="sm">
            {HOW_IT_WORKS.map((step) => (
              <Paper key={step.step} withBorder p="md" radius="md">
                <Group gap="md" align="flex-start">
                  <ThemeIcon size={44} radius="md" color={step.color} variant="light">
                    <step.icon size={22} />
                  </ThemeIcon>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Text fw={700} size="sm">
                      Шаг {step.step}: {step.title}
                    </Text>
                    <Text size="sm" c="dimmed" lh={1.5}>
                      {step.description}
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
