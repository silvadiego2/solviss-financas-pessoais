import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackHeaderProps {
  title: string;
  onBack: () => void;
}

export const BackHeader: React.FC<BackHeaderProps> = ({ title, onBack }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
    </div>
  );
};