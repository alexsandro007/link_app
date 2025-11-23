'use client';

import { Container, Title, Text, Stack } from '@mantine/core';
import { useAuth } from '@/contexts/AuthContext';
import { withAuth } from '@/components/ProtectedRoute';

function DashboardPage() {
  const { user } = useAuth();

  return (
    <Container size="md" py={40}>
      <Stack gap="xl">
        <Title order={1}>Dashboard</Title>
        <Text size="lg">
          Привет, {user?.email}! Это защищенная страница.
        </Text>
        <Text c="dimmed">
          Эта страница доступна только авторизованным пользователям.
        </Text>
      </Stack>
    </Container>
  );
}

export default withAuth(DashboardPage);
