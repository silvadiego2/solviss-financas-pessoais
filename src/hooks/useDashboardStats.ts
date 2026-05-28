import { useMemo } from 'react';
import { parseDateOnly } from '@/utils/dateHelpers';

interface Transaction {
  id: string;
  type: string;
  amount: number | string;
  date: string;
  description: string;
  category?: { name: string };
  [key: string]: any;
}

export const useDashboardStats = (transactions: Transaction[]) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = useMemo(() =>
    transactions.filter(t => {
      const d = parseDateOnly(t.date);
      return !!d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }),
    [transactions, currentMonth, currentYear]
  );

  const monthlyIncome = useMemo(
    () => monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
    [monthlyTransactions]
  );

  const monthlyExpenses = useMemo(
    () => monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    [monthlyTransactions]
  );

  const available = monthlyIncome - monthlyExpenses;
  const budgetUsed = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;

  const spendingChartData = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date().getDate();
    let cumulative = 0;
    const data: { day: number; amount: number }[] = [];
    for (let d = 1; d <= Math.min(today, daysInMonth); d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayExpenses = monthlyTransactions
        .filter(t => t.type === 'expense' && t.date === dateStr)
        .reduce((s, t) => s + Number(t.amount), 0);
      cumulative += dayExpenses;
      data.push({ day: d, amount: cumulative });
    }
    return data;
  }, [monthlyTransactions, currentMonth, currentYear]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();
    monthlyTransactions.filter(t => t.type === 'expense').forEach(t => {
      const catName = t.category?.name || 'Sem Categoria';
      const existing = map.get(catName);
      if (existing) existing.value += Number(t.amount);
      else map.set(catName, { name: catName, value: Number(t.amount) });
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [monthlyTransactions]);

  return {
    monthlyTransactions,
    monthlyIncome,
    monthlyExpenses,
    available,
    budgetUsed,
    spendingChartData,
    expensesByCategory,
  };
};
