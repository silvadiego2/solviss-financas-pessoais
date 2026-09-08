/**
 * Parser CSV - Nubank, Itaú, Bradesco
 */

export interface CSVTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  merchant?: string;
}

export interface CSVResult {
  bank: string;
  transactions: CSVTransaction[];
  startDate: string;
  endDate: string;
}

export function parseCSV(text: string, filename: string): CSVResult {
  const lines = text.split('\n').filter(line => line.trim());
  const transactions: CSVTransaction[] = [];
  const isNubank = filename.toLowerCase().includes('nubank');
  const isItau = filename.toLowerCase().includes('itau');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/;|,/);
    if (parts.length >= 3) {
      let [date, description, amountStr] = parts;
      
      date = date?.replace(/"/g, '').trim();
      if (date && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [d, m, y] = date.split('/');
        date = `${y}-${m}-${d}`;
      }

      amountStr = amountStr?.replace(/"/g, '').replace(/\./g, '').replace(',', '.').trim();
      const amount = parseFloat(amountStr || '0');

      if (date && amount !== 0) {
        const desc = description?.replace(/"/g, '').trim() || 'Transação';
        transactions.push({
          date,
          description: desc,
          amount: Math.abs(amount),
          type: amount < 0 ? 'expense' : 'income',
          category: categorizeTransaction(desc),
          merchant: extractMerchant(desc),
        });
      }
    }
  }

  const bankName = isNubank ? 'Nubank' : isItau ? 'Itaú' : 'Banco';

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
  if (desc.includes('farmacia')) return 'saude';
  if (desc.includes('netflix') || desc.includes('spotify')) return 'lazer';
  if (desc.includes('salario')) return 'renda';
  return 'outros';
}

function extractMerchant(description: string): string {
  const match = description.match(/^([A-Z][A-Za-zÀ-ÿ\s]+)/);
  return match ? match[1].trim() : '';
}