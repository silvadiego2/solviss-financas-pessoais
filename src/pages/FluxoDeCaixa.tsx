import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackHeader } from '@/components/layout/BackHeader';
import { useTransactions } from '@/hooks/useTransactions';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium" style={{ color: p.color }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export const FluxoDeCaixa: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { transactions, loading } = useTransactions();
  const [months, setMonths] = useState('6');

  const monthsCount = parseInt(months);

  const data = useMemo(() => {
    const now = new Date();
    const result: { key: string; label: string; income: number; expense: number; balance: number }[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        key,
        label: `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        income: 0,
        expense: 0,
        balance: 0,
      });
    }

    transactions.forEach((t) => {
      if (t.status === 'cancelled') return;
      const key = t.date.slice(0, 7);
      const item = result.find((r) => r.key === key);
      if (!item) return;
      if (t.type === 'income') item.income += t.amount;
      else if (t.type === 'expense') item.expense += t.amount;
    });

    // saldo acumulado
    let accumulated = 0;
    result.forEach((item) => {
      item.balance = item.income - item.expense;
      accumulated += item.balance;
    });

    return result;
  }, [transactions, monthsCount]);

  const accumulatedData = useMemo(() => {
    let acc = 0;
    return data.map((item) => {
      acc += item.balance;
      return { ...item, accumulated: acc };
    });
  }, [data]);

  const totals = useMemo(() => ({
    income: data.reduce((s, i) => s + i.income, 0),
    expense: data.reduce((s, i) => s + i.expense, 0),
    balance: data.reduce((s, i) => s + i.balance, 0),
  }), [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        {onBack && <BackHeader title="Fluxo de Caixa" onBack={onBack} />}
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {onBack && <BackHeader title="Fluxo de Caixa" onBack={onBack} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Entradas e saídas ao longo do tempo</p>
        </div>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <ArrowUpCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Entradas</p>
                <p className="text-lg font-bold text-green-500">{fmt(totals.income)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <ArrowDownCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Saídas</p>
                <p className="text-lg font-bold text-red-500">{fmt(totals.expense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                totals.balance >= 0 ? 'bg-primary/10' : 'bg-orange-500/10'
              }`}>
                {totals.balance >= 0
                  ? <TrendingUp className="w-5 h-5 text-primary" />
                  : <TrendingDown className="w-5 h-5 text-orange-500" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Líquido</p>
                <p className={`text-lg font-bold ${totals.balance >= 0 ? 'text-primary' : 'text-orange-500'}`}>
                  {fmt(totals.balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de barras - Entradas vs Saídas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entradas vs Saídas</CardTitle>
        </CardHeader>
        <CardContent>
          {data.every((d) => d.income === 0 && d.expense === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma transação no período selecionado.</p>
              <p className="text-xs text-muted-foreground mt-1">Adicione transações para visualizar o fluxo.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data} barCategoryGap="30%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="income" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de linha - Saldo acumulado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo Acumulado</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={accumulatedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="accumulated"
                name="Saldo acumulado"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: 'var(--primary)' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo por Mês</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Mês</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Entradas</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Saídas</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.key} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium">{item.label}</td>
                    <td className="px-4 py-3 text-right text-green-500 tabular-nums">{fmt(item.income)}</td>
                    <td className="px-4 py-3 text-right text-red-500 tabular-nums">{fmt(item.expense)}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                      item.balance >= 0 ? 'text-primary' : 'text-orange-500'
                    }`}>{fmt(item.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50">
                  <td className="px-4 py-3 font-bold">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-green-500 tabular-nums">{fmt(totals.income)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-500 tabular-nums">{fmt(totals.expense)}</td>
                  <td className={`px-4 py-3 text-right font-bold tabular-nums ${
                    totals.balance >= 0 ? 'text-primary' : 'text-orange-500'
                  }`}>{fmt(totals.balance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
