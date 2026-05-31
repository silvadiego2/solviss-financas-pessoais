/**
 * pdfInvoiceParser.ts
 * Parser client-side de faturas de cartão de crédito em PDF.
 * Usa pdfjs-dist (já incluído como dependência transitiva via react-pdf ou disponível via CDN).
 *
 * Bancos suportados: Nubank, Itaú, Bradesco, Santander, Inter, Genérico
 */

import type { ParsedTransaction } from './spreadsheetParser';

export interface PdfParseResult {
  transactions: ParsedTransaction[];
  detectedBank: string;
  invoiceMonth?: string; // "2025-03"
  totalAmount?: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAmountBR(raw: string): number | null {
  // Aceita: "1.234,56"  "1234,56"  "1234.56"  "-250,00"
  const clean = raw.trim().replace(/[^\d,.-]/g, '');
  // Formato BR: ponto = milhar, vírgula = decimal
  if (clean.includes(',')) {
    const normalized = clean.replace(/\./g, '').replace(',', '.');
    const v = parseFloat(normalized);
    return isNaN(v) ? null : Math.abs(v);
  }
  const v = parseFloat(clean);
  return isNaN(v) ? null : Math.abs(v);
}

function parseDateBR(raw: string): string | null {
  // DD/MM/YYYY ou DD/MM/YY ou DD/MM
  const m = raw.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!m) return null;
  const day   = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  let year    = m[3] ? parseInt(m[3]) : new Date().getFullYear();
  if (year < 100) year += 2000;
  const d = new Date(year, parseInt(month) - 1, parseInt(day));
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Detectores de banco
// ---------------------------------------------------------------------------

type BankParser = (lines: string[]) => ParsedTransaction[];

interface BankDef {
  name: string;
  detect: (text: string) => boolean;
  parse: BankParser;
}

// --- Nubank ---
const nubankParser: BankDef = {
  name: 'Nubank',
  detect: (text) => /nubank/i.test(text),
  parse: (lines) => {
    const txs: ParsedTransaction[] = [];
    // Padrão Nubank: "DD/MM  Descrição  R$ 999,99"  ou  "DD/MM  Descrição  999,99"
    const re = /(\d{2}\/\d{2})\s{1,}(.+?)\s{1,}R?\$?\s?([\d.,]+)\s*$/;
    for (const line of lines) {
      const m = line.match(re);
      if (!m) continue;
      const date   = parseDateBR(m[1]);
      const amount = parseAmountBR(m[3]);
      if (!date || !amount || amount <= 0) continue;
      const desc = m[2].trim();
      if (/pagamento|payment|saldo/i.test(desc)) continue;
      txs.push({
        date,
        description: desc,
        amount,
        type: 'expense',
        account: 'Nubank',
      });
    }
    return txs;
  },
};

// --- Itaú ---
const itauParser: BankDef = {
  name: 'Itaú',
  detect: (text) => /ita[uú]/i.test(text),
  parse: (lines) => {
    const txs: ParsedTransaction[] = [];
    // Padrão Itaú: "DD/MM/AA  Descrição  999,99"
    const re = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+([\d.,]+)\s*$/;
    for (const line of lines) {
      const m = line.match(re);
      if (!m) continue;
      const date   = parseDateBR(m[1]);
      const amount = parseAmountBR(m[3]);
      if (!date || !amount || amount <= 0) continue;
      const desc = m[2].trim();
      if (/pagamento|saldo anterior|total/i.test(desc)) continue;
      txs.push({
        date,
        description: desc,
        amount,
        type: 'expense',
        account: 'Itaú',
      });
    }
    return txs;
  },
};

// --- Bradesco ---
const bradescoParser: BankDef = {
  name: 'Bradesco',
  detect: (text) => /bradesco/i.test(text),
  parse: (lines) => {
    const txs: ParsedTransaction[] = [];
    const re = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+([\d.,]+)\s*$/;
    for (const line of lines) {
      const m = line.match(re);
      if (!m) continue;
      const date   = parseDateBR(m[1]);
      const amount = parseAmountBR(m[3]);
      if (!date || !amount || amount <= 0) continue;
      const desc = m[2].trim();
      if (/pagamento|saldo|encargo|multa|juros/i.test(desc)) continue;
      txs.push({
        date,
        description: desc,
        amount,
        type: 'expense',
        account: 'Bradesco',
      });
    }
    return txs;
  },
};

// --- Santander ---
const santanderCCParser: BankDef = {
  name: 'Santander',
  detect: (text) => /santander/i.test(text),
  parse: (lines) => {
    const txs: ParsedTransaction[] = [];
    const re = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+([\d.,]+)\s*$/;
    for (const line of lines) {
      const m = line.match(re);
      if (!m) continue;
      const date   = parseDateBR(m[1]);
      const amount = parseAmountBR(m[3]);
      if (!date || !amount || amount <= 0) continue;
      const desc = m[2].trim();
      if (/pagamento|saldo|encargo/i.test(desc)) continue;
      txs.push({
        date,
        description: desc,
        amount,
        type: 'expense',
        account: 'Santander',
      });
    }
    return txs;
  },
};

// --- Inter ---
const interParser: BankDef = {
  name: 'Inter',
  detect: (text) => /banco inter|\binter\b/i.test(text),
  parse: (lines) => {
    const txs: ParsedTransaction[] = [];
    const re = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+([\d.,]+)\s*$/;
    for (const line of lines) {
      const m = line.match(re);
      if (!m) continue;
      const date   = parseDateBR(m[1]);
      const amount = parseAmountBR(m[3]);
      if (!date || !amount || amount <= 0) continue;
      const desc = m[2].trim();
      if (/pagamento|saldo/i.test(desc)) continue;
      txs.push({
        date,
        description: desc,
        amount,
        type: 'expense',
        account: 'Inter',
      });
    }
    return txs;
  },
};

// --- Genérico (fallback) ---
const genericParser: BankDef = {
  name: 'Genérico',
  detect: () => true,
  parse: (lines) => {
    const txs: ParsedTransaction[] = [];
    // Busca qualquer linha com data BR + valor BR
    const re = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.{3,60}?)\s+([\d.,]{4,})\s*$/;
    for (const line of lines) {
      const m = line.match(re);
      if (!m) continue;
      const date   = parseDateBR(m[1]);
      const amount = parseAmountBR(m[3]);
      if (!date || !amount || amount <= 0 || amount > 999_999) continue;
      const desc = m[2].trim();
      if (/pagamento|saldo|total da fatura|vencimento/i.test(desc)) continue;
      txs.push({
        date,
        description: desc,
        amount,
        type: 'expense',
      });
    }
    return txs;
  },
};

