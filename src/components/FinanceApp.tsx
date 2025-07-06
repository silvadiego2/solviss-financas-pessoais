
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { TopHeader } from '@/components/layout/TopHeader';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { AccountsList } from '@/components/accounts/AccountsList';
import { AddTransactionForm } from '@/components/transactions/AddTransactionForm';
import { AdvancedReports } from '@/components/reports/AdvancedReports';
import { ExportReports } from '@/components/reports/ExportReports';
import { SimpleGoals } from '@/components/goals/SimpleGoals';
import { CreditCardsList } from '@/components/credit-cards/CreditCardsList';
import { BudgetsList } from '@/components/budgets/BudgetsList';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { MoreOptions } from '@/components/more/MoreOptions';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const FinanceApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Listener para navegação do MoreOptions
  useEffect(() => {
    const handleNavigation = (event: CustomEvent) => {
      setActiveTab(event.detail.tab);
    };

    window.addEventListener('navigate', handleNavigation as EventListener);
    return () => {
      window.removeEventListener('navigate', handleNavigation as EventListener);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'accounts':
        return <AccountsList />;
      case 'add':
        return <AddTransactionForm />;
      case 'budgets':
        return <BudgetsList />;
      case 'reports':
        return <AdvancedReports />;
      case 'more':
        return <MoreOptions onNavigate={setActiveTab} />;
      case 'cards':
        return <CreditCardsList />;
      case 'categories':
        return <CategoryManager />;
      case 'export':
        return <ExportReports />;
      case 'goals':
        return <SimpleGoals />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
        <TopHeader />
        
        <main className="container mx-auto px-4 py-4 max-w-md">
          {renderContent()}
        </main>

        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </ThemeProvider>
  );
};
