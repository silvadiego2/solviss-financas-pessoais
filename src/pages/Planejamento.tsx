import React, { useMemo } from 'react';
import { AlertCircle, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTransactions } from '@/hooks/useTransactions';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

interface Debt {
  id: string;
  description: string;
  amount: number;
  interest_rate: number;
  minimum_payment: number;
}

const getPriority = (index: number, total: number): { label: string; variant: 'destructive' | 'default' | 'secondary' } => {
  if (total <= 1) return { label: 'Alta', variant: 'destructive' };
  const ratio = index / total;
  if (ratio < 0.34) return { label: 'Alta', variant: 'destructive' };
  if (ratio < 0.67) return { label: 'Média', variant: 'default' };
  return { label: 'Baixa', variant: 'secondary' };
};

const estimateMonths = (debts: Debt[]): number => {
  let months = 0;
  const balances = debts.map((d) => ({ balance: d.amount, rate: d.interest_rate / 100, min: d.minimum_payment }));
  while (balances.some((b) => b.balance > 0) && months < 600) {
    months++;
    for (const b of balances) {
      if (b.balance <= 0) continue;
      b.balance = b.balance * (1 + b.rate) - (b.min || b.balance * 0.05);
      if (b.balance < 0) b.balance = 0;
    }
  }
  return months;
};

export const Planejamento: React.FC<{ onBack?: () => void }> = () => {
  const { transactions, loading } = useTransactions();

  const debts = useMemo<Debt[]>(() => {
    return (transactions as any[])
      .filter((t) => t.type === 'expense' && t.is_debt === true)
      .map((t) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount) || 0,
        interest_rate: Number(t.interest_rate) || 0,
        minimum_payment: Number(t.minimum_payment) || 0,
      }))
      .sort((a, b) => b.interest_rate - a.interest_rate || b.amount - a.amount);
  }, [transactions]);

  const totalDebt = debts.reduce((s, d) => s + d.amount, 0);
  const totalMin  = debts.reduce((s, d) => s + d.minimum_payment, 0);
  const months    = debts.length > 0 ? estimateMonths(debts) : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Planejamento</p>
        <h1 className="text-2xl font-bold mt-1">Planejamento Financeiro</h1>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-destructive" />
          <h2 className="text-lg font-semibold">Suas Dívidas</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de dívidas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{formatBRL(totalDebt)}</p>
              <p className="text-xs text-muted-foreground mt-1">{debts.length} dívida(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pagamento mínimo total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatBRL(totalMin)}</p>
              <p className="text-xs text-muted-foreground mt-1">por mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Estimativa de quitação</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{months > 0 ? `${months} meses` : '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {months > 0 ? `~${Math.ceil(months / 12)} ano(s) pagando o mínimo` : 'Sem dívidas ativas'}
              </p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="p-8 text-center text-muted-foreground">Carregando...</Card>
        ) : debts.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium text-muted-foreground">Nenhuma dívida cadastrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Marque uma despesa como dívida para vê-la aqui, ordenada por maior taxa de juros.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {debts.map((debt, i) => {
              const priority = getPriority(i, debts.length);
              return (
                <Card key={debt.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{debt.description}</h3>
                        <Badge variant={priority.variant}>{priority.label}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Juros: <strong className="text-foreground">{debt.interest_rate.toFixed(2)}% a.m.</strong></span>
                        <span>Mínimo: <strong className="text-foreground">{formatBRL(debt.minimum_payment)}</strong></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Saldo devedor</p>
                      <p className="text-lg font-bold text-destructive">{formatBRL(debt.amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
