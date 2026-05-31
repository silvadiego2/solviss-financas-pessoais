/**
 * pdfInvoiceParser.ts
 * Parser client-side de faturas de cartão em PDF.
 * Carrega PDF.js via CDN em runtime — sem build-time deps.
 */

import type { ParsedTransaction } from './spreadsheetParser';

export interface PdfParseResult {
  transactions: ParsedTransaction[];
  detectedBank: string;
  invoiceMonth?: string;
  totalAmount?: number;
  errors: string[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan:'01', fev:'02', mar:'03', abr:'04', mai:'05', jun:'06',
  jul:'07', ago:'08', set:'09', out:'10', nov:'11', dez:'12',
};

function parseDateBR(raw: string): string | null {
  const s = raw.trim();
  // DD/mmm ou DD/mmm/YYYY
  const mExt = s.match(/^(\d{1,2})\/(\w{3})(?:\/(\d{2,4}))?$/);
  if (mExt) {
    const month = MONTH_MAP[mExt[2].toLowerCase()];
    if (!month) return null;
    let year = mExt[3] ? +mExt[3] : new Date().getFullYear();
    if (year < 100) year += 2000;
    return `${year}-${month}-${mExt[1].padStart(2,'0')}`;
  }
  // DD/MM ou DD/MM/YYYY
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

// ─── Sicredi ──────────────────────────────────────────────────────────────────
// O pdf.js entrega uma string contínua sem quebras. Exemplo real:
// "26/mai  22:16Anuidade Diferenc 01/12 4115                 R$ 20,00
//  09/mai  13:00Salvador     PresencialArezzo Regueira 09   01/04R$ 99,99"

function parseSicredi(text: string): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  const year = new Date().getFullYear();

  // Divide no início de cada registro: DD/mmm (1+ espaços) HH:MM
  const segments = text
    .split(/(?=\d{2}\/(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+\d{2}:\d{2})/gi)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  for (const seg of segments) {
    // 1. Extrai data
    const mDate = seg.match(/^(\d{2}\/\w{3})\s+\d{2}:\d{2}/);
    if (!mDate) continue;

    // 2. Trunca em rodapés
    let rest = seg
      .slice(mDate[0].length)
      .replace(/Total cart[a\u00e3]o.*/i, '')
      .replace(/Legenda:.*/i, '')
      .trim();

    // 3. Valor no final: R$ X,XX ou -R$ X,XX
    const mVal = rest.match(/-?R\$\s*([\d.,]+)\s*$/);
    if (!mVal) continue;

    let middle = rest.slice(0, mVal.index).trim();

    // 4. Remove [cidade opcional][\s][Presencial|Online]
    //    "Salvador     Presencial" → remover tudo até e incluindo Presencial/Online
    //    "Presencial" ou "Online" direto → também remover
    middle = middle.replace(
      /^(?:[A-Za-z\u00c0-\u00ff][A-Za-z\u00c0-\u00ff\s]{0,22}?\s+)?(?:Presencial|Online)\s*/i, ''
    ).trim();

    // 5. Parcela no final: NN/NN
    let parcela: string | undefined;
    const mP = middle.match(/\s*(\d{2}\/\d{2})\s*$/);
    if (mP) { parcela = mP[1]; middle = middle.slice(0, mP.index).trim(); }

    const desc = middle.replace(/\s{2,}/g, ' ').trim();
    if (!desc || desc.length < 2) continue;

    const date   = parseDateBR(`${mDate[1]}/${year}`);
    const amount = parseAmountBR(mVal[1]);
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

// ─── genéricos ────────────────────────────────────────────────────────────────

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

// ─── bancos ───────────────────────────────────────────────────────────────────

const BANKS = [
  { name:'Sicredi',   detect:(t:string)=>/sicredi/i.test(t),                parse:(l:string[],r:string)=>parseSicredi(r) },
  {
    name:'Nubank',    detect:(t:string)=>/nubank/i.test(t),
    parse:(lines:string[])=>{
      const txs:ParsedTransaction[]=[];
      for(const l of lines){
        const m=l.match(/(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)\s*$/);
        if(!m)continue;
        const date=parseDateBR(m[1]);const amount=parseAmountBR(m[3]);
        if(!date||!amount||amount<=0)continue;
        if(/pagamento|payment|saldo/i.test(m[2]))continue;
        txs.push({date,description:m[2].trim(),amount,type:'expense',account:'Nubank'});
      }
      return txs;
    },
  },
  { name:'Itaú',      detect:(t:string)=>/ita[uú]/i.test(t),               parse:(l:string[])=>genericParser(l,'Itaú') },
  { name:'Bradesco',  detect:(t:string)=>/bradesco/i.test(t),               parse:(l:string[])=>genericParser(l,'Bradesco') },
  { name:'Santander', detect:(t:string)=>/santander/i.test(t),              parse:(l:string[])=>genericParser(l,'Santander') },
  { name:'Inter',     detect:(t:string)=>/banco inter|\binter\b/i.test(t), parse:(l:string[])=>genericParser(l,'Inter') },
  {
    name:'Genérico',  detect:()=>true,
    parse:(lines:string[])=>{
      const txs:ParsedTransaction[]=[];
      const re=/(\d{2}\/(?:\d{2}|\w{3})(?:\/\d{2,4})?)\s+(.{3,60}?)\s+([\d.,]{4,})\s*$/;
      for(const l of lines){
        const m=l.match(re);if(!m)continue;
        const date=parseDateBR(m[1]);const amount=parseAmountBR(m[3]);
        if(!date||!amount||amount<=0||amount>999_999)continue;
        const desc=m[2].trim();if(SKIP.test(desc))continue;
        txs.push({date,description:desc,amount,type:'expense'});
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

async function extractText(file: File): Promise<string> {
  const lib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Une todos os items com espaço simples (como o browser faz)
    pages.push((content.items as any[]).map((x: any) => x.str).join(' '));
  }
  return pages.join('\n');
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function parsePdfInvoice(file: File): Promise<PdfParseResult> {
  const errors: string[] = [];
  let rawText = '';

  try {
    rawText = await extractText(file);
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
    if (mF) { const mo = MONTH_MAP[mF[1].toLowerCase().slice(0,3)]; if (mo) invoiceMonth = `${new Date().getFullYear()}-${mo}`; }
  }

  // Total
  let totalAmount: number | undefined;
  const mT = rawText.match(/total\s+fatura\s+de\s+\w+\s+R\$\s?([\d.,]+)/i)
           ?? rawText.match(/total\s+(?:da\s+)?fatura[:\s]+R?\$?\s?([\d.,]+)/i);
  if (mT) totalAmount = parseAmountBR(mT[1]) ?? undefined;

  const lines = rawText.split(/\n/).map(l => l.trim()).filter(l => l.length > 5);
  const transactions = (bank as any).parse(lines, rawText);

  if (transactions.length === 0) {
    errors.push(
      'Nenhuma transação encontrada. O layout deste PDF pode não ser suportado. '
      + 'Tente exportar o extrato como CSV/Excel pelo app do banco.',
    );
  }

  return { transactions, detectedBank: bank.name, invoiceMonth, totalAmount, errors };
}
