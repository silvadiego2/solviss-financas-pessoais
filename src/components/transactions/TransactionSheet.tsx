import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { AddTransactionForm } from './AddTransactionForm';
import { EditTransactionForm } from './EditTransactionForm';
import { Transaction } from '@/hooks/useTransactions';
import { ScrollArea } from '@/components/ui/scroll-area';

type SheetMode =
  | { mode: 'add' }
  | { mode: 'edit'; transaction: Transaction }
  | { mode: 'closed' };

interface TransactionSheetProps {
  state: SheetMode;
  onClose: () => void;
}

export const TransactionSheet: React.FC<TransactionSheetProps> = ({ state, onClose }) => {
  const open = state.mode !== 'closed';

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 flex flex-col"
      >
        {/* Header acessível — visualmente oculto; o form tem seu próprio título */}
        <SheetHeader className="sr-only">
          <SheetTitle>
            {state.mode === 'add' ? 'Nova Transação' : 'Editar Transação'}
          </SheetTitle>
          <SheetDescription>
            {state.mode === 'add'
              ? 'Preencha os campos para adicionar uma nova transação.'
              : 'Altere os campos e salve para atualizar a transação.'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6">
            {state.mode === 'add' && (
              <AddTransactionForm onClose={onClose} />
            )}
            {state.mode === 'edit' && (
              <EditTransactionForm
                transaction={state.transaction}
                onClose={onClose}
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
