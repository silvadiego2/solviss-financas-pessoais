import React from 'react';
import { SimpleReports } from '@/components/reports/SimpleReports';
import { BackHeader } from '@/components/layout/BackHeader';

export const Relatorios: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  return (
    <div className="space-y-6">
      {onBack && <BackHeader title="Relatórios" onBack={onBack} />}
      <SimpleReports />
    </div>
  );
};
