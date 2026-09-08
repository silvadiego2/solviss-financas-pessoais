import React from 'react';
import { BankStatementImporter } from '@/components/import/BankStatementImporter';
import { FileText, Info } from 'lucide-react';

export function ImportarExtrato() {
  return (
    <div className="flex-1 w-full space-y-8 p-6 md:p-8 pt-6 pb-24">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          Importar Extrato
        </h1>
        <p className="text-muted-foreground">
          Importe suas transações rapidamente usando arquivos do seu banco.
        </p>
      </div>

      {/* Card Informativo (opcional, mas fica bonito) */}
      <div className="bg-primary/5 border border-primary/20 text-primary-foreground/80 p-4 rounded-xl flex gap-3 text-sm max-w-4xl">
        <Info className="text-primary shrink-0 mt-0.5" size={20} />
        <div>
          <strong className="text-foreground block mb-1">Como exportar do seu banco?</strong>
          <span className="text-muted-foreground">
            Acesse o Internet Banking ou App do seu banco e procure pela opção "Exportar Extrato". 
            Dê preferência para o formato <strong>OFX</strong>. Caso o banco não forneça, você pode usar <strong>CSV</strong>.
          </span>
        </div>
      </div>

      {/* Componente Principal que fizemos no Passo 2 */}
      <BankStatementImporter />
      
    </div>
  );
}