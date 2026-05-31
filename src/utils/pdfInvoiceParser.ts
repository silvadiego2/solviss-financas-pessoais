/**
 * pdfInvoiceParser.ts
 * Parser client-side de faturas de cartão de crédito em PDF.
 *
 * Carrega PDF.js 100% via CDN em runtime — sem import estático,
 * sem dependência no package.json, sem impacto no bundle.
 *
 * Bancos suportados: Nubank, Itaú, Bradesco, Santander, Inter, Genérico
 */

import type { ParsedTransaction } from './spreadsheetParser';

export interface PdfParseResult {
  transactions: ParsedTransaction[];
  detectedBank: string;
  invoiceMonth?: string;
  totalAmount?: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAmountBR(raw: string): number | null {
  const clean = raw.trim().replace(/[^\d,.-]/g, '');
  if (clean.includes(',')) {
    const v = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : Math.abs(v);
  }
  const v = parseFloat(clean);
  return isNaN(v) ? null : Math.abs(v);
}

function parseDateBR(raw: string): string | null {
  const m = raw.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  let year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
  if (year < 100) year += 2000;
  const d = new Date(year, parseInt(month) - 1, parseInt(day));
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Parsers por banco
// ---------------------------------------------------------------------------

type BankParser = (lines: string[]) => ParsedTransaction[];

interface BankDef {
  name: string;
  detect: (text: string) => boolean;
  parse: BankParser;
}

function genericLineParser(lines: string[], skipPattern: RegExp, account?: string): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  const re = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+([\d.,]+)\s*$/;
  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const date = parseDateBR(m[1]);
    const amount = parseAmountBR(m[3]);
    if (!date || !amount || amount <= 0 || amount > 999_999) continue;
    const desc = m[2].trim();
    if (skipPattern.test(desc)) continue;
    txs.push({ date, description: desc, amount, type: 'expense', account });
  }
  return txs;
}

const SKIP_DEFAULT = /pagamento|saldo anterior|total da fatura|vencimento|encargo|multa|juros/i;

const BANK_DEFS: BankDef[] = [
  {
    name: 'Nubank',
    detect: (t) => /nubank/i.test(t),
    parse: (lines) => {
      const txs: ParsedTransaction[] = [];
      const re = /(\d{2}\/\d{2})\s{1,}(.+?)\s{1,}R?\$?\s?([\d.,]+)\s*$/;
      for (const line of lines) {
        const m = line.match(re);
        if (!m) continue;
        const date = parseDateBR(m[1]);
        const amount = parseAmountBR(m[3]);
        if (!date || !amount || amount <= 0) continue;
        const desc = m[2].trim();
        if (/pagamento|payment|saldo/i.test(desc)) continue;
        txs.push({ date, description: desc, amount, type: 'expense', account: 'Nubank' });
      }
      return txs;
    },
  },
  {
    name: 'Itaú',
    detect: (t) => /ita[uú]/i.test(t),
    parse: (lines) => genericLineParser(lines, SKIP_DEFAULT, 'Itaú'),
  },
  {
    name: 'Bradesco',
    detect: (t) => /bradesco/i.test(t),
    parse: (lines) => genericLineParser(lines, SKIP_DEFAULT, 'Bradesco'),
  },
  {
    name: 'Santander',
    detect: (t) => /santander/i.test(t),
    parse: (lines) => genericLineParser(lines, SKIP_DEFAULT, 'Santander'),
  },
  {
    name: 'Inter',
    detect: (t) => /banco inter|\binter\b/i.test(t),
    parse: (lines) => genericLineParser(lines, SKIP_DEFAULT, 'Inter'),
  },
  {
    name: 'Genérico',
    detect: () => true,
    parse: (lines) => {
      const txs: ParsedTransaction[] = [];
      const re = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.{3,60}?)\s+([\d.,]{4,})\s*$/;
      for (const line of lines) {
        const m = line.match(re);
        if (!m) continue;
        const date = parseDateBR(m[1]);
        const amount = parseAmountBR(m[3]);
        if (!date || !amount || amount <= 0 || amount > 999_999) continue;
        const desc = m[2].trim();
        if (SKIP_DEFAULT.test(desc)) continue;
        txs.push({ date, description: desc, amount, type: 'expense' });
      }
      return txs;
    },
  },
];

// ---------------------------------------------------------------------------
// Carregamento dinâmico do PDF.js via CDN (sem import estático)
// ---------------------------------------------------------------------------

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

let _pdfjsPromise: Promise<any> | null = null;

function loadPdfJs(): Promise<any> {
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = import(/* @vite-ignore */ PDFJS_CDN).then((mod) => {
    const lib = mod.default ?? mod;
    if (!lib.GlobalWorkerOptions.workerSrc) {
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    }
    return lib;
  });
  return _pdfjsPromise;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    parts.push((content.items as any[]).map((item) => item.str).join(' '));
  }
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

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
    errors.push(
      'O PDF não contém texto extraível. Pode ser um PDF escaneado (imagem). '
      + 'Tente exportar o extrato em CSV pelo app do banco.',
    );
    return { transactions: [], detectedBank: 'Desconhecido', errors };
  }

  const bankDef = BANK_DEFS.find((b) => b.detect(rawText)) ?? BANK_DEFS[BANK_DEFS.length - 1];

  // Mês da fatura
  let invoiceMonth: string | undefined;
  const dmMatch = rawText.match(/vencimento[:\s]+\d{2}\/((\d{2})\/(\d{4}))/i)
    ?? rawText.match(/(\d{2})\/(\d{4})/i);
  if (dmMatch) {
    const dm = (dmMatch[1] ?? dmMatch[0]).match(/(\d{2})\/(\d{4})/);
    if (dm) invoiceMonth = `${dm[2]}-${dm[1]}`;
  }

  // Total da fatura
  let totalAmount: number | undefined;
  const totalMatch = rawText.match(/total\s+(?:da\s+)?fatura[:\s]+R?\$?\s?([\d.,]+)/i)
    ?? rawText.match(/valor\s+total[:\s]+R?\$?\s?([\d.,]+)/i);
  if (totalMatch) totalAmount = parseAmountBR(totalMatch[1]) ?? undefined;

  const lines = rawText
    .split(/\n|(?<=\d)\s{3,}(?=\d{2}\/\d{2})/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5);

  const transactions = bankDef.parse(lines);

  if (transactions.length === 0) {
    errors.push(
      'Nenhuma transação encontrada. O layout deste PDF pode não ser suportado. '
      + 'Tente exportar o extrato como CSV/Excel pelo app do banco.',
    );
  }

  return { transactions, detectedBank: bankDef.name, invoiceMonth, totalAmount, errors };
}
