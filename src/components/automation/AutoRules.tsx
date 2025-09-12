import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { BackHeader } from '@/components/layout/BackHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Zap, Plus, Edit, Trash2, Filter, Target, Calendar, DollarSign } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useAutomationRules, CreateRuleInput } from '@/hooks/useAutomationRules';
import { toast } from 'sonner';

interface AutoRule {
  id: string;
  name: string;
  enabled: boolean;
  type: 'categorization' | 'recurring' | 'budget' | 'alert';
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  lastTriggered?: string;
  timesTriggered: number;
}

interface RuleCondition {
  field: 'description' | 'amount' | 'merchant' | 'day_of_month' | 'category';
  operator: 'contains' | 'equals' | 'greater_than' | 'less_than' | 'starts_with' | 'ends_with';
  value: string | number;
}

interface RuleAction {
  type: 'set_category' | 'set_recurring' | 'send_alert' | 'apply_tag';
  value: string;
}

interface AutoRulesProps {
  onBack?: () => void;
}

export const AutoRules: React.FC<AutoRulesProps> = ({ onBack }) => {
  const { rules, loading, createRule, toggleRule, deleteRule, isCreating } = useAutomationRules();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [newRule, setNewRule] = useState<Partial<CreateRuleInput>>({
    name: '',
    rule_type: 'categorization',
    enabled: true,
    conditions: [{ field: 'description', operator: 'contains', value: '' }],
    actions: [{ type: 'set_category', value: '' }],
    priority: 1,
  });

  const { categories = [] } = useCategories();

  const handleCreateRule = () => {
    if (!newRule.name || !newRule.conditions?.[0]?.value) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const ruleData: CreateRuleInput = {
      name: newRule.name,
      rule_type: newRule.rule_type || 'categorization',
      conditions: newRule.conditions || [],
      actions: newRule.actions || [],
      priority: newRule.priority || 1,
      enabled: newRule.enabled ?? true,
    };

    createRule(ruleData);
    setShowCreateDialog(false);
    setNewRule({
      name: '',
      rule_type: 'categorization',
      enabled: true,
      conditions: [{ field: 'description', operator: 'contains', value: '' }],
      actions: [{ type: 'set_category', value: '' }],
      priority: 1,
    });
  };

  const updateCondition = (index: number, field: string, value: any) => {
    setNewRule(prev => ({
      ...prev,
      conditions: prev.conditions?.map((condition, i) =>
        i === index ? { ...condition, [field]: value } : condition
      ),
    }));
  };

  const updateAction = (index: number, field: string, value: any) => {
    setNewRule(prev => ({
      ...prev,
      actions: prev.actions?.map((action, i) =>
        i === index ? { ...action, [field]: value } : action
      ),
    }));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'categorization':
        return <Filter className="w-4 h-4" />;
      case 'recurring':
        return <Calendar className="w-4 h-4" />;
      case 'budget':
        return <Target className="w-4 h-4" />;
      case 'alert':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'categorization':
        return 'Categorização';
      case 'recurring':
        return 'Recorrente';
      case 'budget':
        return 'Orçamento';
      case 'alert':
        return 'Alerta';
      default:
        return 'Geral';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {onBack && <BackHeader title="Regras Automáticas" onBack={onBack} />}
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando regras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Regras Automáticas" onBack={onBack} />}
      
      {!onBack && (
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Automação</h1>
            <p className="text-muted-foreground">Configure regras inteligentes para suas finanças</p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Regra</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rule-name">Nome da Regra *</Label>
                  <Input
                    id="rule-name"
                    value={newRule.name}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Categorizar Supermercado"
                  />
                </div>

                <div>
                  <Label htmlFor="rule-type">Tipo de Regra</Label>
                  <Select 
                    value={newRule.rule_type} 
                    onValueChange={(value: any) => setNewRule(prev => ({ ...prev, rule_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="categorization">Categorização Automática</SelectItem>
                      <SelectItem value="recurring">Transação Recorrente</SelectItem>
                      <SelectItem value="alert">Alerta de Gastos</SelectItem>
                      <SelectItem value="budget">Controle de Orçamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Condições</Label>
                  {newRule.conditions?.map((condition, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2">
                      <Select
                        value={condition.field}
                        onValueChange={(value: any) => updateCondition(index, 'field', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="description">Descrição</SelectItem>
                          <SelectItem value="amount">Valor</SelectItem>
                          <SelectItem value="merchant">Estabelecimento</SelectItem>
                          <SelectItem value="day_of_month">Dia do Mês</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator}
                        onValueChange={(value: any) => updateCondition(index, 'operator', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contém</SelectItem>
                          <SelectItem value="equals">É igual a</SelectItem>
                          <SelectItem value="greater_than">Maior que</SelectItem>
                          <SelectItem value="less_than">Menor que</SelectItem>
                          <SelectItem value="starts_with">Começa com</SelectItem>
                          <SelectItem value="ends_with">Termina com</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        placeholder="Valor"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Ações</Label>
                  {newRule.actions?.map((action, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2">
                      <Select
                        value={action.type}
                        onValueChange={(value: any) => updateAction(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="set_category">Definir Categoria</SelectItem>
                          <SelectItem value="set_recurring">Marcar como Recorrente</SelectItem>
                          <SelectItem value="send_alert">Enviar Alerta</SelectItem>
                          <SelectItem value="apply_tag">Aplicar Tag</SelectItem>
                        </SelectContent>
                      </Select>

                      {action.type === 'set_category' ? (
                        <Select
                          value={action.value}
                          onValueChange={(value: string) => updateAction(index, 'value', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={action.value}
                          onChange={(e) => updateAction(index, 'value', e.target.value)}
                          placeholder="Valor da ação"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateRule} disabled={isCreating}>
                    {isCreating ? 'Criando...' : 'Criar Regra'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getTypeIcon(rule.rule_type)}
                  <div>
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(rule.rule_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {rule.times_triggered} execuções
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleRule(rule.id)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingRule(rule)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  <strong>Condições:</strong>{' '}
                  {rule.conditions.map((condition, index) => (
                    <span key={index}>
                      {condition.field} {condition.operator} "{condition.value}"
                      {index < rule.conditions.length - 1 ? ' E ' : ''}
                    </span>
                  ))}
                </div>
                <div>
                  <strong>Ações:</strong>{' '}
                  {rule.actions.map((action, index) => (
                    <span key={index}>
                      {action.type}: {action.value}
                      {index < rule.actions.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
                {rule.last_triggered_at && (
                  <div>
                    <strong>Última execução:</strong> {new Date(rule.last_triggered_at).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rules.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma regra configurada</h3>
            <p className="text-muted-foreground mb-4">
              Crie regras automáticas para otimizar o gerenciamento das suas finanças
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira regra
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};