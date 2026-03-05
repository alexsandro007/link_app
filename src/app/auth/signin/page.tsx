'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { IconCheck } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface SignInFormValues {
  email: string;
  password: string;
}

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordReset = searchParams.get('reset') === 'success';
  const callbackError = searchParams.get('error');
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    callbackError === 'auth_callback_failed' || callbackError === 'missing_code'
      ? 'Ссылка недействительна или устарела. Запросите новую ссылку.'
      : null,
  );

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
        const msg = signInError.message ?? '';
        if (msg.toLowerCase().includes('invalid login')) {
          setError('Неверный email или пароль');
        } else if (msg.toLowerCase().includes('email not confirmed')) {
          setError('Email не подтверждён. Проверьте почту и перейдите по ссылке из письма.');
        } else {
          setError(msg || 'Ошибка при входе');
        }
        return;
      }

      // Успешный вход
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      const isOffline =
        err instanceof TypeError && err.message.toLowerCase().includes('fetch');
      setError(
        isOffline
          ? 'Нет подключения к интернету. Проверьте сеть и попробуйте снова.'
          : 'Произошла непредвиденная ошибка',
      );
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
            {passwordReset && (
              <Alert icon={<IconCheck size={16} />} color="teal" title="Пароль изменён">
                Вы успешно сбросили пароль. Войдите с новым паролем.
              </Alert>
            )}
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
