/** 
 * Rótulo físico de carpeta y lomo de libro — Portado y optimizado del SGD Coraza.
 * Genera tiras de corte exacto para:
 * 1. Lomo vertical de Minutas: Ajustado a 22mm de ancho real para libros físicos,
 *    con consecutivo gigante arriba y texto/puesto legible orientado hacia abajo (top-to-bottom)
 *    para que cuando el libro esté en el estante A se identifique de inmediato.
 * 2. Rótulo horizontal para carpetas legajadoras azules (Contratos y Asociados Retirados).
 * 3. Rótulo de radicación TRD para Correspondencia.
 * Incluye sistema de "Cola de Tiras" para imprimir en lote en hojas tamaño Carta.
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
  const tit = (item.titulo || 'CARPETA DE ARCHIVO').toUpperCase();
  const slotRaw = (item.slotFisico || 'ESTANTE A').replace(/^VOXEL_/, '');
  const slot = slotRaw.startsWith('ESTANTE') ? slotRaw : `ESTANTE ${slotRaw}`;
  const fechas = item.fechas || '';
  const esMinuta = item.modulo.toUpperCase().includes('MINUTA');

  if (esMinuta) {
    // Extraer número consecutivo (ej. de MIN-SER-0529 -> 0529 o #529)
    const matchNum = codClean.match(/\d+$/);
    const numGrande = matchNum ? `#${matchNum[0]}` : `#${codClean}`;

    let tipoLabel = 'MINUTA';
    if (codClean.includes('SER') || tit.includes('SERVICIO')) tipoLabel = 'SERVICIO';
    else if (codClean.includes('VIS') || tit.includes('VISITANTE')) tipoLabel = 'VISITANTES';
    else if (codClean.includes('COR') || tit.includes('CORRESPONDENCIA')) tipoLabel = 'RECEPCIÓN';

    // FORMATO 1: Lomo Vertical para Libro Minuta (22mm de ancho x 160mm de alto)
    // Texto del puesto y vigencia corren verticalmente hacia abajo para lectura natural en el estante
    return `
      <div class="tira-lomo-minuta">
        <div class="lomo-top">
          <div class="lomo-org">CORAZA C.T.A.</div>
          <div class="lomo-tipo">${escapeHtml(tipoLabel)}</div>
          <div class="lomo-numero-grande">${escapeHtml(numGrande)}</div>
        </div>

        <div class="lomo-cuerpo-vertical">
          <div class="lomo-texto-vertical">${escapeHtml(tit)}</div>
          ${fechas ? `<div class="lomo-fechas-vertical">${escapeHtml(fechas)}</div>` : ''}
          <div class="lomo-codigo-vertical">${escapeHtml(codClean)}</div>
        </div>

        <div class="lomo-footer">
          <div class="lomo-slot">${escapeHtml(slot)}</div>
          <div class="lomo-version">SGD CORAZA</div>
        </div>
      </div>`;
  }

  // FORMATO 2: Rótulo Horizontal para Carpetas Legajadoras (Contratos / Retirados / Correspondencia)
  const cod = `#${codClean}`;
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
    gap: 10px;
    align-items: flex-start;
  }

  /* ========================================================= */
  /* FORMATO 1: LOMO VERTICAL NAVEGABLE PARA LIBROS DE MINUTAS  */
  /* Ancho 24mm x Alto 170mm (Ajuste exacto al lomo físico)    */
  /* ========================================================= */
  .tira-lomo-minuta {
    width: 24mm;
    height: 170mm;
    border: 1.5px dashed #000000;
    border-radius: 4px;
    padding: 5px 2px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    background: #ffffff;
    page-break-inside: avoid;
    overflow: hidden;
  }
  .lomo-top {
    width: 100%;
    border-bottom: 1.5px solid #000000;
    padding-bottom: 3px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .lomo-org {
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 0.04em;
    color: #000000;
    line-height: 1;
  }
  .lomo-tipo {
    font-size: 7.5px;
    font-weight: 900;
    background: #0284c7;
    color: #ffffff;
    padding: 1px 3px;
    border-radius: 2px;
    margin-top: 2px;
    text-transform: uppercase;
    line-height: 1;
  }
  .lomo-numero-grande {
    font-size: 20px;
    font-weight: 900;
    color: #0284c7;
    line-height: 1.05;
    margin-top: 2px;
    letter-spacing: -0.03em;
  }

  .lomo-cuerpo-vertical {
    flex: 1;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 2px;
    padding: 4px 0;
    overflow: hidden;
  }
  /* TEXTO ORIENTADO HACIA ABAJO (TOP-TO-BOTTOM) A LO LARGO DEL LOMO */
  .lomo-texto-vertical {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #000000;
    white-space: nowrap;
    max-height: 95mm;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1;
  }
  .lomo-fechas-vertical {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-size: 8px;
    font-weight: 700;
    color: #475569;
    white-space: nowrap;
    max-height: 90mm;
    line-height: 1;
  }
  .lomo-codigo-vertical {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-size: 7px;
    font-weight: 800;
    color: #0284c7;
    white-space: nowrap;
    max-height: 85mm;
    line-height: 1;
  }

  .lomo-footer {
    width: 100%;
    border-top: 1.5px solid #000000;
    padding-top: 3px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .lomo-slot {
    font-size: 7.5px;
    font-weight: 900;
    color: #0284c7;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .lomo-version {
    font-size: 6px;
    color: #64748b;
    font-weight: 700;
    line-height: 1;
    margin-top: 1px;
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
