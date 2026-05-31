/**
 * pdfInvoiceParser.ts
 * Parser client-side de faturas de cartão em PDF.
 * Carrega PDF.js via CDN em runtime — sem build-time deps.
 *
 * Estratégia posicional (Sicredi e similares):
 *   O PDF entrega texto em blocos com posições absolutas X/Y.
 *   Agrupamos itens por linha (Y ± tolerância) e ordenamos por X.
 *   Um gap > GAP_THRESHOLD px entre dois itens consecutivos
 *   é tratado como separador de coluna → inserimos '|'.
 *   Resultado: cada linha fica como
 *   "26/mai|22:16|Salvador|Presencial|Arezzo Regueira 09|01/04|R$ 99,99"
 */

import type { ParsedTransaction } from './spreadsheetParser';

export interface PdfParseResult {
  transactions: ParsedTransaction[];
  detectedBank: string;
  invoiceMonth?: string;
  totalAmount?: number;
  errors: string[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const GAP_THRESHOLD = 8;   // px: gap entre itens → separador de coluna
const LINE_MERGE_Y  = 3;   // px: diferença Y para considerar mesma linha

const MONTH_MAP: Record<string, string> = {
  jan:'01', fev:'02', mar:'03', abr:'04', mai:'05', jun:'06',
  jul:'07', ago:'08', set:'09', out:'10', nov:'11', dez:'12',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDateBR(raw: string): string | null {
  const s = raw.trim();
  const mExt = s.match(/^(\d{1,2})\/(\w{3})(?:\/(\d{2,4}))?$/);
  if (mExt) {
    const month = MONTH_MAP[mExt[2].toLowerCase()];
    if (!month) return null;
    let year = mExt[3] ? +mExt[3] : new Date().getFullYear();
    if (year < 100) year += 2000;
    return `${year}-${month}-${mExt[1].padStart(2,'0')}`;
  }
  const mNum = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (mNum) {
    let year = mNum[3] ? +mNum[3] : new Date().getFullYear();
    if (year < 100) year += 2000;
    return `${year}-${mNum[2].padStart(2,'0')}-${mNum[1].padStart(2,'0')}`;
  }
  return null;
}

function parseAmountBR(raw: string): number | null {
  const c = raw.replace(/[^\d,.-]/g, '');
  const v = c.includes(',') ? parseFloat(c.replace(/\./g,'').replace(',','.')) : parseFloat(c);
  return isNaN(v) ? null : Math.abs(v);
}

// ─── Extração posicional ──────────────────────────────────────────────────────

/** Extrai texto agrupando por linha (Y) e inserindo '|' em gaps de coluna */
async function extractTextPositional(file: File, lib: any): Promise<{ positional: string; raw: string }> {
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;

  const positionalPages: string[] = [];
  const rawPages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items   = content.items as any[];

    // Raw: join simples
    rawPages.push(items.map((x: any) => x.str).join(' '));

    // Posicional: agrupa por Y
    type Item = { x: number; x2: number; str: string };
    const byLine = new Map<number, Item[]>();

    for (const it of items) {
      if (!it.str?.trim()) continue;
      const tx = it.transform as number[]; // [a,b,c,d,e,f] — e=x, f=y
      if (!tx) continue;
      const x   = Math.round(tx[4]);
      const y   = Math.round(tx[5]);
      // Encontra linha existente próxima (±LINE_MERGE_Y)
      let lineKey = -1;
      for (const k of byLine.keys()) {
        if (Math.abs(k - y) <= LINE_MERGE_Y) { lineKey = k; break; }
      }
      if (lineKey === -1) { lineKey = y; byLine.set(y, []); }
      const w = it.width as number ?? (it.str.length * 5);
      byLine.get(lineKey)!.push({ x, x2: x + w, str: it.str });
    }

    // Ordena linhas do topo para baixo (Y maior = mais acima em PDFs)
    const sortedYs = [...byLine.keys()].sort((a, b) => b - a);
    const lineStrs: string[] = [];

    for (const yk of sortedYs) {
      const row = byLine.get(yk)!.sort((a, b) => a.x - b.x);
      let line = '';
      let prevX2 = -Infinity;
      for (const it of row) {
        if (prevX2 !== -Infinity && it.x - prevX2 > GAP_THRESHOLD) {
          line += '|';
        } else if (line) {
          line += ' ';
        }
        line += it.str;
        prevX2 = it.x2;
      }
      lineStrs.push(line.trim());
    }

    positionalPages.push(lineStrs.join('\n'));
  }

  return { positional: positionalPages.join('\n'), raw: rawPages.join('\n') };
}

// ─── Parser Sicredi ───────────────────────────────────────────────────────────
//
// Formato posicional de cada linha de transação:
//   DD/mmm | HH:MM | [cidade] | [Presencial|Online] | Descrição [| NN/NN] | R$ X,XX
//
// Linhas especiais:
//   Anuidade: "DD/mmm | HH:MM | Anuidade ... | R$ X,XX"
//   Pagamento: "DD/mmm | HH:MM | Pagamento ... | -R$ X,XX"  ← ignorar

function parseSicredi(lines: string[]): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  const year = new Date().getFullYear();

  // Regex para detectar linha de transação
  // Formato: DD/mmm ... (algum valor R$ no final)
  const DATE_RE = /^(\d{2}\/(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez))/i;
  const AMOUNT_RE = /(-?R\$\s*[\d.,]+)\s*$/i;
  const PARCEL_RE = /(\d{2}\/\d{2})$/;           // ex: 01/04
  const CITY_RE   = /^[A-ZÀ-Ú][a-zA-ZÀ-ú\s]+$/; // ex: "Salvador", "Sao Paulo"
  const MODE_RE   = /^(Presencial|Online)$/i;

  for (const line of lines) {
    if (!DATE_RE.test(line)) continue;
    if (!AMOUNT_RE.test(line)) continue;

    // Separa por '|' (separador de coluna inserido pelo extrator posicional)
    // Fallback: linha sem '|' (extração simples)
    const cols = line.includes('|')
      ? line.split('|').map(c => c.trim()).filter(Boolean)
      : [line];

    if (cols.length < 2) continue;

    const dateRaw = cols[0];   // "26/mai"
    // cols[1] pode ser hora ("22:16") ou já a descrição

    // Descobre onde começa a descrição (pula data, hora, cidade, modalidade)
    let descStart = 1;
    if (/^\d{2}:\d{2}$/.test(cols[1])) descStart = 2; // pula hora
    if (cols[descStart] && CITY_RE.test(cols[descStart]) && !AMOUNT_RE.test(cols[descStart])) descStart++;
    if (cols[descStart] && MODE_RE.test(cols[descStart])) descStart++;

    // Última coluna é o valor
    const lastCol = cols[cols.length - 1];
    const mVal = lastCol.match(AMOUNT_RE);
    if (!mVal) continue;

    // Verifica se é negativo (pagamento)
    const isNegative = mVal[1].trim().startsWith('-');

    // Penúltima coluna pode ser parcela (NN/NN)
    let descEnd = cols.length - 1;
    let parcela: string | undefined;
    if (descEnd > descStart && PARCEL_RE.test(cols[descEnd - 1])) {
      parcela = cols[descEnd - 1];
      descEnd--;
    }

    const descParts = cols.slice(descStart, descEnd);
    const desc = descParts.join(' ').replace(/\s{2,}/g, ' ').trim();

    if (!desc || desc.length < 2) continue;
    if (/^pagamento/i.test(desc)) continue; // ignorar pagamentos de fatura
    if (isNegative) continue;               // créditos/estornos: pular

    const date   = parseDateBR(`${dateRaw}/${year}`);
    const amount = parseAmountBR(mVal[1]);
    if (!date || !amount || amount <= 0) continue;

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

// ─── Parsers genéricos ────────────────────────────────────────────────────────

const SKIP = /^pagamento|^saldo anterior|^total|vencimento|encargo|multa|juros/i;

function genericParser(lines: string[], account?: string): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  const re = /(\d{2}\/(?:\d{2}|\w{3})(?:\/\d{2,4})?)\s+(.+?)\s+([\d.,]+)\s*$/;
  for (const l of lines) {
    const m = l.match(re);
    if (!m) continue;
    const date = parseDateBR(m[1]); const amount = parseAmountBR(m[3]);
    if (!date || !amount || amount <= 0 || amount > 999_999) continue;
    const desc = m[2].trim();
    if (SKIP.test(desc)) continue;
    txs.push({ date, description: desc, amount, type: 'expense', account });
  }
  return txs;
}

// ─── Registro de bancos ───────────────────────────────────────────────────────

const BANKS = [
  {
    name: 'Sicredi',
    detect: (t: string) => /sicredi/i.test(t),
    parse:  (lines: string[], _raw: string) => parseSicredi(lines),
    usePositional: true,
  },
  {
    name: 'Nubank',
    detect: (t: string) => /nubank/i.test(t),
    usePositional: false,
    parse: (lines: string[]) => {
      const txs: ParsedTransaction[] = [];
      for (const l of lines) {
        const m = l.match(/(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)\s*$/);
        if (!m) continue;
        const date = parseDateBR(m[1]); const amount = parseAmountBR(m[3]);
        if (!date || !amount || amount <= 0) continue;
        if (/pagamento|payment|saldo/i.test(m[2])) continue;
        txs.push({ date, description: m[2].trim(), amount, type: 'expense', account: 'Nubank' });
      }
      return txs;
    },
  },
  { name: 'Itaú',      detect: (t: string) => /ita[uú]/i.test(t),               usePositional: false, parse: (l: string[]) => genericParser(l, 'Itaú') },
  { name: 'Bradesco',  detect: (t: string) => /bradesco/i.test(t),               usePositional: false, parse: (l: string[]) => genericParser(l, 'Bradesco') },
  { name: 'Santander', detect: (t: string) => /santander/i.test(t),              usePositional: false, parse: (l: string[]) => genericParser(l, 'Santander') },
  { name: 'Inter',     detect: (t: string) => /banco inter|\binter\b/i.test(t), usePositional: false, parse: (l: string[]) => genericParser(l, 'Inter') },
  {
    name: 'Genérico',
    detect: () => true,
    usePositional: false,
    parse: (lines: string[]) => {
      const txs: ParsedTransaction[] = [];
      const re = /(\d{2}\/(?:\d{2}|\w{3})(?:\/\d{2,4})?)\s+(.{3,60}?)\s+([\d.,]{4,})\s*$/;
      for (const l of lines) {
        const m = l.match(re); if (!m) continue;
        const date = parseDateBR(m[1]); const amount = parseAmountBR(m[3]);
        if (!date || !amount || amount <= 0 || amount > 999_999) continue;
        const desc = m[2].trim(); if (SKIP.test(desc)) continue;
        txs.push({ date, description: desc, amount, type: 'expense' });
      }
      return txs;
    },
  },
];

// ─── PDF.js CDN ───────────────────────────────────────────────────────────────

const CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
let _lib: Promise<any> | null = null;

function loadPdfJs() {
  if (_lib) return _lib;
  _lib = import(/* @vite-ignore */ CDN).then(m => {
    const lib = m.default ?? m;
    if (!lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = WORKER;
    return lib;
  });
  return _lib;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function parsePdfInvoice(file: File): Promise<PdfParseResult> {
  const errors: string[] = [];

  let rawText = '';
  let positionalText = '';
  let lib: any;

  try {
    lib = await loadPdfJs();
    const extracted = await extractTextPositional(file, lib);
    rawText       = extracted.raw;
    positionalText = extracted.positional;
  } catch (err) {
    errors.push('Não foi possível ler o PDF: ' + (err as Error).message);
    return { transactions: [], detectedBank: 'Desconhecido', errors };
  }

  if (!rawText.trim()) {
    errors.push('PDF sem texto extraível (pode ser imagem escaneada).');
    return { transactions: [], detectedBank: 'Desconhecido', errors };
  }

  const bank = BANKS.find(b => b.detect(rawText)) ?? BANKS[BANKS.length - 1];

  // Mês da fatura
  let invoiceMonth: string | undefined;
  const mV = rawText.match(/vencimento\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (mV) invoiceMonth = `${mV[3]}-${mV[2]}`;
  else {
    const mF = rawText.match(/fatura de (\w+)/i);
    if (mF) {
      const mo = MONTH_MAP[mF[1].toLowerCase().slice(0, 3)];
      if (mo) invoiceMonth = `${new Date().getFullYear()}-${mo}`;
    }
  }

  // Total
  let totalAmount: number | undefined;
  const mT = rawText.match(/total\s+fatura\s+de\s+\w+\s+R\$\s?([\d.,]+)/i)
           ?? rawText.match(/total\s+(?:da\s+)?fatura[:\s]+R?\$?\s?([\d.,]+)/i);
  if (mT) totalAmount = parseAmountBR(mT[1]) ?? undefined;

  // Usa texto posicional para Sicredi, raw para os demais
  const text = bank.usePositional ? positionalText : rawText;
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 5);
  const transactions = (bank as any).parse(lines, rawText);

  if (transactions.length === 0) {
    errors.push(
      'Nenhuma transação encontrada. O layout deste PDF pode não ser suportado. '
      + 'Tente exportar o extrato como CSV/Excel pelo app do banco.',
    );
  }

  return { transactions, detectedBank: bank.name, invoiceMonth, totalAmount, errors };
}
