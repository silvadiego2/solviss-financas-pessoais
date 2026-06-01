/**
 * ReceiptScanner v7b
 *
 * CORREÇÃO v7b:
 * ─────────────
 * Remove regex `dm2` inválida (unterminated regexp) na linha 207 que
 * impedia o build. A variável dm2 era inutilizada — apenas dm3 é usada
 * para parsing de data.
 */
import React, {
  useRef, useEffect, useState, useCallback, useLayoutEffect,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import { toast }  from 'sonner';
import {
  Camera, QrCode, Loader2, Check,
  RefreshCw, X, ScanLine, ImagePlus, Scissors, FileCheck,
  AlertCircle,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { cn } from '@/lib/utils';

// ─── tipos ────────────────────────────────────────────────────────────────────
export interface ScannedData {
  amount?:      number;
  description?: string;
  date?:        string;
  merchant?:    string;
  cnpj?:        string;
  thumbnail?:   File;
  source:       'qrcode' | 'ocr' | 'photo-only' | 'manual';
}

interface Props {
  onResult: (data: ScannedData) => void;
  onCancel: () => void;
}

type Point = { x: number; y: number };
type Quad  = [Point, Point, Point, Point];

const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  if (typeof (window as any).Capacitor !== 'undefined') {
    const p = (window as any).Capacitor?.getPlatform?.();
    if (p === 'ios') return true;
  }
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
};

const maskBRL = (raw: string) => {
  const d = raw.replace(/\D/g, '');
  if (!d) return '';
  return (parseInt(d, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const parseBRL = (v: string) => {
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

async function compressToFile(canvas: HTMLCanvasElement, quality = 0.85): Promise<{ dataUrl: string; file: File }> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) { reject(new Error('toBlob falhou')); return; }
        const file   = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ dataUrl, file });
      },
      'image/jpeg', quality,
    );
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = rej;
    img.src     = src;
  });
}

function applyPerspective(srcImg: HTMLImageElement, quad: Quad, outW: number, outH: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width  = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  const [tl, tr, br, bl] = quad;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(outW, 0); ctx.lineTo(outW, outH); ctx.lineTo(0, outH);
  ctx.closePath(); ctx.clip();
  const minX = Math.min(tl.x, bl.x);
  const minY = Math.min(tl.y, tr.y);
  const maxX = Math.max(tr.x, br.x);
  const maxY = Math.max(bl.y, br.y);
  ctx.drawImage(srcImg, minX, minY, maxX - minX, maxY - minY, 0, 0, outW, outH);
  ctx.restore();
  return canvas;
}

function detectQuad(imgW: number, imgH: number): Quad {
  const m = 0.04;
  return [
    { x: imgW * m,       y: imgH * m       },
    { x: imgW * (1 - m), y: imgH * m       },
    { x: imgW * (1 - m), y: imgH * (1 - m) },
    { x: imgW * m,       y: imgH * (1 - m) },
  ];
}

async function tryQrFromImage(dataUrl: string): Promise<string | null> {
  try {
    const jsqr = (await import('jsqr')).default;
    const img  = await loadImage(dataUrl);
    const MAX  = 2400;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(img.width  * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsqr(id.data, id.width, id.height, { inversionAttempts: 'attemptBoth' });
    return code?.data ?? null;
  } catch { return null; }
}

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
    if (dhRaw) { const m = dhRaw.match(/(\d{4})-?(\d{2})-?(\d{2})/); if (m) date = `${m[1]}-${m[2]}-${m[3]}`; }
    const merchant = p.get('xFant') ?? p.get('xNome') ?? (cnpj ? `CNPJ ${cnpj}` : 'NF-e');
    if (!amount && !chave) return null;
    return { amount, date, merchant, cnpj, description: merchant ?? 'Nota Fiscal' };
  } catch { return null; }
}

