'use client';

import {
  Stack,
  Group,
  Title,
  Text,
  Paper,
  Avatar,
  TextInput,
  Button,
  Divider,
  SimpleGrid,
  ThemeIcon,
  Badge,
  Modal,
  Center,
  Loader,
  Alert,
  ActionIcon,
  Tooltip,
  Box,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCards,
  IconCategory,
  IconArchive,
  IconWorld,
  IconAlertTriangle,
  IconCheck,
  IconUpload,
  IconTrash,
} from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { withAuth } from '@/components/ProtectedRoute';
import { useProfile } from '@/hooks/useProfile';
import { uploadViaServer } from '@/lib/supabase/storage';

// ── Предустановленные аватарки ────────────────────────────────────────────────

const PRESET_AVATARS = [
  { id: 1,  emoji: '🦊', label: 'Лиса'       },
  { id: 2,  emoji: '🐼', label: 'Панда'      },
  { id: 3,  emoji: '🦁', label: 'Лев'        },
  { id: 4,  emoji: '🐸', label: 'Лягушка'    },
  { id: 5,  emoji: '🐙', label: 'Осьминог'   },
  { id: 6,  emoji: '🦋', label: 'Бабочка'    },
  { id: 7,  emoji: '🐺', label: 'Волк'       },
  { id: 8,  emoji: '🦄', label: 'Единорог'   },
  { id: 9,  emoji: '🐲', label: 'Дракон'     },
  { id: 10, emoji: '🤖', label: 'Робот'      },
  { id: 11, emoji: '👾', label: 'Пришелец'   },
  { id: 12, emoji: '🎭', label: 'Маска'      },
];

// ── Вспомогательный компонент: статистический счётчик ─────────────────────────

