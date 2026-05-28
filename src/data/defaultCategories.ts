export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  transaction_type: 'income' | 'expense';
}

export const defaultCategories: DefaultCategory[] = [
  // Despesas
  { name: 'Alimentação', icon: '🍽️', color: '#EF4444', transaction_type: 'expense' },
  { name: 'Transporte', icon: '🚗', color: '#F97316', transaction_type: 'expense' },
  { name: 'Moradia', icon: '🏠', color: '#8B5CF6', transaction_type: 'expense' },
  { name: 'Saúde', icon: '🏥', color: '#EC4899', transaction_type: 'expense' },
  { name: 'Educação', icon: '📚', color: '#3B82F6', transaction_type: 'expense' },
  { name: 'Lazer', icon: '🎮', color: '#10B981', transaction_type: 'expense' },
  { name: 'Vestuário', icon: '👗', color: '#F59E0B', transaction_type: 'expense' },
  { name: 'Beleza', icon: '💄', color: '#D946EF', transaction_type: 'expense' },
  { name: 'Pets', icon: '🐾', color: '#84CC16', transaction_type: 'expense' },
  { name: 'Academia', icon: '💪', color: '#06B6D4', transaction_type: 'expense' },
  { name: 'Streaming', icon: '📺', color: '#6366F1', transaction_type: 'expense' },
  { name: 'Viagem', icon: '✈️', color: '#0EA5E9', transaction_type: 'expense' },
  { name: 'Presentes', icon: '🎁', color: '#F43F5E', transaction_type: 'expense' },
  { name: 'Assinaturas', icon: '📱', color: '#7C3AED', transaction_type: 'expense' },
  { name: 'Restaurante', icon: '🍴', color: '#DC2626', transaction_type: 'expense' },
  { name: 'Supermercado', icon: '🛒', color: '#16A34A', transaction_type: 'expense' },
  { name: 'Farmácia', icon: '💊', color: '#059669', transaction_type: 'expense' },
  { name: 'Combustível', icon: '⛽', color: '#D97706', transaction_type: 'expense' },
  { name: 'Manutenção', icon: '🔧', color: '#64748B', transaction_type: 'expense' },
  { name: 'Impostos', icon: '🧾', color: '#475569', transaction_type: 'expense' },
  // Receitas
  { name: 'Salário', icon: '💼', color: '#22C55E', transaction_type: 'income' },
  { name: 'Freelance', icon: '💻', color: '#10B981', transaction_type: 'income' },
  { name: 'Investimentos', icon: '📈', color: '#3B82F6', transaction_type: 'income' },
  { name: 'Aluguel Recebido', icon: '🏘️', color: '#8B5CF6', transaction_type: 'income' },
  { name: 'Vendas', icon: '🛍️', color: '#F59E0B', transaction_type: 'income' },
  { name: 'Bônus', icon: '🎯', color: '#06B6D4', transaction_type: 'income' },
  { name: 'Reembolso', icon: '↩️', color: '#84CC16', transaction_type: 'income' },
  { name: 'Presente Recebido', icon: '🎀', color: '#EC4899', transaction_type: 'income' },
];
