'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@mantine/form';
import {
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Anchor,
  Stack,
  Alert,
  Loader,
  Center,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);

  // Supabase вставляет токен в hash (#access_token=...).
  // После того как SDK обработает его через onAuthStateChange, сессия будет готова.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      } else if (event === 'SIGNED_IN' && !ready) {
        // Перехватываем если пользователь уже автоматически залогинился по ссылке
        setReady(true);
      }
    });

    // Если через 3 секунды событие не пришло — ссылка невалидна или устарела
    const timer = setTimeout(() => {
      setInvalidLink(true);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [ready]);

  const form = useForm({
    initialValues: { password: '', confirm: '' },
    validate: {
      password: (v) => (v.length >= 8 ? null : 'Пароль должен быть не менее 8 символов'),
      confirm: (v, values) => (v === values.password ? null : 'Пароли не совпадают'),
    },
  });

  const handleSubmit = async ({ password }: { password: string; confirm: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
      } else {
        await supabase.auth.signOut();
        router.replace('/auth/signin?reset=success');
      }
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  if (invalidLink && !ready) {
    return (
      <Container size={420} py={80}>
        <Paper withBorder shadow="sm" p="xl" radius="md">
          <Stack gap="md">
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Ссылка недействительна">
              Ссылка для сброса пароля устарела или уже была использована. Запросите новую.
            </Alert>
            <Anchor component={Link} href="/auth/forgot-password" size="sm" ta="center">
              Запросить новую ссылку
            </Anchor>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (!ready) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size={420} py={80}>
      <Title ta="center" order={2} mb="xs">
        Новый пароль
      </Title>
      <Text ta="center" c="dimmed" size="sm" mb="lg">
        Придумайте надёжный пароль для вашего аккаунта.
      </Text>

      <Paper withBorder shadow="sm" p="xl" radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            <PasswordInput
              label="Новый пароль"
              placeholder="Минимум 8 символов"
              required
              autoFocus
              {...form.getInputProps('password')}
            />
            <PasswordInput
              label="Повторите пароль"
              placeholder="Повторите новый пароль"
              required
              {...form.getInputProps('confirm')}
            />

            <Button type="submit" fullWidth loading={loading}>
              Сохранить пароль
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
