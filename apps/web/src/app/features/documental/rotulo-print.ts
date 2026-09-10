/**
 * Marquillas Documental → Niimbot B1 por Web Bluetooth (50×30 mm = 384×240 @ 203 dpi).
 * Chrome/Edge + HTTPS. No usar Imprimir del navegador: el driver de la B1 usa papel 800 mm.
 */

export interface RotuloItem {
  id?: string;
  codigo: string;
  titulo: string;
  fechas?: string;
  slotFisico?: string;
  nit?: string;
  numContrato?: string;
  modulo: 'MINUTAS' | 'CONTRATOS' | 'PERSONAL' | 'CORRESPONDENCIA' | string;
}

export interface LoteHistorial {
  id: string;
  fecha: string;
  cantidad: number;
  items: Array<RotuloItem & { id: string }>;
}

interface LabelCopy {
  kind: string;
  code: string;
  title: string;
  slot: string;
  extra: string;
}

interface NiimbotPrintOpts {
  model: {
    name_prefixes: string[];
    task: string;
    density: number;
    label_type: number;
    speed: number;
  };
  size: { w_px: number; h_px: number; offset_y_px?: number; dpi: number };
  onProgress?: (s: string) => void;
}

interface NiimbotApi {
  isSupported: () => boolean;
  identify: (model: NiimbotPrintOpts['model']) => Promise<unknown>;
  printImage: (url: string, opts: NiimbotPrintOpts) => Promise<void>;
  printBatch: (urls: string[], opts: NiimbotPrintOpts) => Promise<void>;
}

declare global {
  interface Window {
    Niimbot?: NiimbotApi;
  }
}

const COLA_KEY = 'colaTirasCoraza';
const HISTORIAL_KEY = 'historialLotesCoraza';
const STATUS_ID = 'coraza-niimbot-status';

/** B1 50×30 mm — registry T50x30_b1 */
const B1_MODEL: NiimbotPrintOpts['model'] = {
  name_prefixes: ['B1'],
  task: 'b1',
  density: 3,
  label_type: 1,
  speed: 1,
};
const B1_SIZE: NiimbotPrintOpts['size'] = { w_px: 384, h_px: 240, offset_y_px: 4, dpi: 203 };
const CANVAS_W = B1_SIZE.w_px;
const CANVAS_H = B1_SIZE.h_px;

export function addToPrintQueue(item: RotuloItem & { id: string }): void {
  const cola: Array<RotuloItem & { id: string }> = JSON.parse(localStorage.getItem(COLA_KEY) || '[]');
  if (cola.some((i) => i.id === item.id && i.modulo === item.modulo)) return;
  cola.push(item);
  localStorage.setItem(COLA_KEY, JSON.stringify(cola));
  window.dispatchEvent(new Event('storage'));
}

export function getPrintQueue(): Array<RotuloItem & { id: string }> {
  return JSON.parse(localStorage.getItem(COLA_KEY) || '[]');
}

export function clearPrintQueue(): void {
  localStorage.setItem(COLA_KEY, '[]');
  window.dispatchEvent(new Event('storage'));
}

export function removeFromPrintQueue(idx: number): void {
  const cola: Array<RotuloItem & { id: string }> = JSON.parse(localStorage.getItem(COLA_KEY) || '[]');
  if (cola[idx]) {
    cola.splice(idx, 1);
    localStorage.setItem(COLA_KEY, JSON.stringify(cola));
    window.dispatchEvent(new Event('storage'));
  }
}

export function saveBatchToHistory(items: Array<RotuloItem & { id: string }>): void {
  if (!items || items.length === 0) return;
  const historial: LoteHistorial[] = JSON.parse(localStorage.getItem(HISTORIAL_KEY) || '[]');
  const nuevoLote: LoteHistorial = {
    id: 'lote_' + Date.now(),
    fecha: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
    cantidad: items.length,
    items: [...items],
  };
  historial.unshift(nuevoLote);
  if (historial.length > 15) historial.pop();
  localStorage.setItem(HISTORIAL_KEY, JSON.stringify(historial));
}

export function getBatchesHistory(): LoteHistorial[] {
  return JSON.parse(localStorage.getItem(HISTORIAL_KEY) || '[]');
}

