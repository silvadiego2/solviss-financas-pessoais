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
        
        // Show toast with first error
        if (validationErrors.length > 0) {
          toast.error(`Erro de validação: ${validationErrors[0].message}`);
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