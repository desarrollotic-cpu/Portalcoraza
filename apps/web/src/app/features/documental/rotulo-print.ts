/** Rótulo físico de carpeta — portado del SGD (`_construirEImprimirRotulo` / cola de tiras). */

export interface RotuloItem {
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
}

export function getPrintQueue(): Array<RotuloItem & { id: string }> {
  return JSON.parse(localStorage.getItem(COLA_KEY) || '[]');
}

export function clearPrintQueue(): void {
  localStorage.setItem(COLA_KEY, '[]');
}

function stripHtml(item: RotuloItem): string {
  const cod = String(item.codigo || 'S/N').replace(/^#/, '');
  const titulo = (item.titulo || 'CARPETA ARCHIVO').toUpperCase();
  const slot = (item.slotFisico || 'A').replace(/^VOXEL_/, '');
  const fechas = item.fechas || 'S/F';
  const esMinuta = item.modulo.toUpperCase().includes('MINUTA');

  if (esMinuta) {
    // Tira vertical libro de minutas — 3.5cm × 10.5cm
    return `
      <div class="strip minuta">
        <div class="head">CORAZA C.T.A.</div>
        <div class="code">#${cod}</div>
        <div class="title">${escapeHtml(titulo)}</div>
        <div class="meta">${escapeHtml(fechas)}</div>
        <div class="foot">MINUTAS · EST. ${escapeHtml(slot)}</div>
        <div class="ver">SGD CORAZA</div>
      </div>`;
  }

  const mod = item.modulo.toUpperCase();
  return `
    <div class="strip carpeta">
      <div class="head">${escapeHtml(mod)} · ESTANTE ${escapeHtml(slot)}</div>
      <div class="title">${escapeHtml(titulo)}</div>
      <div class="meta">
        ${item.nit ? 'NIT/CC: ' + escapeHtml(item.nit) : ''}
        ${item.numContrato ? ' | Cto. N°: ' + escapeHtml(item.numContrato) : ''}
      </div>
      <div class="meta">${escapeHtml(fechas)}</div>
      <div class="code-box">
        <span>CÓDIGO</span>
        <strong>${escapeHtml(cod)}</strong>
        <em>CORAZA CTA</em>
      </div>
    </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PRINT_CSS = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: #fff; color: #000; }
  .hint { font-size: 11px; color: #555; margin-bottom: 12px; border-bottom: 1px dashed #999; padding-bottom: 8px; }
  .strip.minuta {
    width: 3.5cm; height: 10.5cm; border: 2px solid #000; padding: 6px 4px;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    justify-content: space-between; page-break-inside: avoid;
  }
  .strip.minuta .head { font-size: 9px; font-weight: 800; letter-spacing: .04em; }
  .strip.minuta .code { font-size: 16px; font-weight: 900; }
  .strip.minuta .title { font-size: 11px; font-weight: 700; writing-mode: horizontal-tb; word-break: break-word; }
  .strip.minuta .meta { font-size: 8px; }
  .strip.minuta .foot { font-size: 8px; font-weight: 700; }
  .strip.minuta .ver { font-size: 7px; color: #444; }
  .strip.carpeta {
    width: 9.5cm; height: 4.2cm; border: 2px solid #000; padding: 6px 8px;
    display: grid; grid-template-columns: 1fr auto; gap: 4px; page-break-inside: avoid;
  }
  .strip.carpeta .head { font-size: 9px; font-weight: 800; grid-column: 1 / -1; }
  .strip.carpeta .title { font-size: 13px; font-weight: 800; }
  .strip.carpeta .meta { font-size: 9px; grid-column: 1; }
  .strip.carpeta .code-box {
    grid-row: 2 / 5; grid-column: 2; border: 1px solid #000; padding: 4px 6px;
    text-align: center; display: flex; flex-direction: column; justify-content: center;
  }
  .strip.carpeta .code-box span { font-size: 7px; }
  .strip.carpeta .code-box strong { font-size: 16px; }
  .strip.carpeta .code-box em { font-size: 7px; font-style: normal; }
  @media print { body { padding: 0; } @page { margin: 8mm; } .hint { display: none; } }
`;

/** Abre el diálogo de impresión del navegador con el rótulo. */
export function printRotulo(item: RotuloItem): void {
  const html = `
    <div class="hint">CORAZA SEGURIDAD C.T.A. — RÓTULO OFICIAL. Imprima, recorte y pegue en la carpeta física.</div>
    ${stripHtml(item)}
  `;
  printHtml(html, `Rótulo #${item.codigo} - ${item.titulo}`);
}

/** Imprime todas las tiras de la cola (una hoja) y vacía la cola. */
export function printQueue(): void {
  const items = getPrintQueue();
  if (!items.length) return;
  const html = `
    <div class="hint">CORAZA SEGURIDAD C.T.A. — LOTE DE TIRAS. Imprima, corte por la línea y pegue en las carpetas.</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">${items.map(stripHtml).join('')}</div>
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
