import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, CheckCircle, Plus, Edit, Trash2, TrendingUp, TrendingDown, 
  AlertTriangle, Lightbulb, Calendar, DollarSign, Zap, Brain
} from 'lucide-react';
import { useGoals, Goal } from '@/hooks/useGoals';
import { useTransactions } from '@/hooks/useTransactions';
import { AddGoalForm } from '@/components/goals/AddGoalForm';
import { BackHeader } from '@/components/layout/BackHeader';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar } from 'recharts';

interface IntelligentGoalsProps {
  onBack?: () => void;
}

interface GoalInsight {
  type: 'warning' | 'success' | 'info' | 'suggestion';
  title: string;
  message: string;
  action?: string;
}

interface GoalPrediction {
  goalId: string;
  predictedCompletion: Date;
  confidence: number;
  monthlyNeeded: number;
  feasibility: 'easy' | 'moderate' | 'challenging' | 'unlikely';
}

export const IntelligentGoals: React.FC<IntelligentGoalsProps> = ({ onBack }) => {
  const { goals, deleteGoal, isDeletingGoal } = useGoals();
  const { transactions } = useTransactions();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  // Análise preditiva para cada meta
  const goalPredictions = useMemo(() => {
    const predictions: GoalPrediction[] = [];
    
    // Calcular tendência de poupança dos últimos 3 meses
    const last3Months = new Date();
    last3Months.setMonth(last3Months.getMonth() - 3);
    
    const recentTransactions = transactions.filter(t => 
      new Date(t.date) >= last3Months
    );
    
    const monthlyIncome = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0) / 3;
    
    const monthlyExpenses = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0) / 3;
    
    const monthlySavings = monthlyIncome - monthlyExpenses;
    
    goals.forEach(goal => {
      if (!goal.is_completed && goal.target_date) {
        const remaining = goal.target_amount - goal.current_amount;
        const daysRemaining = Math.ceil(
          (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        const monthsRemaining = Math.max(1, daysRemaining / 30);
        const monthlyNeeded = remaining / monthsRemaining;
        
        let feasibility: 'easy' | 'moderate' | 'challenging' | 'unlikely' = 'moderate';
        let confidence = 50;
        
        if (monthlySavings > 0) {
          const savingsRatio = monthlyNeeded / monthlySavings;
          
          if (savingsRatio <= 0.3) {
            feasibility = 'easy';
            confidence = 85;
          } else if (savingsRatio <= 0.6) {
            feasibility = 'moderate';
            confidence = 70;
          } else if (savingsRatio <= 1) {
            feasibility = 'challenging';
            confidence = 45;
          } else {
            feasibility = 'unlikely';
            confidence = 20;
          }
        }
        
        const predictedCompletion = new Date();
        predictedCompletion.setMonth(
          predictedCompletion.getMonth() + Math.ceil(remaining / Math.max(monthlySavings * 0.5, 100))
        );
        
        predictions.push({
          goalId: goal.id,
          predictedCompletion,
          confidence,
          monthlyNeeded,
          feasibility
        });
      }
    });
    
    return predictions;
  }, [goals, transactions]);

  // Insights inteligentes para metas
  const goalInsights = useMemo(() => {
    const insights: GoalInsight[] = [];
    
    goals.forEach(goal => {
      const prediction = goalPredictions.find(p => p.goalId === goal.id);
      const progress = getProgress(goal.current_amount, goal.target_amount);
      
      // Verificar se meta está atrasada
      if (goal.target_date && !goal.is_completed) {
        const daysRemaining = Math.ceil(
          (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysRemaining < 0) {
          insights.push({
            type: 'warning',
            title: `Meta "${goal.name}" está atrasada`,
            message: `A data limite já passou. Considere revisar o prazo ou aumentar os aportes.`,
            action: `Precisaria de ${formatCurrency((goal.target_amount - goal.current_amount) / Math.max(1, Math.abs(daysRemaining) / 30))} por mês para recuperar o atraso.`
          });
        } else if (daysRemaining < 30 && progress < 80) {
          insights.push({
            type: 'warning',
            title: `Meta "${goal.name}" em risco`,
            message: `Restam menos de 30 dias e você está em ${progress.toFixed(1)}% da meta.`,
            action: prediction ? `Precisaria de ${formatCurrency(prediction.monthlyNeeded)} este mês.` : undefined
          });
        }
      }
      
      // Insights baseados na análise preditiva
      if (prediction) {
        if (prediction.feasibility === 'easy' && progress < 25) {
          insights.push({
            type: 'suggestion',
            title: `Oportunidade: "${goal.name}"`,
            message: 'Esta meta é facilmente alcançável com sua capacidade atual de poupança.',
            action: `Considere aumentar o aporte para ${formatCurrency(prediction.monthlyNeeded * 1.5)} e finalizar mais cedo.`
          });
        } else if (prediction.feasibility === 'unlikely') {
          insights.push({
            type: 'warning',
            title: `Meta "${goal.name}" pode ser muito ambiciosa`,
            message: `Com base no seu padrão de poupança, esta meta é desafiadora.`,
            action: `Considere ajustar o prazo ou valor. Seria mais realista ${formatCurrency(goal.target_amount * 0.7)}.`
          });
        }
      }
      
      // Insights de progresso excepcional
      if (progress > 90 && !goal.is_completed) {
        insights.push({
          type: 'success',
          title: `Parabéns! "${goal.name}" quase concluída`,
          message: `Você está a ${formatCurrency(goal.target_amount - goal.current_amount)} de concluir esta meta!`,
        });
      }
    });
    
    // Insights gerais
    const activeGoals = goals.filter(g => !g.is_completed);
    if (activeGoals.length > 5) {
      insights.push({
        type: 'info',
        title: 'Muitas metas ativas',
        message: `Você tem ${activeGoals.length} metas ativas. Considere focar nas mais importantes.`,
        action: 'Priorize 3-4 metas principais para melhor foco e resultados.'
      });
    }
    
    return insights;
  }, [goals, goalPredictions]);

  // Dados para visualização de progresso ao longo do tempo
  const progressData = useMemo(() => {
    if (!selectedGoal) return [];
    
    const goal = goals.find(g => g.id === selectedGoal);
    if (!goal) return [];
    
    // Simulação de dados históricos (em uma implementação real, isso viria do banco)
    const data = [];
    const startDate = new Date(goal.created_at);
    const currentDate = new Date();
    const totalDays = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= Math.min(totalDays, 30); i += 5) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Simulação de crescimento progressivo
      const progressFactor = Math.min(i / totalDays, 1);
      const amount = goal.current_amount * progressFactor;
      
      data.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        valor: amount,
        meta: goal.target_amount,
        progresso: (amount / goal.target_amount) * 100
      });
    }
    
    return data;
  }, [selectedGoal, goals]);

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setShowAddForm(true);
  };

  const handleDelete = (goalId: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      deleteGoal(goalId);
    }
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingGoal(null);
  };

  if (showAddForm) {
    return <AddGoalForm onClose={handleCloseForm} editingGoal={editingGoal} />;
  }

  const selectedGoalData = selectedGoal ? goals.find(g => g.id === selectedGoal) : null;
  const selectedPrediction = selectedGoal ? goalPredictions.find(p => p.goalId === selectedGoal) : null;

  return (
    <div className="space-y-6">
      {onBack && <BackHeader title="Metas Inteligentes" onBack={onBack} />}
      
      {!onBack && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Brain size={24} />
              Metas Inteligentes
            </h2>
            <p className="text-muted-foreground">Análise preditiva e insights para suas metas financeiras</p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus size={16} className="mr-2" />
            Nova Meta
          </Button>
        </div>
      )}

      {/* Insights Inteligentes */}
      {goalInsights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb size={20} />
            Insights Inteligentes
          </h3>
          {goalInsights.slice(0, 3).map((insight, index) => (
            <Alert key={index} className={
              insight.type === 'warning' ? 'border-orange-200 bg-orange-50' :
              insight.type === 'success' ? 'border-green-200 bg-green-50' :
              insight.type === 'suggestion' ? 'border-blue-200 bg-blue-50' :
              'border-gray-200 bg-gray-50'
            }>
              <div className="flex">
                {insight.type === 'warning' && <AlertTriangle size={16} className="text-orange-600 mt-0.5" />}
                {insight.type === 'success' && <CheckCircle size={16} className="text-green-600 mt-0.5" />}
                {insight.type === 'suggestion' && <Lightbulb size={16} className="text-blue-600 mt-0.5" />}
                {insight.type === 'info' && <Target size={16} className="text-gray-600 mt-0.5" />}
                <div className="ml-3 flex-1">
                  <AlertDescription>
                    <div className="font-medium mb-1">{insight.title}</div>
                    <div className="text-sm">{insight.message}</div>
                    {insight.action && (
                      <div className="text-sm font-medium mt-2 text-primary">{insight.action}</div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Metas */}
        <div className="lg:col-span-2">
          {goals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Target size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Nenhuma meta cadastrada</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Defina seus objetivos financeiros e receba análises inteligentes
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus size={16} className="mr-2" />
                  Criar Primeira Meta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const progress = getProgress(goal.current_amount, goal.target_amount);
                const prediction = goalPredictions.find(p => p.goalId === goal.id);
                const isSelected = selectedGoal === goal.id;
                
                return (
                  <Card 
                    key={goal.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedGoal(isSelected ? null : goal.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center">
                          {goal.is_completed ? (
                            <CheckCircle size={20} className="text-green-600 mr-2" />
                          ) : (
                            <Target size={20} className="text-blue-600 mr-2" />
                          )}
                          {goal.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {prediction && (
                            <Badge variant={
                              prediction.feasibility === 'easy' ? 'default' :
                              prediction.feasibility === 'moderate' ? 'secondary' :
                              prediction.feasibility === 'challenging' ? 'outline' : 'destructive'
                            }>
                              {prediction.feasibility === 'easy' && 'Fácil'}
                              {prediction.feasibility === 'moderate' && 'Moderada'}
                              {prediction.feasibility === 'challenging' && 'Desafiadora'}
                              {prediction.feasibility === 'unlikely' && 'Difícil'}
                            </Badge>
                          )}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(goal);
                              }}
                              className="h-8 w-8"
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(goal.id);
                              }}
                              disabled={isDeletingGoal}
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Progress value={progress} className="h-2" />
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      
                      {prediction && !goal.is_completed && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Previsão: {prediction.predictedCompletion.toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} />
                            <span>{formatCurrency(prediction.monthlyNeeded)}/mês</span>
                          </div>
                        </div>
                      )}
                      
                      {prediction && (
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground">Confiança:</div>
                          <Progress value={prediction.confidence} className="h-1 flex-1" />
                          <div className="text-xs text-muted-foreground">{prediction.confidence}%</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Análise Detalhada da Meta Selecionada */}
        <div className="lg:col-span-1">
          {selectedGoalData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap size={20} />
                  Análise Detalhada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="prediction" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="prediction">Previsão</TabsTrigger>
                    <TabsTrigger value="progress">Progresso</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="prediction" className="space-y-4">
                    {selectedPrediction ? (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {selectedPrediction.predictedCompletion.toLocaleDateString('pt-BR')}
                          </div>
                          <div className="text-sm text-muted-foreground">Data prevista</div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm">Valor mensal necessário:</span>
                            <span className="font-medium">{formatCurrency(selectedPrediction.monthlyNeeded)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Nível de dificuldade:</span>
                            <Badge variant={
                              selectedPrediction.feasibility === 'easy' ? 'default' :
                              selectedPrediction.feasibility === 'moderate' ? 'secondary' :
                              selectedPrediction.feasibility === 'challenging' ? 'outline' : 'destructive'
                            }>
                              {selectedPrediction.feasibility === 'easy' && 'Fácil'}
                              {selectedPrediction.feasibility === 'moderate' && 'Moderada'}
                              {selectedPrediction.feasibility === 'challenging' && 'Desafiadora'}
                              {selectedPrediction.feasibility === 'unlikely' && 'Difícil'}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Confiança da previsão:</span>
                            <span className="font-medium">{selectedPrediction.confidence}%</span>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t">
                          <div className="text-sm text-muted-foreground mb-2">Recomendações:</div>
                          {selectedPrediction.feasibility === 'easy' && (
                            <div className="text-sm">• Considere aumentar os aportes para finalizar mais cedo</div>
                          )}
                          {selectedPrediction.feasibility === 'moderate' && (
                            <div className="text-sm">• Meta equilibrada, mantenha a consistência</div>
                          )}
                          {selectedPrediction.feasibility === 'challenging' && (
                            <div className="text-sm">• Considere revisar o prazo ou valor da meta</div>
                          )}
                          {selectedPrediction.feasibility === 'unlikely' && (
                            <div className="text-sm">• Meta muito ambiciosa, revise os parâmetros</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        Meta já concluída
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="progress" className="space-y-4">
                    {progressData.length > 0 ? (
                      <div>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={progressData}>
                              <XAxis dataKey="date" fontSize={12} />
                              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} fontSize={12} />
                              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                              <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} />
                              <Line type="monotone" dataKey="meta" stroke="#ddd" strokeDasharray="5 5" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          Evolução do progresso ao longo do tempo
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        Dados de progresso indisponíveis
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Target size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Selecione uma meta para ver análise detalhada
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};