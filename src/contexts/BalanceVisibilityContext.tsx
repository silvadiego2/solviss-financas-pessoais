import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'solviss:hideBalance';

interface BalanceVisibilityContextValue {
  hideBalance: boolean;
  toggleHideBalance: () => void;
}

const BalanceVisibilityContext = createContext<BalanceVisibilityContextValue>({
  hideBalance: false,
  toggleHideBalance: () => {},
});

export const BalanceVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hideBalance, setHideBalance] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(hideBalance));
    } catch {
      // sem suporte a localStorage (modo privado)
    }
  }, [hideBalance]);

  const toggleHideBalance = () => setHideBalance(v => !v);

  return (
    <BalanceVisibilityContext.Provider value={{ hideBalance, toggleHideBalance }}>
      {children}
    </BalanceVisibilityContext.Provider>
  );
};

export const useBalanceVisibility = () => useContext(BalanceVisibilityContext);
