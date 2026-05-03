import React, { useState } from 'react';
import { Brain, RefreshCw, TrendingUp, PiggyBank, CreditCard, Target, AlertTriangle, Wallet, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

export const Inteligencia: React.FC<{ onBack?: () => void }> = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-financial-analysis');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis);
      toast.success('Análise atualizada!');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erro ao gerar análise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Inteligência</p>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Inteligência Financeira
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Análise personalizada com IA dos seus dados</p>
        </div>
        <Button onClick={runAnalysis} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {analysis ? 'Atualizar análise' : 'Gerar análise'}
        </Button>
      </div>

      {!analysis && !loading && (
        <Card className="p-12 text-center">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Clique em "Gerar análise" para receber insights personalizados.</p>
        </Card>
      )}

      {loading && !analysis && (
        <Card className="p-12 text-center">
          <RefreshCw className="w-12 h-12 text-primary mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground">Analisando seus dados financeiros...</p>
        </Card>
      )}

      {analysis && (
        <>
          {/* Score */}
          <Card className={`border-2 ${getScoreBg(analysis.score)}`}>
            <CardContent className="p-6 flex items-center gap-6 flex-wrap">
              <div className="flex-shrink-0">
                <div className={`text-6xl font-bold ${getScoreColor(analysis.score)}`}>
                  {analysis.score}
                </div>
                <div className="text-xs text-muted-foreground mt-1">de 100</div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <h2 className="text-lg font-semibold mb-1">Score Financeiro</h2>
                <p className="text-sm text-muted-foreground">{analysis.score_reason}</p>
              </div>
            </CardContent>
          </Card>

          {/* Risk alert */}
          {analysis.risk_alert && (
            <Alert variant={analysis.risk_alert.severity === 'high' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{analysis.risk_alert.title}</AlertTitle>
              <AlertDescription>{analysis.risk_alert.message}</AlertDescription>
            </Alert>
          )}

          {/* Recommendations */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Recomendações prioritárias</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {analysis.recommendations?.map((rec, i) => {
                const Icon = iconMap[rec.icon] || Sparkles;
                return (
                  <Card key={i} className={priorityStyles[rec.priority] || ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <CardTitle className="text-base">{rec.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      <p className="text-xs mt-2 font-medium uppercase tracking-wide text-muted-foreground">
                        Prioridade: {rec.priority}
                      </p>
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
