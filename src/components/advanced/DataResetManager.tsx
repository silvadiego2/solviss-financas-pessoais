import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BackHeader } from '@/components/layout/BackHeader';
import { useDataReset } from '@/hooks/useDataReset';
import { Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface DataResetManagerProps {
  onBack?: () => void;
}

export const DataResetManager: React.FC<DataResetManagerProps> = ({ onBack }) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { deleteAllUserData, isResetting } = useDataReset();

  const handleReset = async () => {
    if (confirmText !== 'CONFIRMAR') return;
    const result = await deleteAllUserData();
    if (result.success) {
      setShowConfirmDialog(false);
      setConfirmText('');
    }
  };

  const isConfirmValid = confirmText === 'CONFIRMAR';

  return (
    <div className="space-y-6">
      <BackHeader
        title="Limpar Dados"
        subtitle="Remova permanentemente todos os seus dados"
        icon={<ShieldAlert className="h-6 w-6" />}
        onBack={onBack}
      />

      <Card className="border-destructive">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-destructive">Ação irreversível</p>
              <p className="text-sm text-muted-foreground">
                Esta ação removerá permanentemente todas as suas transações, contas, categorias, metas e orçamentos.
                Não é possível desfazer esta operação.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">O que será removido</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {['Todas as transações', 'Todas as contas bancárias', 'Categorias personalizadas', 'Metas financeiras', 'Orçamentos configurados', 'Regras de automação'].map(item => (
              <li key={item} className="flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button
        variant="destructive"
        className="w-full"
        onClick={() => setShowConfirmDialog(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Limpar Todos os Dados
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Para confirmar, digite <strong>CONFIRMAR</strong> no campo abaixo:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CONFIRMAR"
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={!isConfirmValid || isResetting}
                className="flex-1"
              >
                {isResetting ? 'Removendo...' : 'Confirmar Exclusão'}
              </Button>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
