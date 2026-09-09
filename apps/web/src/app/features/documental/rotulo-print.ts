/**
 * Marquillas Documental para impresora térmica Niimbot: 50 mm × 30 mm.
 * Minutas, carpetas (contratos/personal) y correspondencia usan el mismo tamaño.
 * Cola e historial de lotes se conservan para reimpresión.
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

const COLA_KEY = 'colaTirasCoraza';
const HISTORIAL_KEY = 'historialLotesCoraza';

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

/** Guarda un lote en el historial persistente de reimpresión (guarda los últimos 15 lotes). */
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

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function niimLabel(kind: string, code: string, title: string, slot: string, extra = ''): string {
  const logo = '/brand/logo-coraza-cta.png';
  return `
    <div class="rotulo-niim">
      <div class="niim-head">
        <img class="niim-logo" src="${logo}" alt="Coraza" />
        <div class="niim-brand">
          <strong>CORAZA C.T.A.</strong>
          <span>${escapeHtml(kind)}</span>
        </div>
        <div class="niim-slot">${escapeHtml(slot)}</div>
      </div>
      <div class="niim-code">${escapeHtml(code)}</div>
      <div class="niim-tit">${escapeHtml(title)}</div>
      ${extra ? `<div class="niim-meta">${extra}</div>` : ''}
    </div>`;
}

function stripHtml(item: RotuloItem): string {
  const codClean = String(item.codigo || 'S/N').replace(/^#/, '');
  const tit = (item.titulo || 'CARPETA DE ARCHIVO').toUpperCase();
  const slotRaw = (item.slotFisico || 'ESTANTE A').replace(/^VOXEL_/, '');
  const slot = slotRaw.startsWith('ESTANTE') ? slotRaw : `ESTANTE ${slotRaw}`;
  const fechas = item.fechas || '';
  const mod = item.modulo.toUpperCase();
  const extraParts = [fechas, slot].filter(Boolean);

  if (mod.includes('MINUTA')) {
    const matchDigits = codClean.match(/\d+$/);
    const digits = (matchDigits ? matchDigits[0] : codClean).padStart(4, '0');
    return niimLabel('MINUTAS', digits, tit, slot, extraParts.join(' · '));
  }

  if (mod.includes('CORRESPONDENCIA')) {
    return niimLabel('CORRESPONDENCIA', codClean, tit, slot, extraParts.join(' · '));
  }

  const extras: string[] = [];
  if (item.nit) extras.push(`NIT/CC ${escapeHtml(item.nit)}`);
  if (item.numContrato) extras.push(`CTO ${escapeHtml(item.numContrato)}`);
  if (fechas) extras.push(escapeHtml(fechas));
  return niimLabel(mod, `#${codClean}`, tit, slot, extras.join(' · '));
}

const PRINT_CSS = `
  @page { size: 50mm 30mm; margin: 0; }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    width: 50mm;
    height: 30mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #fff;
    color: #0f172a;
    font-family: Arial, Helvetica, sans-serif;
  }
  .rotulo-niim {
    width: 50mm;
    height: 30mm;
    padding: 1.4mm 1.6mm;
    margin: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0.6mm;
    background: #fff;
    page-break-inside: avoid;
  }
  .rotulo-niim + .rotulo-niim { page-break-before: always; }
  .niim-head {
    display: flex;
    align-items: center;
    gap: 1.2mm;
    min-height: 5.5mm;
    border-bottom: 0.25mm solid #0c4a6e;
    padding-bottom: 0.5mm;
  }
  .niim-logo {
    width: 5.2mm;
    height: 5.2mm;
    object-fit: contain;
    flex-shrink: 0;
  }
  .niim-brand {
    flex: 1;
    min-width: 0;
  }
  .niim-brand strong {
    display: block;
    font-size: 5.5pt;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: 0.02em;
  }
  .niim-brand span {
    display: block;
    font-size: 4.5pt;
    font-weight: 800;
    color: #0369a1;
    text-transform: uppercase;
  }
  .niim-slot {
    font-size: 4.5pt;
    font-weight: 800;
    text-transform: uppercase;
    color: #0c4a6e;
    background: #e0f2fe;
    padding: 0.3mm 0.8mm;
    max-width: 16mm;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .niim-code {
    font-size: 9pt;
    font-weight: 900;
    letter-spacing: 0.04em;
    color: #0c4a6e;
    line-height: 1.05;
    word-break: break-all;
  }
  .niim-tit {
    font-size: 6pt;
    font-weight: 800;
    text-transform: uppercase;
    line-height: 1.12;
    max-height: 8.2mm;
    overflow: hidden;
  }
  .niim-meta {
    font-size: 4.5pt;
    font-weight: 700;
    color: #334155;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: auto;
  }
`;

export function printRotulo(item: RotuloItem): void {
  const itemWithId = {
    ...item,
    id: item.id || `${item.modulo}_${item.codigo}_${Date.now()}`,
  };
  addToPrintQueue(itemWithId);
  saveBatchToHistory([itemWithId]);

  printLabels(stripHtml(item), `Rótulo #${item.codigo}`);
}

export function printQueue(clearAfter = false): void {
  const items = getPrintQueue();
  if (!items.length) return;

  saveBatchToHistory(items);

  printLabels(items.map(stripHtml).join(''), `Lote ${items.length} marquillas`);

  if (clearAfter) {
    clearPrintQueue();
  }
}

export function printSpecificBatch(items: Array<RotuloItem & { id: string }>): void {
  if (!items || !items.length) return;
  printLabels(items.map(stripHtml).join(''), `Reimpresión ${items.length} marquillas`);
}

function printLabels(labelsHtml: string, title: string): void {
  const win = window.open('', '_blank', 'width=420,height=320');
  if (!win) {
    alert('Permite ventanas emergentes para imprimir la marquilla 50 × 30 mm.');
    return;
  }

  win.document.open();
  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>${labelsHtml}</body>
</html>`);
  win.document.close();

  const startPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* el usuario cierra el diálogo */
    }
  };

  const imgs = Array.from(win.document.images);
  if (!imgs.length) {
    setTimeout(startPrint, 200);
    return;
  }
  let left = imgs.length;
  const done = () => {
    left -= 1;
    if (left <= 0) setTimeout(startPrint, 150);
  };
  for (const img of imgs) {
    if (img.complete) done();
    else {
      img.addEventListener('load', done);
      img.addEventListener('error', done);
    }
  }
}
