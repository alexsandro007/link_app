'use client';

import { useState } from 'react';
import { useForm } from '@mantine/form';
import {
  TextInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Anchor,
  Stack,
  Alert,
} from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: { email: '' },
    validate: {
      email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Введите корректный email'),
    },
  });

  const handleSubmit = async ({ email }: { email: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (err) {
        setError('Не удалось отправить письмо. Проверьте email и попробуйте ещё раз.');
      } else {
        setSent(true);
      }
    } catch {
      setError('Ошибка сети. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} py={80}>
      <Title ta="center" order={2} mb="xs">
        Восстановление пароля
      </Title>
      <Text ta="center" c="dimmed" size="sm" mb="lg">
        Введите ваш email — мы отправим ссылку для сброса пароля.
      </Text>

      <Paper withBorder shadow="sm" p="xl" radius="md">
        {sent ? (
          <Stack gap="md">
            <Alert icon={<IconCheck size={16} />} color="teal" title="Письмо отправлено">
              Проверьте почту и перейдите по ссылке в письме. Ссылка действительна 1 час.
            </Alert>
            <Text size="sm" ta="center" c="dimmed">
              Не пришло письмо? Проверьте папку «Спам».
            </Text>
            <Anchor component={Link} href="/auth/signin" size="sm" ta="center">
              Вернуться ко входу
            </Anchor>
          </Stack>
        ) : (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red">
                  {error}
                </Alert>
              )}

              <TextInput
                label="Email"
                placeholder="you@example.com"
                type="email"
                required
                autoFocus
                {...form.getInputProps('email')}
              />

              <Button type="submit" fullWidth loading={loading}>
                Отправить ссылку
              </Button>

              <Text size="sm" ta="center">
                <Anchor component={Link} href="/auth/signin" size="sm">
                  Вернуться ко входу
                </Anchor>
              </Text>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  );
}
