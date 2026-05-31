/**
 * pdfInvoiceParser.ts
 * Parser client-side de faturas de cartão de crédito em PDF.
 *
 * Carrega PDF.js 100% via CDN em runtime — sem import estático.
 * Bancos suportados: Sicredi, Nubank, Itaú, Bradesco, Santander, Inter, Genérico
 */

import type { ParsedTransaction } from './spreadsheetParser';

export interface PdfParseResult {
  transactions: ParsedTransaction[];
  detectedBank: string;
  invoiceMonth?: string;
  totalAmount?: number;
  errors: string[];
  _debugRawText?: string; // removido em produção
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_MAP: Record<string, string> = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
};

function parseDateBR(raw: string): string | null {
  const s = raw.trim();
  const mExt = s.match(/^(\d{1,2})\/(\w{3})(?:\/(\d{2,4}))?$/);
  if (mExt) {
    const month = MONTH_MAP[mExt[2].toLowerCase()];
    if (!month) return null;
    let year = mExt[3] ? parseInt(mExt[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, parseInt(month) - 1, parseInt(mExt[1]));
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
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
// Extrai texto do PDF preservando estrutura por item
// ---------------------------------------------------------------------------
// Em vez de juntar tudo com ' ', preservamos a posição X de cada item
// para reconstruir as linhas corretamente.

async function extractTextFromPdf(file: File): Promise<{ raw: string; byLine: string[] }> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const allLines: string[] = [];
  let rawParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as any[];

    // Agrupa por linha usando a coordenada Y (arredondada a 2 casas)
    const lineMap = new Map<number, string[]>();
    for (const item of items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5] * 10) / 10;
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push(item.str);
    }

    // Ordena por Y decrescente (topo da página primeiro)
    const sorted = [...lineMap.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, words] of sorted) {
      const line = words.join(' ').trim();
      if (line) allLines.push(line);
    }

    rawParts.push(items.map((it: any) => it.str).join(' '));
  }

  return { raw: rawParts.join('\n'), byLine: allLines };
}

// ---------------------------------------------------------------------------
// Parser Sicredi
// ---------------------------------------------------------------------------

function parseSicredi(lines: string[]): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  const year = new Date().getFullYear();

  // Cada linha do Sicredi (após agrupar por Y) pode ser:
  // Opção A (linha completa com tudo):  "26/mai 22:16 Salvador Presencial Arezzo Regueira 09 01/04 R$ 99,99"
  // Opção B (células separadas em linhas distintas): data/hora numa linha, descrição em outra, valor em outra
  //
  // Tentamos primeiro processar como texto bruto concatenado (split por data)
  const fullText = lines.join(' ');
  const DATE_SPLIT_RE = /(?=\d{2}\/(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+\d{2}:\d{2})/gi;
  const segments = fullText.split(DATE_SPLIT_RE).filter(s => s.trim().length > 5);

  if (segments.length > 1) {
    // Modo A: texto concatenado com datas legíveis
    for (const rawSeg of segments) {
      const seg = rawSeg.trim();
      const mDate = seg.match(/^(\d{2}\/\w{3})\s+(\d{2}:\d{2})/);
      if (!mDate) continue;

      // Trunca em rodapés conhecidos
      let rest = seg.slice(mDate[0].length)
        .replace(/Total cart[a\u00e3]o.*/i, '')
        .replace(/Legenda:.*/i, '')
        .trim();

      const mVal = rest.match(/-?R\$\s*([\d.,]+)\s*$/);
      if (!mVal) continue;

      let middle = rest.slice(0, mVal.index).trim();
      // Remove cidade (opcional) + Presencial/Online
      middle = middle.replace(/^(?:[A-Za-z\u00c0-\u00ff\s]{1,25}?\s*)?(?:Presencial|Online)\s*/i, '').trim();

      let parcela: string | undefined;
      const mParcela = middle.match(/\s*(\d{2}\/\d{2})\s*$/);
      if (mParcela) {
        parcela = mParcela[1];
        middle = middle.slice(0, mParcela.index).trim();
      }

      const desc = middle.replace(/\s{2,}/g, ' ').trim();
      if (!desc) continue;

      const date = parseDateBR(`${mDate[1]}/${year}`);
      const amount = parseAmountBR(mVal[1]);
      if (!date || !amount || amount <= 0) continue;
      if (/^pagamento/i.test(desc)) continue;

      txs.push({
        date, description: desc, amount, type: 'expense', account: 'Sicredi',
        notes: parcela ? `Parcela ${parcela}` : undefined,
      });
    }
  }

  // Modo B: tenta linha a linha com data no início
  if (txs.length === 0) {
    // Cada linha no formato: "DD/mmm HH:MM [cidade] [Presencial|Online] descrição [parcela] R$ valor"
    const reRow = /^(\d{2}\/\w{3})\s+\d{2}:\d{2}\s+(?:.{0,20}?(?:Presencial|Online)\s*)?(.+?)\s*(\d{2}\/\d{2})?\s*R\$\s*([\d.,]+)/i;
    for (const line of lines) {
      const m = line.match(reRow);
      if (!m) continue;
      const date = parseDateBR(`${m[1]}/${year}`);
      const amount = parseAmountBR(m[4]);
      if (!date || !amount || amount <= 0) continue;
      const desc = m[2].trim();
      if (/^pagamento/i.test(desc)) continue;
      txs.push({
        date, description: desc, amount, type: 'expense', account: 'Sicredi',
        notes: m[3] ? `Parcela ${m[3]}` : undefined,
      });
    }
  }

  return txs;
}

