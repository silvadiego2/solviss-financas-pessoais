import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BackHeader } from '@/components/layout/BackHeader';
import {
  Zap, Plus, Edit2, Trash2, Filter, Target, Calendar,
  DollarSign, Bell, Tag, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useAutomationRules, CreateRuleInput } from '@/hooks/useAutomationRules';
import { toast } from 'sonner';

interface AutoRulesProps {
  onBack?: () => void;
}

// ---- tipos de condição e ação -------------------------------------------
type ConditionField = 'description' | 'amount' | 'category';
type ConditionOperator = 'contains' | 'not_contains' | 'equals' | 'gt' | 'lt';
type ActionType = 'set_category' | 'add_tag' | 'alert';

interface Condition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}

interface Action {
  type: ActionType;
  value: string;
}

interface RuleForm {
  name: string;
  rule_type: 'categorization' | 'alert' | 'recurring' | 'budget';
  is_active: boolean;
  priority: number;
  conditions: Condition[];
  actions: Action[];
}

const EMPTY_FORM: RuleForm = {
  name: '',
  rule_type: 'categorization',
  is_active: true,
  priority: 1,
  conditions: [{ field: 'description', operator: 'contains', value: '' }],
  actions: [{ type: 'set_category', value: '' }],
};

const RULE_TYPE_LABELS: Record<string, string> = {
  categorization: 'Categorização',
  alert: 'Alerta',
  recurring: 'Recorrente',
  budget: 'Orçamento',
};

const RULE_TYPE_ICONS: Record<string, React.ReactNode> = {
  categorization: <Filter className="h-4 w-4" />,
  alert: <Target className="h-4 w-4" />,
  recurring: <Calendar className="h-4 w-4" />,
  budget: <DollarSign className="h-4 w-4" />,
};

const FIELD_LABELS: Record<ConditionField, string> = {
  description: 'Descrição',
  amount: 'Valor (R$)',
  category: 'Categoria',
};

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  contains: 'contém',
  not_contains: 'não contém',
  equals: 'é igual a',
  gt: 'é maior que',
  lt: 'é menor que',
};

const ACTION_LABELS: Record<ActionType, string> = {
  set_category: 'Definir categoria',
  add_tag: 'Adicionar tag',
  alert: 'Enviar alerta',
};

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  set_category: <Filter className="h-3.5 w-3.5" />,
  add_tag: <Tag className="h-3.5 w-3.5" />,
  alert: <Bell className="h-3.5 w-3.5" />,
};

