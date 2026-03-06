'use client';

import {
  Box,
  Container,
  Title,
  Text,
  Stack,
  Accordion,
} from '@mantine/core';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { FAQ } from '@/lib/landing-data';

export function FAQSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <Container size="md" py={80}>
      <Stack gap={48}>
        <Stack align="center" ta="center" gap="sm">
          <Title order={2} style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
            Часто задаваемые вопросы
          </Title>
          <Text size="md" c="dimmed" maw={480}>
            Нет вопроса — нет сомнений. Но если есть — вот ответы.
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
        <Accordion
          variant="separated"
          radius="md"
        >
          {FAQ.map((item, idx) => (
            <Accordion.Item
              key={item.question}
              value={item.question}
              style={{ transitionDelay: `${idx * 0.07}s` }}
            >
              <Accordion.Control>
                <Text fw={600} size="sm">
                  {item.question}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm" c="dimmed" lh={1.7}>
                  {item.answer}
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
        </Box>
      </Stack>
    </Container>
  );
}
