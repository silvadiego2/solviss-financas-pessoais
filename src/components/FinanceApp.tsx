import React, { useState } from 'react';
import { AppSidebar } from './layout/AppSidebar';
import { DashboardOverview } from './dashboard/DashboardOverview';
import { AccountsList } from './accounts/AccountsList';
import { TransactionsList } from './transactions/TransactionsList';
import { BudgetsList } from './budgets/BudgetsList';
import { SimpleReports } from './reports/SimpleReports';
import { CreditCardsList } from './credit-cards/CreditCardsList';
import { MoreOptions } from './more/MoreOptions';
import { SimpleGoals } from './goals/SimpleGoals';
import { CategoryManager } from './categories/CategoryManager';
import { ExportReports } from './reports/ExportReports';
import { ImportTransactions } from './transactions/ImportTransactions';
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
import { UserProfile } from './profile/UserProfile';
import { DemoDataManager } from './demo/DemoDataManager';
import { DataResetManager } from './advanced/DataResetManager';
import { RecurringTransactionsManager } from './transactions/RecurringTransactionsManager';
import { SettingsScreen } from './settings/SettingsScreen';
import { AgendaFinanceira } from './agenda/AgendaFinanceira';
import { Planejamento } from '@/pages/Planejamento';
import { FluxoDeCaixa } from '@/pages/FluxoDeCaixa';
import { Inteligencia } from '@/pages/Inteligencia';
import { Planos } from '@/pages/Planos';
import { TransactionSheet } from './transactions/TransactionSheet';

// Tabs de primeiro nível da sidebar (não empilham histórico de navegação)
const ROOT_TABS = new Set([
  'dashboard', 'transactions', 'budgets', 'recurring-transactions',
  'cash-flow', 'cards', 'goals', 'intelligence', 'reports',
  'plans', 'more',
  // 'add' removido — agora abre Sheet, não é mais uma rota
]);

export const FinanceApp: React.FC = () => {
  const [activeTab, setActiveTab]     = useState('dashboard');
  const [tabHistory, setTabHistory]   = useState<string[]>([]);
  // ── Sheet global de nova transação ─────────────────────────────────
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  const handleTabChange = (tab: string) => {
    // FAB / botão "Nova Transação" → abre Sheet, não navega
    if (tab === 'add') {
      setAddSheetOpen(true);
      return;
    }
    if (ROOT_TABS.has(activeTab) && !ROOT_TABS.has(tab)) {
      setTabHistory(prev => [...prev, activeTab]);
    }
    setActiveTab(tab);
  };

  const handleBack = () => {
    setTabHistory(prev => {
      const next = [...prev];
      const origin = next.pop() ?? 'more';
      setActiveTab(origin);
      return next;
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview onNavigate={handleTabChange} />;
      case 'transactions':
        return <TransactionsList />;
      case 'budgets':
        return <Planejamento />;
      case 'budgets-list':
        return <BudgetsList onBack={handleBack} />;
      case 'recurring-transactions':
        return <RecurringTransactionsManager onBack={handleBack} />;
      case 'cash-flow':
        return <FluxoDeCaixa />;
      case 'cards':
        return <CreditCardsList onBack={handleBack} />;
      case 'goals':
        return <SimpleGoals onBack={handleBack} />;
      case 'intelligence':
        return <Inteligencia />;
      case 'reports':
        return <SimpleReports onBack={handleBack} />;
      case 'plans':
        return <Planos />;
      case 'more':
        return <MoreOptions onNavigate={handleTabChange} />;
      case 'accounts':
        return <AccountsList onBack={handleBack} />;
      case 'categories':
        return <CategoryManager onBack={handleBack} />;
      case 'export':
        return <ExportReports onBack={handleBack} />;
      case 'import-transactions':
        return <ImportTransactions onBack={handleBack} />;
      case 'profile':
        return <UserProfile onBack={handleBack} />;
      case 'settings':
        return <SettingsScreen onBack={handleBack} />;
      case 'auto-categorization':
        return <AutoCategorizationManager onBack={handleBack} />;
      case 'duplicate-detection':
        return <DuplicateDetectionManager onBack={handleBack} />;
      case 'auto-backup':
        return <AutoBackupManager onBack={handleBack} />;
      case 'analytics':
        return <AnalyticsHub onBack={handleBack} />;
      case 'receipt-scanner':
        return <ReceiptScanner onBack={handleBack} />;
      case 'notifications':
        return <NotificationManager onBack={handleBack} />;
      case 'auto-rules':
        return <AutoRules onBack={handleBack} />;
      case 'demo-data':
        return <DemoDataManager onBack={handleBack} />;
      case 'data-reset':
        return <DataResetManager onBack={handleBack} />;
      case 'security':
        return <SecurityDashboard onBack={handleBack} />;
      case 'agenda':
        return <AgendaFinanceira onBack={handleBack} />;
      default:
        return <DashboardOverview onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Sheet global de nova transação — acessível de qualquer tela */}
      <TransactionSheet
        state={addSheetOpen ? { mode: 'add' } : { mode: 'closed' }}
        onClose={() => setAddSheetOpen(false)}
      />

      <AppSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenAddSheet={() => setAddSheetOpen(true)}
      />
      <main className="flex-1 min-h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pt-16 lg:pt-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};
