'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@mantine/form';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Anchor,
  Stack,
  Alert,
} from '@mantine/core';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface SignInFormValues {
  email: string;
  password: string;
}

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SignInFormValues>({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => {
        if (!value) return 'Email обязателен';
        if (!/^\S+@\S+\.\S+$/.test(value)) return 'Введите корректный email';
        return null;
      },
      password: (value) => {
        if (!value) return 'Пароль обязателен';
        if (value.length < 6) return 'Пароль должен содержать минимум 6 символов';
        return null;
      },
    },
  });

  const handleSubmit = async (values: SignInFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await signIn(values.email, values.password);

      if (signInError) {
        setError(signInError.message || 'Ошибка при входе');
        return;
      }

      // Успешный вход
      router.push('/');
      router.refresh();
    } catch (err) {
      setError('Произошла непредвиденная ошибка');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" style={{ fontWeight: 900 }}>
        Добро пожаловать!
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Нет аккаунта?{' '}
        <Anchor size="sm" component={Link} href="/auth/signup">
          Зарегистрируйтесь
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            {error && (
              <Alert color="red" title="Ошибка">
                {error}
              </Alert>
            )}

            <TextInput
              label="Email"
              placeholder="your@email.com"
              required
              withAsterisk
              {...form.getInputProps('email')}
            />

            <PasswordInput
              label="Пароль"
              placeholder="Ваш пароль"
              required
              withAsterisk
              {...form.getInputProps('password')}
            />

            <Button type="submit" fullWidth loading={loading}>
              Войти
            </Button>

            <Text size="sm" ta="center">
              <Anchor component={Link} href="/auth/forgot-password" size="sm">
                Забыли пароль?
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
