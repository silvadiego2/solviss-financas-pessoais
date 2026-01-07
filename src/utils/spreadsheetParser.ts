import * as XLSX from 'xlsx';

export interface SpreadsheetRow {
  [key: string]: string | number | undefined;
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
  detectedBank?: string;
}

// Palavras-chave comuns para identificar colunas automaticamente
const COLUMN_KEYWORDS = {
  date: ['data', 'date', 'dt', 'dia', 'fecha', 'data movim'],
  description: ['descrição', 'descricao', 'description', 'desc', 'historico', 'histórico'],
  amount: ['valor', 'amount', 'value', 'quantia', 'montante', 'crédito', 'débito', 'credito', 'debito'],
  type: ['tipo', 'type', 'categoria tipo', 'receita/despesa', 'situação', 'situacao'],
  category: ['categoria', 'category', 'cat'],
  account: ['conta', 'account', 'banco', 'bank'],
  notes: ['notas', 'notes', 'observações', 'observacoes', 'obs', 'documento', 'docto'],
  tags: ['tags', 'etiquetas', 'marcadores'],
};

// Padrões para detectar bancos
interface BankPattern {
  name: string;
  headerPatterns: string[];
  columnMapping: Partial<ColumnMapping>;
  processRow: (row: SpreadsheetRow, headers: string[]) => ParsedTransaction | null;
}

// Normaliza string removendo acentos e caracteres especiais para comparação
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Procura valor em objeto por chave normalizada
function findValueByNormalizedKey(row: SpreadsheetRow, searchKey: string): string | number | undefined {
  const normalizedSearch = normalizeString(searchKey);
  for (const key of Object.keys(row)) {
    if (normalizeString(key).includes(normalizedSearch) || normalizedSearch.includes(normalizeString(key))) {
      return row[key];
    }
  }
  return undefined;
}

const BANK_PATTERNS: BankPattern[] = [
  {
    name: 'Banco do Brasil',
    headerPatterns: ['data', 'dependencia', 'historico', 'documento', 'valor'],
    columnMapping: {
      date: 'Data',
      description: 'Histórico',
      amount: 'Valor',
      type: '_auto_',
    },
    processRow: (row: SpreadsheetRow): ParsedTransaction | null => {
      try {
        const dateStr = (findValueByNormalizedKey(row, 'data') as string)?.toString();
        const description = (findValueByNormalizedKey(row, 'historico') as string)?.toString();
        const valorStr = (findValueByNormalizedKey(row, 'valor') as string)?.toString();
        
        if (!dateStr || !description || valorStr === undefined) return null;
        
        // Ignorar saldo anterior e saldo final
        const descLower = description.toLowerCase();
        if (descLower.includes('saldo anterior') || descLower.includes('s a l d o')) {
          return null;
        }
        
        // Parse date DD/MM/YYYY
        const dateParts = dateStr.split('/');
        if (dateParts.length !== 3) return null;
        const date = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
        if (isNaN(date.getTime())) return null;
        
        // Parse valor - BB usa valores negativos para débitos
        const cleanValue = valorStr.toString().replace(/[^\d.,-]/g, '').replace(',', '.');
        let amount = parseFloat(cleanValue);
        
        if (isNaN(amount)) return null;
        
        const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense';
        
        return {
          date: date.toISOString().split('T')[0],
          description: description.trim(),
          amount: Math.abs(amount),
          type,
          account: 'Banco do Brasil',
        };
      } catch {
        return null;
      }
    }
  },
  {
    name: 'Santander',
    headerPatterns: ['data', 'descricao', 'docto', 'situacao', 'credito', 'debito', 'saldo'],
    columnMapping: {
      date: 'Data',
      description: 'Descrição',
      amount: '_calculated_',
      type: '_auto_',
    },
    processRow: (row: SpreadsheetRow): ParsedTransaction | null => {
      try {
        const dateStr = (findValueByNormalizedKey(row, 'data') as string)?.toString();
        const description = (findValueByNormalizedKey(row, 'descricao') as string)?.toString();
        const creditoStr = (findValueByNormalizedKey(row, 'credito') as string)?.toString();
        const debitoStr = (findValueByNormalizedKey(row, 'debito') as string)?.toString();
        
        if (!dateStr || !description) return null;
        
        // Ignorar linhas de saldo e totais
        const descLower = description.toLowerCase();
        if (descLower.includes('saldo anterior') || 
            descLower.includes('total') ||
            descLower.includes('saldo de conta') ||
            descLower.includes('saldo bloqueado') ||
            descLower.includes('provisao') ||
            descLower.includes('limite')) {
          return null;
        }
        
        // Parse date DD/MM/YYYY
        const dateParts = dateStr.split('/');
        if (dateParts.length !== 3) return null;
        const date = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
        if (isNaN(date.getTime())) return null;
        
        // Determine tipo e valor
        let amount = 0;
        let type: 'income' | 'expense' = 'expense';
        
        if (creditoStr && creditoStr.trim() !== '') {
          const cleanValue = creditoStr.replace(/[^\d.,-]/g, '').replace('.', '').replace(',', '.');
          const parsed = parseFloat(cleanValue);
          if (!isNaN(parsed) && parsed !== 0) {
            amount = parsed;
            type = 'income';
          }
        }
        
        if ((amount === 0) && debitoStr && debitoStr.trim() !== '') {
          const cleanValue = debitoStr.replace(/[^\d.,-]/g, '').replace('.', '').replace(',', '.');
          const parsed = parseFloat(cleanValue);
          if (!isNaN(parsed) && parsed !== 0) {
            amount = Math.abs(parsed);
            type = 'expense';
          }
        }
        
        if (amount === 0) return null;
        
        return {
          date: date.toISOString().split('T')[0],
          description: description.trim(),
          amount,
          type,
          account: 'Santander',
        };
      } catch {
        return null;
      }
    }
  }
];

