import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon = <Plus className="h-6 w-6" />,
  label,
  className,
}) => {
  return (
    <Button
      onClick={onClick}
      className={cn(
        'fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg',
        'md:bottom-4 md:right-4',
        'transition-all hover:scale-110',
        label && 'w-auto px-4 gap-2',
        className
      )}
      size="icon"
    >
      {icon}
      {label && <span className="font-semibold">{label}</span>}
    </Button>
  );
};
