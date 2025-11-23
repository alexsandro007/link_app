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

interface SignUpFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<SignUpFormValues>({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      email: (value) => {
        if (!value) return 'Email обязателен';
        if (!/^\S+@\S+\.\S+$/.test(value)) return 'Введите корректный email';
        const [local, domain] = value.split('@');
        if (!local || local.length < 2) return 'Email слишком короткий';
        if (!domain || !domain.includes('.')) return 'Введите полный email адрес';
        return null;
      },
      password: (value) => {
        if (!value) return 'Пароль обязателен';
        if (value.length < 6) return 'Пароль должен содержать минимум 6 символов';
        if (!/[A-Za-z]/.test(value)) return 'Пароль должен содержать хотя бы одну букву';
        if (!/[0-9]/.test(value)) return 'Пароль должен содержать хотя бы одну цифру';
        return null;
      },
      confirmPassword: (value, values) => {
        if (!value) return 'Подтверждение пароля обязательно';
        if (value !== values.password) return 'Пароли не совпадают';
        return null;
      },
    },
  });

  const handleSubmit = async (values: SignUpFormValues) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: signUpError } = await signUp(values.email, values.password);

      if (signUpError) {
        // Переводим распространенные ошибки на русский
        let errorMessage = signUpError.message;
        
        if (signUpError.message.includes('invalid')) {
          errorMessage = 'Некорректный email адрес. Используйте реальный email (например, example@gmail.com)';
        } else if (signUpError.message.includes('already registered')) {
          errorMessage = 'Этот email уже зарегистрирован. Попробуйте войти.';
        }
        
        setError(errorMessage);
        return;
      }

      setSuccess(true);
      form.reset();
      
      // Перенаправляем на страницу входа через несколько секунд
      setTimeout(() => {
        router.push('/auth/signin');
      }, 3000);
    } catch (err) {
      setError('Произошла непредвиденная ошибка');
      console.error('Sign up error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" style={{ fontWeight: 900 }}>
        Регистрация
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Уже есть аккаунт?{' '}
        <Anchor size="sm" component={Link} href="/auth/signin">
          Войти
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

            {success && (
              <Alert color="green" title="Успешно!">
                Регистрация прошла успешно. Проверьте email для подтверждения.
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
              description="Минимум 6 символов, должен содержать буквы и цифры"
              {...form.getInputProps('password')}
            />

            <PasswordInput
              label="Подтвердите пароль"
              placeholder="Повторите пароль"
              required
              withAsterisk
              {...form.getInputProps('confirmPassword')}
            />

            <Button type="submit" fullWidth loading={loading}>
              Зарегистрироваться
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
