/**
 * useUserPreferences
 *
 * Persists user settings with two strategies:
 *  - `currency`  → synced to `profiles.currency` in Supabase (already a real column)
 *  - `notifications` / `billReminders` → localStorage (no schema change needed;
 *    gracefully falls back to defaults if storage is unavailable)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserPreferences {
  currency: string;
  notifications: boolean;
  billReminders: boolean;
}

const DEFAULTS: UserPreferences = {
  currency: 'BRL',
  notifications: true,
  billReminders: true,
};

// Safe localStorage helpers (sandboxed iframe may block access)
function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently ignore (quota or sandbox restriction)
  }
}

export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Optimistically restore from localStorage first (instant UI)
      const local: UserPreferences = {
        currency: lsGet('pref_currency', DEFAULTS.currency),
        notifications: lsGet('pref_notifications', DEFAULTS.notifications),
        billReminders: lsGet('pref_bill_reminders', DEFAULTS.billReminders),
      };
      if (!cancelled) setPrefs(local);

      // 2. Then fetch the authoritative currency from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('currency')
        .eq('id', user.id)
        .maybeSingle();

      if (!cancelled && profile?.currency) {
        const merged = { ...local, currency: profile.currency };
        setPrefs(merged);
        lsSet('pref_currency', profile.currency);
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Updaters ──────────────────────────────────────────────────────────────

  const setCurrency = useCallback(async (value: string) => {
    setPrefs(p => ({ ...p, currency: value }));
    lsSet('pref_currency', value);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ currency: value, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      toast.error('Erro ao salvar moeda. Tente novamente.');
    }
  }, []);

  const setNotifications = useCallback((value: boolean) => {
    setPrefs(p => ({ ...p, notifications: value }));
    lsSet('pref_notifications', value);
    // Disable bill reminders automatically when master toggle goes off
    if (!value) {
      setPrefs(p => ({ ...p, billReminders: false }));
      lsSet('pref_bill_reminders', false);
    }
  }, []);

  const setBillReminders = useCallback((value: boolean) => {
    setPrefs(p => ({ ...p, billReminders: value }));
    lsSet('pref_bill_reminders', value);
  }, []);

  return {
    prefs,
    loading,
    setCurrency,
    setNotifications,
    setBillReminders,
  };
}
