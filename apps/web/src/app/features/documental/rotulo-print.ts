/** 
 * Rótulo físico de carpeta y lomo de libro — Portado y optimizado del SGD Coraza.
 * Genera tiras de corte exacto para:
 * 1. Lomo de Minutas: Con el CONSECUTIVO orientado verticalmente (bajando de arriba hacia abajo)
 *    para que nunca se corte en lomos estrechos de libros físicos, manteniendo el resto
 *    de datos (CORAZA C.T.A., nombre de puesto, fechas, estante) en su formato horizontal.
 * 2. Rótulo horizontal para carpetas legajadoras azules (Contratos y Asociados Retirados).
 * 3. Rótulo de radicación TRD para Correspondencia.
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

const COLA_KEY = 'colaTirasCoraza';

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

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripHtml(item: RotuloItem): string {
  const codClean = String(item.codigo || 'S/N').replace(/^#/, '');
  const cod = `#${codClean}`;
  const tit = (item.titulo || 'CARPETA DE ARCHIVO').toUpperCase();
  const slotRaw = (item.slotFisico || 'ESTANTE A').replace(/^VOXEL_/, '');
  const slot = slotRaw.startsWith('ESTANTE') ? slotRaw : `ESTANTE ${slotRaw}`;
  const fechas = item.fechas || '';
  const esMinuta = item.modulo.toUpperCase().includes('MINUTA');

  if (esMinuta) {
    // FORMATO 1: Lomo de Minutas
    // El consecutivo va BAJANDO verticalmente (top-to-bottom); el resto horizontal.
    return `
      <div class="tira-lomo-minuta">
        <div class="lomo-head">
          <div class="org-name">CORAZA C.T.A.</div>
        </div>

        <div class="lomo-consecutivo-box">
          <div class="consecutivo-bajando">${escapeHtml(cod)}</div>
        </div>

        <div class="lomo-info-horizontal">
          <div class="minuta-puesto-text">${escapeHtml(tit)}</div>
          ${fechas ? `<div class="minuta-fechas-text">${escapeHtml(fechas)}</div>` : ''}
          <div class="minuta-slot-text">MINUTAS · ${escapeHtml(slot)}</div>
        </div>

        <div class="lomo-foot">
          <div class="sys-tag">SGD CORAZA 2027</div>
        </div>
      </div>`;
  }

  // FORMATO 2: Rótulo Horizontal para Carpetas Legajadoras (Contratos / Retirados / Correspondencia)
  const modLabel = item.modulo.toUpperCase();
  return `
    <div class="rotulo-carpeta">
      <div class="carpeta-info">
        <div class="carpeta-mod-slot">
          <span>${escapeHtml(modLabel)}</span> · <strong>${escapeHtml(slot)}</strong>
        </div>
        <div class="carpeta-titulo">${escapeHtml(tit)}</div>
        <div class="carpeta-meta">
          ${item.nit ? `<span><strong>NIT/CC:</strong> ${escapeHtml(item.nit)}</span>` : ''}
          ${item.numContrato ? `<span><strong>CTO N°:</strong> ${escapeHtml(item.numContrato)}</span>` : ''}
          ${fechas ? `<span><strong>FECHAS:</strong> ${escapeHtml(fechas)}</span>` : ''}
        </div>
        <div class="carpeta-subfoot">CORAZA SEGURIDAD C.T.A. · ARCHIVO CENTRAL</div>
      </div>
      <div class="carpeta-code-box">
        <span class="code-lbl">CÓDIGO</span>
        <strong class="code-val">${escapeHtml(cod)}</strong>
        <span class="code-sub">SGD CORAZA</span>
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
    font-family: 'Segoe UI', Arial, sans-serif; 
    margin: 0; 
    padding: 12px; 
    background: #fff; 
    color: #000; 
  }
  .print-banner {
    font-size: 11px;
    font-weight: 700;
    color: #475569;
    border-bottom: 2px dashed #94a3b8;
    padding-bottom: 6px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
  }
  .print-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-start;
  }

  /* ========================================================= */
  /* FORMATO 1: LOMO MINUTAS — CONSECUTIVO BAJANDO VERTICAL    */
  /* Ancho 26mm x Alto 175mm (Ajuste óptimo al lomo del libro) */
  /* ========================================================= */
  .tira-lomo-minuta {
    width: 26mm;
    height: 175mm;
    border: 1.5px dashed #000000;
    border-radius: 4px;
    padding: 6px 3px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    background: #ffffff;
    page-break-inside: avoid;
    overflow: hidden;
  }
  .lomo-head {
    width: 100%;
    border-bottom: 1.5px solid #000000;
    padding-bottom: 4px;
  }
  .org-name {
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.05em;
    color: #000000;
    line-height: 1;
  }

  /* CONSECUTIVO BAJANDO (VERTICAL TOP-TO-BOTTOM) */
  .lomo-consecutivo-box {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 6px 0;
  }
  .consecutivo-bajando {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-size: 22px;
    font-weight: 900;
    color: #0284c7;
    letter-spacing: 0.08em;
    line-height: 1;
    white-space: nowrap;
  }

  .lomo-info-horizontal {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 0;
    border-top: 1px solid #cbd5e1;
  }
  .minuta-puesto-text {
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 1.2;
    word-break: break-word;
    color: #000000;
  }
  .minuta-fechas-text {
    font-size: 7.5px;
    font-weight: 700;
    color: #334155;
    line-height: 1.1;
  }
  .minuta-slot-text {
    font-size: 7.5px;
    font-weight: 900;
    color: #0284c7;
    text-transform: uppercase;
    line-height: 1.1;
  }

  .lomo-foot {
    width: 100%;
    border-top: 1.5px solid #000000;
    padding-top: 3px;
  }
  .sys-tag {
    font-size: 6.5px;
    font-weight: 700;
    color: #64748b;
    line-height: 1;
  }

  /* ========================================================= */
  /* FORMATO 2: RÓTULO HORIZONTAL PARA CARPETAS LEGAJADORAS    */
  /* ========================================================= */
  .rotulo-carpeta {
    width: 370px;
    height: 155px;
    border: 2px dashed #000;
    border-radius: 6px;
    padding: 8px;
    display: flex;
    justify-content: space-between;
    background: #ffffff;
    page-break-inside: avoid;
  }
  .carpeta-info {
    flex: 1;
    border: 1.5px solid #000;
    border-radius: 4px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
  }
  .carpeta-mod-slot {
    font-size: 9.5px;
    font-weight: 900;
    color: #0284c7;
    letter-spacing: 0.02em;
  }
  .carpeta-titulo {
    font-size: 13px;
    font-weight: 900;
    line-height: 1.2;
    text-transform: uppercase;
    word-break: break-word;
    color: #000000;
    margin: 2px 0;
  }
  .carpeta-meta {
    display: flex;
    flex-direction: column;
    gap: 1.5px;
    font-size: 9px;
    color: #1e293b;
  }
  .carpeta-subfoot {
    font-size: 7px;
    color: #64748b;
    font-weight: 700;
    letter-spacing: 0.04em;
    border-top: 0.5px solid #cbd5e1;
    padding-top: 3px;
    margin-top: 3px;
  }
  .carpeta-code-box {
    width: 85px;
    border: 2px solid #0284c7;
    background: #f0f9ff;
    border-radius: 4px;
    margin-left: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 4px;
  }
  .code-lbl {
    font-size: 7.5px;
    font-weight: 900;
    color: #0369a1;
    letter-spacing: 0.05em;
  }
  .code-val {
    font-size: 22px;
    font-weight: 900;
    color: #0284c7;
    line-height: 1.1;
    margin: 3px 0;
    word-break: break-all;
  }
  .code-sub {
    font-size: 7px;
    font-weight: 800;
    color: #64748b;
  }

  @media print {
    body { padding: 0; }
    .print-banner { display: none; }
  }
`;

export function printRotulo(item: RotuloItem): void {
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

export function printQueue(): void {
  const items = getPrintQueue();
  if (!items.length) return;
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
  clearPrintQueue();
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
