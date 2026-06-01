/**
 * ReceiptScanner — scanner inteligente de notas fiscais
 *
 * Modos de operação:
 *  1. QR Code ao vivo  — getUserMedia + jsQR, lê QR NF-e em tempo real
 *  2. Foto / câmera    — input capture, comprime via Canvas antes de salvar
 *  3. Upload galeria   — mesmo pipeline de compressão
 *  4. OCR fallback     — Tesseract.js quando não há QR Code detectável
 *
 * Compressão: toda imagem é reduzida para ≤ 900px e JPEG 72% (~80KB)
 * NF-e: decodifica URL da SEFAZ e extrai nfv (valor), dhEmi (data), emit (CNPJ/nome)
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Camera, QrCode, Upload, Loader2, Check,
  RefreshCw, X, ScanLine, ImagePlus,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

// ─── tipos ────────────────────────────────────────────────────────────────────
export interface ScannedData {
  amount?:      number;
  description?: string;
  date?:        string;    // YYYY-MM-DD
  merchant?:    string;
  cnpj?:        string;
  thumbnail?:   File;      // imagem comprimida (≤ ~100KB)
  source:       'qrcode' | 'ocr' | 'manual';
}

interface Props {
  onResult: (data: ScannedData) => void;
  onCancel: () => void;
}

// ─── compressão Canvas ────────────────────────────────────────────────────────
async function compressImage(
  src: string,
  maxPx  = 900,
  quality = 0.72,
): Promise<{ dataUrl: string; file: File }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale  = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w      = Math.round(img.width  * scale);
      const h      = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('canvas toBlob falhou')); return; }
          const file    = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({ dataUrl, file });
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ─── parser URL NF-e SEFAZ ───────────────────────────────────────────────────
function parseNFeUrl(url: string): Partial<ScannedData> | null {
  try {
    // Ex: https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chNFe=...&nfv=123.45&dhEmi=20260601...
    const u      = new URL(url);
    const params = u.searchParams;

    // valor total
    const nfv    = params.get('nfv') || params.get('vNF') || params.get('vTotTrib');
    const amount = nfv ? parseFloat(nfv.replace(',', '.')) : undefined;

    // data de emissão
    const dhEmi = params.get('dhEmi') || params.get('dEmi');
    let date: string | undefined;
    if (dhEmi) {
      // pode vir como 20260601T120000-03:00 ou 2026-06-01
      const m = dhEmi.match(/(\d{4})(\d{2})(\d{2})/) || dhEmi.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (m) date = `${m[1]}-${m[2]}-${m[3]}`;
    }

    // CNPJ emitente (aparece como cEAN, cNPJ ou xFant)
    const cnpj = params.get('cNPJ') || params.get('CNPJ') || undefined;
    const merchant = params.get('xFant') || params.get('xNome') || cnpj || 'NF-e';

    if (!amount && !date) return null; // URL não reconhecida

    return { amount, date, merchant, cnpj, description: merchant || 'Nota Fiscal' };
  } catch {
    return null;
  }
}

// ─── extrai dados por OCR (fallback) ─────────────────────────────────────────
function extractByOcr(text: string): Partial<ScannedData> {
  // maior valor numérico encontrado (total da nota)
  const amounts = [...text.matchAll(/(?:R\$\s*)?(\d{1,3}(?:[\.,]\d{3})*[\.,]\d{2})/g)]
    .map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')))
    .filter(n => !isNaN(n) && n > 0);
  const amount = amounts.length ? Math.max(...amounts) : undefined;

  // data
  const dm = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  let date: string | undefined;
  if (dm) {
    const [, d, mo, y] = dm;
    const year = y.length === 2 ? '20' + y : y;
    date = `${year}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // estabelecimento: primeira linha não numérica com 4-50 chars
  const merchant = text.split('\n')
    .map(l => l.trim())
    .find(l => l.length >= 4 && l.length <= 50 && !/^[\d\s]+$/.test(l));

  return { amount, date, merchant, description: merchant || 'Transação escaneada', source: 'ocr' };
}

// ─── componente principal ─────────────────────────────────────────────────────
export const ReceiptScanner: React.FC<Props> = ({ onResult, onCancel }) => {
  type Mode    = 'choose' | 'qr-live' | 'processing' | 'review';
  type SubMode = 'qr' | 'photo' | 'upload';

  const [mode,       setMode]       = useState<Mode>('choose');
  const [subMode,    setSubMode]    = useState<SubMode | null>(null);
  const [preview,    setPreview]    = useState<string | null>(null);
  const [extracted,  setExtracted]  = useState<Partial<ScannedData> | null>(null);
  const [thumbFile,  setThumbFile]  = useState<File | null>(null);
  const [qrActive,   setQrActive]   = useState(false);
  const [camError,   setCamError]   = useState<string | null>(null);

  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const rafRef     = useRef<number>(0);
  const fileRef    = useRef<HTMLInputElement>(null);
  const photoRef   = useRef<HTMLInputElement>(null);

  // ── para câmera ao encerrar ─────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setQrActive(false);
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  // ── inicia câmera QR ────────────────────────────────────────────────────────
  const startQrCamera = async () => {
    setCamError(null);
    setMode('qr-live');
    setSubMode('qr');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setQrActive(true);
      scanQrLoop();
    } catch (err: any) {
      setCamError('Câmera não autorizada. Use "Upload" ou "Foto" como alternativa.');
      setMode('choose');
    }
  };

  // ── loop de leitura QR ──────────────────────────────────────────────────────
  const scanQrLoop = useCallback(() => {
    const tick = async () => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // importação dinâmica do jsQR para não aumentar o bundle inicial
      try {
        const jsQR = (await import('jsqr')).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          stopStream();
          handleQrDetected(code.data, canvas.toDataURL('image/jpeg', 0.72));
          return;
        }
      } catch { /* jsQR ainda não carregou */ }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopStream]);

  // ── QR detectado ────────────────────────────────────────────────────────────
  const handleQrDetected = async (qrText: string, frameDataUrl: string) => {
    setMode('processing');
    toast.info('QR Code detectado! Extraindo dados...');

    // tenta interpretar como URL de NF-e
    const fromUrl = qrText.startsWith('http') ? parseNFeUrl(qrText) : null;

    // comprime o frame capturado
    const { dataUrl, file } = await compressImage(frameDataUrl, 900, 0.72);
    setPreview(dataUrl);
    setThumbFile(file);

    if (fromUrl) {
      setExtracted({ ...fromUrl, source: 'qrcode' });
      toast.success('Nota Fiscal lida com sucesso!');
    } else {
      // QR não-NF-e: usa o texto como descrição e tenta OCR
      toast.info('QR genérico — rodando OCR...');
      runOcr(dataUrl, qrText);
      return;
    }
    setMode('review');
  };

  // ── OCR via Tesseract ────────────────────────────────────────────────────────
  const runOcr = async (dataUrl: string, qrFallback?: string) => {
    setMode('processing');
    try {
      const { data: { text } } = await Tesseract.recognize(dataUrl, 'por', {
        logger: () => {},
      });
      const result = extractByOcr(text);
      if (qrFallback && !result.description) result.description = qrFallback.slice(0, 60);
      setExtracted({ ...result, source: 'ocr' });
      toast.success('Recibo processado por OCR.');
    } catch {
      toast.error('Não foi possível ler o recibo automaticamente.');
      setExtracted({ source: 'ocr' });
    }
    setMode('review');
  };

  // ── foto / upload ─────────────────────────────────────────────────────────
  const handleImageFile = async (file: File) => {
    setMode('processing');
    setSubMode('photo');
    const raw = await file.text().catch(() => '');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      try {
        const { dataUrl, file: compressed } = await compressImage(src, 900, 0.72);
        setPreview(dataUrl);
        setThumbFile(compressed);
        await runOcr(dataUrl);
      } catch {
        toast.error('Erro ao processar imagem.');
        setMode('choose');
      }
    };
    reader.readAsDataURL(file);
  };

  // ── confirma uso dos dados ────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!extracted) return;
    onResult({
      amount:      extracted.amount,
      description: extracted.description,
      date:        extracted.date,
      merchant:    extracted.merchant,
      cnpj:        extracted.cnpj,
      thumbnail:   thumbFile ?? undefined,
      source:      extracted.source ?? 'manual',
    });
  };

  const reset = () => {
    stopStream();
    setMode('choose');
    setSubMode(null);
    setPreview(null);
    setExtracted(null);
    setThumbFile(null);
    setCamError(null);
  };

  // ─────────────────────────────── RENDER ──────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Seleção de modo ─────────────────────────────────────────────── */}
      {mode === 'choose' && (
        <>
          {camError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {camError}
            </p>
          )}

          <div className="grid grid-cols-1 gap-3">

            {/* QR Code */}
            <button
              onClick={startQrCamera}
              className="flex items-center gap-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <QrCode size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Ler QR Code da NF-e</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aponte a câmera para o QR Code do cupom fiscal — dados preenchidos automaticamente
                </p>
              </div>
            </button>

            {/* Tirar foto */}
            <button
              onClick={() => photoRef.current?.click()}
              className="flex items-center gap-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                <Camera size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Fotografar nota</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  OCR extrai valor e data; imagem comprimida para ~80KB antes de salvar
                </p>
              </div>
            </button>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
            />

            {/* Upload galeria */}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <ImagePlus size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Selecionar da galeria</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Escolha uma foto já salva — mesma compressão automática
                </p>
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
            />
          </div>

          <Button variant="ghost" size="sm" onClick={onCancel} className="w-full text-muted-foreground">
            <X size={14} className="mr-1.5" /> Cancelar
          </Button>
        </>
      )}

      {/* ── Câmera QR ao vivo ────────────────────────────────────────────── */}
      {mode === 'qr-live' && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />
            {/* mira de escaneamento */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/80 rounded-xl relative">
                <span className="absolute -top-px -left-px w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <span className="absolute -top-px -right-px w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <span className="absolute -bottom-px -left-px w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <span className="absolute -bottom-px -right-px w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                <ScanLine size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/60 animate-pulse" />
              </div>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Centralize o QR Code dentro da área marcada
          </p>
          <Button variant="outline" size="sm" onClick={() => { stopStream(); setMode('choose'); }} className="w-full">
            <X size={14} className="mr-1.5" /> Cancelar leitura
          </Button>
        </div>
      )}

      {/* ── Processando ──────────────────────────────────────────────────── */}
      {mode === 'processing' && (
        <div className="flex flex-col items-center gap-4 py-8">
          {preview && (
            <img src={preview} alt="Recibo" className="max-h-40 rounded-xl border object-contain" />
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">
              {subMode === 'qr' ? 'Extraindo dados do QR Code...' : 'Reconhecendo texto (OCR)...'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Aguarde alguns segundos</p>
        </div>
      )}

      {/* ── Revisão dos dados ────────────────────────────────────────────── */}
      {mode === 'review' && extracted && (
        <div className="space-y-4">
          {preview && (
            <img src={preview} alt="Recibo" className="w-full max-h-44 rounded-xl border object-contain" />
          )}

          {/* badge da fonte */}
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full',
              extracted.source === 'qrcode'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            )}>
              {extracted.source === 'qrcode' ? '✓ NF-e via QR Code' : '⚡ OCR — confira os dados'}
            </span>
            {thumbFile && (
              <span className="text-[10px] text-muted-foreground">
                Imagem: {Math.round(thumbFile.size / 1024)}KB
              </span>
            )}
          </div>

          {/* dados extraídos */}
          <div className="rounded-xl border border-border divide-y divide-border">
            {extracted.amount && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground">Valor total</span>
                <span className="text-sm font-semibold text-success">
                  {formatCurrency(extracted.amount)}
                </span>
              </div>
            )}
            {extracted.description && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground">Descrição</span>
                <span className="text-sm font-medium truncate max-w-[180px]">{extracted.description}</span>
              </div>
            )}
            {extracted.date && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground">Data</span>
                <span className="text-sm">{extracted.date}</span>
              </div>
            )}
            {extracted.cnpj && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground">CNPJ</span>
                <span className="text-sm font-mono">{extracted.cnpj}</span>
              </div>
            )}
            {!extracted.amount && !extracted.description && (
              <div className="px-4 py-4 text-center text-xs text-muted-foreground">
                Nenhum dado extraído automaticamente. Preencha manualmente.
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} className="flex-1">
              <RefreshCw size={14} className="mr-1.5" /> Tentar novamente
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              <Check size={14} className="mr-1.5" /> Usar estes dados
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
