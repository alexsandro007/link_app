import { useState, useCallback, useEffect } from 'react';
import type { ProfileResponse, UpdateProfileBody } from '@/types/database';

export interface UseProfileResult {
  profile: ProfileResponse | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateProfile: (body: UpdateProfileBody) => Promise<{ ok: boolean; error?: string }>;
  deleteAccount: () => Promise<{ ok: boolean; error?: string }>;
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile]   = useState<ProfileResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Ошибка загрузки профиля');
        return;
      }
      setProfile(await res.json());
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateProfile = useCallback(async (body: UpdateProfileBody) => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: json.error ?? 'Ошибка сохранения' };
      // Обновляем профиль локально
      setProfile((prev) => prev ? { ...prev, ...body } : prev);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Ошибка сети' };
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      const res = await fetch('/api/profile', { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: json.error ?? 'Ошибка удаления аккаунта' };
      return { ok: true };
    } catch {
      return { ok: false, error: 'Ошибка сети' };
    }
  }, []);

  return { profile, loading, saving, error, refresh, updateProfile, deleteAccount };
}
