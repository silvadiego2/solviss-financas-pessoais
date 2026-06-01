import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BackHeader } from '@/components/layout/BackHeader';
import { Zap, Plus, Edit, Trash2, Filter, Target, Calendar, DollarSign } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useAutomationRules, CreateRuleInput } from '@/hooks/useAutomationRules';
import { toast } from 'sonner';

interface AutoRulesProps {
  onBack?: () => void;
}

export const AutoRules: React.FC<AutoRulesProps> = ({ onBack }) => {
  const { rules, loading, createRule, toggleRule, deleteRule, isCreating } = useAutomationRules();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRule, setNewRule] = useState<Partial<CreateRuleInput>>({
    name: '',
    rule_type: 'categorization',
    conditions: [],
    actions: [],
    priority: 1,
    is_active: true,
  });

  const handleCreate = async () => {
    if (!newRule.name?.trim()) {
      toast.error('Nome da regra é obrigatório');
      return;
    }
    try {
      await createRule(newRule as CreateRuleInput);
      setShowCreateDialog(false);
      setNewRule({ name: '', rule_type: 'categorization', conditions: [], actions: [], priority: 1, is_active: true });
      toast.success('Regra criada com sucesso!');
    } catch {
      toast.error('Erro ao criar regra');
    }
  };

  const ruleTypeLabels: Record<string, string> = {
    categorization: 'Categorização',
    recurring: 'Recorrente',
    budget: 'Orçamento',
    alert: 'Alerta',
  };

  const ruleTypeIcons: Record<string, React.ReactNode> = {
    categorization: <Filter className="h-4 w-4" />,
    recurring: <Calendar className="h-4 w-4" />,
    budget: <DollarSign className="h-4 w-4" />,
    alert: <Target className="h-4 w-4" />,
  };

  return (
    <div className="space-y-6">
      <BackHeader
        title="Regras Automáticas"
        subtitle="Automatize categorização e alertas de transações"
        icon={<Zap className="h-6 w-6" />}
        onBack={onBack}
        action={
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Regra Automática</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nome da regra</Label>
                  <Input
                    placeholder="Ex: Categorizar Uber como Transporte"
                    value={newRule.name || ''}
                    onChange={(e) => setNewRule(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newRule.rule_type || 'categorization'}
                    onValueChange={(v) => setNewRule(p => ({ ...p, rule_type: v as any }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ruleTypeLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newRule.is_active ?? true}
                    onCheckedChange={(v) => setNewRule(p => ({ ...p, is_active: v }))}
                  />
                  <Label>Ativa</Label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleCreate} disabled={isCreating} className="flex-1">
                    {isCreating ? 'Criando...' : 'Criar Regra'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Carregando regras...
          </CardContent>
        </Card>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Nenhuma regra criada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie regras para automatizar a categorização e alertas das suas transações
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="text-muted-foreground">
                      {ruleTypeIcons[rule.rule_type] || <Zap className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs">
                          {ruleTypeLabels[rule.rule_type] || rule.rule_type}
                        </Badge>
                        {rule.times_triggered > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {rule.times_triggered}x executada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRule(rule.id, !rule.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
