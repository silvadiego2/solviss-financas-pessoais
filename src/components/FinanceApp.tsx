import React, { useState } from 'react';
import { BottomNavigation } from './layout/BottomNavigation';
import { DesktopSidebar } from './layout/DesktopSidebar';
import { TopHeader } from './layout/TopHeader';
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
import { useIsMobile } from '@/hooks/use-mobile';

export const FinanceApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState('more');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading } = useAuth();
  const { toggleTheme } = useTheme();
  const isMobile = useIsMobile();

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
      case 'more':
        return <MoreOptions onNavigate={handleTabChange} onToggleTheme={toggleTheme} />;
      default:
        return <DashboardOverview onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header only */}
        {isMobile && <TopHeader />}

        <main className="flex-1 container mx-auto px-4 py-4 max-w-2xl pb-20 md:pb-4">
          {renderContent()}
        </main>

        {/* Mobile bottom nav */}
        {isMobile && (
          <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        )}
      </div>
    </div>
  );
};