function extractByOcr(text: string): Partial<ScannedData> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const parseVal = (s: string): number | null => {
    const ms = [...s.matchAll(/(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g)];
    if (!ms.length) return null;
    const v = parseFloat(ms[ms.length - 1][1].replace(/\./g, '').replace(',', '.'));
    return isNaN(v) || v <= 0 ? null : v;
  };
  const TOTAL_KW = [
    /TOTAL\s*A\s*PAGAR/i, /VALOR\s*A\s*PAGAR/i, /TOTAL\s*GERAL/i,
    /TOTAL\s*LIQ/i, /\bTOTAL\b/i, /VALOR\s*TOTAL/i, /\bPAGAR\b/i,
  ];
  let amount: number | undefined;
  outer: for (const kw of TOTAL_KW) {
    for (let i = 0; i < lines.length; i++) {
      if (!kw.test(lines[i])) continue;
      const v = parseVal(lines[i]) ?? parseVal(lines[i + 1] ?? '') ?? parseVal(lines[i + 2] ?? '');
      if (v) { amount = v; break outer; }
    }
  }
  if (!amount) {
    const all = [...text.matchAll(/(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g)]
      .map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')))
      .filter(n => !isNaN(n) && n > 0 && n < 100_000);
    if (all.length) amount = Math.max(...all);
  }
  // FIX v7b: removida regex dm2 inválida. Apenas dm3 é necessária.
  const dm3 = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  let date: string | undefined;
  if (dm3) { const [, d, mo, y] = dm3; date = `${y.length === 2 ? '20' + y : y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`; }
  const merchant = lines.find(l => l.length >= 4 && l.length <= 60 && !/^[\d\s\W]+$/.test(l));
  return { amount, date, merchant, description: merchant || 'Transação escaneada', source: 'ocr' };
}

// ─────────────────────────────────────────────────────────────────────────────
export const ReceiptScanner: React.FC<Props> = ({ onResult, onCancel }) => {
  type Mode = 'choose' | 'crop' | 'qr-live' | 'processing' | 'review';

  const [mode,       setMode]       = useState<Mode>('choose');
  const [camError,   setCamError]   = useState<string | null>(null);
  const [ocrMode,    setOcrMode]    = useState(false);

  const [origDataUrl, setOrigDataUrl] = useState<string | null>(null);
  const [origImg,     setOrigImg]     = useState<HTMLImageElement | null>(null);
  const [quad,        setQuad]        = useState<Quad | null>(null);
  const [dragIdx,     setDragIdx]     = useState<number | null>(null);

  const [croppedUrl,  setCroppedUrl]  = useState<string | null>(null);
  const [thumbFile,   setThumbFile]   = useState<File | null>(null);

  const [extracted,       setExtracted]       = useState<Partial<ScannedData> | null>(null);
  const [editAmount,      setEditAmount]      = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate,        setEditDate]        = useState('');

  const [useMode, setUseMode] = useState<'photo-only' | 'extract' | null>(null);

  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef       = useRef(false);
  const qrInputRef    = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const galleryRef    = useRef<HTMLInputElement>(null);
  const jsQRRef       = useRef<any>(null);

  useEffect(() => { import('jsqr').then(m => { jsQRRef.current = m.default; }); }, []);

  // Refs para setters — evitam que callbacks internos do loop causem re-renders
  // que reiniciariam o useLayoutEffect
  const setModeRef       = useRef(setMode);
  const setCroppedUrlRef = useRef(setCroppedUrl);
  const setThumbFileRef  = useRef(setThumbFile);
  const setExtractedRef  = useRef(setExtracted);
  const setCamErrorRef   = useRef(setCamError);
  useEffect(() => { setModeRef.current = setMode; }, []);
  useEffect(() => { setCroppedUrlRef.current = setCroppedUrl; }, []);
  useEffect(() => { setThumbFileRef.current  = setThumbFile; }, []);
  useEffect(() => { setExtractedRef.current  = setExtracted; }, []);
  useEffect(() => { setCamErrorRef.current   = setCamError; }, []);

  useEffect(() => {
    if (!extracted) return;
    setEditAmount(extracted.amount ? maskBRL(String(Math.round(extracted.amount * 100))) : '');
    setEditDescription(extracted.description ?? '');
    setEditDate(extracted.date ?? '');
  }, [extracted]);

  // stopStream via ref — referência estável, não força re-render
  const stopStreamFn = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };
  const stopStreamRef = useRef(stopStreamFn);
  stopStreamRef.current = stopStreamFn;
  useEffect(() => () => stopStreamRef.current(), []);

  const handleQrDetectedLive = async (qrText: string, frameDataUrl: string) => {
    setModeRef.current('processing');
    const fromUrl = qrText.startsWith('http') ? parseNFeUrl(qrText) : null;
    const img = await loadImage(frameDataUrl);
    const out = document.createElement('canvas');
    out.width = img.width; out.height = img.height;
    out.getContext('2d')!.drawImage(img, 0, 0);
    const { dataUrl, file } = await compressToFile(out, 0.85);
    setCroppedUrlRef.current(dataUrl);
    setThumbFileRef.current(file);
    if (fromUrl) {
      setExtractedRef.current({ ...fromUrl, source: 'qrcode' });
      toast.success('Nota Fiscal lida com sucesso!');
    } else {
      const { data: { text } } = await Tesseract.recognize(dataUrl, 'por', { logger: () => {} });
      setExtractedRef.current({ ...extractByOcr(text), source: 'ocr' });
      toast.success('Recibo processado!');
    }
    setModeRef.current('review');
  };

  // startQrLoop via ref — referência estável
  const startQrLoopFn = () => {
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
      const id   = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(id.data, id.width, id.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data) {
        doneRef.current = true;
        stopStreamRef.current();
        await handleQrDetectedLive(code.data, canvas.toDataURL('image/jpeg', 0.85));
      }
    }, 200);
  };
  const startQrLoopRef = useRef(startQrLoopFn);
  startQrLoopRef.current = startQrLoopFn;

  // deps=[mode] apenas — sem funções instáveis nas deps
  useLayoutEffect(() => {
    if (mode !== 'qr-live') return;
    let cancelled = false;
    const init = async () => {
      await new Promise<void>(r => requestAnimationFrame(() => r()));
      if (cancelled) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          await video.play();
          startQrLoopRef.current();
        }
      } catch {
        if (!cancelled) setCamErrorRef.current('Câmera não autorizada. Use "Tirar foto" abaixo.');
      }
    };
    init();
    return () => { cancelled = true; };
  }, [mode]);

  const handleImageFile = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      const img = await loadImage(src);
      setOrigDataUrl(src);
      setOrigImg(img);
      setQuad(detectQuad(img.naturalWidth, img.naturalHeight));
      setMode('crop');
    };
    reader.readAsDataURL(file);
  }, []);

  const drawCropCanvas = useCallback(() => {
    const canvas = cropCanvasRef.current;
    if (!canvas || !origImg || !quad) return;
    const maxW = Math.min(canvas.parentElement?.clientWidth ?? 360, 500);
    const scale = maxW / origImg.naturalWidth;
    canvas.width  = maxW;
    canvas.height = Math.round(origImg.naturalHeight * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(origImg, 0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(quad[0].x * scale, quad[0].y * scale);
    ctx.lineTo(quad[1].x * scale, quad[1].y * scale);
    ctx.lineTo(quad[2].x * scale, quad[2].y * scale);
    ctx.lineTo(quad[3].x * scale, quad[3].y * scale);
    ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(quad[0].x * scale, quad[0].y * scale);
    ctx.lineTo(quad[1].x * scale, quad[1].y * scale);
    ctx.lineTo(quad[2].x * scale, quad[2].y * scale);
    ctx.lineTo(quad[3].x * scale, quad[3].y * scale);
    ctx.closePath(); ctx.stroke();
    quad.forEach((pt, i) => {
      ctx.beginPath();
      ctx.arc(pt.x * scale, pt.y * scale, 14, 0, Math.PI * 2);
      ctx.fillStyle = i === dragIdx ? '#06b6d4' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 2.5; ctx.stroke();
    });
  }, [origImg, quad, dragIdx]);

  useEffect(() => { if (mode === 'crop') drawCropCanvas(); }, [mode, drawCropCanvas]);

  const getCanvasPoint = (canvas: HTMLCanvasElement, e: React.MouseEvent | React.TouchEvent): Point => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const findNearestHandle = (pt: Point, canvas: HTMLCanvasElement): number | null => {
    const scaleX   = canvas.width / canvas.getBoundingClientRect().width;
    const imgScale = canvas.width / (origImg?.naturalWidth ?? 1);
    let nearest = -1, minD = 30 * scaleX;
    quad?.forEach((h, i) => {
      const d = Math.hypot(h.x * imgScale - pt.x, h.y * imgScale - pt.y);
      if (d < minD) { minD = d; nearest = i; }
    });
    return nearest === -1 ? null : nearest;
  };

  const onCropPointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = cropCanvasRef.current; if (!canvas || !quad) return;
    const idx = findNearestHandle(getCanvasPoint(canvas, e), canvas);
    if (idx !== null) { setDragIdx(idx); e.preventDefault(); }
  };

  const onCropPointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (dragIdx === null || !origImg || !quad) return;
    const canvas = cropCanvasRef.current; if (!canvas) return;
    const pt       = getCanvasPoint(canvas, e);
    const imgScale = canvas.width / origImg.naturalWidth;
    const newQuad: Quad = [...quad] as Quad;
    newQuad[dragIdx] = {
      x: Math.max(0, Math.min(origImg.naturalWidth,  pt.x / imgScale)),
      y: Math.max(0, Math.min(origImg.naturalHeight, pt.y / imgScale)),
    };
    setQuad(newQuad);
    e.preventDefault();
  };

  const onCropPointerUp = () => setDragIdx(null);

  const handleCropConfirm = useCallback(async () => {
    if (!origImg || !quad || !useMode) return;
    setMode('processing'); setOcrMode(false);
    const outW = Math.round(Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y));
    const outH = Math.round(Math.hypot(quad[3].x - quad[0].x, quad[3].y - quad[0].y));
    const cropped = applyPerspective(origImg, quad, Math.max(outW, 300), Math.max(outH, 400));
    const { dataUrl, file } = await compressToFile(cropped, 0.88);
    setCroppedUrl(dataUrl); setThumbFile(file);
    if (useMode === 'photo-only') {
      setExtracted({ source: 'photo-only' }); setMode('review'); return;
    }
    toast.info('Verificando QR Code...');
    const qrText = origDataUrl ? await tryQrFromImage(origDataUrl) : null;
    if (qrText?.startsWith('http')) {
      const fromUrl = parseNFeUrl(qrText);
      if (fromUrl) {
        setExtracted({ ...fromUrl, source: 'qrcode' });
        toast.success('QR Code NF-e encontrado!'); setMode('review'); return;
      }
    }
    toast.info('Lendo texto da nota (OCR)...'); setOcrMode(true);
    try {
      const { data: { text } } = await Tesseract.recognize(dataUrl, 'por', { logger: () => {} });
      const result = extractByOcr(text);
      if (qrText && !result.description) result.description = qrText.slice(0, 60);
      setExtracted({ ...result, source: 'ocr' });
      toast.success('Nota processada! Confira os dados.');
    } catch {
      toast.error('OCR falhou. Preencha manualmente.');
      setExtracted({ source: 'ocr' });
    }
    setMode('review');
  }, [origImg, quad, useMode, origDataUrl]);

  const handleConfirm = () => {
    if (useMode === 'photo-only') {
      onResult({ thumbnail: thumbFile ?? undefined, source: 'photo-only' }); return;
    }
    onResult({
      amount:      parseBRL(editAmount) || undefined,
      description: editDescription     || extracted?.description,
      date:        editDate            || extracted?.date,
      merchant:    extracted?.merchant,
      cnpj:        extracted?.cnpj,
      thumbnail:   thumbFile ?? undefined,
      source:      extracted?.source ?? 'manual',
    });
  };

  const reset = () => {
    stopStreamRef.current(); doneRef.current = false;
    setMode('choose'); setCamError(null); setOcrMode(false);
    setOrigDataUrl(null); setOrigImg(null); setQuad(null); setDragIdx(null);
    setCroppedUrl(null); setThumbFile(null); setExtracted(null);
    setEditAmount(''); setEditDescription(''); setEditDate('');
    setUseMode(null);
  };

  return (
    <div className="space-y-4" style={{ touchAction: mode === 'crop' ? 'none' : undefined }}>

      <input ref={qrInputRef}    type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { setUseMode('extract');    handleImageFile(f); } e.target.value = ''; }} />
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { setUseMode('photo-only'); handleImageFile(f); } e.target.value = ''; }} />
      <input ref={galleryRef}    type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { setUseMode('extract');    handleImageFile(f); } e.target.value = ''; }} />

      {/* ── Escolha ── */}
      {mode === 'choose' && (
        <>
          {camError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle size={13} className="flex-shrink-0" /> {camError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button type="button"
              onClick={() => { setUseMode('photo-only'); photoInputRef.current?.click(); }}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:bg-accent transition-colors p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center"><FileCheck size={20} /></div>
              <div>
                <p className="text-xs font-semibold">Só salvar foto</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Recorta e salva como comprovante</p>
              </div>
            </button>
            <button type="button"
              onClick={() => { setCamError(null); setUseMode('extract'); if (isIOS()) { qrInputRef.current?.click(); } else { setMode('qr-live'); } }}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:bg-accent transition-colors p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><QrCode size={20} /></div>
              <div>
                <p className="text-xs font-semibold">Ler QR Code</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Preenche o formulário automaticamente</p>
              </div>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button type="button"
              onClick={() => { setUseMode('extract'); qrInputRef.current?.click(); }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors px-4 py-3 text-left">
              <Camera size={18} className="text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Fotografar e extrair dados</p>
                <p className="text-xs text-muted-foreground">OCR extrai valor, data e nome do estabelecimento</p>
              </div>
            </button>
            <button type="button"
              onClick={() => { setUseMode('extract'); galleryRef.current?.click(); }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors px-4 py-3 text-left">
              <ImagePlus size={18} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Galeria e extrair dados</p>
                <p className="text-xs text-muted-foreground">OCR em foto já salva + detecção de QR</p>
              </div>
            </button>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="w-full text-muted-foreground">
            <X size={14} className="mr-1.5" /> Cancelar
          </Button>
        </>
      )}

      {/* ── Recorte ── */}
      {mode === 'crop' && quad && origImg && (
        <div className="space-y-3">
          <div className="text-center space-y-0.5">
            <p className="text-sm font-semibold">Ajuste os cantos do documento</p>
            <p className="text-xs text-muted-foreground">Arraste os círculos até as bordas da nota</p>
          </div>
          <div className="rounded-xl overflow-hidden border border-border select-none">
            <canvas ref={cropCanvasRef} className="w-full touch-none cursor-crosshair"
              onMouseDown={onCropPointerDown} onMouseMove={onCropPointerMove} onMouseUp={onCropPointerUp} onMouseLeave={onCropPointerUp}
              onTouchStart={onCropPointerDown} onTouchMove={onCropPointerMove} onTouchEnd={onCropPointerUp} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={reset} className="flex-1"><X size={14} className="mr-1.5" /> Cancelar</Button>
            <Button type="button" onClick={handleCropConfirm} className="flex-1">
              <Scissors size={14} className="mr-1.5" />
              {useMode === 'photo-only' ? 'Recortar e salvar' : 'Recortar e ler'}
            </Button>
          </div>
        </div>
      )}

      {/* ── QR live ── */}
      {mode === 'qr-live' && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 border-2 border-white/50 rounded-xl relative">
                <span className="absolute -top-px -left-px   w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl" />
                <span className="absolute -top-px -right-px  w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl" />
                <span className="absolute -bottom-px -left-px  w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
                <span className="absolute -bottom-px -right-px w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />
                <div className="absolute left-2 right-2 h-0.5 bg-cyan-400/80 rounded-full"
                  style={{ animation: 'scanline 2s ease-in-out infinite', top: '10%' }} />
              </div>
            </div>
            {camError && (
              <div className="absolute bottom-3 left-3 right-3 bg-black/70 text-white text-xs rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle size={12} className="flex-shrink-0 text-yellow-400" /><span>{camError}</span>
              </div>
            )}
          </div>
          <style>{`@keyframes scanline{0%,100%{top:10%}50%{top:80%}}`}</style>
          <p className="text-xs text-center text-muted-foreground">Centralize o QR Code dentro da área marcada</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { stopStreamRef.current(); setCamError(null); setMode('choose'); }} className="flex-1">
              <X size={14} className="mr-1.5" /> Cancelar
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { stopStreamRef.current(); setCamError(null); setUseMode('extract'); qrInputRef.current?.click(); }} className="flex-1">
              <Camera size={14} className="mr-1.5" /> Tirar foto
            </Button>
          </div>
        </div>
      )}

      {/* ── Processando ── */}
      {mode === 'processing' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">{ocrMode ? 'Reconhecendo texto (OCR)…' : 'Verificando QR Code…'}</span>
          </div>
          <p className="text-xs text-muted-foreground">Aguarde alguns segundos</p>
        </div>
      )}

      {/* ── Revisão ── */}
      {mode === 'review' && extracted && (
        <div className="space-y-4">
          {croppedUrl && <img src={croppedUrl} alt="Nota recortada" className="w-full max-h-48 rounded-xl border object-contain" />}
          {useMode === 'photo-only' ? (
            <>
              <p className="text-sm text-center text-muted-foreground">
                Foto recortada e pronta para salvar como comprovante.<br />
                <span className="text-xs">Os dados já preenchidos no formulário serão mantidos.</span>
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={reset} className="flex-1"><RefreshCw size={14} className="mr-1.5" /> Refazer</Button>
                <Button type="button" onClick={handleConfirm} className="flex-1"><Check size={14} className="mr-1.5" /> Salvar foto</Button>
              </div>
            </>
          ) : (
            <>
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                extracted.source === 'qrcode'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
              )}>
                {extracted.source === 'qrcode' ? '✓ NF-e via QR Code' : '⚡ OCR — confira e edite'}
              </span>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                    <Input type="text" inputMode="numeric" value={editAmount} placeholder="0,00"
                      onChange={e => setEditAmount(maskBRL(e.target.value))} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição / Estabelecimento</Label>
                  <Input type="text" value={editDescription} placeholder="Ex: Supermercado…" onChange={e => setEditDescription(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                </div>
                {extracted.cnpj && (
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">CNPJ</span>
                    <span className="text-xs font-mono">{extracted.cnpj}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={reset} className="flex-1"><RefreshCw size={14} className="mr-1.5" /> Refazer</Button>
                <Button type="button" onClick={handleConfirm} className="flex-1"><Check size={14} className="mr-1.5" /> Usar dados</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
