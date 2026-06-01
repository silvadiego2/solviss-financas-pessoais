import React from 'react';
import { Button } from '@/components/ui/button';

interface BackHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onBack?: () => void;
  action?: React.ReactNode;
}

export const BackHeader: React.FC<BackHeaderProps> = ({ title, subtitle, icon, onBack, action }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {icon && <div className="text-primary">{icon}</div>}
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {action && <div>{action}</div>}
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
        )}
      </div>
    </div>
  );
};
