import React, { createContext, useContext, useState, useEffect } from 'react';
import { OnboardingTooltip } from './OnboardingTooltip';
import { useAuth } from '@/components/auth/AuthProvider';

interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingContextType {
  startOnboarding: (steps: OnboardingStep[]) => void;
  isOnboardingActive: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<OnboardingStep[]>([]);
  const { user } = useAuth();

  // Check if user needs onboarding
  useEffect(() => {
    if (user && !localStorage.getItem('onboarding_completed')) {
      // Auto-start onboarding for new users after a short delay
      setTimeout(() => {
        startDashboardOnboarding();
      }, 1000);
    }
  }, [user]);

  const startOnboarding = (steps: OnboardingStep[]) => {
    setCurrentSteps(steps);
    setIsActive(true);
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem('onboarding_completed', 'true');
  };

  const handleSkip = () => {
    setIsActive(false);
    localStorage.setItem('onboarding_completed', 'true');
  };

  const startDashboardOnboarding = () => {
    const steps: OnboardingStep[] = [
      {
        id: 'welcome',
        title: 'Bem-vindo ao FinanceApp! 👋',
        content: 'Vamos fazer um tour rápido para você conhecer as principais funcionalidades.',
        target: 'main',
        position: 'bottom',
      },
      {
        id: 'balance',
        title: 'Seu Saldo Total',
        content: 'Aqui você vê o saldo total de todas as suas contas correntes, poupança e carteiras.',
        target: '[data-onboarding="balance-card"]',
        position: 'bottom',
      },
      {
        id: 'add-account',
        title: 'Adicionar Conta',
        content: 'Clique no botão + para adicionar suas primeiras contas bancárias.',
        target: '[data-onboarding="add-account"]',
        position: 'left',
        action: {
          label: 'Adicionar Conta',
          onClick: () => {
            const button = document.querySelector('[data-onboarding="add-account"]') as HTMLButtonElement;
            button?.click();
          }
        }
      },
      {
        id: 'bottom-nav',
        title: 'Navegação',
        content: 'Use a barra inferior para navegar entre as diferentes seções do app.',
        target: '[data-onboarding="bottom-nav"]',
        position: 'top',
      },
      {
        id: 'add-transaction',
        title: 'Adicionar Transações',
        content: 'O botão central permite adicionar receitas e despesas rapidamente.',
        target: '[data-onboarding="add-transaction"]',
        position: 'top',
      },
    ];

    startOnboarding(steps);
  };

  return (
    <OnboardingContext.Provider value={{ startOnboarding, isOnboardingActive: isActive }}>
      {children}
      <OnboardingTooltip
        steps={currentSteps}
        isActive={isActive}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    </OnboardingContext.Provider>
  );
};