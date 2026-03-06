'use client';

import {
  Box,
  Container,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { FOR_WHOM } from '@/lib/landing-data';

export function ForWhomSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <Box py={80} style={{ background: 'var(--mantine-color-gray-0, var(--mantine-color-dark-8))' }}>
      <Container size="lg">
        <Stack gap={48}>
          <Stack align="center" ta="center" gap="sm">
            <Title order={2} style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
              Для кого это?
            </Title>
            <Text size="md" c="dimmed" maw={480}>
              Всё, что попадает во вкладки &laquo;сохранить на потом&raquo; — теперь в порядке.
            </Text>
          </Stack>

          <SimpleGrid
            ref={ref}
            cols={{ base: 1, sm: 2 }}
            spacing="md"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            {FOR_WHOM.map((item) => (
              <Paper
                key={item.title}
                withBorder
                p="lg"
                radius="md"
                style={{
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    '0 8px 24px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                <Stack gap="sm">
                  <ThemeIcon size={48} radius="md" color={item.color} variant="light">
                    <item.icon size={24} />
                  </ThemeIcon>
                  <Text fw={700} size="md">
                    {item.title}
                  </Text>
                  <Text size="sm" c="dimmed" lh={1.6}>
                    {item.description}
                  </Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  );
}
