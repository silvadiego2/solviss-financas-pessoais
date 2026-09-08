/**
 * Parser OFX - Extrai transações de arquivos OFX (padrão brasileiro)
 */

export interface OFXTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  merchant?: string;
}

export interface OFXResult {
  bank: string;
  transactions: OFXTransaction[];
  startDate: string;
  endDate: string;
}

export function parseOFX(text: string): OFXResult {
  const transactions: OFXTransaction[] = [];
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;

  while ((match = stmttrnRegex.exec(text)) !== null) {
    const block = match[1];
    const dtposted = block.match(/<DTPOSTED>([\s\S]*?)<\/DTPOSTED>/)?.[1] || '';
    const amount = parseFloat(block.match(/<TRNAMT>([\s\S]*?)<\/TRNAMT>/)?.[1] || '0');
    const name = block.match(/<NAME>([\s\S]*?)<\/NAME>/)?.[1] || '';
    const memo = block.match(/<MEMO>([\s\S]*?)<\/MEMO>/)?.[1] || '';

    const date = dtposted.length >= 8 
      ? `${dtposted.slice(0,4)}-${dtposted.slice(4,6)}-${dtposted.slice(6,8)}`
      : new Date().toISOString().split('T')[0];

    const description = name || memo || 'Transação';

    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type: amount < 0 ? 'expense' : 'income',
      category: categorizeTransaction(description),
      merchant: extractMerchant(description),
    });
  }

  const bankName = text.match(/<FIORG>([\s\S]*?)<\/FIORG>/)?.[1] || 'Banco';

  return {
    bank: bankName,
    transactions,
    startDate: transactions[0]?.date || '',
    endDate: transactions[transactions.length - 1]?.date || '',
  };
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes('uber') || desc.includes('99')) return 'transporte';
  if (desc.includes('ifood') || desc.includes('restaurante')) return 'alimentacao';
  if (desc.includes('supermercado') || desc.includes('mercado')) return 'mercado';
  if (desc.includes('farmacia') || desc.includes('drogaria')) return 'saude';
  if (desc.includes('netflix') || desc.includes('spotify')) return 'lazer';
  if (desc.includes('salario') || desc.includes('deposito')) return 'renda';
  return 'outros';
}

function extractMerchant(description: string): string {
  const match = description.match(/^([A-Z][A-Za-zÀ-ÿ\s]+)/);
  return match ? match[1].trim() : '';
}