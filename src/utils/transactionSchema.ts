import { z } from 'zod';

// Helper para converter valor brasileiro (1.234,56) para número
const parseBrazilianNumber = (value: string): number => {
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
};

// Schema para validação de transação
export const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    required_error: 'Selecione o tipo de transação',
    invalid_type_error: 'Tipo de transação inválido',
  }),
  
  amount: z
    .string()
    .min(1, 'O valor é obrigatório')
    .refine((val) => {
      const num = parseBrazilianNumber(val);
      return !isNaN(num) && num > 0;
    }, 'O valor deve ser um número positivo')
    .refine((val) => {
      const num = parseBrazilianNumber(val);
      return num <= 999999999.99;
    }, 'O valor máximo é R$ 999.999.999,99'),
  
  description: z
    .string()
    .min(1, 'A descrição é obrigatória')
    .max(200, 'A descrição deve ter no máximo 200 caracteres')
    .refine((val) => val.trim().length > 0, 'A descrição não pode ser vazia'),
  
  accountId: z
    .string()
    .min(1, 'Selecione uma conta ou cartão')
    .uuid('ID de conta inválido'),
  
  categoryId: z
    .string()
    .min(1, 'Selecione uma categoria')
    .uuid('ID de categoria inválido'),
  
  date: z
    .string()
    .min(1, 'A data é obrigatória')
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Data inválida')
    .refine((val) => {
      const date = new Date(val);
      const minDate = new Date('2000-01-01');
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 5);
      return date >= minDate && date <= maxDate;
    }, 'A data deve estar entre 2000 e 5 anos no futuro'),
  
  isRecurring: z.boolean().default(false),
  
  recurrenceFrequency: z
    .enum(['daily', 'weekly', 'monthly', 'yearly'])
    .optional(),
  
  recurrenceEndDate: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Data final inválida'),
}).refine((data) => {
  // Se recorrente, precisa ter frequência
  if (data.isRecurring && !data.recurrenceFrequency) {
    return false;
  }
  return true;
}, {
  message: 'Selecione a frequência para transações recorrentes',
  path: ['recurrenceFrequency'],
}).refine((data) => {
  // Se tem data final, deve ser maior que a data inicial
  if (data.recurrenceEndDate && data.date) {
    return new Date(data.recurrenceEndDate) > new Date(data.date);
  }
  return true;
}, {
  message: 'A data final deve ser posterior à data inicial',
  path: ['recurrenceEndDate'],
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

// Função para validar e retornar erros formatados
export const validateTransaction = (data: unknown): { success: true; data: TransactionFormData } | { success: false; errors: Record<string, string> } => {
  const result = transactionSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
};

// Função para converter amount string para número
export const parseAmount = (amount: string): number => {
  return parseBrazilianNumber(amount);
};
