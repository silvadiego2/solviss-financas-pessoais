import React, { createContext, useContext, useEffect, useState } from 'react';

export type Currency = 'BRL' | 'USD' | 'EUR';
export type WeekStart = 'sunday' | 'monday';

interface AppSettings {
  currency: Currency;
  weekStart: WeekStart;
  notifications: boolean;
  confirmDelete: boolean;
}

interface SettingsContextType extends AppSettings {
  setCurrency: (v: Currency) => void;
  setWeekStart: (v: WeekStart) => void;
  setNotifications: (v: boolean) => void;
  setConfirmDelete: (v: boolean) => void;
}

const STORAGE_KEY = 'solviss_settings';

const defaults: AppSettings = {
  currency: 'BRL',
  weekStart: 'monday',
  notifications: true,
  confirmDelete: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <SettingsContext.Provider value={{
      ...settings,
      setCurrency: v => set('currency', v),
      setWeekStart: v => set('weekStart', v),
      setNotifications: v => set('notifications', v),
      setConfirmDelete: v => set('confirmDelete', v),
    }}>
      {children}
    </SettingsContext.Provider>
  );
};
