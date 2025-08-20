import React from 'react';
import { toast as sonnerToast, ToastT } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Info, Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface EnhancedToastOptions {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  undo?: {
    label: string;
    onClick: () => void;
    duration?: number; // Default 5000ms
  };
  duration?: number;
  important?: boolean; // Shows toast longer and with different styling
}

const createEnhancedToast = (
  type: 'success' | 'error' | 'warning' | 'info',
  message: string,
  options: EnhancedToastOptions = {}
) => {
  const icons = {
    success: <CheckCircle className="h-4 w-4 text-green-600" />,
    error: <XCircle className="h-4 w-4 text-red-600" />,
    warning: <AlertCircle className="h-4 w-4 text-yellow-600" />,
    info: <Info className="h-4 w-4 text-blue-600" />
  };

  const toastOptions: any = {
    duration: options.important ? 8000 : options.duration || 4000,
  };

  const content = (
    <div className="flex items-start space-x-3 w-full">
      <div className="flex-shrink-0 mt-0.5">
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground">
          {options.title || message}
        </div>
        {options.description && (
          <div className="text-sm text-muted-foreground mt-1">
            {options.description}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 flex space-x-2">
        {options.undo && (
          <Button
            variant="ghost"
            size="sm"
            onClick={options.undo.onClick}
            className="h-auto p-1 text-xs"
          >
            <Undo className="h-3 w-3 mr-1" />
            {options.undo.label}
          </Button>
        )}
        {options.action && (
          <Button
            variant="ghost"  
            size="sm"
            onClick={options.action.onClick}
            className="h-auto p-1 text-xs"
          >
            {options.action.label}
          </Button>
        )}
      </div>
    </div>
  );

  return sonnerToast.custom(() => content, toastOptions);
};

export const enhancedToast = {
  success: (message: string, options?: EnhancedToastOptions) =>
    createEnhancedToast('success', message, options),
  
  error: (message: string, options?: EnhancedToastOptions) =>
    createEnhancedToast('error', message, options),
  
  warning: (message: string, options?: EnhancedToastOptions) =>
    createEnhancedToast('warning', message, options),
  
  info: (message: string, options?: EnhancedToastOptions) =>
    createEnhancedToast('info', message, options),

  loading: (message: string, options?: { duration?: number }) => {
    return sonnerToast.loading(message, {
      duration: options?.duration || Infinity,
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
    });
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },
};

// Helper function to create undo functionality
export const createUndoAction = <T,>(
  item: T,
  undoFn: (item: T) => Promise<void>,
  options: {
    undoLabel?: string;
    duration?: number;
  } = {}
) => {
  return {
    label: options.undoLabel || 'Desfazer',
    onClick: async () => {
      try {
        await undoFn(item);
        enhancedToast.success('Ação desfeita com sucesso');
      } catch (error) {
        enhancedToast.error('Erro ao desfazer ação');
      }
    },
    duration: options.duration || 5000,
  };
};