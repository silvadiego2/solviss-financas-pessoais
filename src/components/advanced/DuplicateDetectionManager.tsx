import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Shield, Settings, AlertTriangle, Trash2, Merge, Archive } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { DuplicateDetectionEngine, DuplicateGroup, DuplicateDetectionSettings, DEFAULT_DUPLICATE_SETTINGS } from '@/utils/duplicateDetection';
import { enhancedToast } from '@/components/ui/enhanced-toast';
import { BackHeader } from '@/components/layout/BackHeader';

interface DuplicateDetectionManagerProps {
  onBack?: () => void;
}

export const DuplicateDetectionManager: React.FC<DuplicateDetectionManagerProps> = ({ onBack }) => {
  const { transactions, deleteTransaction, updateTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const [engine, setEngine] = useState<DuplicateDetectionEngine>(new DuplicateDetectionEngine());
  const [settings, setSettings] = useState<DuplicateDetectionSettings>(DEFAULT_DUPLICATE_SETTINGS);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setEngine(new DuplicateDetectionEngine(settings));
  }, [settings]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getAccountName = (accountId: string) =>
    accounts.find(a => a.id === accountId)?.name || 'Conta desconhecida';

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Sem categoria';
    return categories.find(c => c.id === categoryId)?.name || 'Categoria desconhecida';
  };

  const getCategoryIcon = (categoryId?: string) => {
    if (!categoryId) return '📋';
    return categories.find(c => c.id === categoryId)?.icon || '📋';
  };

  const analyzeDuplicates = async () => {
    setIsAnalyzing(true);
    setDuplicateGroups([]);
    try {
      const duplicateTransactions = transactions.map(t => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        date: t.date,
        account_id: t.account_id,
        category_id: t.category_id,
      }));
      const groups = engine.detectDuplicates(duplicateTransactions);
      setDuplicateGroups(groups);
      if (groups.length === 0) {
        enhancedToast.info('Nenhuma duplicata encontrada', {
          description: 'Todas as transações parecem ser únicas com base nos critérios atuais.',
        });
      } else {
        enhancedToast.success(`${groups.length} grupos de duplicatas encontrados!`, {
          description: `Total de ${groups.reduce((sum, g) => sum + g.transactions.length, 0)} transações envolvidas.`,
        });
      }
    } catch {
      enhancedToast.error('Erro ao analisar duplicatas');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGroupAction = async (
    group: DuplicateGroup,
    action: 'merge' | 'keep_all' | 'remove_duplicates' | 'keep_first' | 'keep_latest',
  ) => {
    setIsProcessing(true);
    try {
      const result = DuplicateDetectionEngine.applyDuplicateAction(group, action);
      for (const id of result.toDelete) await deleteTransaction(id);
      if (result.toUpdate) await updateTransaction({ id: result.toUpdate.id, ...result.toUpdate.updates });
      setDuplicateGroups(prev => prev.filter(g => g.id !== group.id));
      enhancedToast.success(result.message);
    } catch {
      enhancedToast.error('Erro ao aplicar ação');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSettingsChange = (key: keyof DuplicateDetectionSettings, value: unknown) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-red-100 text-red-800';
    if (confidence >= 0.8) return 'bg-orange-100 text-orange-800';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getSuggestedActionIcon = (action: string) => {
    switch (action) {
      case 'remove_duplicates': return <Trash2 className="h-4 w-4" />;
      case 'merge': return <Merge className="h-4 w-4" />;
      default: return <Archive className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <BackHeader
        title="Detecção de Duplicatas"
        subtitle="Identifique e gerencie transações duplicadas automaticamente"
        onBack={onBack}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{transactions.length}</p>
                <p className="text-xs text-muted-foreground">Transações Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{duplicateGroups.length}</p>
                <p className="text-xs text-muted-foreground">Grupos Duplicados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {duplicateGroups.reduce((sum, g) => sum + g.transactions.length - 1, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Duplicatas Detectadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="detection" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="detection">Detecção de Duplicatas</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="detection" className="space-y-4">
          <Button onClick={analyzeDuplicates} disabled={isAnalyzing} className="w-full">
            <Search className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Analisando...' : 'Analisar Duplicatas'}
          </Button>

          {duplicateGroups.length > 0 ? (
            <div className="space-y-4">
              {duplicateGroups.map(group => (
                <Card key={group.id} className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <CardTitle className="text-lg">Grupo de Duplicatas</CardTitle>
                        <Badge className={getConfidenceColor(group.confidence)}>
                          {(group.confidence * 100).toFixed(0)}% confiança
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getSuggestedActionIcon(group.suggestedAction)}
                        <span className="text-sm text-muted-foreground capitalize">
                          {group.suggestedAction.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Razão: {group.reason} • {group.transactions.length} transações
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {group.transactions.map((transaction, index) => (
                      <div
                        key={transaction.id}
                        className={`p-3 rounded-lg border ${
                          index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-muted/50 border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">{transaction.description}</span>
                              {index === 0 && <Badge variant="outline">Original</Badge>}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>{formatCurrency(transaction.amount)}</span>
                              <span>{new Date(transaction.date).toLocaleDateString('pt-BR')}</span>
                              <span>{getAccountName(transaction.account_id)}</span>
                              <div className="flex items-center space-x-1">
                                <span>{getCategoryIcon(transaction.category_id)}</span>
                                <span>{getCategoryName(transaction.category_id)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={isProcessing}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remover Duplicatas
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso irá remover {group.transactions.length - 1} transações duplicadas,
                              mantendo apenas a primeira. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleGroupAction(group, 'remove_duplicates')}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button variant="outline" size="sm" onClick={() => handleGroupAction(group, 'keep_latest')} disabled={isProcessing}>
                        Manter Mais Recente
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleGroupAction(group, 'merge')} disabled={isProcessing}>
                        <Merge className="h-4 w-4 mr-1" />
                        Mesclar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleGroupAction(group, 'keep_all')} disabled={isProcessing}>
                        Manter Todas
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Nenhuma duplicata encontrada</h3>
                <p className="text-sm text-muted-foreground">
                  Clique em "Analisar Duplicatas" para verificar se há transações duplicadas
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Configurações de Detecção</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Tolerância de Valor: {(settings.amountTolerance * 100).toFixed(0)}%</Label>
                <Input type="range" min="0" max="0.1" step="0.01" value={settings.amountTolerance}
                  onChange={(e) => handleSettingsChange('amountTolerance', parseFloat(e.target.value))} className="w-full" />
                <p className="text-xs text-muted-foreground">Diferença percentual permitida entre valores para serem considerados similares</p>
              </div>
              <div className="space-y-2">
                <Label>Tolerância de Data: {settings.daysTolerance} dias</Label>
                <Input type="range" min="0" max="30" step="1" value={settings.daysTolerance}
                  onChange={(e) => handleSettingsChange('daysTolerance', parseInt(e.target.value))} className="w-full" />
                <p className="text-xs text-muted-foreground">Número máximo de dias entre transações para serem consideradas duplicatas</p>
              </div>
              <div className="space-y-2">
                <Label>Similaridade de Descrição: {(settings.descriptionSimilarityThreshold * 100).toFixed(0)}%</Label>
                <Input type="range" min="0.5" max="1" step="0.05" value={settings.descriptionSimilarityThreshold}
                  onChange={(e) => handleSettingsChange('descriptionSimilarityThreshold', parseFloat(e.target.value))} className="w-full" />
                <p className="text-xs text-muted-foreground">Quão similares as descrições devem ser para serem consideradas duplicatas</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Ignorar valores pequenos</Label>
                  <p className="text-xs text-muted-foreground">Ignorar transações menores que R$ {settings.smallAmountThreshold.toFixed(2)}</p>
                </div>
                <Switch checked={settings.ignoreSmallAmounts} onCheckedChange={(checked) => handleSettingsChange('ignoreSmallAmounts', checked)} />
              </div>
              {settings.ignoreSmallAmounts && (
                <div className="space-y-2">
                  <Label>Valor mínimo: R$ {settings.smallAmountThreshold.toFixed(2)}</Label>
                  <Input type="range" min="1" max="100" step="1" value={settings.smallAmountThreshold}
                    onChange={(e) => handleSettingsChange('smallAmountThreshold', parseFloat(e.target.value))} className="w-full" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Considerar conta na detecção</Label>
                  <p className="text-xs text-muted-foreground">Transações da mesma conta têm maior probabilidade de serem duplicatas</p>
                </div>
                <Switch checked={settings.considerAccount} onCheckedChange={(checked) => handleSettingsChange('considerAccount', checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Considerar categoria na detecção</Label>
                  <p className="text-xs text-muted-foreground">Transações da mesma categoria têm maior probabilidade de serem duplicatas</p>
                </div>
                <Switch checked={settings.considerCategory} onCheckedChange={(checked) => handleSettingsChange('considerCategory', checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Exigir valores exatos</Label>
                  <p className="text-xs text-muted-foreground">Apenas considerar duplicatas se os valores forem exatamente iguais</p>
                </div>
                <Switch checked={settings.exactMatchRequired} onCheckedChange={(checked) => handleSettingsChange('exactMatchRequired', checked)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
