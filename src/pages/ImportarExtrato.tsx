import React from 'react';
import { BankStatementImporter } from '@/components/import/BankStatementImporter';
import { FileText, Info } from 'lucide-react';
import { BackHeader } from '@/components/layout/BackHeader';

// 🚀 Criamos a interface para receber o botão de voltar
interface ImportarExtratoProps {
  onBack?: () => void;
}

export function ImportarExtrato({ onBack }: ImportarExtratoProps) {
  return (
    <div className="space-y-6 pb-24">
      
      {/* 🚀 Adicionamos o BackHeader oficial do seu app */}
      <BackHeader
        title="Importar Extrato"
        subtitle="Importe suas transações usando arquivos OFX ou CSV."
        icon={<FileText className="h-6 w-6" />}
        onBack={onBack}
      />

      {/* Card Informativo */}
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

      {/* Componente Principal */}
      <BankStatementImporter />
      
    </div>
  );
}
