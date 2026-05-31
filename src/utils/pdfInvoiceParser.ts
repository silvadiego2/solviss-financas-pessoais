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

/** Converte "26/mai" ou "26/mai/2026" ou "26/05/2026" em ISO date */
function parseDateBR(raw: string): string | null {
  const rawClean = raw.trim();

  // Formato com mês por extenso: DD/mmm ou DD/mmm/YYYY
  const mExt = rawClean.match(/^(\d{1,2})\/(\w{3})(?:\/(\d{2,4}))?$/);
  if (mExt) {
    const day   = mExt[1].padStart(2, '0');
    const month = MONTH_MAP[mExt[2].toLowerCase()];
    if (!month) return null;
    let year = mExt[3] ? parseInt(mExt[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, parseInt(month) - 1, parseInt(day));
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  // Formato numérico: DD/MM/YYYY ou DD/MM/YY ou DD/MM
  const mNum = rawClean.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (mNum) {
    const day   = mNum[1].padStart(2, '0');
    const month = mNum[2].padStart(2, '0');
    let year = mNum[3] ? parseInt(mNum[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, parseInt(month) - 1, parseInt(day));
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
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
// Parsers por banco
// ---------------------------------------------------------------------------

type BankParser = (lines: string[]) => ParsedTransaction[];

interface BankDef {
  name: string;
  detect: (text: string) => boolean;
  parse: BankParser;
  // Se true, o texto bruto é passado como uma única string (sem split em linhas)
  rawMode?: boolean;
}

const SKIP_DEFAULT = /^pagamento|^saldo anterior|^total|vencimento|encargo|multa|juros/i;

// ---------------------------------------------------------------------------
// Sicredi
// ---------------------------------------------------------------------------
// Texto extraído pelo pdf.js do Sicredi vem concatenado, sem quebras reais entre
// transações. Exemplo:
//   "26/mai  22:16Anuidade Diferenc 01/12 4115                 R$ 20,00"
//   "09/mai  13:00Salvador     PresencialArezzo Regueira 09                      01/04R$ 99,99"
//
// Estratégia: dividir o texto bruto usando como separador a data DD/mmm seguida
// de HH:MM, depois parsear cada segmento.

function parseSicrediRaw(rawText: string): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  const year = new Date().getFullYear();

  // Divide nos pontos onde começa uma nova data: DD/mmm  HH:MM
  // Ex: "26/mai  22:16"  "09/mai  13:00"
  const DATE_SPLIT_RE = /(?=\d{2}\/(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+\d{2}:\d{2})/gi;
  const segments = rawText.split(DATE_SPLIT_RE).filter(s => s.trim().length > 5);

  for (const seg of segments) {
    // Captura: DD/mmm  HH:MM  [Cidade]  [Presencial|Online]  Descrição  [Parcela]  R$ valor
    //
    // Regex flexível: pós data+hora vem "cidade" opcional, depois "presencial/online" opcional,
    // depois descrição (qualquer coisa), depois opcional parcela NN/NN, depois R$ valor
    const m = seg.match(
      /^(\d{2}\/\w{3})\s+(\d{2}:\d{2})\s*(?:[A-Za-zÀ-ÿ\s]{2,20}?\s*)?(?:Presencial|Online)?\s*(.+?)\s*(\d{2}\/\d{2})?\s*(?:-?R\$\s?([\d.,]+))\s*$/i
    );
    if (!m) continue;

    const dateStr = m[1];          // "26/mai"
    const descRaw = m[3].trim();   // descrição
    const amountStr = m[5];        // "20,00"

    const date = parseDateBR(dateStr + '/' + year);
    if (!date) continue;

    const amount = parseAmountBR(amountStr);
    if (!amount || amount <= 0) continue;

    // Ignora pagamentos e anuidades? Não — anuidade é uma despesa válida
    // Ignora apenas pagamentos (crédito negativo)
    if (/^pagamento/i.test(descRaw)) continue;

    // Limpar descrição: remover sufixo de parcela se ficou colado
    const desc = descRaw.replace(/\s+\d{2}\/\d{2}\s*$/, '').trim();

    txs.push({
      date,
      description: desc,
      amount,
      type: 'expense',
      account: 'Sicredi',
      notes: m[4] ? `Parcela ${m[4]}` : undefined,
    });
  }

  return txs;
}

// ---------------------------------------------------------------------------
// Fallback genérico para outros bancos (linha a linha)
// ---------------------------------------------------------------------------

function genericLineParser(lines: string[], account?: string): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  // Aceita data numérica OU mês por extenso
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

const BANK_DEFS: BankDef[] = [
  {
    name: 'Sicredi',
    detect: (t) => /sicredi/i.test(t),
    rawMode: true,
    parse: (lines) => parseSicrediRaw(lines.join(' ')),
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
    // Fallback genérico
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
  const dmMatch = rawText.match(/vencimento\s+(\d{2})\/(\d{2})\/(\d{4})/i)
    ?? rawText.match(/fatura de (\w+)/i);
  if (dmMatch) {
    if (dmMatch[3]) {
      // DD/MM/YYYY
      invoiceMonth = `${dmMatch[3]}-${dmMatch[2]}`;
    } else if (dmMatch[1]) {
      // "fatura de junho" etc
      const mo = MONTH_MAP[dmMatch[1].toLowerCase().slice(0, 3)];
      if (mo) invoiceMonth = `${new Date().getFullYear()}-${mo}`;
    }
  }

  // Total da fatura
  let totalAmount: number | undefined;
  const totalMatch = rawText.match(/total\s+fatura\s+de\s+\w+\s+R\$\s?([\d.,]+)/i)
    ?? rawText.match(/total\s+(?:da\s+)?fatura[:\s]+R?\$?\s?([\d.,]+)/i)
    ?? rawText.match(/valor\s+total[:\s]+R?\$?\s?([\d.,]+)/i);
  if (totalMatch) totalAmount = parseAmountBR(totalMatch[1]) ?? undefined;

  // Linhas para parsers não-raw
  const lines = rawText
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5);

  const transactions = bankDef.rawMode
    ? bankDef.parse(lines) // parseSicrediRaw une as linhas internamente
    : bankDef.parse(lines);

  if (transactions.length === 0) {
    errors.push(
      'Nenhuma transação encontrada. O layout deste PDF pode não ser suportado. '
      + 'Tente exportar o extrato como CSV/Excel pelo app do banco.',
    );
  }

  return { transactions, detectedBank: bankDef.name, invoiceMonth, totalAmount, errors };
}
