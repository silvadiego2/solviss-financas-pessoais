/**
 * ReceiptScanner v4
 *
 * Fixes nesta versão:
 * 1. OCR — valor extraído por proximidade de keywords (TOTAL, VALOR A PAGAR…)
 *    em vez de Math.max() que pegava CNPJ / subtotais.
 * 2. Tela de revisão — todos os campos são editáveis (Inputs + máscara BRL).
 * 3. QR Code iOS — isIOS() robusto para WKWebView/Capacitor; tryQrFromImage
 *    tenta a imagem em resolução ORIGINAL antes da compressão.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button }  from '@/components/ui/button';
import { Input }   from '@/components/ui/input';
import { Label }   from '@/components/ui/label';
import { toast }   from 'sonner';
import {
  Camera, QrCode, Upload, Loader2, Check,
  RefreshCw, X, ScanLine, ImagePlus, Pencil,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

// ─── tipos ───────────────────────────────────────────────────────────────────
export interface ScannedData {
  amount?:      number;
  description?: string;
  date?:        string;   // YYYY-MM-DD
  merchant?:    string;
  cnpj?:        string;
  thumbnail?:   File;
  source:       'qrcode' | 'ocr' | 'manual';
}

interface Props {
  onResult: (data: ScannedData) => void;
  onCancel: () => void;
}

// ─── detecta iOS / WKWebView (robusto para Capacitor) ────────────────────────
const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  // userAgent cobre Safari, Chrome iOS e WKWebView
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  // Capacitor expõe window.Capacitor
  if (typeof (window as any).Capacitor !== 'undefined') {
    const p = (window as any).Capacitor?.getPlatform?.();
    if (p === 'ios') return true;
  }
  // iPad modernos reportam MacIntel mas têm touch
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
};

// ─── máscara BRL ─────────────────────────────────────────────────────────────
const maskBRL = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return (parseInt(digits, 10) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseBRL = (v: string) => {
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

// ─── compressão Canvas ────────────────────────────────────────────────────────
async function compressImage(
  src: string,
  maxPx   = 1400,
  quality = 0.85,
): Promise<{ dataUrl: string; file: File }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale  = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('toBlob falhou')); return; }
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', quality),
            file: new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }),
          });
        },
        'image/jpeg', quality,
      );
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ─── parser URL NF-e SEFAZ ───────────────────────────────────────────────────
function parseNFeUrl(url: string): Partial<ScannedData> | null {
  try {
    const u = new URL(url);
    const p = u.searchParams;
    const chaveMatch = url.match(/\b(\d{44})\b/);
    const chave = chaveMatch?.[1];
    const cnpj = chave
      ? chave.slice(6, 20).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      : (p.get('cNPJ') ?? p.get('CNPJ') ?? undefined);
    const rawVal = p.get('nfv') ?? p.get('vNF') ?? p.get('vTotTrib') ?? p.get('valor') ?? null;
    const amount = rawVal ? parseFloat(rawVal.replace(',', '.')) : undefined;
    const dhRaw  = p.get('dhEmi') ?? p.get('dEmi') ?? p.get('dhCont') ?? null;
    let date: string | undefined;
    if (dhRaw) {
      const m = dhRaw.match(/(\d{4})-?(\d{2})-?(\d{2})/);
      if (m) date = `${m[1]}-${m[2]}-${m[3]}`;
    }
    const merchant = p.get('xFant') ?? p.get('xNome') ?? (cnpj ? `CNPJ ${cnpj}` : 'NF-e');
    if (!amount && !chave) return null;
    return { amount, date, merchant, cnpj, description: merchant ?? 'Nota Fiscal' };
  } catch { return null; }
}

// ─── OCR: extrai valor por keyword ───────────────────────────────────────────
// Busca linhas que contenham palavras de "total" e extrai o número mais próximo.
// Fallback para maior valor somente se nenhuma keyword for encontrada.
function extractByOcr(text: string): Partial<ScannedData> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Keywords de total em ordem de prioridade
  const TOTAL_KW = [
    /TOTAL\s*A\s*PAGAR/i,
    /VALOR\s*A\s*PAGAR/i,
    /TOTAL\s*GERAL/i,
    /TOTAL\s*LIQUIDO/i,
    /TOTAL\s*LIQ/i,
    /\bTOTAL\b/i,
    /VALOR\s*TOTAL/i,
    /\bTOTAL\s*DA\s*NOTA\b/i,
    /\bPAGAR\b/i,
  ];

  const parseVal = (s: string): number | null => {
    // pega a última ocorrência de valor monetário na string
    const matches = [...s.matchAll(/(\d{1,3}(?:[\.,]\d{3})*[\.,]\d{2})/g)];
    if (!matches.length) return null;
    const raw = matches[matches.length - 1][1];
    const v = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    return isNaN(v) || v <= 0 ? null : v;
  };

  let amount: number | undefined;

  // Tenta cada keyword — varre a linha e as 2 seguintes
  outer: for (const kw of TOTAL_KW) {
    for (let i = 0; i < lines.length; i++) {
      if (!kw.test(lines[i])) continue;
      // tenta extrair da mesma linha
      let v = parseVal(lines[i]);
      // se não achou, tenta nas 2 linhas seguintes
      if (!v && i + 1 < lines.length) v = parseVal(lines[i + 1]);
      if (!v && i + 2 < lines.length) v = parseVal(lines[i + 2]);
      if (v) { amount = v; break outer; }
    }
  }

  // Fallback: maior valor da nota (comportamento anterior)
  if (!amount) {
    const allAmounts = [...text.matchAll(/(\d{1,3}(?:[\.,]\d{3})*[\.,]\d{2})/g)]
      .map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')))
      .filter(n => !isNaN(n) && n > 0 && n < 100_000); // exclui CNPJ/chave
    if (allAmounts.length) amount = Math.max(...allAmounts);
  }

  // Data
  const dm = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  let date: string | undefined;
  if (dm) {
    const [, d, mo, y] = dm;
    const year = y.length === 2 ? '20' + y : y;
    date = `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Nome do estabelecimento: primeira linha não-numérica com 4–60 chars
  const merchant = lines.find(l => l.length >= 4 && l.length <= 60 && !/^[\d\s\W]+$/.test(l));

  return {
    amount,
    date,
    merchant,
    description: merchant || 'Transação escaneada',
    source: 'ocr',
  };
}

// ─── tenta ler QR de uma imagem (usa resolução original) ─────────────────────
async function tryQrFromImage(dataUrl: string): Promise<string | null> {
  try {
    const jsqr = (await import('jsqr')).default;
    const img  = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = dataUrl; });
    const canvas = document.createElement('canvas');
    // Usa resolução máxima para não perder módulos do QR
    const MAX = 2400;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    canvas.width  = Math.round(img.width  * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsqr(id.data, id.width, id.height, { inversionAttempts: 'attemptBoth' });
    return code?.data ?? null;
  } catch { return null; }
}

// ─── componente principal ─────────────────────────────────────────────────────
export const ReceiptScanner: React.FC<Props> = ({ onResult, onCancel }) => {
  type Mode = 'choose' | 'qr-live' | 'processing' | 'review';

  const [mode,      setMode]      = useState<Mode>('choose');
  const [preview,   setPreview]   = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Partial<ScannedData> | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [camError,  setCamError]  = useState<string | null>(null);
  const [ocrMode,   setOcrMode]   = useState(false);

  // campos editáveis na revisão
  const [editAmount,      setEditAmount]      = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate,        setEditDate]        = useState('');

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef     = useRef(false);
  const qrInputRef  = useRef<HTMLInputElement>(null);
  const photoRef    = useRef<HTMLInputElement>(null);
  const galleryRef  = useRef<HTMLInputElement>(null);

  const jsQRRef = useRef<any>(null);
  useEffect(() => { import('jsqr').then(m => { jsQRRef.current = m.default; }); }, []);

  const stopStream = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => () => stopStream(), [stopStream]);

  // preenche os campos editáveis quando extracted muda
  useEffect(() => {
    if (!extracted) return;
    setEditAmount(extracted.amount ? maskBRL(String(Math.round(extracted.amount * 100))) : '');
    setEditDescription(extracted.description ?? '');
    setEditDate(extracted.date ?? '');
  }, [extracted]);

  // ── OCR ──────────────────────────────────────────────────────────────────
  const runOcr = useCallback(async (dataUrl: string, qrFallback?: string) => {
    setOcrMode(true);
    setMode('processing');
    try {
      const { data: { text } } = await Tesseract.recognize(dataUrl, 'por', { logger: () => {} });
      const result = extractByOcr(text);
      if (qrFallback && !result.description) result.description = qrFallback.slice(0, 60);
      setExtracted({ ...result, source: 'ocr' });
      toast.success('Recibo processado! Confira e edite se necessário.');
    } catch {
      toast.error('Não foi possível ler o recibo automaticamente.');
      setExtracted({ source: 'ocr' });
    }
    setMode('review');
  }, []);

  // ── processa arquivo de imagem ────────────────────────────────────────────
  const handleImageFile = useCallback(async (file: File) => {
    setMode('processing');
    setOcrMode(false);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      try {
        // Tenta QR na resolução original ANTES de comprimir
        const qrText = await tryQrFromImage(src);
        const { dataUrl, file: compressed } = await compressImage(src, 1400, 0.85);
        setPreview(dataUrl);
        setThumbFile(compressed);

        if (qrText?.startsWith('http')) {
          const fromUrl = parseNFeUrl(qrText);
          if (fromUrl) {
            setExtracted({ ...fromUrl, source: 'qrcode' });
            toast.success('QR Code NF-e encontrado na imagem!');
            setMode('review');
            return;
          }
        }
        if (qrText) {
          toast.info('QR genérico detectado — rodando OCR...');
          await runOcr(dataUrl, qrText);
          return;
        }
        await runOcr(dataUrl);
      } catch {
        toast.error('Erro ao processar imagem.');
        setMode('choose');
      }
    };
    reader.readAsDataURL(file);
  }, [runOcr]);

  // ── QR detectado (câmera live) ────────────────────────────────────────────
  const handleQrDetected = useCallback(async (qrText: string, frameDataUrl: string) => {
    setMode('processing');
    toast.info('QR Code detectado!');
    const fromUrl = qrText.startsWith('http') ? parseNFeUrl(qrText) : null;
    const { dataUrl, file } = await compressImage(frameDataUrl, 900, 0.80);
    setPreview(dataUrl);
    setThumbFile(file);
    if (fromUrl) {
      setExtracted({ ...fromUrl, source: 'qrcode' });
      toast.success('Nota Fiscal lida com sucesso!');
      setMode('review');
    } else {
      await runOcr(dataUrl, qrText);
    }
  }, [runOcr]);

  // ── loop QR live (Android/Desktop) ───────────────────────────────────────
  const startQrLoop = useCallback(() => {
    doneRef.current = false;
    intervalRef.current = setInterval(async () => {
      if (doneRef.current) return;
      const video = videoRef.current, canvas = canvasRef.current, jsQR = jsQRRef.current;
      if (!video || !canvas || !jsQR) return;
      if (video.readyState < 2 || video.videoWidth === 0) return;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const id   = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(id.data, id.width, id.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data) {
        doneRef.current = true;
        stopStream();
        await handleQrDetected(code.data, canvas.toDataURL('image/jpeg', 0.80));
      }
    }, 200);
  }, [handleQrDetected, stopStream]);

  const startLiveQrCamera = async () => {
    setCamError(null);
    setMode('qr-live');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();
      }
      startQrLoop();
    } catch {
      setCamError('Câmera não autorizada. Use "Fotografar nota" como alternativa.');
      setMode('choose');
    }
  };

  const handleQrButton = () => {
    isIOS() ? qrInputRef.current?.click() : startLiveQrCamera();
  };

  // ── confirma dados (usa valores editados) ────────────────────────────────
  const handleConfirm = () => {
    onResult({
      amount:      parseBRL(editAmount) || undefined,
      description: editDescription || extracted?.description,
      date:        editDate        || extracted?.date,
      merchant:    extracted?.merchant,
      cnpj:        extracted?.cnpj,
      thumbnail:   thumbFile ?? undefined,
      source:      extracted?.source ?? 'manual',
    });
  };

  const reset = () => {
    stopStream(); doneRef.current = false;
    setMode('choose'); setPreview(null); setExtracted(null);
    setThumbFile(null); setCamError(null); setOcrMode(false);
    setEditAmount(''); setEditDescription(''); setEditDate('');
  };

  // ────────────────────────────── RENDER ──────────────────────────────────
  return (
    <div className="space-y-4">

      {/* inputs nativos */}
      <input ref={qrInputRef}  type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
      <input ref={photoRef}    type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
      <input ref={galleryRef}  type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />

      {/* ── Escolha de modo ──────────────────────────────────────────────── */}
      {mode === 'choose' && (
        <>
          {camError && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{camError}</p>}
          <div className="grid grid-cols-1 gap-3">

            <button type="button" onClick={handleQrButton}
              className="flex items-center gap-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <QrCode size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Ler QR Code da NF-e</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isIOS() ? 'Abre a câmera — aponte para o QR Code do cupom fiscal'
                           : 'Câmera ao vivo — centralize o QR Code'}
                </p>
              </div>
            </button>

            <button type="button" onClick={() => photoRef.current?.click()}
              className="flex items-center gap-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                <Camera size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Fotografar nota</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isIOS() ? 'iOS detecta e recorta o documento automaticamente'
                           : 'OCR extrai valor e data — imagem comprimida antes de salvar'}
                </p>
              </div>
            </button>

            <button type="button" onClick={() => galleryRef.current?.click()}
              className="flex items-center gap-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <ImagePlus size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Selecionar da galeria</p>
                <p className="text-xs text-muted-foreground mt-0.5">Foto já salva — OCR + detecção de QR automáticos</p>
              </div>
            </button>

            <button type="button" onClick={() => {
                const i = document.createElement('input');
                i.type = 'file'; i.accept = 'image/*,.pdf';
                i.onchange = () => { const f = i.files?.[0]; if (f) handleImageFile(f); };
                i.click();
              }}
              className="flex items-center gap-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                <Upload size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Importar arquivo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Imagem ou PDF já salvo no dispositivo</p>
              </div>
            </button>
          </div>

          <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="w-full text-muted-foreground">
            <X size={14} className="mr-1.5" /> Cancelar
          </Button>
        </>
      )}

      {/* ── QR live (Android/Desktop) ────────────────────────────────────── */}
      {mode === 'qr-live' && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 border-2 border-white/60 rounded-xl relative">
                <span className="absolute -top-px -left-px  w-7 h-7 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <span className="absolute -top-px -right-px w-7 h-7 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <span className="absolute -bottom-px -left-px  w-7 h-7 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <span className="absolute -bottom-px -right-px w-7 h-7 border-b-4 border-r-4 border-primary rounded-br-lg" />
                <ScanLine size={22} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 animate-pulse" />
              </div>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">Centralize o QR Code dentro da área marcada</p>
          <Button type="button" variant="outline" size="sm" onClick={() => { stopStream(); setMode('choose'); }} className="w-full">
            <X size={14} className="mr-1.5" /> Cancelar leitura
          </Button>
        </div>
      )}

      {/* ── Processando ──────────────────────────────────────────────────── */}
      {mode === 'processing' && (
        <div className="flex flex-col items-center gap-4 py-8">
          {preview && <img src={preview} alt="Recibo" className="max-h-40 rounded-xl border object-contain" />}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">{ocrMode ? 'Reconhecendo texto (OCR)...' : 'Verificando QR Code...'}</span>
          </div>
          <p className="text-xs text-muted-foreground">Aguarde alguns segundos</p>
        </div>
      )}

      {/* ── Revisão + edição ─────────────────────────────────────────────── */}
      {mode === 'review' && extracted && (
        <div className="space-y-4">
          {preview && <img src={preview} alt="Recibo" className="w-full max-h-40 rounded-xl border object-contain" />}

          <div className="flex items-center gap-2">
            <span className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full',
              extracted.source === 'qrcode'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
            )}>
              {extracted.source === 'qrcode' ? '✓ NF-e via QR Code' : '⚡ OCR — confira os dados'}
            </span>
            <Pencil size={12} className="text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Edite se necessário</span>
          </div>

          {/* campos editáveis */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                <Input
                  type="text" inputMode="numeric"
                  value={editAmount}
                  onChange={e => setEditAmount(maskBRL(e.target.value))}
                  placeholder="0,00"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descrição / Estabelecimento</Label>
              <Input
                type="text"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="Ex: Supermercado, Farmácia…"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
              />
            </div>

            {extracted.cnpj && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-xs text-muted-foreground">CNPJ</span>
                <span className="text-xs font-mono">{extracted.cnpj}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={reset} className="flex-1">
              <RefreshCw size={14} className="mr-1.5" /> Tentar novamente
            </Button>
            <Button type="button" onClick={handleConfirm} className="flex-1">
              <Check size={14} className="mr-1.5" /> Usar estes dados
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
