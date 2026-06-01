import React, { useState } from 'react';
import {
  Check, X, Zap, Shield, Crown,
  CreditCard, Lock, HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BackHeader } from '@/components/layout/BackHeader';

type Period = 'monthly' | 'yearly';

interface Plan {
  id: string;
  name: string;
  icon: React.ReactNode;
  badge?: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  description: string;
  cta: string;
  ctaVariant: 'default' | 'outline' | 'secondary';
  highlight: boolean;
  features: { label: string; included: boolean }[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratuito',
    icon: <Shield className="w-5 h-5" />,
    priceMonthly: 0,
    priceYearly: 0,
    description: 'Para quem está começando a organizar as finanças.',
    cta: 'Plano atual',
    ctaVariant: 'outline',
    highlight: false,
    features: [
      { label: '1 conta bancária', included: true },
      { label: 'Até 50 transações/mês', included: true },
      { label: 'Dashboard básico', included: true },
      { label: 'Relatórios simples', included: true },
      { label: 'Metas financeiras', included: false },
      { label: 'Orçamento por categoria', included: false },
      { label: 'Fluxo de caixa', included: false },
      { label: 'Inteligência financeira (IA)', included: false },
      { label: 'Exportação de dados', included: false },
      { label: 'Suporte prioritário', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: <Zap className="w-5 h-5" />,
    badge: 'Mais popular',
    priceMonthly: 19.90,
    priceYearly: 14.90,
    description: 'Para quem quer controle total das finanças pessoais.',
    cta: 'Assinar Pro',
    ctaVariant: 'default',
    highlight: true,
    features: [
      { label: 'Contas ilimitadas', included: true },
      { label: 'Transações ilimitadas', included: true },
      { label: 'Dashboard completo', included: true },
      { label: 'Relatórios avançados', included: true },
      { label: 'Metas financeiras', included: true },
      { label: 'Orçamento por categoria', included: true },
      { label: 'Fluxo de caixa', included: true },
      { label: 'Inteligência financeira (IA)', included: true },
      { label: 'Exportação de dados', included: false },
      { label: 'Suporte prioritário', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    icon: <Crown className="w-5 h-5" />,
    priceMonthly: 39.90,
    priceYearly: 29.90,
    description: 'Para quem precisa do máximo em automação e suporte.',
    cta: 'Assinar Premium',
    ctaVariant: 'secondary',
    highlight: false,
    features: [
      { label: 'Contas ilimitadas', included: true },
      { label: 'Transações ilimitadas', included: true },
      { label: 'Dashboard completo', included: true },
      { label: 'Relatórios avançados', included: true },
      { label: 'Metas financeiras', included: true },
      { label: 'Orçamento por categoria', included: true },
      { label: 'Fluxo de caixa', included: true },
      { label: 'Inteligência financeira (IA)', included: true },
      { label: 'Exportação de dados', included: true },
      { label: 'Suporte prioritário', included: true },
    ],
  },
];

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const FeatureRow: React.FC<{ label: string; included: boolean }> = ({ label, included }) => (
  <div className="flex items-center gap-3 py-1.5">
    {included
      ? <Check className="w-4 h-4 text-primary flex-shrink-0" />
      : <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
    <span className={`text-sm ${included ? 'text-foreground' : 'text-muted-foreground/60'}`}>
      {label}
    </span>
  </div>
);

export const Planos: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [period, setPeriod] = useState<Period>('monthly');

  return (
    <div className="space-y-8">
      <BackHeader
        title="Planos"
        icon={<Crown size={22} />}
        subtitle="Desbloqueie recursos avançados"
        onBack={onBack}
      />

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Desbloqueie recursos avançados e tenha controle total das suas finanças.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPeriod('monthly')}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
              period === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setPeriod('yearly')}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
              period === 'yearly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Anual
            <Badge variant="secondary" className="text-xs px-1.5 py-0">-25%</Badge>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {PLANS.map((plan) => {
          const price = period === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                plan.highlight ? 'border-primary ring-2 ring-primary/20 shadow-lg' : ''
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="text-xs px-3 py-0.5 shadow-sm">{plan.badge}</Badge>
                </div>
              )}
              <CardHeader className="pb-4 pt-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  plan.highlight ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {plan.icon}
                </div>
                <h2 className="text-lg font-bold">{plan.name}</h2>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
                <div className="mt-3">
                  {price === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">Grátis</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{fmt(price!)}</span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                  )}
                  {period === 'yearly' && price !== 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cobrado {fmt(price! * 12)}/ano
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <Button variant={plan.ctaVariant} className="w-full" disabled={plan.id === 'free'}>
                  {plan.id !== 'free' && <CreditCard className="w-4 h-4 mr-2" />}
                  {plan.cta}
                </Button>
                <div className="divide-y divide-border/50">
                  {plan.features.map((f) => (
                    <FeatureRow key={f.label} label={f.label} included={f.included} />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          Pagamento 100% seguro
        </div>
        <div className="hidden sm:block w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          Cancele a qualquer momento
        </div>
        <div className="hidden sm:block w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          Suporte em português
        </div>
      </div>
    </div>
  );
};
