import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
}

export const BackHeader: React.FC<BackHeaderProps> = ({ title, subtitle, onBack, action }) => {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft size={18} />
            <span>Voltar</span>
          </Button>
        )}
        <div>
          <h1 className="text-xl font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
