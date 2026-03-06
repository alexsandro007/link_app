'use client';

import {
  Box,
  Container,
  Title,
  Text,
  Stack,
  SimpleGrid,
} from '@mantine/core';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { STATS } from '@/lib/landing-data';

export function StatsSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <Box
      py={64}
      style={{
        background:
          'linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-blue-8) 100%)',
      }}
    >
      <Container size="lg">
        <SimpleGrid
          ref={ref}
          cols={{ base: 2, md: 4 }}
          spacing="xl"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          {STATS.map((stat) => (
            <Stack key={stat.label} align="center" ta="center" gap={4}>
              <Title
                order={2}
                style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#fff' }}
              >
                {stat.value}
              </Title>
              <Text size="sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {stat.label}
              </Text>
            </Stack>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
