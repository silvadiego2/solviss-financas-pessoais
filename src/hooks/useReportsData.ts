import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { startOfMonth, subMonths, endOfMonth, format } from 'date-fns';

export interface MonthlyPoint {
  month: string;
  receitas: number;
  despesas: number;
}

export interface CategoryPoint {
  name: string;
  value: number;
}

export interface ReportsData {
  monthly: MonthlyPoint[];
  byCategory: CategoryPoint[];
}

export const useReportsData = () => {
  const { user } = useAuth();

  return useQuery<ReportsData>({
    queryKey: ['reports-data', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Janela: início do mês de 5 meses atrás → fim do mês atual
      const since = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');
      const until = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('transactions')
        .select('date, type, amount, category:categories(name)')
        .eq('user_id', user!.id)
        .gte('date', since)
        .lte('date', until)
        .order('date', { ascending: true });

      if (error) throw error;

      const rows = data ?? [];

      // --- gráfico de barras: 6 meses ---
      const monthly: MonthlyPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const ref  = subMonths(new Date(), i);
        const m    = ref.getMonth();
        const y    = ref.getFullYear();
        const label = format(ref, 'MMM', { locale: undefined });

        const slice = rows.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === m && d.getFullYear() === y;
        });

        monthly.push({
          month:    label.charAt(0).toUpperCase() + label.slice(1),
          receitas: slice.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
          despesas: slice.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
        });
      }

      // --- gráfico de pizza: categorias (mês atual) ---
      const currentM = new Date().getMonth();
      const currentY = new Date().getFullYear();
      const categoryMap = new Map<string, number>();

      rows
        .filter(t => {
          const d = new Date(t.date);
          return t.type === 'expense' && d.getMonth() === currentM && d.getFullYear() === currentY;
        })
        .forEach(t => {
          const name = (t.category as any)?.name ?? 'Sem categoria';
          categoryMap.set(name, (categoryMap.get(name) ?? 0) + Number(t.amount));
        });

      const byCategory: CategoryPoint[] = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      return { monthly, byCategory };
    },
  });
};
