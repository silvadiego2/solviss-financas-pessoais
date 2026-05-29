import React from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { useReportsData } from '@/hooks/useReportsData';
import { BackHeader } from '@/components/layout/BackHeader';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const fmt = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value);

const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.dataKey === 'receitas' ? 'Receitas' : 'Despesas'}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

const CustomTooltipPie = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground">{name}</p>
      <p className="text-muted-foreground">{fmt(value)}</p>
    </div>
  );
};

interface SimpleReportsProps {
  onBack?: () => void;
}

export const SimpleReports: React.FC<SimpleReportsProps> = ({ onBack }) => {
  const { data, isLoading } = useReportsData();

  const monthly    = data?.monthly    ?? [];
  const byCategory = data?.byCategory ?? [];

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Relatórios" onBack={onBack} />}
      {!onBack && <h2 className="text-lg font-semibold">Relatórios</h2>}

      {/* Receitas vs Despesas — 6 meses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receitas vs Despesas (6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false} tickLine={false} width={52}
                  />
                  <Tooltip content={<CustomTooltipBar />} />
                  <Legend
                    formatter={(value) => value === 'receitas' ? 'Receitas' : 'Despesas'}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="receitas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="despesas" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Despesas por Categoria — mês atual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Despesas por Categoria (mês atual)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Nenhuma despesa encontrada este mês
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-1/2 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory}
                      cx="50%" cy="50%"
                      innerRadius={48} outerRadius={80}
                      paddingAngle={2} strokeWidth={0}
                      dataKey="value"
                    >
                      {byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltipPie />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full sm:w-1/2 space-y-2">
                {byCategory.map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="flex-1 truncate text-muted-foreground">{cat.name}</span>
                    <span className="font-medium tabular-nums">{fmt(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo do mês */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo do Mês Atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded" />
            ))
          ) : byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma despesa encontrada para este período
            </p>
          ) : (
            byCategory.map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-sm">{cat.name}</span>
                </div>
                <span className="text-sm font-medium tabular-nums">{fmt(cat.value)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