// ---- sub-componente: editor de uma condição ----------------------------
const ConditionRow: React.FC<{
  cond: Condition;
  index: number;
  onChange: (i: number, c: Condition) => void;
  onRemove: (i: number) => void;
  canRemove: boolean;
}> = ({ cond, index, onChange, onRemove, canRemove }) => (
  <div className="flex flex-wrap gap-2 items-center p-3 rounded-lg bg-muted/40 border border-border">
    <Select value={cond.field} onValueChange={v => onChange(index, { ...cond, field: v as ConditionField })}>
      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {(Object.keys(FIELD_LABELS) as ConditionField[]).map(f => (
          <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select value={cond.operator} onValueChange={v => onChange(index, { ...cond, operator: v as ConditionOperator })}>
      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {(Object.keys(OPERATOR_LABELS) as ConditionOperator[]).map(op => (
          <SelectItem key={op} value={op}>{OPERATOR_LABELS[op]}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Input
      className="flex-1 min-w-[120px] h-8 text-xs"
      placeholder={cond.field === 'amount' ? 'Ex: 50' : 'Ex: Uber'}
      value={cond.value}
      onChange={e => onChange(index, { ...cond, value: e.target.value })}
    />

    {canRemove && (
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => onRemove(index)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    )}
  </div>
);

// ---- sub-componente: editor de uma ação --------------------------------
const ActionRow: React.FC<{
  action: Action;
  index: number;
  categories: { id: string; name: string }[];
  onChange: (i: number, a: Action) => void;
  onRemove: (i: number) => void;
  canRemove: boolean;
}> = ({ action, index, categories, onChange, onRemove, canRemove }) => (
  <div className="flex flex-wrap gap-2 items-center p-3 rounded-lg bg-muted/40 border border-border">
    <Select value={action.type} onValueChange={v => onChange(index, { ...action, type: v as ActionType, value: '' })}>
      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {(Object.keys(ACTION_LABELS) as ActionType[]).map(t => (
          <SelectItem key={t} value={t}>
            <span className="flex items-center gap-1.5">{ACTION_ICONS[t]}{ACTION_LABELS[t]}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {action.type === 'set_category' ? (
      <Select value={action.value} onValueChange={v => onChange(index, { ...action, value: v })}>
        <SelectTrigger className="flex-1 min-w-[140px] h-8 text-xs">
          <SelectValue placeholder="Escolher categoria" />
        </SelectTrigger>
        <SelectContent>
          {categories.map(c => (
            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <Input
        className="flex-1 min-w-[140px] h-8 text-xs"
        placeholder={action.type === 'alert' ? 'Mensagem do alerta' : 'Nome da tag'}
        value={action.value}
        onChange={e => onChange(index, { ...action, value: e.target.value })}
      />
    )}

    {canRemove && (
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => onRemove(index)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    )}
  </div>
);

// ---- componente principal ---------------------------------------------
export const AutoRules: React.FC<AutoRulesProps> = ({ onBack }) => {
  const { rules, loading, createRule, updateRule, toggleRule, deleteRule, isCreating } = useAutomationRules();
  const { categories } = useCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (rule: any) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      rule_type: rule.rule_type,
      is_active: rule.is_active,
      priority: rule.priority ?? 1,
      conditions: rule.conditions?.length ? rule.conditions : EMPTY_FORM.conditions,
      actions: rule.actions?.length ? rule.actions : EMPTY_FORM.actions,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nome da regra é obrigatório'); return; }
    const hasEmptyCondition = form.conditions.some(c => !c.value.trim());
    const hasEmptyAction = form.actions.some(a => !a.value.trim());
    if (hasEmptyCondition) { toast.error('Preencha todos os valores das condições'); return; }
    if (hasEmptyAction) { toast.error('Preencha todos os valores das ações'); return; }

    try {
      if (editingId) {
        await updateRule(editingId, form as CreateRuleInput);
        toast.success('Regra atualizada!');
      } else {
        await createRule(form as CreateRuleInput);
        toast.success('Regra criada!');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao salvar regra');
    }
  };

  // helpers para conditions
  const updateCondition = (i: number, c: Condition) =>
    setForm(p => ({ ...p, conditions: p.conditions.map((x, idx) => idx === i ? c : x) }));
  const addCondition = () =>
    setForm(p => ({ ...p, conditions: [...p.conditions, { field: 'description', operator: 'contains', value: '' }] }));
  const removeCondition = (i: number) =>
    setForm(p => ({ ...p, conditions: p.conditions.filter((_, idx) => idx !== i) }));

  // helpers para actions
  const updateAction = (i: number, a: Action) =>
    setForm(p => ({ ...p, actions: p.actions.map((x, idx) => idx === i ? a : x) }));
  const addAction = () =>
    setForm(p => ({ ...p, actions: [...p.actions, { type: 'set_category', value: '' }] }));
  const removeAction = (i: number) =>
    setForm(p => ({ ...p, actions: p.actions.filter((_, idx) => idx !== i) }));

  const summarizeConditions = (conditions: Condition[]) =>
    conditions.map(c => `${FIELD_LABELS[c.field]} ${OPERATOR_LABELS[c.operator]} "${c.value}"`).join(' E ');

  const summarizeActions = (actions: Action[]) =>
    actions.map(a => `${ACTION_LABELS[a.type]}: ${a.value}`).join(', ');

  return (
    <div className="space-y-6">
      <BackHeader
        title="Regras Automáticas"
        subtitle="Automatize categorização e alertas de transações"
        icon={<Zap className="h-6 w-6" />}
        onBack={onBack}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nova Regra
          </Button>
        }
      />

      {/* Lista de regras */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando regras...</p>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <Zap className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
            <p className="font-medium">Nenhuma regra criada</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Crie regras para categorizar automaticamente e receber alertas nas suas transações
            </p>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Criar primeira regra</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const isExpanded = expandedId === rule.id;
            const conds: Condition[] = rule.conditions ?? [];
            const acts: Action[] = rule.actions ?? [];
            return (
              <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-0">
                  {/* Cabeçalho da regra */}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className="text-muted-foreground shrink-0">
                      {RULE_TYPE_ICONS[rule.rule_type] ?? <Zap className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{rule.name}</p>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {RULE_TYPE_LABELS[rule.rule_type] ?? rule.rule_type}
                        </Badge>
                        {rule.times_triggered > 0 && (
                          <span className="text-xs text-muted-foreground">{rule.times_triggered}× executada</span>
                        )}
                      </div>
                      {!isExpanded && conds.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {summarizeConditions(conds)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => toggleRule(rule.id, !rule.is_active)}
                      />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(rule)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground"
                        onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Detalhe expandido */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t pt-3">
                      {conds.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">SE</p>
                          <div className="space-y-1.5">
                            {conds.map((c, i) => (
                              <div key={i} className="text-xs bg-muted/40 rounded-md px-3 py-1.5">
                                <span className="font-medium">{FIELD_LABELS[c.field]}</span>
                                {' '}{OPERATOR_LABELS[c.operator]}{' '}
                                <span className="font-medium">"{c.value}"</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {acts.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">ENTÃO</p>
                          <div className="space-y-1.5">
                            {acts.map((a, i) => (
                              <div key={i} className="text-xs bg-muted/40 rounded-md px-3 py-1.5 flex items-center gap-1.5">
                                {ACTION_ICONS[a.type]}
                                <span className="font-medium">{ACTION_LABELS[a.type]}:</span>
                                {' '}{a.value}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Regra' : 'Nova Regra'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label>Nome da regra *</Label>
              <Input
                placeholder="Ex: Categorizar Uber como Transporte"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Tipo + prioridade */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.rule_type} onValueChange={v => setForm(p => ({ ...p, rule_type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Input
                  type="number" min={1} max={100}
                  value={form.priority}
                  onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))}
                />
              </div>
            </div>

            {/* Condições */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Condições (SE)</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addCondition}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {form.conditions.map((c, i) => (
                  <ConditionRow
                    key={i} cond={c} index={i}
                    onChange={updateCondition}
                    onRemove={removeCondition}
                    canRemove={form.conditions.length > 1}
                  />
                ))}
              </div>
            </div>

            {/* Ações */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ações (ENTÃO)</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addAction}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {form.actions.map((a, i) => (
                  <ActionRow
                    key={i} action={a} index={i}
                    categories={categories}
                    onChange={updateAction}
                    onRemove={removeAction}
                    canRemove={form.actions.length > 1}
                  />
                ))}
              </div>
            </div>

            {/* Ativo */}
            <div className="flex items-center gap-3 pt-1">
              <Switch
                checked={form.is_active}
                onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))}
              />
              <Label className="cursor-pointer">Regra ativa</Label>
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={isCreating} className="flex-1">
                {isCreating ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar regra'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