export function restoreBatchToQueue(batchId: string): void {
  const historial = getBatchesHistory();
  const found = historial.find((h) => h.id === batchId);
  if (found && found.items.length) {
    localStorage.setItem(COLA_KEY, JSON.stringify(found.items));
    window.dispatchEvent(new Event('storage'));
  }
}

function labelCopy(item: RotuloItem): LabelCopy {
  const codClean = String(item.codigo || 'S/N').replace(/^#/, '');
  const title = (item.titulo || 'CARPETA DE ARCHIVO').toUpperCase();
  const slotRaw = (item.slotFisico || 'ESTANTE A').replace(/^VOXEL_/, '');
  const slot = slotRaw.startsWith('ESTANTE') ? slotRaw : `ESTANTE ${slotRaw}`;
  const fechas = item.fechas || '';
  const mod = item.modulo.toUpperCase();

  if (mod.includes('MINUTA')) {
    const matchDigits = codClean.match(/\d+$/);
    const digits = (matchDigits ? matchDigits[0] : codClean).padStart(4, '0');
    return { kind: 'MINUTAS', code: digits, title, slot, extra: [fechas, slot].filter(Boolean).join(' · ') };
  }
  if (mod.includes('CORRESPONDENCIA')) {
    return { kind: 'CORRESPONDENCIA', code: codClean, title, slot, extra: [fechas, slot].filter(Boolean).join(' · ') };
  }
  const extras: string[] = [];
  if (item.nit) extras.push(`NIT/CC ${item.nit}`);
  if (item.numContrato) extras.push(`CTO ${item.numContrato}`);
  if (fechas) extras.push(fechas);
  return { kind: mod, code: `#${codClean}`, title, slot, extra: extras.join(' · ') };
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/brand/logo-coraza-cta.png';
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w;
      if (lines.length >= maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.length) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = last.endsWith('…') ? last : `${last}…`;
  }
  return lines;
}

function drawThermalLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
): void {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const o = off.getContext('2d');
  if (!o) return;
  o.fillStyle = '#ffffff';
  o.fillRect(0, 0, size, size);
  o.imageSmoothingEnabled = true;
  o.imageSmoothingQuality = 'high';
  const iw = img.naturalWidth || img.width || size;
  const ih = img.naturalHeight || img.height || size;
  const scale = Math.min(size / iw, size / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  o.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
  const px = o.getImageData(0, 0, size, size);
  const d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const on = d[i + 3] > 40 && lum < 188;
    d[i] = d[i + 1] = d[i + 2] = on ? 0 : 255;
    d[i + 3] = 255;
  }
  o.putImageData(px, 0, 0);
  ctx.drawImage(off, x, y);
}

function paintLabel(copy: LabelCopy, logo: HTMLImageElement | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const pad = 8;
  const logoSize = 72;
  if (logo) drawThermalLogo(ctx, logo, pad, pad, logoSize);

  const textX = pad + (logo ? logoSize + 8 : 0);
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 16px Arial, Helvetica, sans-serif';
  ctx.fillText('CORAZA C.T.A.', textX, pad + 28);
  ctx.fillStyle = '#0c4a6e';
  ctx.font = '800 13px Arial, Helvetica, sans-serif';
  ctx.fillText(copy.kind, textX, pad + 50);

  const slot = copy.slot.slice(0, 16);
  ctx.font = '800 10px Arial, Helvetica, sans-serif';
  const sw = Math.min(ctx.measureText(slot).width + 10, 120);
  ctx.fillStyle = '#0c4a6e';
  ctx.fillRect(CANVAS_W - pad - sw, pad + 6, sw, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(slot, CANVAS_W - pad - sw + 5, pad + 19, sw - 10);

  const dividerY = pad + logoSize + 6;
  ctx.strokeStyle = '#0c4a6e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, dividerY);
  ctx.lineTo(CANVAS_W - pad, dividerY);
  ctx.stroke();

  ctx.fillStyle = '#0c4a6e';
  ctx.font = '900 26px Arial, Helvetica, sans-serif';
  ctx.fillText(copy.code, pad, dividerY + 32, CANVAS_W - pad * 2);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 13px Arial, Helvetica, sans-serif';
  const lines = wrapText(ctx, copy.title, CANVAS_W - pad * 2, 2);
  lines.forEach((ln, i) => ctx.fillText(ln, pad, dividerY + 54 + i * 16, CANVAS_W - pad * 2));

  if (copy.extra) {
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 10px Arial, Helvetica, sans-serif';
    ctx.fillText(copy.extra, pad, CANVAS_H - 8, CANVAS_W - pad * 2);
  }
  return canvas;
}

function canvasPngUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('PNG'))), 'image/png');
  });
}