/**
 * Detecta o banco baseado nos headers
 */
function detectBank(headers: string[]): BankPattern | null {
  const normalizedHeaders = headers.map(h => normalizeString(h?.toString() || ''));
  
  for (const pattern of BANK_PATTERNS) {
    const matchCount = pattern.headerPatterns.filter(ph => 
      normalizedHeaders.some(h => h.includes(ph) || ph.includes(h))
    ).length;
    
    // Se encontrar pelo menos 3 headers correspondentes, considera como match
    if (matchCount >= 3) {
      return pattern;
    }
  }
  
  return null;
}

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
function createSuggestedMapping(headers: string[], bankPattern?: BankPattern | null): ColumnMapping {
  if (bankPattern) {
    return {
      date: bankPattern.columnMapping.date || '',
      description: bankPattern.columnMapping.description || '',
      amount: bankPattern.columnMapping.amount || '',
      type: bankPattern.columnMapping.type || '_auto_',
      ...bankPattern.columnMapping
    } as ColumnMapping;
  }
  
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
 * Processa dados de banco específico
 */
function processBankData(data: SpreadsheetRow[], headers: string[], bankPattern: BankPattern): SpreadsheetRow[] {
  // Retorna os dados originais - o processamento será feito no convertRowToTransaction
  return data;
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
        const workbook = XLSX.read(text, { type: 'string', codepage: 65001 });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<SpreadsheetRow>(firstSheet, { defval: '' });
        const headers = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 })[0] || [];
        
        const bankPattern = detectBank(headers as string[]);
        const suggestedMapping = createSuggestedMapping(headers as string[], bankPattern);
        
        resolve({
          data,
          headers: headers as string[],
          suggestedMapping,
          detectedBank: bankPattern?.name,
        });
      } catch (error) {
        reject(new Error('Erro ao processar CSV: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file, 'UTF-8');
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
        const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Encontrar a linha do header real (pode não ser a primeira)
        const allRows = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
        let headerRowIndex = 0;
        let headers: string[] = [];
        
        // Procurar linha que contenha "Data" e "Descrição" ou padrões de banco
        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
          const row = allRows[i] as string[];
          if (row && row.some(cell => {
            const cellStr = cell?.toString().toLowerCase() || '';
            return cellStr.includes('data') || cellStr.includes('descrição') || cellStr.includes('descricao');
          })) {
            headerRowIndex = i;
            headers = row.map(h => h?.toString() || '');
            break;
          }
        }
        
        // Se não encontrou header específico, usa a primeira linha
        if (headers.length === 0) {
          headers = (allRows[0] as string[] || []).map(h => h?.toString() || '');
        }
        
        // Pegar dados a partir da linha após o header
        const jsonData = XLSX.utils.sheet_to_json<SpreadsheetRow>(firstSheet, { 
          range: headerRowIndex,
          defval: '' 
        });
        
        const bankPattern = detectBank(headers);
        const suggestedMapping = createSuggestedMapping(headers, bankPattern);
        
        resolve({
          data: jsonData,
          headers,
          suggestedMapping,
          detectedBank: bankPattern?.name,
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
  mapping: ColumnMapping,
  detectedBank?: string
): ParsedTransaction | null {
  // Se é um banco conhecido, usa o processador específico
  if (detectedBank) {
    const bankPattern = BANK_PATTERNS.find(b => b.name === detectedBank);
    if (bankPattern) {
      return bankPattern.processRow(row, Object.keys(row));
    }
  }
  
  // Processamento genérico
  try {
    const getValue = (key: string) => {
      const columnName = mapping[key as keyof ColumnMapping];
      return columnName ? row[columnName] : undefined;
    };
    
    const dateStr = getValue('date') as string;
    const description = getValue('description') as string;
    const amountStr = getValue('amount');
    const typeStr = (getValue('type') as string)?.toLowerCase();
    
    if (!dateStr || !description || amountStr === undefined) {
      return null;
    }
    
    // Parse date
    let date: Date;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        return null;
      }
    } else if (dateStr.includes('-')) {
      date = new Date(dateStr);
    } else {
      return null;
    }
    
    if (isNaN(date.getTime())) return null;
    
    // Parse amount
    const amount = typeof amountStr === 'number' 
      ? amountStr 
      : parseFloat(amountStr.toString().replace(/[^\d.,-]/g, '').replace(',', '.'));
    
    if (isNaN(amount)) {
      return null;
    }
    
    // Determine type
    let type: 'income' | 'expense' = 'expense';
    if (typeStr && typeStr !== '_auto_') {
      if (typeStr.includes('receita') || typeStr.includes('income') || typeStr.includes('entrada') || typeStr.includes('crédito')) {
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
