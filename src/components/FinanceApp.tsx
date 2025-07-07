
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

export const FinanceApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Listen for navigation events from MoreOptions
  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      setActiveTab(event.detail.tab);
    };

    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => {
      window.removeEventListener('navigate', handleNavigate as EventListener);
    };
  }, []);

  const handleTabChange = (tab: string) => {
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
