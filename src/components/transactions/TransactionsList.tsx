import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Repeat, Search, Filter, ArrowUpRight, ArrowDownRight, X, SlidersHorizontal, Loader2, Plus } from 'lucide-react';
import { useTransactions, Transaction, TransactionFilters } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { TransactionSheet } from './TransactionSheet';
import { formatCurrency, formatDateBR } from '@/utils/formatters';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDebounce } from '@/hooks/useDebounce';

type SheetState =
  | { mode: 'add' }
  | { mode: 'edit'; transaction: Transaction }
  | { mode: 'closed' };

export const TransactionsList: React.FC = () => {
  // ── Filtros locais ───────────────────────────────────────────────────────
  const [search,         setSearch]         = useState('');
  const [filterType,     setFilterType]     = useState<TransactionFilters['type']>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount,  setFilterAccount]  = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const [showAdvanced,   setShowAdvanced]   = useState(false);

  // ── Sheet state ──────────────────────────────────────────────────────────
  const [sheet, setSheet] = useState<SheetState>({ mode: 'closed' });

  // Debounce de 350ms no search para não disparar query a cada tecla
  const debouncedSearch = useDebounce(search, 350);

  // ── Query com filtros server-side ────────────────────────────────────────
  const filters: TransactionFilters = useMemo(() => ({
    type:        filterType,
    category_id: filterCategory || undefined,
    account_id:  filterAccount  || undefined,
    dateFrom:    filterDateFrom || undefined,
    dateTo:      filterDateTo   || undefined,
    search:      debouncedSearch || undefined,
  }), [filterType, filterCategory, filterAccount, filterDateFrom, filterDateTo, debouncedSearch]);

  const {
    transactions,
    deleteTransaction,
    loading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTransactions(filters);

  const { accounts }   = useAccounts();
  const { categories } = useCategories();

  const activeFiltersCount = [
    filterCategory !== '',
    filterAccount  !== '',
    filterDateFrom !== '',
    filterDateTo   !== '',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setFilterCategory('');
    setFilterAccount('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // KPIs calculados apenas sobre os registros já carregados
  const totalIncome  = useMemo(() => transactions.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [transactions]);

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-7">
        <div>
          <div className="h-3 w-20 rounded bg-muted animate-pulse mb-2" />
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
        <div className="space-y-2">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Sheet lateral (Add / Edit) ─────────────────────────────────── */}
      <TransactionSheet
        state={sheet}
        onClose={() => setSheet({ mode: 'closed' })}
      />

      <div className="space-y-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-eyebrow">Transações</p>
            <h1 className="text-3xl font-semibold mt-1 tracking-tight">Movimentações</h1>
          </div>
          <Button
            onClick={() => setSheet({ mode: 'add' })}
            className="flex items-center gap-2 flex-shrink-0 mt-1"
          >
            <Plus className="w-4 h-4" />
            Nova Transação
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card-elevated p-5">
            <p className="label-eyebrow">Receitas</p>
            <p className="figure-hero text-2xl mt-2 text-success">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="card-elevated p-5">
            <p className="label-eyebrow">Despesas</p>
            <p className="figure-hero text-2xl mt-2 text-destructive">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="card-elevated p-5">
            <p className="label-eyebrow">Balanço</p>
            <p className="figure-hero text-2xl mt-2">{formatCurrency(totalIncome - totalExpense)}</p>
          </div>
        </div>

        {/* Filtros básicos */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar transações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType ?? 'all'} onValueChange={v => setFilterType(v as TransactionFilters['type'])}>
              <SelectTrigger className="w-36">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="icon" className="relative flex-shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>

          {/* Filtros avançados */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleContent>
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Categoria</p>
                    <Select value={filterCategory || 'all'} onValueChange={v => setFilterCategory(v === 'all' ? '' : v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Conta</p>
                    <Select value={filterAccount || 'all'} onValueChange={v => setFilterAccount(v === 'all' ? '' : v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Todas as contas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Data inicial</p>
                    <Input type="date" className="h-9" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Data final</p>
                    <Input type="date" className="h-9" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                  </div>
                </div>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                    <X className="w-3 h-3 mr-1" /> Limpar filtros
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Lista */}
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
              <Search className="h-8 w-8 mb-3 opacity-30" />
              <p className="font-medium">Nenhuma transação encontrada</p>
              {(search || activeFiltersCount > 0) && (
                <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  t.type === 'income'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-chart-income'
                    : 'bg-red-50 dark:bg-red-950/40 text-chart-expense'
                }`}>
                  {t.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    {t.is_recurring && (
                      <Badge variant="outline" className="text-[10px] gap-0.5 py-0">
                        <Repeat className="h-2.5 w-2.5" /> Rec.
                      </Badge>
                    )}
                    {(t as any).is_transfer && (
                      <Badge variant="secondary" className="text-[10px] gap-0.5 py-0">↔ Transf.</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.category?.name && `${t.category.name} · `}
                    {formatDateBR(t.date)}
                    {t.account?.name && ` · ${t.account.name}`}
                  </p>
                </div>
                <p className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                  t.type === 'income' ? 'text-chart-income' : 'text-foreground'
                }`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setSheet({ mode: 'edit', transaction: t })}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-accent transition-all"
                    aria-label="Editar transação"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-all"
                        aria-label="Excluir transação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja excluir esta transação?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTransaction(t.id)} className="bg-destructive hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Botão Carregar mais */}
        {hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="min-w-[160px]"
            >
              {isFetchingNextPage
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando...</>
                : `Carregar mais`
              }
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {transactions.length} transação(ões) carregada(s){hasNextPage ? ' — há mais' : ''}
        </p>
      </div>
    </>
  );
};