function StatCard({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: React.ElementType;
  color: string;
  label: string;
  value: number;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group gap="sm">
        <ThemeIcon size={40} radius="md" color={color} variant="light">
          <Icon size={20} />
        </ThemeIcon>
        <Stack gap={2}>
          <Text size="xl" fw={700} lh={1}>
            {value}
          </Text>
          <Text size="xs" c="dimmed">
            {label}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}

// ── Основной компонент страницы ───────────────────────────────────────────────

function ProfilePage() {
  const { profile, loading, saving, error, refresh, updateProfile, deleteAccount } = useProfile();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Модалка удаления аккаунта
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Поле выбора аватарки
  const [presetPickerOpen, { toggle: togglePresetPicker }] = useDisclosure(false);

  // Форма профиля
  const form = useForm({
    initialValues: { nickname: '', phone: '' },
  });

  // Заполняем форму когда профиль загружен
  const [formInitialized, setFormInitialized] = useState(false);
  if (profile && !formInitialized) {
    form.setValues({
      nickname: profile.nickname ?? '',
      phone: profile.phone ?? '',
    });
    setFormInitialized(true);
  }

  // ── Обработчики ──────────────────────────────────────────────────────────

  const handleSaveProfile = async (values: { nickname: string; phone: string }) => {
    const result = await updateProfile({
      nickname: values.nickname.trim() || null,
      phone: values.phone.trim() || null,
    });
    if (result.ok) {
      notifications.show({ message: 'Профиль сохранён', color: 'teal', autoClose: 2500 });
    } else {
      notifications.show({ message: result.error ?? 'Ошибка сохранения', color: 'red' });
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    try {
      const result = await uploadViaServer(file);
      if (!result.ok) {
        notifications.show({ message: result.message, color: 'red' });
        return;
      }
      const res = await updateProfile({ avatar_url: result.publicUrl, avatar_type: 'upload' });
      if (res.ok) {
        notifications.show({ message: 'Аватар обновлён', color: 'teal', autoClose: 2500 });
        refresh();
      } else {
        notifications.show({ message: res.error ?? 'Ошибка обновления аватара', color: 'red' });
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePresetSelect = async (preset: (typeof PRESET_AVATARS)[number]) => {
    const result = await updateProfile({
      avatar_url: null,
      avatar_type: 'preset',
      avatar_preset_id: preset.id,
    });
    if (result.ok) {
      notifications.show({ message: `Аватар «${preset.emoji}» выбран`, color: 'teal', autoClose: 2000 });
      refresh();
      togglePresetPicker();
    } else {
      notifications.show({ message: result.error ?? 'Ошибка', color: 'red' });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleteLoading(true);
    const result = await deleteAccount();
    setDeleteLoading(false);
    if (!result.ok) {
      notifications.show({ message: result.error ?? 'Ошибка удаления', color: 'red' });
      return;
    }
    closeDelete();
    router.replace('/');
  };

  // Текущий аватар
  const avatarContent = (() => {
    if (profile?.avatar_type === 'upload' && profile.avatar_url) {
      return profile.avatar_url; // строка — src изображения
    }
    if (profile?.avatar_type === 'preset' && profile.avatar_preset_id) {
      return PRESET_AVATARS.find((p) => p.id === profile.avatar_preset_id)?.emoji ?? '👤';
    }
    return profile?.nickname?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? '?';
  })();

  const isEmojiAvatar =
    profile?.avatar_type === 'preset' || (!profile?.avatar_url && avatarContent !== '?');

  // ── Рендер ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={18} />}>
        {error}
      </Alert>
    );
  }

  if (!profile) return null;

  return (
    <Stack gap="xl" maw={680}>
      <Title order={2}>Профиль</Title>

      {/* ── Основная информация ──────────────────────────────────────────── */}
      <Paper withBorder p="xl" radius="md">
        <Stack gap="lg">
          <Title order={4}>Основная информация</Title>

          {/* Аватар */}
          <Group gap="lg" align="flex-end">
            <Box pos="relative">
              <Avatar
                src={profile.avatar_type === 'upload' ? profile.avatar_url : null}
                size={80}
                radius="xl"
                color="indigo"
              >
                {isEmojiAvatar ? (
                  <Text size={rem(36)}>{avatarContent}</Text>
                ) : (
                  avatarContent
                )}
              </Avatar>
              {avatarUploading && (
                <Box
                  pos="absolute"
                  top={0}
                  left={0}
                  w={80}
                  h={80}
                  style={{
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Loader size="sm" color="white" />
                </Box>
              )}
            </Box>

            <Stack gap="xs">
              <Group gap="xs">
                <Tooltip label="Загрузить своё фото">
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconUpload size={14} />}
                    loading={avatarUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Загрузить фото
                  </Button>
                </Tooltip>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={togglePresetPicker}
                >
                  {presetPickerOpen ? 'Скрыть' : 'Выбрать аватар'}
                </Button>
                {profile.avatar_url && (
                  <Tooltip label="Удалить аватар">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={() =>
                        updateProfile({ avatar_url: null, avatar_type: 'preset', avatar_preset_id: null }).then(
                          () => refresh()
                        )
                      }
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                JPEG, PNG, WEBP, GIF — до 5 МБ
              </Text>
            </Stack>

            {/* Скрытый input для загрузки файла */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
                e.target.value = '';
              }}
            />
          </Group>

          {/* Пикер пресетных аватарок */}
          {presetPickerOpen && (
            <Box>
              <Text size="sm" fw={500} mb="xs">
                Выберите аватар из библиотеки:
              </Text>
              <SimpleGrid cols={{ base: 6, xs: 12 }} spacing="xs">
                {PRESET_AVATARS.map((preset) => (
                  <Tooltip key={preset.id} label={preset.label}>
                    <UnstyledButton
                      onClick={() => handlePresetSelect(preset)}
                      style={(theme) => ({
                        width: 44,
                        height: 44,
                        borderRadius: theme.radius.md,
                        border:
                          profile.avatar_preset_id === preset.id
                            ? `2px solid ${theme.primaryColor}`
                            : '2px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: rem(24),
                        background:
                          profile.avatar_preset_id === preset.id
                            ? 'var(--mantine-color-default-hover)'
                            : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        '&:hover': {
                          background: 'var(--mantine-color-default-hover)',
                        },
                      })}
                    >
                      {preset.emoji}
                    </UnstyledButton>
                  </Tooltip>
                ))}
              </SimpleGrid>
            </Box>
          )}

          <Divider />

          {/* Email (нередактируемый) */}
          <TextInput
            label="Email"
            value={profile.email}
            readOnly
            description="Email используется для входа и не может быть изменён"
            styles={{ input: { opacity: 0.7, cursor: 'default' } }}
          />

          {/* Форма редактируемых полей */}
          <form onSubmit={form.onSubmit(handleSaveProfile)}>
            <Stack gap="md">
              <TextInput
                label="Никнейм"
                placeholder="Как вас называть?"
                maxLength={50}
                {...form.getInputProps('nickname')}
              />
              <TextInput
                label="Телефон"
                placeholder="+7 (___) ___-__-__"
                maxLength={30}
                {...form.getInputProps('phone')}
              />
              <Group>
                <Button type="submit" loading={saving} leftSection={<IconCheck size={16} />}>
                  Сохранить
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>

      {/* ── Статистика ───────────────────────────────────────────────────── */}
      <Paper withBorder p="xl" radius="md">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Title order={4}>Статистика активности</Title>
            {profile.stats.last_activity && (
              <Badge variant="light" size="sm">
                Последняя активность:{' '}
                {new Date(profile.stats.last_activity).toLocaleDateString('ru-RU')}
              </Badge>
            )}
          </Group>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <StatCard
              icon={IconCards}
              color="blue"
              label="Всего карточек"
              value={profile.stats.total_cards}
            />
            <StatCard
              icon={IconCategory}
              color="grape"
              label="Категорий"
              value={profile.stats.total_categories}
            />
            <StatCard
              icon={IconArchive}
              color="orange"
              label="В архиве"
              value={profile.stats.archived_cards}
            />
            <StatCard
              icon={IconWorld}
              color="teal"
              label="Публичных"
              value={profile.stats.public_cards}
            />
          </SimpleGrid>
        </Stack>
      </Paper>

      {/* ── Аккаунт ──────────────────────────────────────────────────────── */}
      <Paper withBorder p="xl" radius="md">
        <Stack gap="xs">
          <Title order={4}>Аккаунт</Title>
          <Text size="sm" c="dimmed">
            Зарегистрирован:{' '}
            {new Date(profile.created_at).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          {profile.last_sign_in_at && (
            <Text size="sm" c="dimmed">
              Последний вход:{' '}
              {new Date(profile.last_sign_in_at).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </Stack>
      </Paper>

      {/* ── Опасная зона ─────────────────────────────────────────────────── */}
      <Paper withBorder p="xl" radius="md" style={{ borderColor: 'var(--mantine-color-red-4)' }}>
        <Stack gap="md">
          <Group gap="xs">
            <IconAlertTriangle size={18} color="var(--mantine-color-red-6)" />
            <Title order={4} c="red">
              Опасная зона
            </Title>
          </Group>
          <Text size="sm" c="dimmed">
            Удаление аккаунта безвозвратно уничтожит все ваши карточки, категории и загруженные
            изображения.
          </Text>
          <Button
            variant="light"
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={openDelete}
          >
            Удалить аккаунт
          </Button>
        </Stack>
      </Paper>

      {/* ── Модалка подтверждения удаления ───────────────────────────────── */}
      <Modal
        opened={deleteOpened}
        onClose={() => { closeDelete(); setDeleteConfirm(''); }}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={18} color="var(--mantine-color-red-6)" />
            <Text fw={600} c="red">Удалить аккаунт?</Text>
          </Group>
        }
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Это действие <b>необратимо</b>. Будут удалены:
          </Text>
          <Stack gap={4} pl="md">
            <Text size="sm" c="dimmed">• Все ваши карточки ({profile.stats.total_cards})</Text>
            <Text size="sm" c="dimmed">• Все категории ({profile.stats.total_categories})</Text>
            <Text size="sm" c="dimmed">• Все загруженные изображения</Text>
            <Text size="sm" c="dimmed">• Ваш аккаунт</Text>
          </Stack>
          <Text size="sm" fw={500}>
            Введите <b>DELETE</b> для подтверждения:
          </Text>
          <TextInput
            placeholder="DELETE"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.currentTarget.value)}
            error={deleteConfirm && deleteConfirm !== 'DELETE' ? 'Введите DELETE' : null}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => { closeDelete(); setDeleteConfirm(''); }}>
              Отмена
            </Button>
            <Button
              color="red"
              loading={deleteLoading}
              disabled={deleteConfirm !== 'DELETE'}
              onClick={handleDeleteAccount}
            >
              Удалить навсегда
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

export default withAuth(ProfilePage);
