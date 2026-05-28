import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, ChevronRight, AlertTriangle, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { useAgendaFinanceira } from '@/hooks/useAgendaFinanceira';
import { formatCurrency } from '@/utils/formatters';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgendaWidgetProps {
  onNavigate?: (tab: string) => void;
}

const getDueDateLabel = (dateStr: string) => {
  const d = parseISO(dateStr);
  if (isToday(d)) return { label: 'Hoje', color: 'text-orange-500' };
  if (isTomorrow(d)) return { label: 'Amanhã', color: 'text-yellow-500' };
  if (isPast(d)) return { label: 'Vencida', color: 'text-red-500' };
  return { label: format(d, "dd MMM", { locale: ptBR }), color: 'text-muted-foreground' };
};

export const AgendaWidget: React.FC<AgendaWidgetProps> = ({ onNavigate }) => {
  const { items, loading, stats } = useAgendaFinanceira();

  const upcoming = items
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .slice(0, 4);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />)}
        </CardContent>
      </Card>
    );
  }

  if (upcoming.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Agenda Financeira
          </CardTitle>
          <Button
            variant="ghost" size="sm"
            className="text-xs text-primary h-auto py-1"
            onClick={() => onNavigate?.('agenda')}
          >
            Ver tudo <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
        {stats.overdue > 0 && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-red-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            {stats.overdue} vencido{stats.overdue > 1 ? 's' : ''} — ação necessária
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.map(item => {
          const { label, color } = getDueDateLabel(item.due_date);
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 py-1.5 cursor-pointer rounded-lg hover:bg-muted/50 transition-colors px-1"
              onClick={() => onNavigate?.('agenda')}
            >
              <div className={`flex-shrink-0 ${item.type === 'payable' ? 'text-red-500' : 'text-green-500'}`}>
                {item.type === 'payable'
                  ? <TrendingDown className="h-4 w-4" />
                  : <TrendingUp className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold">{formatCurrency(item.amount)}</p>
                <p className={`text-xs ${color}`}>{label}</p>
              </div>
            </div>
          );
        })}

        {(stats.totalPayable > 0 || stats.totalReceivable > 0) && (
          <div className="flex gap-3 pt-2 border-t border-border">
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground">A Pagar</p>
              <p className="text-sm font-bold text-red-500">{formatCurrency(stats.totalPayable)}</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground">A Receber</p>
              <p className="text-sm font-bold text-green-500">{formatCurrency(stats.totalReceivable)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
