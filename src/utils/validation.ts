import { z } from 'zod';

// Schemas de validação para formulários
export const transactionSchema = z.object({
  description: z.string()
    .min(1, 'Descrição é obrigatória')
    .max(255, 'Descrição muito longa')
    .transform(val => val.trim()),
  amount: z.number()
    .positive('Valor deve ser positivo')
    .max(999999999.99, 'Valor muito alto (máximo: 999.999.999,99)')
    .multipleOf(0.01, 'Valor deve ter no máximo 2 casas decimais'),
  date: z.date()
    .max(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'Data não pode ser mais de 1 ano no futuro'),
  type: z.enum(['income', 'expense', 'transfer']),
  account_id: z.string().uuid('ID da conta inválido'),
  category_id: z.string().uuid('ID da categoria inválido').optional(),
  transfer_account_id: z.string().uuid('ID da conta de transferência inválido').optional(),
  notes: z.string().max(1000, 'Notas muito longas').optional(),
  tags: z.array(z.string()).optional(),
});

export const accountSchema = z.object({
  name: z.string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome muito longo')
    .transform(val => val.trim()),
  type: z.enum(['checking', 'savings', 'credit_card', 'investment', 'cash']),
  balance: z.number()
    .max(999999999.99, 'Saldo muito alto')
    .multipleOf(0.01, 'Saldo deve ter no máximo 2 casas decimais'),
  bank_name: z.string()
    .max(100, 'Nome do banco muito longo')
    .optional()
    .transform(val => val?.trim()),
  credit_limit: z.number()
    .positive('Limite deve ser positivo')
    .max(999999999.99, 'Limite muito alto')
    .optional(),
  due_day: z.number()
    .int('Dia deve ser um número inteiro')
    .min(1, 'Dia deve ser entre 1 e 31')
    .max(31, 'Dia deve ser entre 1 e 31')
    .optional(),
  closing_day: z.number()
    .int('Dia deve ser um número inteiro')
    .min(1, 'Dia deve ser entre 1 e 31')
    .max(31, 'Dia deve ser entre 1 e 31')
    .optional(),
});

export const budgetSchema = z.object({
  category_id: z.string().uuid('ID da categoria inválido'),
  amount: z.number()
    .positive('Valor deve ser positivo')
    .max(999999999.99, 'Valor muito alto'),
  month: z.number()
    .int('Mês deve ser um número inteiro')
    .min(1, 'Mês deve ser entre 1 e 12')
    .max(12, 'Mês deve ser entre 1 e 12'),
  year: z.number()
    .int('Ano deve ser um número inteiro')
    .min(2000, 'Ano deve ser válido')
    .max(2100, 'Ano deve ser válido'),
});

export const goalSchema = z.object({
  name: z.string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome muito longo')
    .transform(val => val.trim()),
  description: z.string()
    .max(500, 'Descrição muito longa')
    .optional()
    .transform(val => val?.trim()),
  target_amount: z.number()
    .positive('Valor meta deve ser positivo')
    .max(999999999.99, 'Valor muito alto'),
  current_amount: z.number()
    .min(0, 'Valor atual não pode ser negativo')
    .max(999999999.99, 'Valor muito alto')
    .optional(),
  target_date: z.date().optional(),
  category_id: z.string().uuid('ID da categoria inválido').optional(),
});

// Função para sanitizar strings
export const sanitizeString = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .trim();
};

// Função para validar valores monetários
export const validateAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 999999999.99 && Number(amount.toFixed(2)) === amount;
};

// Função para validar datas
export const validateDate = (date: Date): boolean => {
  const now = new Date();
  const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 ano no futuro
  return date <= maxDate;
};

// Esquema para validação de categorias
export const categorySchema = z.object({
  name: z.string()
    .min(1, 'Nome é obrigatório')
    .max(50, 'Nome muito longo')
    .transform(val => val.trim()),
  icon: z.string().optional(),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal')
    .optional(),
  transaction_type: z.enum(['income', 'expense', 'transfer']),
  parent_id: z.string().uuid('ID do pai inválido').optional(),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
export type AccountFormData = z.infer<typeof accountSchema>;
export type BudgetFormData = z.infer<typeof budgetSchema>;
export type GoalFormData = z.infer<typeof goalSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;