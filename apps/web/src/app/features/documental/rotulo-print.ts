/** 
 * Rótulo físico de carpeta y lomo de libro — Medidas y diseño 100% original del SGD Coraza.
 * - Minutas: Medida exacta original de 130px x 390px (3.5cm x 10.5cm), con consecutivo
 *   numérico apilado verticalmente (- / 0 / 0 / 9 / 8) dentro de la cabecera.
 * - Carpetas legajadoras: Medida exacta original de 380px x 160px (9.5cm x 4.2cm).
 * - Sistema de Cola y Memoria: Guarda automáticamente un HISTORIAL de lotes impresos
 *   para poder reimprimir cualquier lote anterior en caso de fallos de impresora o reimpresiones.
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
  if (historial.length > 15) historial.pop(); // Mantener últimos 15 lotes
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

function stripHtml(item: RotuloItem): string {
  const codClean = String(item.codigo || 'S/N').replace(/^#/, '');
  const tit = (item.titulo || 'CARPETA DE ARCHIVO').toUpperCase();
  const slotRaw = (item.slotFisico || 'ESTANTE A').replace(/^VOXEL_/, '');
  const slot = slotRaw.startsWith('ESTANTE') ? slotRaw : `ESTANTE ${slotRaw}`;
  const fechas = item.fechas || '';
  const esMinuta = item.modulo.toUpperCase().includes('MINUTA');

  if (esMinuta) {
    // Extraer únicamente los dígitos numéricos del consecutivo (ej. 0098 o 0529)
    const matchDigits = codClean.match(/\d+$/);
    const digits = (matchDigits ? matchDigits[0] : codClean).padStart(4, '0');
    const digitsList = digits.split('');

    // FORMATO 1: Medidas exactas originales (130px x 390px / 3.5cm x 10.5cm)
    return `
      <div class="strip-minuta-orig">
        <div class="strip-minuta-head">
          <div class="strip-org">CORAZA C.T.A.</div>
          <div class="strip-digits-col">
            <div class="strip-dash">-</div>
            ${digitsList.map((d) => `<div class="strip-num">${escapeHtml(d)}</div>`).join('')}
          </div>
        </div>
        <div class="strip-tit">${escapeHtml(tit)}</div>
        ${fechas ? `<div class="strip-fec">${escapeHtml(fechas)}</div>` : ''}
        <div class="strip-slot">MINUTAS · ${escapeHtml(slot)}</div>
        <div class="strip-ver">SGD CORAZA 2027</div>
      </div>`;
  }

  // FORMATO 2: Medidas exactas originales de Carpeta Legajadora (380px x 160px / 9.5cm x 4.2cm)
  const cod = `#${codClean}`;
  const modLabel = item.modulo.toUpperCase();
  return `
    <div class="rotulo-carpeta-orig">
      <div class="carpeta-orig-left">
        <div class="carpeta-orig-mod">${escapeHtml(modLabel)} · ${escapeHtml(slot)}</div>
        <div class="carpeta-orig-tit">${escapeHtml(tit)}</div>
        <div class="carpeta-orig-meta">
          ${item.nit ? `<span>NIT/CC: ${escapeHtml(item.nit)}</span>` : ''}
          ${item.numContrato ? `<span> | Contrato N° ${escapeHtml(item.numContrato)}</span>` : ''}
        </div>
        ${fechas ? `<div class="carpeta-orig-meta">${escapeHtml(fechas)}</div>` : ''}
      </div>
      <div class="carpeta-orig-right">
        <div class="carpeta-orig-lbl">CÓDIGO</div>
        <div class="carpeta-orig-cod">${escapeHtml(cod)}</div>
        <div class="carpeta-orig-sub">CORAZA CTA</div>
      </div>
    </div>`;
}

const PRINT_CSS = `
  * { 
    box-sizing: border-box; 
    -webkit-print-color-adjust: exact !important; 
    print-color-adjust: exact !important; 
  }
  @page {
    size: letter portrait;
    margin: 8mm;
  }
  body { 
    font-family: Arial, Helvetica, sans-serif; 
    margin: 0; 
    padding: 8px; 
    background: #fff; 
    color: #000; 
  }
  .print-banner {
    font-size: 11px;
    font-weight: 700;
    color: #475569;
    border-bottom: 2px dashed #94a3b8;
    padding-bottom: 6px;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
  }
  .print-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: flex-start;
  }

  /* ========================================================= */
  /* MINUTAS — MEDIDAS ORIGINALES: 130px x 390px (3.5cm x 10.5cm)*/
  /* ========================================================= */
  .strip-minuta-orig {
    border: 2px dashed #000000;
    width: 130px;
    height: 390px;
    padding: 8px;
    margin: 4px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    page-break-inside: avoid;
    border-radius: 4px;
    background: #ffffff;
  }
  .strip-minuta-head {
    width: 100%;
    border-bottom: 2px solid #000000;
    padding-bottom: 4px;
  }
  .strip-org {
    font-size: 0.65rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    color: #000000;
  }
  .strip-digits-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
    line-height: 1;
  }
  .strip-dash {
    font-size: 1.2rem;
    font-weight: 900;
    color: #000000;
    line-height: 0.8;
    margin-bottom: 2px;
  }
  .strip-num {
    font-size: 1.7rem;
    font-weight: 900;
    color: #0284c7;
    line-height: 1.05;
  }
  .strip-tit {
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 1.2;
    word-break: break-word;
    color: #000000;
  }
  .strip-fec {
    font-size: 0.62rem;
    font-weight: 700;
    color: #334155;
  }
  .strip-slot {
    font-size: 0.6rem;
    font-weight: 800;
    color: #0284c7;
    text-transform: uppercase;
  }
  .strip-ver {
    border-top: 1px solid #000000;
    width: 100%;
    padding-top: 4px;
    font-size: 0.55rem;
    font-weight: 700;
    color: #475569;
  }

  /* ========================================================= */
  /* CARPETAS — MEDIDAS ORIGINALES: 380px x 160px (9.5cm x 4.2cm)*/
  /* ========================================================= */
  .rotulo-carpeta-orig {
    border: 2px dashed #000000;
    width: 380px;
    height: 160px;
    padding: 8px;
    margin: 4px;
    display: flex;
    justify-content: space-between;
    page-break-inside: avoid;
    border-radius: 4px;
    background: #ffffff;
  }
  .carpeta-orig-left {
    flex: 1;
    border: 1.5px solid #000000;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-radius: 4px;
    min-width: 0;
  }
  .carpeta-orig-mod {
    font-size: 0.65rem;
    font-weight: 900;
    color: #0284c7;
    text-transform: uppercase;
  }
  .carpeta-orig-tit {
    font-size: 0.85rem;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 1.2;
    word-break: break-word;
    color: #000000;
  }
  .carpeta-orig-meta {
    font-size: 0.65rem;
    font-weight: 700;
    color: #1e293b;
  }
  .carpeta-orig-right {
    width: 80px;
    border: 2px solid #0284c7;
    background: #eff6ff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-left: 6px;
    border-radius: 4px;
    text-align: center;
    padding: 4px;
  }
  .carpeta-orig-lbl {
    font-size: 0.52rem;
    font-weight: 900;
    color: #0369a1;
  }
  .carpeta-orig-cod {
    font-size: 1.8rem;
    font-weight: 900;
    color: #0284c7;
    line-height: 1.1;
    margin: 3px 0;
  }
  .carpeta-orig-sub {
    font-size: 0.52rem;
    font-weight: 800;
    color: #64748b;
  }

  @media print {
    body { padding: 0; }
    .print-banner { display: none; }
  }
