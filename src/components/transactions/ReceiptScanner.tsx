/**
 * ReceiptScanner v3 — scanner inteligente de notas fiscais
 *
 * Estratégia por plataforma:
 *
 * iOS (Safari / WKWebView)
 * ─────────────────────────
 *  • getUserMedia dentro de Dialog falha silenciosamente por causa do
 *    pointer-events:none que o Radix aplica durante a animação de entrada.
 *  • Solução: NÃO usamos live-camera QR no iOS. Em vez disso:
 *    – "Ler QR Code" → abre a câmera nativa via <input capture="environment">
 *      O iOS decodifica QR Codes nativamente desde o iOS 11 (Vision framework)
 *      e o usuário pode TAMBÉM tirar uma foto que capturamos via jsQR + OCR.
 *    – "Fotografar nota" → <input capture="environment" accept="image/*">
 *      O iOS ativa automaticamente o modo "Documento" (igual ao app Notas /
 *      Arquivos) detectando bordas e recortando a nota fiscalmente.
 *    – "Da galeria" → <input accept="image/*"> sem capture, abre o seletor.
 *
 * Android / Desktop
 * ─────────────────
 *  • getUserMedia funciona normalmente. Usamos live-camera com jsQR (setInterval
 *    200 ms, mais confiável que rAF dentro de modais).
 *  • Fallback idêntico ao iOS caso getUserMedia seja negado.
 *
 * Campo Data
 * ──────────
 *  • Input.tsx agora força h-10 + appearance-none em type="date",
 *    garantindo altura idêntica aos demais campos do formulário.
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
  thumbnail?:   File;
  source:       'qrcode' | 'ocr' | 'manual';
}

interface Props {
  onResult: (data: ScannedData) => void;
  onCancel: () => void;
}

// ─── detecta iOS ─────────────────────────────────────────────────────────────
const isIOS = () =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// ─── compressão Canvas ────────────────────────────────────────────────────────
async function compressImage(
  src: string,
  maxPx   = 1200,
  quality = 0.80,
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
    const u      = new URL(url);
    const params = u.searchParams;

    const chaveMatch = url.match(/\b(\d{44})\b/);
    const chave      = chaveMatch?.[1];

    const cnpj = chave
      ? chave.slice(6, 20).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      : (params.get('cNPJ') ?? params.get('CNPJ') ?? undefined);

    const rawVal =
      params.get('nfv')      ??
      params.get('vNF')      ??
      params.get('vTotTrib') ??
      params.get('valor')    ??
      null;
    const amount = rawVal ? parseFloat(rawVal.replace(',', '.')) : undefined;

    const dhRaw =
      params.get('dhEmi')  ??
      params.get('dEmi')   ??
      params.get('dhCont') ??
      null;
    let date: string | undefined;
    if (dhRaw) {
      const m = dhRaw.match(/(\d{4})-?(\d{2})-?(\d{2})/);
      if (m) date = `${m[1]}-${m[2]}-${m[3]}`;
    }

    const merchant =
      params.get('xFant') ??
      params.get('xNome') ??
      (cnpj ? `CNPJ ${cnpj}` : 'NF-e');

    if (!amount && !chave) return null;
    return { amount, date, merchant, cnpj, description: merchant ?? 'Nota Fiscal' };
  } catch {
    return null;
  }
}

// ─── extrai dados por OCR ─────────────────────────────────────────────────────
function extractByOcr(text: string): Partial<ScannedData> {
  const amounts = [...text.matchAll(/(?:R\$\s*)?(\d{1,3}(?:[\.,]\d{3})*[\.,]\d{2})/g)]
    .map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')))
    .filter(n => !isNaN(n) && n > 0);
  const amount = amounts.length ? Math.max(...amounts) : undefined;

  const dm = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  let date: string | undefined;
  if (dm) {
    const [, d, mo, y] = dm;
    const year = y.length === 2 ? '20' + y : y;
    date = `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const merchant = text.split('\n')
    .map(l => l.trim())
    .find(l => l.length >= 4 && l.length <= 50 && !/^[\d\s]+$/.test(l));

  return { amount, date, merchant, description: merchant || 'Transação escaneada', source: 'ocr' };
}

// ─── tenta ler QR de uma imagem via jsQR ─────────────────────────────────────
async function tryQrFromImage(dataUrl: string): Promise<string | null> {
  try {
    const jsqr = (await import('jsqr')).default;
    const img  = new Image();
    await new Promise<void>((res, rej) => {
      img.onload  = () => res();
      img.onerror = rej;
      img.src     = dataUrl;
    });
    const canvas  = document.createElement('canvas');
    canvas.width  = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const code      = jsqr(imageData.data, imageData.width, imageData.height);
    return code?.data ?? null;
  } catch {
    return null;
  }
}

// ─── componente principal ─────────────────────────────────────────────────────
export const ReceiptScanner: React.FC<Props> = ({ onResult, onCancel }) => {
  type Mode = 'choose' | 'qr-live' | 'processing' | 'review';

  const [mode,      setMode]      = useState<Mode>('choose');
  const [preview,   setPreview]   = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Partial<ScannedData> | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [camError,  setCamError]  = useState<string | null>(null);
  const [ocrMode,   setOcrMode]   = useState(false); // true = OCR, false = QR

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef     = useRef(false);

  // inputs nativos separados para cada função
  const qrInputRef    = useRef<HTMLInputElement>(null);   // câmera QR (iOS)
  const photoInputRef = useRef<HTMLInputElement>(null);   // câmera documento
  const galleryRef    = useRef<HTMLInputElement>(null);   // galeria

  const jsQRRef = useRef<((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null>(null);
  useEffect(() => {
    import('jsqr').then(m => { jsQRRef.current = m.default; }).catch(() => {});
  }, []);

  // ── stop câmera ──────────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  // ── OCR ─────────────────────────────────────────────────────────────────
  const runOcr = useCallback(async (dataUrl: string, qrFallback?: string) => {
    setOcrMode(true);
    setMode('processing');
    try {
      const { data: { text } } = await Tesseract.recognize(dataUrl, 'por', { logger: () => {} });
      const result = extractByOcr(text);
      if (qrFallback && !result.description) result.description = qrFallback.slice(0, 60);
      setExtracted({ ...result, source: 'ocr' });
      toast.success('Recibo processado por OCR.');
    } catch {
      toast.error('Não foi possível ler o recibo automaticamente.');
      setExtracted({ source: 'ocr' });
    }
    setMode('review');
  }, []);

  // ── processa qualquer imagem: tenta QR primeiro, depois OCR ─────────────
  const handleImageFile = useCallback(async (file: File, forceOcr = false) => {
    setMode('processing');
    setOcrMode(false);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      try {
        const { dataUrl, file: compressed } = await compressImage(src, 1200, 0.80);
        setPreview(dataUrl);
        setThumbFile(compressed);

        if (!forceOcr) {
          // Tenta ler QR da imagem (útil quando o user fotografou o cupom)
          const qrText = await tryQrFromImage(dataUrl);
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
        }
        // sem QR → OCR
        await runOcr(dataUrl);
      } catch {
        toast.error('Erro ao processar imagem.');
        setMode('choose');
      }
    };
    reader.readAsDataURL(file);
  }, [runOcr]);

  // ── QR detectado via câmera live ─────────────────────────────────────────
  const handleQrDetected = useCallback(async (qrText: string, frameDataUrl: string) => {
    setMode('processing');
    toast.info('QR Code detectado! Extraindo dados...');
    const fromUrl = qrText.startsWith('http') ? parseNFeUrl(qrText) : null;
    const { dataUrl, file } = await compressImage(frameDataUrl, 900, 0.72);
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

  // ── loop QR câmera live (Android/Desktop) ─────────────────────────────────
  const startQrLoop = useCallback(() => {
    doneRef.current = false;
    intervalRef.current = setInterval(async () => {
      if (doneRef.current) return;
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      const jsQR   = jsQRRef.current;
      if (!video || !canvas || !jsQR) return;
      if (video.readyState < 2 || video.videoWidth === 0) return;
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        doneRef.current = true;
        stopStream();
        await handleQrDetected(code.data, canvas.toDataURL('image/jpeg', 0.72));
      }
    }, 200);
  }, [handleQrDetected, stopStream]);

  // ── inicia câmera QR live (Android/Desktop) ───────────────────────────────
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
      setCamError('Câmera não autorizada. Use uma das opções abaixo.');
      setMode('choose');
    }
  };

  // ── aciona câmera QR (iOS usa input nativo; outros usam live) ─────────────
  const handleQrButton = () => {
    if (isIOS()) {
      // No iOS, o Scanner nativo de QR Code já está integrado na câmera.
      // O usuário aponta → iOS detecta → retorna a foto; nós extraímos o QR da imagem.
      qrInputRef.current?.click();
    } else {
      startLiveQrCamera();
    }
  };

  // ── confirma dados ────────────────────────────────────────────────────────
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
    doneRef.current = false;
    setMode('choose');
    setPreview(null);
    setExtracted(null);
    setThumbFile(null);
    setCamError(null);
    setOcrMode(false);
  };

  // ──────────────────────────────── RENDER ──────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Inputs nativos (sempre presentes no DOM para .click() funcionar) ── */}
      {/* QR: iOS usa câmera nativa com suporte a QR embutido */}
      <input
        ref={qrInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f, false); }}
      />
      {/* Foto documento: capture sem accept="video" → iOS oferece modo Documento */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f, false); }}
      />
      {/* Galeria: sem capture → seletor de arquivos / galeria */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f, false); }}
      />

      {/* ── Seleção de modo ──────────────────────────────────────────────── */}
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
              type="button"
              onClick={handleQrButton}
              className="flex items-center gap-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <QrCode size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Ler QR Code da NF-e</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isIOS()
                    ? 'Abre a câmera — aponte para o QR Code do cupom fiscal'
                    : 'Câmera ao vivo — centralize o QR Code para leitura automática'}
                </p>
              </div>
            </button>

            {/* Fotografar nota — iOS ativa detecção de documento automaticamente */}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                <Camera size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Fotografar nota</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isIOS()
                    ? 'iOS detecta e recorta o documento automaticamente (igual ao app Notas)'
                    : 'OCR extrai valor e data — imagem comprimida antes de salvar'}
                </p>
              </div>
            </button>

            {/* Galeria */}
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex items-center gap-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <ImagePlus size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Selecionar da galeria</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Escolha uma foto já salva — OCR + detecção de QR automáticos
                </p>
              </div>
            </button>

            {/* Upload arquivo */}
            <button
              type="button"
              onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*,.pdf'; i.onchange=()=>{ const f=i.files?.[0]; if(f) handleImageFile(f,false); }; i.click(); }}
              className="flex items-center gap-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                <Upload size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Importar arquivo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Imagem ou PDF já salvo no dispositivo
                </p>
              </div>
            </button>

          </div>

          <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="w-full text-muted-foreground">
            <X size={14} className="mr-1.5" /> Cancelar
          </Button>
        </>
      )}

      {/* ── Câmera QR live (Android/Desktop) ─────────────────────────────── */}
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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 border-2 border-white/60 rounded-xl relative">
                <span className="absolute -top-px -left-px w-7 h-7 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <span className="absolute -top-px -right-px w-7 h-7 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <span className="absolute -bottom-px -left-px w-7 h-7 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <span className="absolute -bottom-px -right-px w-7 h-7 border-b-4 border-r-4 border-primary rounded-br-lg" />
                <ScanLine size={22} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 animate-pulse" />
              </div>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Centralize o QR Code dentro da área marcada
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => { stopStream(); setMode('choose'); }} className="w-full">
            <X size={14} className="mr-1.5" /> Cancelar leitura
          </Button>
        </div>
      )}

      {/* ── Processando ───────────────────────────────────────────────── */}
      {mode === 'processing' && (
        <div className="flex flex-col items-center gap-4 py-8">
          {preview && (
            <img src={preview} alt="Recibo" className="max-h-40 rounded-xl border object-contain" />
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">
              {ocrMode ? 'Reconhecendo texto (OCR)...' : 'Verificando QR Code...'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Aguarde alguns segundos</p>
        </div>
      )}

      {/* ── Revisão ───────────────────────────────────────────────────── */}
      {mode === 'review' && extracted && (
        <div className="space-y-4">
          {preview && (
            <img src={preview} alt="Recibo" className="w-full max-h-44 rounded-xl border object-contain" />
          )}

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
                {Math.round(thumbFile.size / 1024)}KB
              </span>
            )}
          </div>

          <div className="rounded-xl border border-border divide-y divide-border">
            {extracted.amount && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground">Valor total</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
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
                Nenhum dado extraído. Preencha manualmente.
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
