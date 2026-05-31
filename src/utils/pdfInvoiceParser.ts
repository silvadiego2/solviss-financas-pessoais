/**
 * pdfInvoiceParser.ts
 * Parser client-side de faturas de cartão de crédito em PDF.
 *
 * Carrega PDF.js 100% via CDN em runtime — sem import estático,
 * sem dependência no package.json, sem impacto no bundle.
 *
 * Bancos suportados: Sicredi, Nubank, Itaú, Bradesco, Santander, Inter, Genérico
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

const MONTH_MAP: Record<string, string> = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
};

/** Converte "26/mai" / "26/mai/2026" / "26/05/2026" em ISO date */
function parseDateBR(raw: string): string | null {
  const s = raw.trim();

  // Mês por extenso: DD/mmm ou DD/mmm/YYYY
  const mExt = s.match(/^(\d{1,2})\/(\w{3})(?:\/(\d{2,4}))?$/);
  if (mExt) {
    const month = MONTH_MAP[mExt[2].toLowerCase()];
    if (!month) return null;
    let year = mExt[3] ? parseInt(mExt[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, parseInt(month) - 1, parseInt(mExt[1]));
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }

  // Formato numérico: DD/MM ou DD/MM/YYYY
  const mNum = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (mNum) {
    let year = mNum[3] ? parseInt(mNum[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, parseInt(mNum[2]) - 1, parseInt(mNum[1]));
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }

  return null;
}

function parseAmountBR(raw: string): number | null {
  const clean = raw.trim().replace(/[^\d,.-]/g, '');
  if (clean.includes(',')) {
    const v = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : Math.abs(v);
  }
  const v = parseFloat(clean);
  return isNaN(v) ? null : Math.abs(v);
}

// ---------------------------------------------------------------------------
// Parser Sicredi
// ---------------------------------------------------------------------------
// O pdf.js extrai o texto das células da tabela colado sem separadores reais.
// Estratégia: dividir pelo padrão de início de linha (DD/mmm  HH:MM) e
// parsear cada segmento individualmente.

function parseSicrediRaw(rawText: string): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  const year = new Date().getFullYear();

  // Divide no início de cada transação: DD/mmm  HH:MM
  const DATE_SPLIT_RE = /(?=\d{2}\/(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+\d{2}:\d{2})/gi;
  const segments = rawText.split(DATE_SPLIT_RE).filter(s => s.trim().length > 5);

  for (const rawSeg of segments) {
    const seg = rawSeg.trim();

    // Extrai data e hora do início
    const mDate = seg.match(/^(\d{2}\/\w{3})\s+(\d{2}:\d{2})/);
    if (!mDate) continue;

    // Trunca em "Total cartão" para não capturar rodapé
    let rest = seg.slice(mDate[0].length).replace(/Total cart[a\u00e3]o.*/i, '').trim();

    // Extrai o valor no final: R$ X,XX ou -R$ X,XX
    const mVal = rest.match(/-?R\$\s*([\d.,]+)\s*$/);
    if (!mVal) continue;

    const amountStr = mVal[1];
    let middle = rest.slice(0, mVal.index).trim();

    // Remove cidade (palavras antes de Presencial/Online) + Presencial/Online
    // Funciona tanto com cidade ("Salvador     Presencial") quanto sem ("Presencial")
    middle = middle.replace(/^(?:[A-Za-z\u00c0-\u00ff\s]{2,20}?\s*)?(?:Presencial|Online)\s*/i, '').trim();

    // Remove parcela colada no final: NN/NN
    let parcela: string | undefined;
    const mParcela = middle.match(/\s*(\d{2}\/\d{2})\s*$/);
    if (mParcela) {
      parcela = mParcela[1];
      middle = middle.slice(0, mParcela.index).trim();
    }

    const desc = middle.replace(/\s{2,}/g, ' ').trim();
    if (!desc) continue;

    const date = parseDateBR(`${mDate[1]}/${year}`);
    const amount = parseAmountBR(amountStr);

    if (!date || !amount || amount <= 0) continue;
    if (/^pagamento/i.test(desc)) continue;

    txs.push({
      date,
      description: desc,
      amount,
      type: 'expense',
      account: 'Sicredi',
      notes: parcela ? `Parcela ${parcela}` : undefined,
    });
  }

  return txs;
}

// ---------------------------------------------------------------------------
// Parsers genéricos (linha a linha)
// ---------------------------------------------------------------------------

const SKIP_DEFAULT = /^pagamento|^saldo anterior|^total|vencimento|encargo|multa|juros/i;

function genericLineParser(lines: string[], account?: string): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  const re = /(\d{2}\/(?:\d{2}|\w{3})(?:\/\d{2,4})?)\s+(.+?)\s+([\d.,]+)\s*$/;
  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const date = parseDateBR(m[1]);
    const amount = parseAmountBR(m[3]);
    if (!date || !amount || amount <= 0 || amount > 999_999) continue;
    const desc = m[2].trim();
    if (SKIP_DEFAULT.test(desc)) continue;
    txs.push({ date, description: desc, amount, type: 'expense', account });
  }
  return txs;
}

