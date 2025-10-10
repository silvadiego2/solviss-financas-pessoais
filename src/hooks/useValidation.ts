import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';

export interface ValidationError {
  field: string;
  message: string;
}

export const useValidation = <T extends z.ZodType>(schema: T) => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const validate = async (data: any): Promise<{ isValid: boolean; data?: z.infer<T> }> => {
    setIsValidating(true);
    setErrors([]);

    try {
      const validatedData = await schema.parseAsync(data);
      setIsValidating(false);
      return { isValid: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        setErrors(validationErrors);
        
        // Show detailed error with suggestions
        if (validationErrors.length > 0) {
          const firstError = validationErrors[0];
          const suggestion = getErrorSuggestion(firstError.field, firstError.message);
          toast.error(firstError.message, {
            description: suggestion,
            duration: 5000,
          });
        }
      } else {
        toast.error('Erro inesperado na validação');
      }
      
      setIsValidating(false);
      return { isValid: false };
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  };

  const hasError = (field: string): boolean => {
    return errors.some(error => error.field === field);
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return {
    validate,
    errors,
    isValidating,
    getFieldError,
    hasError,
    clearErrors,
  };
};

// Helper function to provide suggestions based on validation errors
function getErrorSuggestion(field: string, message: string): string | undefined {
  if (field.includes('amount') && message.includes('positivo')) {
    return 'Digite um valor maior que zero';
  }
  if (field.includes('date') && message.includes('futuro')) {
    return 'Escolha uma data válida';
  }
  if (field === 'description' && message.includes('vazio')) {
    return 'Adicione uma descrição para identificar a transação';
  }
  if (field.includes('email')) {
    return 'Verifique se o email está no formato correto';
  }
  return undefined;
}