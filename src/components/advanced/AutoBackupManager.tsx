import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { BackHeader } from '@/components/layout/BackHeader';
import { useExportReports } from '@/hooks/useExportReports';
import { Cloud, Clock, Download, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

interface AutoBackupManagerProps {
  onBack?: () => void;
}

interface BackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  format: 'pdf' | 'excel' | 'both';
  includeTransactions: boolean;
  includeCategories: boolean;
  includeBudgets: boolean;
  includeAccounts: boolean;
  lastBackup?: Date;
  nextBackup?: Date;
}

export const AutoBackupManager: React.FC<AutoBackupManagerProps> = ({ onBack }) => {
  const { exportToPDF, exportToExcel, isExporting } = useExportReports();
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    enabled: false,
    frequency: 'weekly',
    format: 'excel',
    includeTransactions: true,
    includeCategories: true,
    includeBudgets: true,
    includeAccounts: true
  });
  const [backupHistory, setBackupHistory] = useState<Array<{
    date: Date;
    format: string;
    status: 'success' | 'failed';
    size?: string;
  }>>([]);

  useEffect(() => {
    // Carregar configuração do localStorage
    const savedConfig = localStorage.getItem('autoBackupConfig');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setBackupConfig({
        ...parsed,
        lastBackup: parsed.lastBackup ? new Date(parsed.lastBackup) : undefined,
        nextBackup: parsed.nextBackup ? new Date(parsed.nextBackup) : undefined
      });
    }

    // Carregar histórico do localStorage
    const savedHistory = localStorage.getItem('backupHistory');
    if (savedHistory) {
      const parsed = JSON.parse(savedHistory);
      setBackupHistory(parsed.map((item: any) => ({
        ...item,
        date: new Date(item.date)
      })));
    }

    // Verificar se precisa fazer backup
    checkForScheduledBackup();
  }, []);

  const calculateNextBackup = (frequency: string, from = new Date()): Date => {
    switch (frequency) {
      case 'daily':
        return addDays(from, 1);
      case 'weekly':
        return addWeeks(from, 1);
      case 'monthly':
        return addMonths(from, 1);
      default:
        return addWeeks(from, 1);
    }
  };

  const checkForScheduledBackup = () => {
    const savedConfig = localStorage.getItem('autoBackupConfig');
    if (!savedConfig) return;

    const config = JSON.parse(savedConfig);
    if (!config.enabled || !config.nextBackup) return;

    const nextBackup = new Date(config.nextBackup);
    const now = new Date();

    if (now >= nextBackup) {
      toast.info('Backup automático agendado será executado');
      setTimeout(() => {
        executeAutoBackup();
      }, 2000);
    }
  };

  const executeAutoBackup = async () => {
    try {
      const exportOptions = {
        period: 'last_month' as const,
        includeTransactions: backupConfig.includeTransactions,
        includeCategories: backupConfig.includeCategories,
        includeBudgets: backupConfig.includeBudgets,
        includeAccounts: backupConfig.includeAccounts
      };

      let success = false;

      if (backupConfig.format === 'pdf' || backupConfig.format === 'both') {
        await exportToPDF(exportOptions);
        success = true;
      }

      if (backupConfig.format === 'excel' || backupConfig.format === 'both') {
        await exportToExcel(exportOptions);
        success = true;
      }

      if (success) {
        const now = new Date();
        const nextBackup = calculateNextBackup(backupConfig.frequency, now);
        
        const newConfig = {
          ...backupConfig,
          lastBackup: now,
          nextBackup: nextBackup
        };

        setBackupConfig(newConfig);
        localStorage.setItem('autoBackupConfig', JSON.stringify(newConfig));

        // Adicionar ao histórico
        const newHistoryEntry = {
          date: now,
          format: backupConfig.format,
          status: 'success' as const,
          size: '~2.5MB'
        };

        const updatedHistory = [newHistoryEntry, ...backupHistory].slice(0, 10);
        setBackupHistory(updatedHistory);
        localStorage.setItem('backupHistory', JSON.stringify(updatedHistory));

        toast.success('Backup automático realizado com sucesso!');
      }
    } catch (error) {
      console.error('Erro no backup automático:', error);
      
      const failedEntry = {
        date: new Date(),
        format: backupConfig.format,
        status: 'failed' as const
      };

      const updatedHistory = [failedEntry, ...backupHistory].slice(0, 10);
      setBackupHistory(updatedHistory);
      localStorage.setItem('backupHistory', JSON.stringify(updatedHistory));

      toast.error('Falha no backup automático');
    }
  };

  const handleConfigChange = (key: keyof BackupConfig, value: any) => {
    const newConfig = { ...backupConfig, [key]: value };
    
    if (key === 'enabled' && value) {
      newConfig.nextBackup = calculateNextBackup(newConfig.frequency);
    } else if (key === 'frequency') {
      newConfig.nextBackup = calculateNextBackup(value);
    }

    setBackupConfig(newConfig);
    localStorage.setItem('autoBackupConfig', JSON.stringify(newConfig));
  };

  const triggerManualBackup = async () => {
    await executeAutoBackup();
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Diariamente';
      case 'weekly': return 'Semanalmente';
      case 'monthly': return 'Mensalmente';
      default: return 'Semanalmente';
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'pdf': return 'PDF';
      case 'excel': return 'Excel';
      case 'both': return 'PDF + Excel';
      default: return 'Excel';
    }
  };

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Backup Automático" onBack={onBack} />}
      
      {!onBack && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Backup Automático</h2>
        </div>
      )}

      {/* Configuração Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Cloud size={20} />
            <span>Configuração de Backup</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ativar/Desativar */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="backup-enabled">Backup Automático</Label>
              <p className="text-sm text-muted-foreground">
                Gerar backups automaticamente dos seus dados financeiros
              </p>
            </div>
            <Switch
              id="backup-enabled"
              checked={backupConfig.enabled}
              onCheckedChange={(checked) => handleConfigChange('enabled', checked)}
            />
          </div>

          {backupConfig.enabled && (
            <>
              {/* Frequência */}
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequência</Label>
                <Select 
                  value={backupConfig.frequency} 
                  onValueChange={(value) => handleConfigChange('frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diariamente</SelectItem>
                    <SelectItem value="weekly">Semanalmente</SelectItem>
                    <SelectItem value="monthly">Mensalmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Formato */}
              <div className="space-y-2">
                <Label htmlFor="format">Formato de Exportação</Label>
                <Select 
                  value={backupConfig.format} 
                  onValueChange={(value) => handleConfigChange('format', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">Apenas PDF</SelectItem>
                    <SelectItem value="excel">Apenas Excel</SelectItem>
                    <SelectItem value="both">PDF + Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dados Incluídos */}
              <div className="space-y-3">
                <Label>Dados Incluídos no Backup</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-transactions"
                      checked={backupConfig.includeTransactions}
                      onCheckedChange={(checked) => handleConfigChange('includeTransactions', checked)}
                    />
                    <Label htmlFor="include-transactions" className="text-sm">Transações</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-categories"
                      checked={backupConfig.includeCategories}
                      onCheckedChange={(checked) => handleConfigChange('includeCategories', checked)}
                    />
                    <Label htmlFor="include-categories" className="text-sm">Categorias</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-budgets"
                      checked={backupConfig.includeBudgets}
                      onCheckedChange={(checked) => handleConfigChange('includeBudgets', checked)}
                    />
                    <Label htmlFor="include-budgets" className="text-sm">Orçamentos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-accounts"
                      checked={backupConfig.includeAccounts}
                      onCheckedChange={(checked) => handleConfigChange('includeAccounts', checked)}
                    />
                    <Label htmlFor="include-accounts" className="text-sm">Contas</Label>
                  </div>
                </div>
              </div>

              {/* Próximo Backup */}
              {backupConfig.nextBackup && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock size={16} />
                    <span className="font-medium">Próximo Backup</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(backupConfig.nextBackup, "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Frequência: {getFrequencyLabel(backupConfig.frequency)} • Formato: {getFormatLabel(backupConfig.format)}
                  </p>
                </div>
              )}

              {/* Backup Manual */}
              <div className="pt-4 border-t">
                <Button 
                  onClick={triggerManualBackup}
                  disabled={isExporting}
                  className="w-full"
                  variant="outline"
                >
                  <Download size={16} className="mr-2" />
                  {isExporting ? 'Gerando Backup...' : 'Executar Backup Agora'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Backups */}
      {backupHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings size={20} />
              <span>Histórico de Backups</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {backupHistory.map((backup, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {backup.status === 'success' ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <AlertCircle size={16} className="text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {format(backup.date, "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Formato: {getFormatLabel(backup.format)}
                        {backup.size && ` • Tamanho: ${backup.size}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={backup.status === 'success' ? 'default' : 'destructive'}>
                    {backup.status === 'success' ? 'Sucesso' : 'Falha'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <h4 className="font-medium text-foreground">Sobre o Backup Automático:</h4>
            <ul className="space-y-1 pl-4">
              <li>• Os backups são gerados automaticamente no seu dispositivo</li>
              <li>• Os arquivos são baixados na pasta de Downloads padrão</li>
              <li>• Recomendamos manter backup mensal para segurança</li>
              <li>• Os dados sempre refletem o último mês completo</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};