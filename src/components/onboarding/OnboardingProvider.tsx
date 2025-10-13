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
        content: 'Vamos fazer um tour completo para você conhecer todas as funcionalidades do app e começar a controlar suas finanças.',
        target: 'main',
        position: 'bottom',
      },
      {
        id: 'balance',
        title: 'Seu Saldo Total',
        content: 'Aqui você vê o saldo total de todas as suas contas correntes, poupança e carteiras. Este valor é atualizado automaticamente.',
        target: '[data-onboarding="balance-card"]',
        position: 'bottom',
      },
      {
        id: 'add-account',
        title: 'Adicionar Conta',
        content: 'Clique no botão + para adicionar suas primeiras contas bancárias. Você pode adicionar contas correntes, poupança, carteiras e investimentos.',
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
        id: 'add-transaction',
        title: 'Adicionar Transações Rápidas',
        content: 'Use este botão flutuante para adicionar receitas e despesas rapidamente de qualquer lugar do app.',
        target: '[data-onboarding="add-transaction"]',
        position: 'top',
      },
      {
        id: 'bottom-nav',
        title: 'Navegação Principal',
        content: 'Use a barra inferior para navegar entre Dashboard, Transações, Relatórios e Mais opções.',
        target: '[data-onboarding="bottom-nav"]',
        position: 'top',
      },
      {
        id: 'transactions',
        title: 'Lista de Transações',
        content: 'Na aba Transações, você pode visualizar, filtrar e buscar todas as suas movimentações. Use os filtros por período, tipo, categoria e conta.',
        target: 'main',
        position: 'bottom',
      },
      {
        id: 'recurring',
        title: 'Transações Recorrentes',
        content: 'Configure transações que se repetem automaticamente (salário, aluguel, assinaturas). Acesse em Mais > Transações Recorrentes.',
        target: 'main',
        position: 'bottom',
      },
      {
        id: 'categories',
        title: 'Categorias Personalizadas',
        content: 'Crie suas próprias categorias para organizar melhor suas finanças. Acesse em Mais > Categorias.',
        target: 'main',
        position: 'bottom',
      },
      {
        id: 'import',
        title: 'Importar Planilha',
        content: 'Você pode importar suas transações de planilhas Excel ou CSV. Acesse em Mais > Importar Transações.',
        target: 'main',
        position: 'bottom',
      },
      {
        id: 'reports',
        title: 'Relatórios e Análises',
        content: 'Na aba Relatórios, você encontra gráficos detalhados e análises das suas finanças por categoria, período e conta.',
        target: 'main',
        position: 'bottom',
      },
      {
        id: 'complete',
        title: 'Tutorial Concluído! 🎉',
        content: 'Agora você já conhece as principais funcionalidades. Você pode reiniciar este tutorial a qualquer momento em Mais > Perfil.',
        target: 'main',
        position: 'bottom',
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