// ---------------------------------------------------------------------------
// Parsers genéricos
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
// Bancos
// ---------------------------------------------------------------------------

interface BankDef {
  name: string;
  detect: (text: string) => boolean;
  parse: (lines: string[], raw: string) => ParsedTransaction[];
}

const BANK_DEFS: BankDef[] = [
  { name: 'Sicredi',  detect: t => /sicredi/i.test(t),         parse: (lines) => parseSicredi(lines) },
  {
    name: 'Nubank',   detect: t => /nubank/i.test(t),
    parse: (lines) => {
      const txs: ParsedTransaction[] = [];
      const re = /(\d{2}\/\d{2})\s{1,}(.+?)\s{1,}R?\$?\s?([\d.,]+)\s*$/;
      for (const line of lines) {
        const m = line.match(re);
        if (!m) continue;
        const date = parseDateBR(m[1]); const amount = parseAmountBR(m[3]);
        if (!date || !amount || amount <= 0) continue;
        const desc = m[2].trim();
        if (/pagamento|payment|saldo/i.test(desc)) continue;
        txs.push({ date, description: desc, amount, type: 'expense', account: 'Nubank' });
      }
      return txs;
    },
  },
  { name: 'Itaú',      detect: t => /ita[uú]/i.test(t),         parse: (lines) => genericLineParser(lines, 'Itaú') },
  { name: 'Bradesco',  detect: t => /bradesco/i.test(t),         parse: (lines) => genericLineParser(lines, 'Bradesco') },
  { name: 'Santander', detect: t => /santander/i.test(t),        parse: (lines) => genericLineParser(lines, 'Santander') },
  { name: 'Inter',     detect: t => /banco inter|\binter\b/i.test(t), parse: (lines) => genericLineParser(lines, 'Inter') },
  {
    name: 'Genérico',  detect: () => true,
    parse: (lines) => {
      const txs: ParsedTransaction[] = [];
      const re = /(\d{2}\/(?:\d{2}|\w{3})(?:\/\d{2,4})?)\s+(.{3,60}?)\s+([\d.,]{4,})\s*$/;
      for (const line of lines) {
        const m = line.match(re);
        if (!m) continue;
        const date = parseDateBR(m[1]); const amount = parseAmountBR(m[3]);
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
// PDF.js via CDN
// ---------------------------------------------------------------------------

const PDFJS_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
let _pdfjsPromise: Promise<any> | null = null;

function loadPdfJs(): Promise<any> {
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = import(/* @vite-ignore */ PDFJS_CDN).then(mod => {
    const lib = mod.default ?? mod;
    if (!lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return lib;
  });
  return _pdfjsPromise;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export async function parsePdfInvoice(file: File): Promise<PdfParseResult> {
  const errors: string[] = [];

  let rawText = '';
  let byLine: string[] = [];

  try {
    const result = await extractTextFromPdf(file);
    rawText = result.raw;
    byLine  = result.byLine;
  } catch (err) {
    errors.push('Não foi possível ler o PDF: ' + (err as Error).message);
    return { transactions: [], detectedBank: 'Desconhecido', errors };
  }

  // LOG DE DEBUG — ver no console do navegador
  console.group('[PDF Parser] Texto extraído');
  console.log('=== RAW (items unidos por espaço) ===');
  console.log(rawText.slice(0, 3000));
  console.log('=== BY LINE (agrupado por Y) ===');
  byLine.slice(0, 60).forEach((l, i) => console.log(`${i}: ${l}`));
  console.groupEnd();

  if (!rawText.trim() && byLine.length === 0) {
    errors.push('O PDF não contém texto extraível. Pode ser um PDF escaneado (imagem).');
    return { transactions: [], detectedBank: 'Desconhecido', errors };
  }

  const detectText = rawText + ' ' + byLine.join(' ');
  const bankDef = BANK_DEFS.find(b => b.detect(detectText)) ?? BANK_DEFS[BANK_DEFS.length - 1];

  // Mês da fatura
  let invoiceMonth: string | undefined;
  const mVenc = detectText.match(/vencimento\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (mVenc) {
    invoiceMonth = `${mVenc[3]}-${mVenc[2]}`;
  } else {
    const mFat = detectText.match(/fatura de (\w+)/i);
    if (mFat) {
      const mo = MONTH_MAP[mFat[1].toLowerCase().slice(0, 3)];
      if (mo) invoiceMonth = `${new Date().getFullYear()}-${mo}`;
    }
  }

  // Total
  let totalAmount: number | undefined;
  const mTotal = detectText.match(/total\s+fatura\s+de\s+\w+\s+R\$\s?([\d.,]+)/i)
    ?? detectText.match(/total\s+(?:da\s+)?fatura[:\s]+R?\$?\s?([\d.,]+)/i);
  if (mTotal) totalAmount = parseAmountBR(mTotal[1]) ?? undefined;

  const transactions = bankDef.parse(byLine, rawText);

  if (transactions.length === 0) {
    errors.push(
      'Nenhuma transação encontrada. Abra o console do navegador (F12) e procure '
      + '"[PDF Parser]" para ver o texto bruto extraído e reportar ao suporte.',
    );
  }

  return { transactions, detectedBank: bankDef.name, invoiceMonth, totalAmount, errors, _debugRawText: rawText.slice(0, 500) };
}
