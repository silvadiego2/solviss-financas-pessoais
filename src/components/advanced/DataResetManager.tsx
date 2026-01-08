import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDataReset } from '@/hooks/useDataReset';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { BackHeader } from '@/components/layout/BackHeader';

interface DataResetManagerProps {
  onBack?: () => void;
}

export const DataResetManager: React.FC<DataResetManagerProps> = ({ onBack }) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { deleteAllUserData, isResetting } = useDataReset();

  const handleReset = async () => {
    if (confirmText !== 'CONFIRMAR') {
      return;
    }

    const result = await deleteAllUserData();
    
    if (result.success) {
      setShowConfirmDialog(false);
      setConfirmText('');
    }
  };

  const isConfirmValid = confirmText === 'CONFIRMAR';

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Limpar Dados" onBack={onBack} />}
      <Card className="w-full max-w-2xl mx-auto border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Limpar todos os dados do aplicativo (ação irreversível)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h4 className="font-semibold text-destructive mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!
              </h4>
              
              <div className="space-y-2 text-sm">
                <p className="font-medium">Será excluído permanentemente:</p>
                <ul className="space-y-1 ml-4">
                  <li>✓ Todas as transações</li>
                  <li>✓ Todas as contas bancárias</li>
                  <li>✓ Todos os cartões de crédito</li>
                  <li>✓ Todos os orçamentos</li>
                  <li>✓ Todas as metas financeiras</li>
                  <li>✓ Todas as regras de automação</li>
                  <li>✓ Todas as notificações</li>
                  <li>✓ Todas as conexões bancárias</li>
                  <li>✓ Categorias personalizadas</li>
                </ul>
                
                <p className="font-medium mt-4 text-muted-foreground">
                  ℹ️ Categorias padrão serão mantidas
                </p>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold mb-2">💡 Quando usar esta função?</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Testou o app com dados de demonstração</li>
                <li>• Quer limpar tudo antes de importar dados reais</li>
                <li>• Deseja começar do zero</li>
              </ul>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Download className="h-4 w-4" />
                📥 Recomendação
              </h4>
              <p className="text-sm">
                Se você tem dados importantes, exporte-os antes de limpar usando a opção 
                <strong> "Relatórios Exportar"</strong> no menu.
              </p>
            </div>
          </div>

          <Button 
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={() => setShowConfirmDialog(true)}
            disabled={isResetting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Limpar Todos os Dados
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão Permanente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="font-semibold">
                Esta ação NÃO pode ser desfeita!
              </p>
              
              <p>
                Todos os seus dados financeiros serão permanentemente excluídos. 
                Não há como recuperar após a confirmação.
              </p>

              <div className="space-y-2">
                <Label htmlFor="confirm-input">
                  Digite <strong>CONFIRMAR</strong> para prosseguir:
                </Label>
                <Input
                  id="confirm-input"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Digite: CONFIRMAR"
                  className="font-mono"
                  disabled={isResetting}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setConfirmText('');
                setShowConfirmDialog(false);
              }}
              disabled={isResetting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={!isConfirmValid || isResetting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Tudo
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Download = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
