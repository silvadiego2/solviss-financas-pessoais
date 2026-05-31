import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

const PAGE_SIZE  = 50;
const STALE_TIME = 2 * 60 * 1000; // 2 min

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  date: string;
  notes?: string;
  tags?: string[];
  status: 'pending' | 'completed' | 'cancelled';
  transfer_account_id?: string;
  is_recurring?: boolean;
  recurrence_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_end_date?: string;
  receipt_image_url?: string;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string; icon?: string; color?: string };
  account?:  { id: string; name: string };
  category_name?: string | null;
}

export interface TransactionFilters {
  type?:        'income' | 'expense' | 'transfer' | 'all';
  category_id?: string;
  account_id?:  string;
  dateFrom?:    string;
  dateTo?:      string;
  search?:      string;
}

export interface CreateTransactionInput {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  account_id: string;
  category_id?: string;
  date: string;
  notes?: string;
  tags?: string[];
  status: 'pending' | 'completed' | 'cancelled';
  transfer_account_id?: string;
  is_recurring?: boolean;
  recurrence_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_end_date?: string;
  receiptFile?: File;
}

// ─── Fetcher com filtros server-side ──────────────────────────────────────────

async function fetchPage(
  userId: string,
  filters: TransactionFilters,
  page: number,
): Promise<{ data: Transaction[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  let q = supabase
    .from('transactions')
    .select(`
      *,
      category:categories(id, name, icon, color),
      account:accounts!transactions_account_id_fkey(id, name)
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .range(from, to);

  if (filters.type && filters.type !== 'all')   q = q.eq('type', filters.type);
  if (filters.category_id)                       q = q.eq('category_id', filters.category_id);
  if (filters.account_id)                        q = q.eq('account_id',  filters.account_id);
  if (filters.dateFrom)                          q = q.gte('date', filters.dateFrom);
  if (filters.dateTo)                            q = q.lte('date', filters.dateTo);
  if (filters.search?.trim()) {
    q = q.ilike('description', `%${filters.search.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as any[];
  return {
    data:    rows.map(normalizeRow),
    hasMore: rows.length === PAGE_SIZE,
  };
}

function normalizeRow(t: any): Transaction {
  return {
    ...t,
    amount:        Number(t.amount),
    category_name: t.category?.name ?? null,
  };
}

// ─── Upload de comprovante ───────────────────────────────────────────────

async function uploadReceipt(userId: string, file: File): Promise<string> {
  const ext      = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('receipts').upload(fileName, file);
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
  return urlData.publicUrl;
}

// ─── Hook principal ──────────────────────────────────────────────────────────────────

export const useTransactions = (filters: TransactionFilters = {}) => {
  const { user }    = useAuth();
  const queryClient = useQueryClient();

  const queryKey = [
    'transactions', user?.id,
    filters.type,
    filters.category_id,
    filters.account_id,
    filters.dateFrom,
    filters.dateTo,
    filters.search,
  ];

  // Infinite query (paginação acumulativa)
  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 0 }) =>
      fetchPage(user!.id, filters, pageParam as number),
    getNextPageParam: (last, pages) =>
      last.hasMore ? pages.length : undefined,
    initialPageParam: 0,
    enabled:   !!user,
    staleTime: STALE_TIME,
  });

  const transactions: Transaction[] =
    infiniteQuery.data?.pages.flatMap(p => p.data) ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['transactions'] });

  // ── Create ─────────────────────────────────────────────────────────────────────
  const createTransactionMutation = useMutation({
    mutationFn: async ({ receiptFile, ...input }: CreateTransactionInput) => {
      if (!user) throw new Error('Usuário não autenticado');
      const receipt_image_url = receiptFile
        ? await uploadReceipt(user.id, receiptFile)
        : undefined;
      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...input, user_id: user.id, receipt_image_url } as any])
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      if (variables.is_recurring)
        queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      toast.success('Transação adicionada com sucesso!');
    },
    onError: () => toast.error('Erro ao adicionar transação'),
  });

  // ── Update ─────────────────────────────────────────────────────────────────────
  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, receiptFile, ...updates }: Partial<Transaction> & { id: string; receiptFile?: File }) => {
      const receipt_image_url = receiptFile
        ? await uploadReceipt(user!.id, receiptFile)
        : updates.receipt_image_url;
      const { data, error } = await supabase
        .from('transactions')
        .update({ ...updates, receipt_image_url } as any)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      toast.success('Transação atualizada com sucesso!');
    },
    onError: () => toast.error('Erro ao atualizar transação'),
  });

  // ── Delete ─────────────────────────────────────────────────────────────────────
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      toast.success('Transação excluída com sucesso!');
    },
    onError: () => toast.error('Erro ao deletar transação'),
  });

  return {
    transactions,
    // paginação
    hasNextPage:        infiniteQuery.hasNextPage,
    fetchNextPage:      infiniteQuery.fetchNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    // estados
    loading:    infiniteQuery.isLoading,
    isFetching: infiniteQuery.isFetching,
    error:      infiniteQuery.error,
    // mutations
    createTransaction: createTransactionMutation.mutate,
    updateTransaction: updateTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,
    isCreating: createTransactionMutation.isPending,
    isUpdating: updateTransactionMutation.isPending,
    isDeleting: deleteTransactionMutation.isPending,
    refetch:    invalidate,
  };
};
