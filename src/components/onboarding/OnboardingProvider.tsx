import React, { createContext, useContext, useState, useEffect } from 'react';

interface OnboardingContextValue {
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  hasCompletedOnboarding: true,
  completeOnboarding: () => {},
  resetOnboarding: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('solviss_onboarding_complete');
      setHasCompletedOnboarding(stored === 'true');
    } catch {
      // localStorage bloqueado (iframe sandbox) — assume concluído
      setHasCompletedOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    try {
      localStorage.setItem('solviss_onboarding_complete', 'true');
    } catch { /* ignorado */ }
    setHasCompletedOnboarding(true);
  };

  const resetOnboarding = () => {
    try {
      localStorage.removeItem('solviss_onboarding_complete');
    } catch { /* ignorado */ }
    setHasCompletedOnboarding(false);
  };

  return (
    <OnboardingContext.Provider
      value={{ hasCompletedOnboarding, completeOnboarding, resetOnboarding }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
