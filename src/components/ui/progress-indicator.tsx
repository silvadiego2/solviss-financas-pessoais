import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  progress?: number; // 0-100
  message?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'circular' | 'dots';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  message = 'Carregando...',
  showPercentage = false,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2', 
    lg: 'h-3',
  };

  if (variant === 'circular') {
    const iconSizes = {
      sm: 16,
      md: 24,
      lg: 32,
    };

    return (
      <div className={cn("flex items-center space-x-3", className)}>
        <Loader2 size={iconSizes[size]} className="animate-spin text-primary" />
        <div className="text-sm text-muted-foreground">
          {message}
          {showPercentage && progress !== undefined && (
            <span className="ml-2 font-medium">{Math.round(progress)}%</span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn("flex items-center space-x-3", className)}>
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "rounded-full bg-primary animate-pulse",
                size === 'sm' && "w-1 h-1",
                size === 'md' && "w-2 h-2",
                size === 'lg' && "w-3 h-3"
              )}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s',
              }}
            />
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          {message}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{message}</span>
        {showPercentage && progress !== undefined && (
          <span className="text-sm font-medium text-foreground">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <Progress 
        value={progress} 
        className={cn(sizeClasses[size])}
      />
    </div>
  );
};

// Loading overlay component
interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  variant?: 'default' | 'circular' | 'dots';
  backdrop?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Carregando...',
  progress,
  variant = 'circular',
  backdrop = true,
}) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center",
      backdrop && "bg-background/80 backdrop-blur-sm"
    )}>
      <div className="bg-card border rounded-lg p-6 shadow-lg min-w-[300px]">
        <ProgressIndicator
          progress={progress}
          message={message}
          showPercentage={progress !== undefined}
          variant={variant}
          size="md"
        />
      </div>
    </div>
  );
};