function showStatus(text: string): void {
  let el = document.getElementById(STATUS_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = STATUS_ID;
    el.setAttribute(
      'style',
      'position:fixed;z-index:10000;left:50%;bottom:24px;transform:translateX(-50%);max-width:min(92vw,420px);background:#0f172a;color:#fff;padding:12px 16px;border-radius:10px;font:700 13px/1.4 Arial,Helvetica,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);',
    );
    document.body.appendChild(el);
  }
  el.textContent = text;
}

function hideStatus(): void {
  document.getElementById(STATUS_ID)?.remove();
}

/** Primera vez: el navegador pide la B1. Después reusa esa impresora, sin ventana extra. */
function reusePairedB1(): void {
  const nav = navigator as Navigator & {
    bluetooth?: {
      getDevices?: () => Promise<Array<{ name?: string }>>;
      requestDevice: (options: unknown) => Promise<unknown>;
      __corazaB1?: boolean;
    };
  };
  const bt = nav.bluetooth;
  if (!bt || bt.__corazaB1) return;
  bt.__corazaB1 = true;
  const orig = bt.requestDevice.bind(bt);
  bt.requestDevice = async (options: unknown) => {
    if (localStorage.getItem('corazaNiimbotB1') === '1' && typeof bt.getDevices === 'function') {
      try {
        const hit = (await bt.getDevices()).find((d) => (d.name || '').startsWith('B1'));
        if (hit) return hit;
      } catch {
        /* getDevices no disponible */
      }
    }
    const device = await orig(options);
    localStorage.setItem('corazaNiimbotB1', '1');
    return device;
  };
}

async function printOnNiimbotB1(items: RotuloItem[]): Promise<void> {
  if (!items.length) return;
  const api = window.Niimbot;
  if (!api?.isSupported()) {
    alert('Abre el Portal en Chrome o Edge (https) para imprimir en la Niimbot B1 por Bluetooth.');
    return;
  }

  reusePairedB1();
  showStatus('Imprimiendo…');
  // requestDevice debe arrancar en el mismo clic (sin await antes).
  const paired = api.identify(B1_MODEL);
  const urls: string[] = [];
  try {
    const logo = await loadLogo();
    const canvases = items.map((it) => paintLabel(labelCopy(it), logo));
    for (const c of canvases) urls.push(await canvasPngUrl(c));
    await paired;
    const opts: NiimbotPrintOpts = {
      model: B1_MODEL,
      size: B1_SIZE,
      onProgress: (s) => showStatus(s),
    };
    showStatus(items.length > 1 ? `Imprimiendo ${items.length} etiquetas…` : 'Imprimiendo…');
    if (urls.length === 1) await api.printImage(urls[0], opts);
    else await api.printBatch(urls, opts);
    showStatus('Impreso en la B1');
    setTimeout(hideStatus, 1600);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const cancelled = /cancel|choos/i.test(raw);
    showStatus(cancelled ? 'Impresión cancelada' : `No se pudo imprimir: ${raw}`);
    setTimeout(hideStatus, cancelled ? 1600 : 6000);
  } finally {
    urls.forEach((u) => URL.revokeObjectURL(u));
  }
}

export function printRotulo(item: RotuloItem): void {
  const itemWithId = {
    ...item,
    id: item.id || `${item.modulo}_${item.codigo}_${Date.now()}`,
  };
  addToPrintQueue(itemWithId);
  saveBatchToHistory([itemWithId]);
  void printOnNiimbotB1([item]);
}

export function printQueue(clearAfter = false): void {
  const items = getPrintQueue();
  if (!items.length) return;
  saveBatchToHistory(items);
  void printOnNiimbotB1(items);
  if (clearAfter) clearPrintQueue();
}

export function printSpecificBatch(items: Array<RotuloItem & { id: string }>): void {
  if (!items?.length) return;
  void printOnNiimbotB1(items);
}
