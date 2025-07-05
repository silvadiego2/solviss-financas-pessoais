
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { FinanceApp } from '@/components/FinanceApp';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FinanceApp />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