const BANK_DEFS: BankDef[] = [
  nubankParser,
  itauParser,
  bradescoParser,
  santanderCCParser,
  interParser,
  genericParser,
];

// ---------------------------------------------------------------------------
// Loader pdf.js via CDN (evita bundle pesado)
// ---------------------------------------------------------------------------

async function getPdfJs() {
  // Tenta importar pdfjs-dist se já estiver no node_modules
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Configura worker via CDN para não depender de arquivo local
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
    }
    return pdfjsLib;
  } catch {
    // fallback: carrega via CDN dinâmico
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
    const w = window as any;
    if (w.pdfjsLib) {
      w.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
    }
    return w.pdfjsLib as typeof import('pdfjs-dist');
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.type = 'module';
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(s);
  });
}

// ---------------------------------------------------------------------------
// Extrai texto bruto do PDF
// ---------------------------------------------------------------------------

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    parts.push(pageText);
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Parseia um arquivo PDF de fatura de cartão de crédito.
 * Retorna as transações extraídas prontas para importação.
 */
export async function parsePdfInvoice(file: File): Promise<PdfParseResult> {
  const errors: string[] = [];
  let rawText = '';

  try {
    rawText = await extractTextFromPdf(file);
  } catch (err) {
    errors.push('Não foi possível ler o PDF: ' + (err as Error).message);
    return { transactions: [], detectedBank: 'Desconhecido', errors };
  }

  if (!rawText.trim()) {
    errors.push('O PDF não contém texto extraível. Pode ser um PDF escaneado (imagem). Tente converter para texto primeiro.');
    return { transactions: [], detectedBank: 'Desconhecido', errors };
  }

  // Detectar banco
  const bankDef = BANK_DEFS.find(b => b.detect(rawText)) ?? genericParser;

  // Extrair mês da fatura
  let invoiceMonth: string | undefined;
  const monthMatch = rawText.match(/vencimento[:\s]+\d{2}\/((\d{2})\/(\d{4}))/i)
    ?? rawText.match(/fatura[\s\S]{0,30}(\d{2})\/(\d{4})/i);
  if (monthMatch) {
    const raw = monthMatch[0];
    const dm  = raw.match(/(\d{2})\/(\d{4})/);
    if (dm) invoiceMonth = `${dm[2]}-${dm[1]}`;
  }

  // Extrair total
  let totalAmount: number | undefined;
  const totalMatch = rawText.match(/total\s+(?:da\s+)?fatura[:\s]+R?\$?\s?([\d.,]+)/i)
    ?? rawText.match(/valor\s+total[:\s]+R?\$?\s?([\d.,]+)/i);
  if (totalMatch) totalAmount = parseAmountBR(totalMatch[1]) ?? undefined;

  // Dividir em linhas para o parser
  const lines = rawText.split(/\n|(?<=\d)\s{3,}(?=\d{2}\/\d{2})/)
    .map(l => l.trim())
    .filter(l => l.length > 5);

  const transactions = bankDef.parse(lines);

  if (transactions.length === 0) {
    errors.push(
      'Nenhuma transação encontrada. O layout deste PDF pode não ser suportado. ' +
      'Tente exportar o extrato como CSV/Excel pelo app do banco.'
    );
  }

  return {
    transactions,
    detectedBank: bankDef.name,
    invoiceMonth,
    totalAmount,
    errors,
  };
}
