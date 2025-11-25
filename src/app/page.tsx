'use client';

import { Button, Container, Title, Text, Stack, Group } from '@mantine/core';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/signin');
  };

  return (
    <Container size="md" py={40}>
      <Stack gap="xl">
        <Title order={1}>Добро пожаловать в Linkery</Title>
        
        {user ? (
          <>
            <Text size="lg">
              Вы вошли как: <strong>{user.email}</strong>
            </Text>
            <Group>
              <Button onClick={handleSignOut} variant="outline">
                Выйти
              </Button>
              <Button onClick={() => router.push('/dashboard')} variant="filled">
                Перейти в Dashboard
              </Button>
            </Group>
          </>
        ) : (
          <>
            <Text size="lg">
              Пожалуйста, войдите в систему или зарегистрируйтесь
            </Text>
            <Group>
              <Button onClick={() => router.push('/auth/signin')} variant="filled">
                Войти
              </Button>
              <Button onClick={() => router.push('/auth/signup')} variant="outline">
                Регистрация
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Container>
  );
}
