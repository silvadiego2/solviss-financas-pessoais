/**
 * useUserPreferences
 *
 * Persiste preferências do usuário com duas estratégias:
 *  - currency  → profiles.currency no Supabase (coluna existente)
 *  - notifications / billReminders → sessionStorage com fallback em memória
 *    (sessionStorage funciona em iframes; localStorage pode ser bloqueado)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
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

// Tenta sessionStorage primeiro (funciona em iframes), depois localStorage
function storageGet<T>(key: string, fallback: T): T {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch { /* ignorar */ }
  }
  return fallback;
}

function storageSet(key: string, value: unknown): void {
  for (const store of [sessionStorage, localStorage]) {
    try { store.setItem(key, JSON.stringify(value)); return; } catch { /* ignorar */ }
  }
  // Se ambos falharem, apenas mantém em memória (o estado React já foi atualizado)
}

export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const savingCurrency = useRef(false);

  // Carrega na montagem
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Restaura instantaneamente do storage (sem flash de estado padrão)
      const local: UserPreferences = {
        currency:      storageGet('pref_currency',       DEFAULTS.currency),
        notifications: storageGet('pref_notifications',  DEFAULTS.notifications),
        billReminders: storageGet('pref_bill_reminders', DEFAULTS.billReminders),
      };
      if (!cancelled) setPrefs(local);

      // 2. Busca currency autoritativa do Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) { setLoading(false); return; }

        const { data: profile } = await supabase
          .from('profiles')
          .select('currency')
          .eq('id', user.id)
          .maybeSingle();

        if (!cancelled && profile?.currency) {
          setPrefs(p => ({ ...p, currency: profile.currency! }));
          storageSet('pref_currency', profile.currency);
        }
      } catch { /* falha silenciosa — usa valor do storage */ }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const setCurrency = useCallback(async (value: string) => {
    if (savingCurrency.current) return;
    savingCurrency.current = true;

    setPrefs(p => ({ ...p, currency: value }));
    storageSet('pref_currency', value);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ currency: value, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        if (error) toast.error('Erro ao salvar moeda. Tente novamente.');
      }
    } catch { /* falha silenciosa */ } finally {
      savingCurrency.current = false;
    }
  }, []);

  const setNotifications = useCallback((value: boolean) => {
    setPrefs(p => ({
      ...p,
      notifications: value,
      // Desativa lembretes automaticamente quando notificações gerais são desligadas
      billReminders: value ? p.billReminders : false,
    }));
    storageSet('pref_notifications', value);
    if (!value) storageSet('pref_bill_reminders', false);
  }, []);

  const setBillReminders = useCallback((value: boolean) => {
    setPrefs(p => ({ ...p, billReminders: value }));
    storageSet('pref_bill_reminders', value);
  }, []);

  return { prefs, loading, setCurrency, setNotifications, setBillReminders };
}