// ---------------------------------------------------------------------------
// Lista de bancos
// ---------------------------------------------------------------------------

interface BankDef {
  name: string;
  detect: (text: string) => boolean;
  parse: (lines: string[], rawText: string) => ParsedTransaction[];
}

const BANK_DEFS: BankDef[] = [
  {
    name: 'Sicredi',
    detect: (t) => /sicredi/i.test(t),
    parse: (_lines, rawText) => parseSicrediRaw(rawText),
  },
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
    parse: (lines) => genericLineParser(lines, 'Itaú'),
  },
  {
    name: 'Bradesco',
    detect: (t) => /bradesco/i.test(t),
    parse: (lines) => genericLineParser(lines, 'Bradesco'),
  },
  {
    name: 'Santander',
    detect: (t) => /santander/i.test(t),
    parse: (lines) => genericLineParser(lines, 'Santander'),
  },
  {
    name: 'Inter',
    detect: (t) => /banco inter|\binter\b/i.test(t),
    parse: (lines) => genericLineParser(lines, 'Inter'),
  },
  {
    name: 'Genérico',
    detect: () => true,
    parse: (lines) => {
      const txs: ParsedTransaction[] = [];
      const re = /(\d{2}\/(?:\d{2}|\w{3})(?:\/\d{2,4})?)\s+(.{3,60}?)\s+([\d.,]{4,})\s*$/;
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

const PDFJS_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
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
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    parts.push((content.items as any[]).map((item: any) => item.str).join(' '));
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
  const mVenc = rawText.match(/vencimento\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (mVenc) {
    invoiceMonth = `${mVenc[3]}-${mVenc[2]}`;
  } else {
    const mFat = rawText.match(/fatura de (\w+)/i);
    if (mFat) {
      const mo = MONTH_MAP[mFat[1].toLowerCase().slice(0, 3)];
      if (mo) invoiceMonth = `${new Date().getFullYear()}-${mo}`;
    }
  }

  // Total da fatura
  let totalAmount: number | undefined;
  const mTotal = rawText.match(/total\s+fatura\s+de\s+\w+\s+R\$\s?([\d.,]+)/i)
    ?? rawText.match(/total\s+(?:da\s+)?fatura[:\s]+R?\$?\s?([\d.,]+)/i)
    ?? rawText.match(/valor\s+total[:\s]+R?\$?\s?([\d.,]+)/i);
  if (mTotal) totalAmount = parseAmountBR(mTotal[1]) ?? undefined;

  const lines = rawText.split(/\n/).map(l => l.trim()).filter(l => l.length > 5);

  const transactions = bankDef.parse(lines, rawText);

  if (transactions.length === 0) {
    errors.push(
      'Nenhuma transação encontrada. O layout deste PDF pode não ser suportado. '
      + 'Tente exportar o extrato como CSV/Excel pelo app do banco.',
    );
  }

  return { transactions, detectedBank: bankDef.name, invoiceMonth, totalAmount, errors };
}
