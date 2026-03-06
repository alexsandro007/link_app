'use client';

import {
  Container,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { FEATURES } from '@/lib/landing-data';

export function FeaturesSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <Container size="lg" py={80}>
      <Stack gap={48}>
        <Stack align="center" ta="center" gap="sm">
          <Title order={2} style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
            Всё для вашей коллекции
          </Title>
          <Text size="md" c="dimmed" maw={480}>
            Никаких лишних функций — только то, что реально помогает сохранять и находить нужное.
          </Text>
        </Stack>

        <SimpleGrid
          ref={ref}
          cols={{ base: 1, sm: 2, md: 3 }}
          spacing="md"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          {FEATURES.map((f) => (
            <Paper
              key={f.title}
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
                <ThemeIcon size={44} radius="md" color={f.color} variant="light">
                  <f.icon size={22} />
                </ThemeIcon>
                <Text fw={600} size="md">
                  {f.title}
                </Text>
                <Text size="sm" c="dimmed" lh={1.6}>
                  {f.description}
                </Text>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
