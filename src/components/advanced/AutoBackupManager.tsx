import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const STORAGE_KEY = 'solviss_backup_config';

const defaultConfig: BackupConfig = {
  enabled: false,
  frequency: 'weekly',
  format: 'excel',
  includeTransactions: true,
  includeCategories: true,
  includeBudgets: true,
  includeAccounts: true,
};

export const AutoBackupManager: React.FC<AutoBackupManagerProps> = ({ onBack }) => {
  const { exportToPDF, exportToExcel, isExporting } = useExportReports();
  const [backupConfig, setBackupConfig] = useState<BackupConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultConfig,
          ...parsed,
          lastBackup: parsed.lastBackup ? new Date(parsed.lastBackup) : undefined,
          nextBackup: parsed.nextBackup ? new Date(parsed.nextBackup) : undefined,
        };
      }
    } catch {}
    return defaultConfig;
  });
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const saveConfig = (config: BackupConfig) => {
    setBackupConfig(config);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {}
  };

  const calculateNextBackup = (frequency: BackupConfig['frequency'], from: Date = new Date()): Date => {
    switch (frequency) {
      case 'daily': return addDays(from, 1);
      case 'weekly': return addWeeks(from, 1);
      case 'monthly': return addMonths(from, 1);
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    const newConfig = {
      ...backupConfig,
      enabled,
      nextBackup: enabled ? calculateNextBackup(backupConfig.frequency) : undefined,
    };
    saveConfig(newConfig);
  };

  const handleFrequencyChange = (frequency: BackupConfig['frequency']) => {
    const newConfig = {
      ...backupConfig,
      frequency,
      nextBackup: backupConfig.enabled ? calculateNextBackup(frequency) : undefined,
    };
    saveConfig(newConfig);
  };

  const handleFormatChange = (fmt: BackupConfig['format']) => {
    saveConfig({ ...backupConfig, format: fmt });
  };

  const handleToggleInclude = (field: keyof Pick<BackupConfig, 'includeTransactions' | 'includeCategories' | 'includeBudgets' | 'includeAccounts'>, value: boolean) => {
    saveConfig({ ...backupConfig, [field]: value });
  };

  const handleManualBackup = async () => {
    setIsCreatingBackup(true);
    try {
      if (backupConfig.format === 'pdf' || backupConfig.format === 'both') {
        await exportToPDF();
      }
      if (backupConfig.format === 'excel' || backupConfig.format === 'both') {
        await exportToExcel();
      }
      const now = new Date();
      saveConfig({
        ...backupConfig,
        lastBackup: now,
        nextBackup: backupConfig.enabled ? calculateNextBackup(backupConfig.frequency, now) : undefined,
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const frequencyLabels = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' };
  const formatLabels = { pdf: 'PDF', excel: 'Excel', both: 'PDF + Excel' };

  return (
    <div className="space-y-6">
      <BackHeader
        title="Backup Automático"
        subtitle="Agende exportações periódicas dos seus dados"
        icon={<Cloud className="h-6 w-6" />}
        onBack={onBack}
      />

      {/* Status Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {backupConfig.enabled ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">{backupConfig.enabled ? 'Backup Ativo' : 'Backup Inativo'}</p>
                {backupConfig.lastBackup && (
                  <p className="text-sm text-muted-foreground">
                    Último: {format(backupConfig.lastBackup, 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
                {backupConfig.enabled && backupConfig.nextBackup && (
                  <p className="text-sm text-muted-foreground">
                    Próximo: {format(backupConfig.nextBackup, 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
              </div>
            </div>
            <Switch
              checked={backupConfig.enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={backupConfig.frequency} onValueChange={(v) => handleFrequencyChange(v as BackupConfig['frequency'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(frequencyLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={backupConfig.format} onValueChange={(v) => handleFormatChange(v as BackupConfig['format'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(formatLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Incluir no backup</Label>
            {([
              { key: 'includeTransactions', label: 'Transações' },
              { key: 'includeCategories', label: 'Categorias' },
              { key: 'includeBudgets', label: 'Orçamentos' },
              { key: 'includeAccounts', label: 'Contas' },
            ] as const).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="font-normal">{label}</Label>
                <Switch
                  id={key}
                  checked={backupConfig[key]}
                  onCheckedChange={(v) => handleToggleInclude(key, v)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4" />
            Backup Manual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Faça um backup imediato dos seus dados no formato configurado acima.
          </p>
          <Button
            onClick={handleManualBackup}
            disabled={isCreatingBackup || isExporting}
            className="w-full"
          >
            {isCreatingBackup || isExporting ? (
              <><Clock className="h-4 w-4 mr-2 animate-spin" />Criando backup...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />Fazer Backup Agora</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
