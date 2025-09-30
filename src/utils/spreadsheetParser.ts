import * as XLSX from 'xlsx';

export interface SpreadsheetRow {
  date?: string;
  description?: string;
  amount?: string | number;
  type?: string;
  category?: string;
  account?: string;
  notes?: string;
  tags?: string;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  account?: string;
  notes?: string;
  tags?: string[];
}

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  type: string;
  category?: string;
  account?: string;
  notes?: string;
  tags?: string;
}

export interface ParseResult {
  data: SpreadsheetRow[];
  headers: string[];
  suggestedMapping: ColumnMapping;
}

// Palavras-chave comuns para identificar colunas automaticamente
const COLUMN_KEYWORDS = {
  date: ['data', 'date', 'dt', 'dia', 'fecha'],
  description: ['descrição', 'descricao', 'description', 'desc', 'historico', 'histórico'],
  amount: ['valor', 'amount', 'value', 'quantia', 'montante'],
  type: ['tipo', 'type', 'categoria tipo', 'receita/despesa'],
  category: ['categoria', 'category', 'cat'],
  account: ['conta', 'account', 'banco', 'bank'],
  notes: ['notas', 'notes', 'observações', 'observacoes', 'obs'],
  tags: ['tags', 'etiquetas', 'marcadores'],
};

/**
 * Detecta automaticamente o tipo de coluna baseado no nome
 */
function detectColumnType(columnName: string): string | null {
  const normalized = columnName.toLowerCase().trim();
  
  for (const [type, keywords] of Object.entries(COLUMN_KEYWORDS)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return type;
    }
  }
  
  return null;
}

/**
 * Cria um mapeamento sugerido de colunas
 */
function createSuggestedMapping(headers: string[]): ColumnMapping {
  const mapping: Partial<ColumnMapping> = {};
  
  for (const header of headers) {
    const type = detectColumnType(header);
    if (type && !mapping[type as keyof ColumnMapping]) {
      mapping[type as keyof ColumnMapping] = header;
    }
  }
  
  return mapping as ColumnMapping;
}

/**
 * Parseia arquivo CSV
 */
export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const workbook = XLSX.read(text, { type: 'string' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<SpreadsheetRow>(firstSheet);
        const headers = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 })[0] || [];
        
        const suggestedMapping = createSuggestedMapping(headers as string[]);
        
        resolve({
          data,
          headers: headers as string[],
          suggestedMapping,
        });
      } catch (error) {
        reject(new Error('Erro ao processar CSV: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
}

/**
 * Parseia arquivo Excel
 */
export function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<SpreadsheetRow>(firstSheet);
        const headers = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 })[0] || [];
        
        const suggestedMapping = createSuggestedMapping(headers as string[]);
        
        resolve({
          data: jsonData,
          headers: headers as string[],
          suggestedMapping,
        });
      } catch (error) {
        reject(new Error('Erro ao processar Excel: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parseia arquivo automaticamente (CSV ou Excel)
 */
export async function parseSpreadsheet(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    return parseCSV(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file);
  } else {
    throw new Error('Formato não suportado. Use CSV ou Excel (.xlsx, .xls)');
  }
}

/**
 * Converte linha da planilha em transação processada
 */
export function convertRowToTransaction(
  row: SpreadsheetRow,
  mapping: ColumnMapping
): ParsedTransaction | null {
  try {
    const getValue = (key: string) => {
      const columnName = mapping[key as keyof ColumnMapping];
      return columnName ? row[columnName as keyof SpreadsheetRow] : undefined;
    };
    
    const dateStr = getValue('date') as string;
    const description = getValue('description') as string;
    const amountStr = getValue('amount');
    const typeStr = (getValue('type') as string)?.toLowerCase();
    
    if (!dateStr || !description || !amountStr) {
      return null;
    }
    
    // Parse date
    let date: Date;
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (dateStr.includes('-')) {
      date = new Date(dateStr);
    } else {
      return null;
    }
    
    // Parse amount
    const amount = typeof amountStr === 'number' 
      ? amountStr 
      : parseFloat(amountStr.toString().replace(/[^\d.,-]/g, '').replace(',', '.'));
    
    if (isNaN(amount)) {
      return null;
    }
    
    // Determine type
    let type: 'income' | 'expense' = 'expense';
    if (typeStr) {
      if (typeStr.includes('receita') || typeStr.includes('income') || typeStr.includes('entrada')) {
        type = 'income';
      }
    } else if (amount > 0) {
      type = 'income';
    }
    
    // Parse tags
    const tagsStr = getValue('tags') as string;
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : undefined;
    
    return {
      date: date.toISOString().split('T')[0],
      description: description.trim(),
      amount: Math.abs(amount),
      type,
      category: getValue('category') as string,
      account: getValue('account') as string,
      notes: getValue('notes') as string,
      tags,
    };
  } catch (error) {
    console.error('Error converting row:', error);
    return null;
  }
}

/**
 * Gera arquivo de exemplo para download
 */
export function generateExampleFile(): void {
  const exampleData = [
    {
      Data: '01/01/2025',
      Descrição: 'Salário',
      Valor: 5000,
      Tipo: 'Receita',
      Categoria: 'Salário',
      Conta: 'Conta Corrente',
      Notas: 'Pagamento mensal',
      Tags: 'trabalho,mensal',
    },
    {
      Data: '05/01/2025',
      Descrição: 'Supermercado',
      Valor: -250.50,
      Tipo: 'Despesa',
      Categoria: 'Alimentação',
      Conta: 'Cartão de Crédito',
      Notas: '',
      Tags: 'mercado',
    },
    {
      Data: '10/01/2025',
      Descrição: 'Uber',
      Valor: -45.00,
      Tipo: 'Despesa',
      Categoria: 'Transporte',
      Conta: 'Conta Corrente',
      Notas: 'Viagem ao escritório',
      Tags: 'transporte,trabalho',
    },
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(exampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transações');
  
  XLSX.writeFile(workbook, 'exemplo_importacao.xlsx');
}