`;

export function printRotulo(item: RotuloItem): void {
  const itemWithId = {
    ...item,
    id: item.id || `${item.modulo}_${item.codigo}_${Date.now()}`,
  };
  addToPrintQueue(itemWithId);
  saveBatchToHistory([itemWithId]);

  const html = `
    <div class="print-banner">
      <span>CORAZA SEGURIDAD C.T.A. — RÓTULO OFICIAL DE ARCHIVO</span>
      <span>✂️ Recorte por la línea punteada</span>
    </div>
    <div class="print-grid">
      ${stripHtml(item)}
    </div>
  `;
  printHtml(html, `Rótulo #${item.codigo} - ${item.titulo}`);
}

/** 
 * Imprime las tiras acumuladas.
 * Guarda una copia en el historial de lotes para poder reimprimir cuando se desee.
 * NO borra la cola automáticamente a menos que el usuario lo solicite.
 */
export function printQueue(clearAfter = false): void {
  const items = getPrintQueue();
  if (!items.length) return;
  
  // Guardar en historial antes de imprimir
  saveBatchToHistory(items);

  const html = `
    <div class="print-banner">
      <span>CORAZA SEGURIDAD C.T.A. — LOTE DE TIRAS (${items.length} Rótulos)</span>
      <span>✂️ Recorte por las líneas punteadas · Ahorro de Papel</span>
    </div>
    <div class="print-grid">
      ${items.map(stripHtml).join('')}
    </div>
  `;
  printHtml(html, `Lote de ${items.length} rótulos - Coraza`);

  if (clearAfter) {
    clearPrintQueue();
  }
}

/** Imprime directamente un lote específico del historial. */
export function printSpecificBatch(items: Array<RotuloItem & { id: string }>): void {
  if (!items || !items.length) return;
  const html = `
    <div class="print-banner">
      <span>CORAZA SEGURIDAD C.T.A. — REIMPRESIÓN DE LOTE (${items.length} Rótulos)</span>
      <span>✂️ Recorte por las líneas punteadas</span>
    </div>
    <div class="print-grid">
      ${items.map(stripHtml).join('')}
    </div>
  `;
  printHtml(html, `Reimpresión de Lote (${items.length} rótulos) - Coraza`);
}

function printHtml(content: string, title: string): void {
  const existing = document.getElementById('iframePrintCoraza');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'iframePrintCoraza';
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: 'none',
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow!.document;
  doc.open();
  doc.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head><body>${content}</body></html>`);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
    } catch {
      window.print();
    }
  }, 350);
}
