
import React, { useState } from 'react';
import { BottomNavigation } from './layout/BottomNavigation';
import { TopHeader } from './layout/TopHeader';
import { DashboardOverview } from './dashboard/DashboardOverview';
import { AccountsList } from './accounts/AccountsList';
import { AddTransactionForm } from './transactions/AddTransactionForm';
import { BudgetsList } from './budgets/BudgetsList';
import { SimpleReports } from './reports/SimpleReports';
import { MoreOptions } from './more/MoreOptions';

export const FinanceApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'accounts':
        return <AccountsList />;
      case 'budgets':
        return <BudgetsList />;
      case 'add':
        return <AddTransactionForm />;
      case 'reports':
        return <SimpleReports />;
      case 'more':
        return <MoreOptions />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <TopHeader />
      <main className="container mx-auto px-4 py-4 max-w-md">
        {renderContent()}
      </main>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
