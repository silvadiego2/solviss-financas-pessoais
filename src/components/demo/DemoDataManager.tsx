import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useBudgets } from '@/hooks/useBudgets';
import { useAutomationRules } from '@/hooks/useAutomationRules';
import { useCategories } from '@/hooks/useCategories';
import { toast } from 'sonner';
import { Loader2, Database, CheckCircle } from 'lucide-react';
import { BackHeader } from '@/components/layout/BackHeader';

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
      // 1. Criar contas bancárias
      toast.info('Criando contas bancárias...');
      
      const checkingAccount = await new Promise((resolve) => {
        createAccount({
          name: 'Conta Corrente',
          type: 'checking' as any,
          bank_name: 'Banco do Brasil',
          balance: 2500
        });
        // Simular delay para demonstrar progresso
        setTimeout(() => resolve('checking-created'), 500);
      });
      updateProgress('Conta corrente criada');

      const savingsAccount = await new Promise((resolve) => {
        createAccount({
          name: 'Poupança',
          type: 'savings' as any,
          bank_name: 'Caixa Econômica Federal', 
          balance: 8000
        });
        setTimeout(() => resolve('savings-created'), 500);
      });
      updateProgress('Conta poupança criada');

      const creditCardAccount = await new Promise((resolve) => {
        createAccount({
          name: 'Cartão Nubank',
          type: 'credit_card' as any,
          bank_name: 'Nubank',
          balance: -850,
          credit_limit: 3000,
          due_day: 15,
          closing_day: 8
        });
        setTimeout(() => resolve('credit-created'), 500);
      });
      updateProgress('Cartão de crédito criado');

      // 2. Criar metas financeiras
      toast.info('Criando metas financeiras...');
      
      addGoal({
        name: 'Reserva de Emergência',
        description: 'Acumular 6 meses de gastos para emergências',
        target_amount: 20000,
        current_amount: 8000,
        target_date: '2024-12-31',
        is_completed: false
      });
      updateProgress('Meta: Reserva de Emergência');

      addGoal({
        name: 'Viagem para Europa',
        description: 'Economizar para viagem dos sonhos',
        target_amount: 15000,
        current_amount: 2300,
        target_date: '2025-06-30',
        is_completed: false
      });
      updateProgress('Meta: Viagem Europa');

      addGoal({
        name: 'Novo Notebook',
        description: 'Comprar notebook para trabalho',
        target_amount: 4000,
        current_amount: 1200,
        target_date: '2024-03-31',
        is_completed: false
      });
      updateProgress('Meta: Notebook');

      // 3. Criar orçamentos
      toast.info('Criando orçamentos...');
      
      const alimentacaoCategory = categories.find(c => c.name === 'Alimentação');
      const transporteCategory = categories.find(c => c.name === 'Transporte');
      const lazerCategory = categories.find(c => c.name === 'Lazer');
      const moradiaCategory = categories.find(c => c.name === 'Moradia');

      if (alimentacaoCategory) {
        createBudget({
          category_id: alimentacaoCategory.id,
          amount: 800,
          spent: 0,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        });
        updateProgress('Orçamento: Alimentação');
      }

      if (transporteCategory) {
        createBudget({
          category_id: transporteCategory.id,
          amount: 300,
          spent: 0,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        });
        updateProgress('Orçamento: Transporte');
      }

      if (lazerCategory) {
        createBudget({
          category_id: lazerCategory.id,
          amount: 400,
          spent: 0,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        });
        updateProgress('Orçamento: Lazer');
      }

      if (moradiaCategory) {
        createBudget({
          category_id: moradiaCategory.id,
          amount: 1500,
          spent: 0,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        });
        updateProgress('Orçamento: Moradia');
      }

      // 4. Criar regras de automação
      toast.info('Criando regras de automação...');
      
      createRule({
        name: 'Auto-categorizar Transferências',
        rule_type: 'categorization',
        conditions: [
          {
            field: 'description',
            operator: 'contains',
            value: 'transferencia'
          }
        ],
        actions: [
          {
            type: 'set_category',
            value: 'investimentos'
          }
        ],
        priority: 1
      });
      updateProgress('Regra: Auto-categorização');

      createRule({
        name: 'Alerta Gastos Alimentação',
        rule_type: 'alert',
        conditions: [
          {
            field: 'category',
            operator: 'equals',
            value: 'alimentacao'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 600
          }
        ],
        actions: [
          {
            type: 'send_alert',
            value: 'Gastos com alimentação acima de R$ 600'
          }
        ],
        priority: 2
      });
      updateProgress('Regra: Alerta gastos');

      toast.success('🎉 Dados de demonstração criados com sucesso!');
      
    } catch (error) {
      console.error('Erro ao criar dados demo:', error);
      toast.error('Erro ao criar dados de demonstração');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Dados de Demonstração" onBack={onBack} />}
      <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Dados de Demonstração
        </CardTitle>
        <CardDescription>
          Crie dados de exemplo para testar todas as funcionalidades do aplicativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
          <div className="space-y-3">
          <h4 className="font-medium">O que será criado:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">📊 Contas (3)</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Conta Corrente BB</li>
                <li>• Poupança Caixa</li>
                <li>• Cartão Nubank</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">🎯 Metas (3)</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Reserva emergência</li>
                <li>• Viagem Europa</li>
                <li>• Novo notebook</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">💰 Orçamentos (4)</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Alimentação: R$ 800</li>
                <li>• Transporte: R$ 300</li>
                <li>• Lazer: R$ 400</li>
                <li>• Moradia: R$ 1.500</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">🤖 Automação (2)</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Auto-categorização</li>
                <li>• Alertas orçamento</li>
              </ul>
            </div>
          </div>
        </div>

        {completedSteps.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Progresso:</h4>
            <div className="space-y-1">
              {completedSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button 
          onClick={createDemoData} 
          disabled={isCreating}
          className="w-full"
          size="lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando dados...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Criar Dados de Demonstração
            </>
          )}
        </Button>
      </CardContent>
    </Card>
    </div>
  );
};