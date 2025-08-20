import React, { useState, useEffect } from 'react';
import { BottomNavigation } from './layout/BottomNavigation';
import { TopHeader } from './layout/TopHeader';
import { DashboardOverview } from './dashboard/DashboardOverview';
import { AccountsList } from './accounts/AccountsList';
import { AddTransactionForm } from './transactions/AddTransactionForm';
import { BudgetsList } from './budgets/BudgetsList';
import { SimpleReports } from './reports/SimpleReports';
import { CreditCardsList } from './credit-cards/CreditCardsList';
import { MoreOptions } from './more/MoreOptions';
import { SimpleGoals } from './goals/SimpleGoals';
import { CategoryManager } from './categories/CategoryManager';
import { ExportReports } from './reports/ExportReports';
import { BankConnectionManager } from './banking/BankConnectionManager';
import { SecurityDashboard } from './security/SecurityDashboard';
import { useAuth } from './auth/AuthProvider';
import { AuthScreen } from './auth/AuthScreen';
import { AutoCategorizationManager } from './advanced/AutoCategorizationManager';
import { DuplicateDetectionManager } from './advanced/DuplicateDetectionManager';

export const FinanceApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState('more');
  const { user, loading } = useAuth();

  // Debug logging
  console.log('FinanceApp - User:', user);
  console.log('FinanceApp - Loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, showing AuthScreen');
    return <AuthScreen />;
  }

  const handleTabChange = (tab: string) => {
    console.log('Changing tab to:', tab);
    // Store previous tab for navigation back functionality
    if (activeTab === 'more' && tab !== 'more') {
      setPreviousTab('more');
    }
    setActiveTab(tab);
  };

  const handleBackToMore = () => {
    setActiveTab(previousTab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview onNavigate={handleTabChange} />;
      case 'accounts':
        return <AccountsList />;
      case 'budgets':
        return <BudgetsList />;
      case 'add':
        return <AddTransactionForm />;
      case 'reports':
        return <SimpleReports />;
      case 'cards':
        return <CreditCardsList />;
      case 'goals':
        return <SimpleGoals onBack={handleBackToMore} />;
      case 'categories':
        return <CategoryManager onBack={handleBackToMore} />;
      case 'export':
        return <ExportReports onBack={handleBackToMore} />;
      case 'banking':
        return <BankConnectionManager onBack={handleBackToMore} />;
      case 'profile':
        return (
          <div className="text-center py-8">
            <h2 className="text-lg font-semibold mb-4">Perfil do Usuário</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento</p>
          </div>
        );
      case 'security':
        return <SecurityDashboard />;
      case 'auto-categorization':
        return <AutoCategorizationManager onBack={handleBackToMore} />;
      case 'duplicate-detection':
        return <DuplicateDetectionManager onBack={handleBackToMore} />;
      case 'more':
        return <MoreOptions onNavigate={handleTabChange} onToggleTheme={() => {
          // Implement theme toggle logic here
          console.log('Toggle theme called');
        }} />;
      default:
        return <DashboardOverview onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <TopHeader />
      <main className="container mx-auto px-4 py-4 max-w-md">
        {renderContent()}
      </main>
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};
