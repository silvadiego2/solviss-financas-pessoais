import React, { useState } from 'react';
import {
  Brain, RefreshCw, TrendingUp, PiggyBank, CreditCard,
  Target, AlertTriangle, Wallet, Sparkles, Cpu, Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Recommendation {
  title: string;
  description: string;
  priority: 'alta' | 'media' | 'baixa';
  icon: string;
}

interface RiskAlert {
  title: string;
  message: string;
  severity: 'high' | 'medium';
}

interface Analysis {
  score: number;
  score_reason: string;
  recommendations: Recommendation[];
  risk_alert: RiskAlert | null;
}

interface AnalysisResult {
  analysis: Analysis;
  summary: Record<string, number>;
  source: 'openai' | 'local';
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'trending-up': TrendingUp,
  'piggy-bank': PiggyBank,
  'credit-card': CreditCard,
  'target': Target,
  'alert-triangle': AlertTriangle,
  'wallet': Wallet,
};

const priorityStyles: Record<string, string> = {
  alta: 'border-l-4 border-l-destructive',
  media: 'border-l-4 border-l-yellow-500',
  baixa: 'border-l-4 border-l-primary',
};

const priorityBadge: Record<string, string> = {
  alta: 'bg-destructive/10 text-destructive',
  media: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  baixa: 'bg-primary/10 text-primary',
};

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-destructive';
};

const getScoreBg = (score: number) => {
  if (score >= 70) return 'bg-green-500/10 border-green-500/30';
  if (score >= 40) return 'bg-yellow-500/10 border-yellow-500/30';
  return 'bg-destructive/10 border-destructive/30';
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const errorMessage = (e: any): string => {
  const msg: string = e?.message || '';
  if (msg.includes('429') || msg.toLowerCase().includes('limite'))
    return 'Limite de requisições atingido. Aguarde alguns minutos e tente novamente.';
  if (msg.includes('401') || msg.toLowerCase().includes('autorizado'))
    return 'Sessão expirada. Faça login novamente.';
  if (msg.includes('402') || msg.toLowerCase().includes('crédito'))
    return 'Créditos de IA esgotados.';
  if (msg.includes('500') || msg.toLowerCase().includes('interno'))
    return 'Erro interno no servidor. Tente novamente em instantes.';
  return msg || 'Erro ao gerar análise. Tente novamente.';
};

export const Inteligencia: React.FC<{ onBack?: () => void }> = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-financial-analysis');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as AnalysisResult);
      toast.success('Análise atualizada!');
    } catch (e: any) {
      console.error(e);
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const analysis = result?.analysis ?? null;
  const summary = result?.summary ?? null;
  const source = result?.source ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Inteligência</p>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Inteligência Financeira
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Análise personalizada dos seus dados financeiros</p>
        </div>
        <Button onClick={runAnalysis} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {analysis ? 'Atualizar análise' : 'Gerar análise'}
        </Button>
      </div>

      {/* Estado vazio */}
      {!analysis && !loading && (
        <Card className="p-12 text-center">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Pronto para analisar suas finanças</p>
          <p className="text-sm text-muted-foreground">
            Clique em &ldquo;Gerar análise&rdquo; para receber insights personalizados baseados nas suas transações, contas e metas.
          </p>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card className="p-12 text-center">
          <RefreshCw className="w-12 h-12 text-primary mx-auto mb-3 animate-spin" />
          <p className="font-medium mb-1">Analisando seus dados...</p>
          <p className="text-sm text-muted-foreground">Calculando score e recomendações personalizadas</p>
        </Card>
      )}

      {analysis && (
        <>
          {/* Score */}
          <Card className={`border-2 ${getScoreBg(analysis.score)}`}>
            <CardContent className="p-6 flex items-center gap-6 flex-wrap">
              <div className="flex-shrink-0 text-center">
                <div className={`text-6xl font-bold ${getScoreColor(analysis.score)}`}>
                  {analysis.score}
                </div>
                <div className="text-xs text-muted-foreground mt-1">de 100</div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold">Score Financeiro</h2>
                  {source && (
                    <Badge variant="outline" className="text-xs gap-1">
                      {source === 'openai'
                        ? <><Bot className="w-3 h-3" /> OpenAI</>
                        : <><Cpu className="w-3 h-3" /> Análise local</>
                      }
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{analysis.score_reason}</p>
              </div>
              {/* Resumo rápido do mês */}
              {summary && (
                <div className="flex gap-4 flex-wrap text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Receita</p>
                    <p className="font-semibold text-green-500">{fmt(summary.income_month)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Despesas</p>
                    <p className="font-semibold text-destructive">{fmt(summary.expense_month)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Saldo</p>
                    <p className={`font-semibold ${summary.net_month >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                      {fmt(summary.net_month)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerta de risco */}
          {analysis.risk_alert && (
            <Alert variant={analysis.risk_alert.severity === 'high' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{analysis.risk_alert.title}</AlertTitle>
              <AlertDescription>{analysis.risk_alert.message}</AlertDescription>
            </Alert>
          )}

          {/* Recomendações */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Recomendações prioritárias</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {analysis.recommendations?.map((rec, i) => {
                const Icon = iconMap[rec.icon] || Sparkles;
                return (
                  <Card key={i} className={priorityStyles[rec.priority] || ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <CardTitle className="text-base leading-tight">{rec.title}</CardTitle>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${priorityBadge[rec.priority] || ''}`}>
                          {rec.priority}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
