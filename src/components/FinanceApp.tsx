
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

export const FinanceApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleTabChange = (tab: string) => {
    console.log('Changing tab to:', tab);
    setActiveTab(tab);
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
        return <SimpleGoals />;
      case 'categories':
        return <CategoryManager />;
      case 'export':
        return <ExportReports />;
      case 'profile':
        return (
          <div className="text-center py-8">
            <h2 className="text-lg font-semibold mb-4">Perfil do Usuário</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento</p>
          </div>
        );
      case 'more':
        return <MoreOptions onNavigate={handleTabChange} />;
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
