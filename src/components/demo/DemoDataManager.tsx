import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BackHeader } from '@/components/layout/BackHeader';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useBudgets } from '@/hooks/useBudgets';
import { useAutomationRules } from '@/hooks/useAutomationRules';
import { useCategories } from '@/hooks/useCategories';
import { Database, CheckCircle, Loader2, Play } from 'lucide-react';
import { enhancedToast } from '@/components/ui/enhanced-toast';

interface DemoDataManagerProps {
  onBack?: () => void;
}

export const DemoDataManager: React.FC<DemoDataManagerProps> = ({ onBack }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const { createAccount } = useAccounts();
  const { createTransaction } = useTransactions();
  const { addGoal } = useGoals();
  const { createBudget } = useBudgets();
  const { createRule } = useAutomationRules();
  const { categories } = useCategories();

  const updateProgress = (step: string) => {
    setCompletedSteps(prev => [...prev, step]);
  };

  const createDemoData = async () => {
    setIsCreating(true);
    setCompletedSteps([]);

    try {
      // 1. Contas
      const contaCorrente = await createAccount({
        name: 'Conta Corrente Nubank',
        type: 'checking',
        initial_balance: 3500,
        color: '#820ad1',
        icon: '🏦',
        is_active: true,
      });
      const poupanca = await createAccount({
        name: 'Poupança Itaú',
        type: 'savings',
        initial_balance: 12000,
        color: '#003d7a',
        icon: '💰',
        is_active: true,
      });
      updateProgress('accounts');

      // 2. Transações demo
      const expenseCategories = categories.filter(c => c.type === 'expense');
      const incomeCategories = categories.filter(c => c.type === 'income');
      const today = new Date();

      const demoTransactions = [
        { description: 'Salário', amount: 5500, type: 'income' as const, days: 5, catIdx: 0 },
        { description: 'Aluguel', amount: 1200, type: 'expense' as const, days: 4, catIdx: 0 },
        { description: 'Supermercado', amount: 380, type: 'expense' as const, days: 3, catIdx: 1 },
        { description: 'Netflix', amount: 39.9, type: 'expense' as const, days: 3, catIdx: 2 },
        { description: 'Uber', amount: 45, type: 'expense' as const, days: 2, catIdx: 3 },
        { description: 'Freelance', amount: 1200, type: 'income' as const, days: 1, catIdx: 1 },
      ];

      for (const t of demoTransactions) {
        const date = new Date(today);
        date.setDate(date.getDate() - t.days);
        const cats = t.type === 'income' ? incomeCategories : expenseCategories;
        await createTransaction({
          description: t.description,
          amount: t.amount,
          type: t.type,
          date: date.toISOString().split('T')[0],
          account_id: contaCorrente?.id || '',
          category_id: cats[t.catIdx % cats.length]?.id,
        });
      }
      updateProgress('transactions');

      // 3. Meta
      await addGoal({
        title: 'Fundo de Emergência',
        description: 'Reserva equivalente a 6 meses de despesas',
        target_amount: 18000,
        current_amount: 12000,
        deadline: new Date(today.getFullYear() + 1, 5, 30).toISOString().split('T')[0],
        icon: '🛡️',
        color: '#059669',
      });
      updateProgress('goals');

      // 4. Orçamento
      const firstExpenseCat = expenseCategories[0];
      if (firstExpenseCat) {
        await createBudget({
          category_id: firstExpenseCat.id,
          amount: 600,
          period: 'monthly',
          month: today.getMonth() + 1,
          year: today.getFullYear(),
        });
      }
      updateProgress('budgets');

      enhancedToast.success('Dados de demonstração criados!', {
        description: 'Explore o app com dados reais de exemplo.'
      });
    } catch (error) {
      enhancedToast.error('Erro ao criar dados de demonstração');
    } finally {
      setIsCreating(false);
    }
  };

  const steps = [
    { id: 'accounts', label: 'Contas bancárias' },
    { id: 'transactions', label: 'Transações' },
    { id: 'goals', label: 'Metas' },
    { id: 'budgets', label: 'Orçamentos' },
  ];

  return (
    <div className="space-y-6">
      <BackHeader
        title="Dados de Demonstração"
        subtitle="Crie dados de exemplo para explorar o app"
        icon={<Database className="h-6 w-6" />}
        onBack={onBack}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">O que será criado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map(step => (
            <div key={step.id} className="flex items-center justify-between">
              <span className="text-sm">{step.label}</span>
              {completedSteps.includes(step.id) ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        onClick={createDemoData}
        disabled={isCreating}
        className="w-full"
      >
        {isCreating ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando dados...</>
        ) : (
          <><Play className="h-4 w-4 mr-2" />Criar Dados de Demonstração</>
        )}
      </Button>
    </div>
  );
};
