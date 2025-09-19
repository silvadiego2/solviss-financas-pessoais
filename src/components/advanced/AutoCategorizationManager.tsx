import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Plus, Trash2, Edit, Target, BarChart3 } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { AutoCategorizationEngine, CategoryRule, CategorizationResult } from '@/utils/autoCategorizationEngine';
import { enhancedToast } from '@/components/ui/enhanced-toast';

interface AutoCategorizationManagerProps {
  onBack?: () => void;
}

export const AutoCategorizationManager: React.FC<AutoCategorizationManagerProps> = ({ onBack }) => {
  const { categories } = useCategories();
  const { transactions, updateTransaction } = useTransactions();
  const [engine, setEngine] = useState<AutoCategorizationEngine | null>(null);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [stats, setStats] = useState({ totalRules: 0, activeRules: 0, learningEntries: 0 });
  
  // Estado para nova regra
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRule, setNewRule] = useState({
    keywords: '',
    categoryId: '',
    confidence: 0.8,
    isActive: true
  });

  // Estado para sugestões
  const [suggestions, setSuggestions] = useState<Array<{
    transaction: any;
    suggestion: CategorizationResult;
  }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (categories.length > 0) {
      const newEngine = new AutoCategorizationEngine(categories);
      setEngine(newEngine);
      setRules(newEngine.getRules());
      setStats(newEngine.getCategorizationStats());
    }
  }, [categories]);

  const handleAddRule = () => {
    if (!engine || !newRule.keywords || !newRule.categoryId) {
      enhancedToast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const keywords = newRule.keywords.split(',').map(k => k.trim()).filter(k => k);
    if (keywords.length === 0) {
      enhancedToast.error('Adicione pelo menos uma palavra-chave');
      return;
    }

    const rule = engine.addCustomRule({
      keywords,
      categoryId: newRule.categoryId,
      confidence: newRule.confidence,
      isActive: newRule.isActive
    });

    setRules(engine.getRules());
    setStats(engine.getCategorizationStats());
    setIsAddingRule(false);
    setNewRule({ keywords: '', categoryId: '', confidence: 0.8, isActive: true });
    
    enhancedToast.success('Regra adicionada com sucesso!');
  };

  const handleToggleRule = (ruleId: string, isActive: boolean) => {
    if (!engine) return;
    
    engine.updateRule(ruleId, { isActive });
    setRules(engine.getRules());
    setStats(engine.getCategorizationStats());
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!engine) return;
    
    const success = engine.deleteRule(ruleId);
    if (success) {
      setRules(engine.getRules());
      setStats(engine.getCategorizationStats());
      enhancedToast.success('Regra removida com sucesso');
    }
  };

  const analyzeTransactions = async () => {
    if (!engine) return;
    
    setIsAnalyzing(true);
    setSuggestions([]);

    try {
      // Analisar transações sem categoria ou com baixa confiança
      const uncategorizedTransactions = transactions.filter(t => !t.category_id);
      const newSuggestions: Array<{ transaction: any; suggestion: CategorizationResult }> = [];

      for (const transaction of uncategorizedTransactions.slice(0, 20)) { // Limitar para performance
        const suggestion = engine.categorizeTransaction(
          transaction.description,
          transaction.amount,
          transaction.category_id
        );

        if (suggestion.categoryId && suggestion.confidence > 0.6) {
          newSuggestions.push({ transaction, suggestion });
        }
      }

      setSuggestions(newSuggestions);
      
      if (newSuggestions.length === 0) {
        enhancedToast.info('Nenhuma sugestão de categorização encontrada', {
          description: 'Todas as transações já estão categorizadas ou não atendem aos critérios.'
        });
      } else {
        enhancedToast.success(`${newSuggestions.length} sugestões de categorização encontradas!`);
      }
    } catch (error) {
      enhancedToast.error('Erro ao analisar transações');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = async (transactionId: string, categoryId: string) => {
    try {
      await updateTransaction({ id: transactionId, category_id: categoryId });
      
      // Remover da lista de sugestões
      setSuggestions(prev => prev.filter(s => s.transaction.id !== transactionId));
      
      enhancedToast.success('Categoria aplicada com sucesso!');
    } catch (error) {
      enhancedToast.error('Erro ao aplicar categoria');
    }
  };

  const applyAllSuggestions = async () => {
    setIsAnalyzing(true);
    
    try {
      let applied = 0;
      for (const suggestion of suggestions) {
        if (suggestion.suggestion.confidence > 0.8) {
          await updateTransaction({ 
            id: suggestion.transaction.id,
            category_id: suggestion.suggestion.categoryId
          });
          applied++;
        }
      }
      
      setSuggestions(prev => prev.filter(s => s.suggestion.confidence <= 0.8));
      
      enhancedToast.success(`${applied} categorias aplicadas automaticamente!`);
    } catch (error) {
      enhancedToast.error('Erro ao aplicar sugestões');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Desconhecida';
  };

  const getCategoryIcon = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.icon || '📋';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Auto-Categorização Inteligente</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie regras e analise transações automaticamente
            </p>
          </div>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.activeRules}</p>
                <p className="text-xs text-muted-foreground">Regras Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.learningEntries}</p>
                <p className="text-xs text-muted-foreground">Dados Aprendidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{suggestions.length}</p>
                <p className="text-xs text-muted-foreground">Sugestões</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rules">Regras de Categorização</TabsTrigger>
          <TabsTrigger value="suggestions">Sugestões Automáticas</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {/* Add Rule Form */}
          {isAddingRule && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nova Regra de Categorização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    id="keywords"
                    placeholder="Ex: uber, taxi, transporte"
                    value={newRule.keywords}
                    onChange={(e) => setNewRule(prev => ({ ...prev, keywords: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={newRule.categoryId} onValueChange={(value) => setNewRule(prev => ({ ...prev, categoryId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center space-x-2">
                            <span>{category.icon}</span>
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confidence">Confiança: {(newRule.confidence * 100).toFixed(0)}%</Label>
                  <Input
                    id="confidence"
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={newRule.confidence}
                    onChange={(e) => setNewRule(prev => ({ ...prev, confidence: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newRule.isActive}
                    onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label>Regra ativa</Label>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={handleAddRule}>Adicionar Regra</Button>
                  <Button variant="outline" onClick={() => setIsAddingRule(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Rule Button */}
          {!isAddingRule && (
            <Button onClick={() => setIsAddingRule(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Nova Regra
            </Button>
          )}

          {/* Rules List */}
          <div className="space-y-3">
            {rules.map(rule => (
              <Card key={rule.id} className={!rule.isActive ? 'opacity-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span>{getCategoryIcon(rule.categoryId)}</span>
                        <span className="font-medium">{getCategoryName(rule.categoryId)}</span>
                        <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                          {(rule.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rule.keywords.map(keyword => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                      />
                      {rule.id.startsWith('custom_') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button onClick={analyzeTransactions} disabled={isAnalyzing}>
              <Brain className="h-4 w-4 mr-2" />
              {isAnalyzing ? 'Analisando...' : 'Analisar Transações'}
            </Button>
            {suggestions.length > 0 && (
              <Button variant="outline" onClick={applyAllSuggestions} disabled={isAnalyzing}>
                Aplicar Sugestões (Confiança {'>'} 80%)
              </Button>
            )}
          </div>

          {/* Suggestions List */}
          {suggestions.length > 0 ? (
            <div className="space-y-3">
              {suggestions.map(({ transaction, suggestion }, index) => (
                <Card key={`${transaction.id}-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{transaction.description}</span>
                          <Badge variant="outline">
                            R$ {transaction.amount.toFixed(2)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">Sugerido:</span>
                          <span>{getCategoryIcon(suggestion.categoryId!)}</span>
                          <span className="font-medium">{getCategoryName(suggestion.categoryId!)}</span>
                          <Badge variant={suggestion.confidence > 0.8 ? 'default' : 'secondary'}>
                            {(suggestion.confidence * 100).toFixed(0)}% confiança
                          </Badge>
                        </div>
                        {suggestion.matchedKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {suggestion.matchedKeywords.map(keyword => (
                              <Badge key={keyword} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => applySuggestion(transaction.id, suggestion.categoryId!)}
                        >
                          Aplicar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSuggestions(prev => prev.filter((_, i) => i !== index))}
                        >
                          Ignorar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Nenhuma sugestão disponível</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique em "Analisar Transações" para gerar sugestões de categorização automática
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};