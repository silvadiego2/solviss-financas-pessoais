import React, { useState } from 'react';
import { AppSidebar } from './layout/AppSidebar';
import { DashboardOverview } from './dashboard/DashboardOverview';
import { AccountsList } from './accounts/AccountsList';
import { AddTransactionForm } from './transactions/AddTransactionForm';
import { TransactionsList } from './transactions/TransactionsList';
import { BudgetsList } from './budgets/BudgetsList';
import { SimpleReports } from './reports/SimpleReports';
import { CreditCardsList } from './credit-cards/CreditCardsList';
import { MoreOptions } from './more/MoreOptions';
import { SimpleGoals } from './goals/SimpleGoals';
import { CategoryManager } from './categories/CategoryManager';
import { ExportReports } from './reports/ExportReports';
import { ImportTransactions } from './transactions/ImportTransactions';
import { BankConnectionManager } from './banking/BankConnectionManager';
import { SecurityDashboard } from './security/SecurityDashboard';
import { useAuth } from './auth/AuthProvider';
import { AuthScreen } from './auth/AuthScreen';
import { AutoCategorizationManager } from './advanced/AutoCategorizationManager';
import { DuplicateDetectionManager } from './advanced/DuplicateDetectionManager';
import { AutoBackupManager } from './advanced/AutoBackupManager';
import { AnalyticsHub } from './analytics/AnalyticsHub';
import { NotificationManager } from './mobile/NotificationManager';
import { ReceiptScanner } from './mobile/ReceiptScanner';
import { AutoRules } from './automation/AutoRules';
import { useTheme } from '@/contexts/ThemeContext';
import { UserProfile } from './profile/UserProfile';
import { DemoDataManager } from './demo/DemoDataManager';
import { DataResetManager } from './advanced/DataResetManager';
import { RecurringTransactionsManager } from './transactions/RecurringTransactionsManager';
import { SettingsScreen } from './settings/SettingsScreen';
import { Planejamento } from '@/pages/Planejamento';
import { FluxoDeCaixa } from '@/pages/FluxoDeCaixa';
import { Inteligencia } from '@/pages/Inteligencia';
import { Relatorios } from '@/pages/Relatorios';
import { Planos } from '@/pages/Planos';
import { Integracoes } from '@/pages/Integracoes';

export const FinanceApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState('more');
  const { user, loading } = useAuth();
  const { toggleTheme } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const handleTabChange = (tab: string) => {
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
        return <AccountsList onBack={handleBackToMore} />;
      case 'budgets':
        return <BudgetsList onBack={handleBackToMore} />;
      case 'add':
        return <AddTransactionForm />;
      case 'transactions':
        return <TransactionsList />;
      case 'reports':
        return <SimpleReports onBack={handleBackToMore} />;
      case 'cards':
        return <CreditCardsList onBack={handleBackToMore} />;
      case 'goals':
        return <SimpleGoals onBack={handleBackToMore} />;
      case 'categories':
        return <CategoryManager onBack={handleBackToMore} />;
      case 'export':
        return <ExportReports onBack={handleBackToMore} />;
      case 'import-transactions':
        return <ImportTransactions onBack={handleBackToMore} />;
      case 'banking':
        return <BankConnectionManager onBack={handleBackToMore} />;
      case 'profile':
        return <UserProfile onBack={handleBackToMore} />;
      case 'settings':
        return <SettingsScreen onBack={handleBackToMore} />;
      case 'auto-categorization':
        return <AutoCategorizationManager onBack={handleBackToMore} />;
      case 'auto-backup':
        return <AutoBackupManager onBack={handleBackToMore} />;
      case 'analytics':
        return <AnalyticsHub onBack={handleBackToMore} />;
      case 'receipt-scanner':
        return <ReceiptScanner onBack={handleBackToMore} />;
      case 'notifications':
        return <NotificationManager onBack={handleBackToMore} />;
      case 'auto-rules':
        return <AutoRules onBack={handleBackToMore} />;
      case 'demo-data':
        return <DemoDataManager onBack={handleBackToMore} />;
      case 'data-reset':
        return <DataResetManager onBack={handleBackToMore} />;
      case 'recurring-transactions':
        return <RecurringTransactionsManager onBack={handleBackToMore} />;
      case 'security':
        return <SecurityDashboard onBack={handleBackToMore} />;
      case 'cash-flow':
        return <FluxoDeCaixa />;
      case 'intelligence':
        return <Inteligencia />;
      case 'relatorios':
        return <Relatorios />;
      case 'plans':
        return <Planos />;
      case 'integrations':
        return <Integracoes />;
      case 'more':
        return <MoreOptions onNavigate={handleTabChange} onToggleTheme={toggleTheme} />;
      default:
        return <DashboardOverview onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="flex-1 min-h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pt-16 lg:pt-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};
