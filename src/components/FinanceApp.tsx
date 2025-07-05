
import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { TopHeader } from '@/components/layout/TopHeader';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { AccountsList } from '@/components/accounts/AccountsList';
import { AddTransactionForm } from '@/components/transactions/AddTransactionForm';
import { SimpleReports } from '@/components/reports/SimpleReports';
import { SimpleGoals } from '@/components/goals/SimpleGoals';

export const FinanceApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

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
      case 'reports':
        return <SimpleReports />;
      case 'goals':
        return <SimpleGoals />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <TopHeader />
      
      <main className="container mx-auto px-4 py-4 max-w-md">
        {renderContent()}
      </main>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
