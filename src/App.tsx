import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { FinanceApp } from '@/components/FinanceApp';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { BalanceVisibilityProvider } from '@/contexts/BalanceVisibilityContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SettingsProvider>
          <AuthProvider>
            <OnboardingProvider>
              <BalanceVisibilityProvider>
                <FinanceApp />
                <Toaster />
              </BalanceVisibilityProvider>
            </OnboardingProvider>
          </AuthProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
