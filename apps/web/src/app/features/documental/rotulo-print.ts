/**
 * Marquillas Documental para Niimbot B1: PDF de 50 mm × 30 mm (una página = una etiqueta).
 * Chrome no respeta @page CSS con esa impresora y manda hoja grande (~23 etiquetas).
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

const COLA_KEY = 'colaTirasCoraza';
const HISTORIAL_KEY = 'historialLotesCoraza';
const MM_W = 50;
const MM_H = 30;
const PX_PER_MM = 12;
const CANVAS_W = MM_W * PX_PER_MM;
const CANVAS_H = MM_H * PX_PER_MM;
const PT_W = (MM_W * 72) / 25.4;
const PT_H = (MM_H * 72) / 25.4;

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

function paintLabel(copy: LabelCopy, logo: HTMLImageElement | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const pad = 16;
  if (logo) ctx.drawImage(logo, pad, pad, 52, 52);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 18px Arial, Helvetica, sans-serif';
  ctx.fillText('CORAZA C.T.A.', pad + (logo ? 62 : 0), pad + 22);
  ctx.fillStyle = '#0369a1';
  ctx.font = '800 14px Arial, Helvetica, sans-serif';
  ctx.fillText(copy.kind, pad + (logo ? 62 : 0), pad + 42);

  ctx.fillStyle = '#e0f2fe';
  const slot = copy.slot.slice(0, 18);
  ctx.font = '800 13px Arial, Helvetica, sans-serif';
  const sw = Math.min(ctx.measureText(slot).width + 12, 190);
  ctx.fillRect(CANVAS_W - pad - sw, pad + 8, sw, 24);
  ctx.fillStyle = '#0c4a6e';
  ctx.fillText(slot, CANVAS_W - pad - sw + 6, pad + 25, sw - 12);

  ctx.strokeStyle = '#0c4a6e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, 78);
  ctx.lineTo(CANVAS_W - pad, 78);
  ctx.stroke();

  ctx.fillStyle = '#0c4a6e';
  ctx.font = '900 36px Arial, Helvetica, sans-serif';
  ctx.fillText(copy.code, pad, 122, CANVAS_W - pad * 2);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 18px Arial, Helvetica, sans-serif';
  const lines = wrapText(ctx, copy.title, CANVAS_W - pad * 2, 2);
  lines.forEach((ln, i) => ctx.fillText(ln, pad, 158 + i * 22, CANVAS_W - pad * 2));

  if (copy.extra) {
    ctx.fillStyle = '#334155';
    ctx.font = '700 13px Arial, Helvetica, sans-serif';
    ctx.fillText(copy.extra, pad, CANVAS_H - 16, CANVAS_W - pad * 2);
  }
  return canvas;
}

function jpegBytes(canvas: HTMLCanvasElement): Uint8Array {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const b64 = dataUrl.split(',')[1] || '';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function ascii(s: string): Uint8Array {
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff;
  return u;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** PDF 1.4: cada JPEG es una página MediaBox 50×30 mm. */
function jpegPagesToPdf(jpegs: Uint8Array[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let pos = 0;
  const push = (part: Uint8Array | string) => {
    const b = typeof part === 'string' ? ascii(part) : part;
    chunks.push(b);
    pos += b.length;
  };
  const mark = () => {
    offsets.push(pos);
  };

  const n = jpegs.length;
  const pageIds: number[] = [];
  for (let i = 0; i < n; i++) pageIds.push(3 + i * 3);

  push('%PDF-1.4\n');
  mark();
  push(`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n`);
  mark();
  push(`2 0 obj << /Type /Pages /Count ${n} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >> endobj\n`);

  for (let i = 0; i < n; i++) {
    const pageId = 3 + i * 3;
    const contentId = pageId + 1;
    const imgId = pageId + 2;
    const jpeg = jpegs[i];
    const content = `q ${PT_W.toFixed(2)} 0 0 ${PT_H.toFixed(2)} 0 0 cm /Im1 Do Q`;
    mark();
    push(
      `${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PT_W.toFixed(2)} ${PT_H.toFixed(2)}] /Resources << /XObject << /Im1 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >> endobj\n`,
    );
    mark();
    push(`${contentId} 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj\n`);
    mark();
    push(
      `${imgId} 0 obj << /Type /XObject /Subtype /Image /Width ${CANVAS_W} /Height ${CANVAS_H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >> stream\n`,
    );
    push(jpeg);
    push(`\nendstream endobj\n`);
  }

  const xrefPos = pos;
  const objCount = 3 + n * 3;
  let xref = `xref\n0 ${objCount}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  push(xref);
  push(`trailer << /Size ${objCount} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);
  return concat(chunks);
}

async function printNiimbotPdf(items: RotuloItem[]): Promise<void> {
  if (!items.length) return;
  const logo = await loadLogo();
  const jpegs = items.map((it) => jpegBytes(paintLabel(labelCopy(it), logo)));
  const pdf = jpegPagesToPdf(jpegs);
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  alert(
    'Niimbot B1: en el diálogo pulsa «Más ajustes».\n' +
      'Papel: 50 × 30 mm · Márgenes: ninguno · Escala: 100% · Encabezados: no.\n' +
      'Si el preview es una franja ancha, NO imprimas: sigue en hoja grande y gasta el rollo.',
  );

  const win = window.open(url, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `marquilla-niimbot-50x30.pdf`;
    a.click();
    return;
  }
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* el visor PDF pide imprimir a mano */
    }
  }, 700);
}

export function printRotulo(item: RotuloItem): void {
  const itemWithId = {
    ...item,
    id: item.id || `${item.modulo}_${item.codigo}_${Date.now()}`,
  };
  addToPrintQueue(itemWithId);
  saveBatchToHistory([itemWithId]);
  void printNiimbotPdf([item]);
}

export function printQueue(clearAfter = false): void {
  const items = getPrintQueue();
  if (!items.length) return;
  saveBatchToHistory(items);
  void printNiimbotPdf(items);
  if (clearAfter) clearPrintQueue();
}

export function printSpecificBatch(items: Array<RotuloItem & { id: string }>): void {
  if (!items?.length) return;
  void printNiimbotPdf(items);
}
