import { Injectable } from '@angular/core';

export interface SstPdfItem {
  codigo: number;
  categoria: string;
  pregunta: string;
  valoracion: string;
  hallazgo?: string;
  planAccionPropuesto?: string;
  responsablePlanAccion?: string;
  fechaCompromiso?: string;
  evidencias?: string[];
}

export interface SstPdfData {
  id: string;
  tipo: string;
  fecha: string;
  clienteNombre: string;
  puestoNombre: string;
  ciudad: string;
  tipoPuesto: string;
  responsableNombre: string;
  responsableCargo?: string;
  observacionesGenerales?: string;
  cumplimientoGlobal?: string | number | null;
  nivelRiesgo?: string | null;
  items: SstPdfItem[];
}

@Injectable({ providedIn: 'root' })
export class SstPdfService {
  /**
   * Genera y abre el documento formal con Membrete Institucional Coraza
   * listo para imprimir o guardar como PDF en un clic.
   */
  generateAndPrintPdf(data: SstPdfData): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permite las ventanas emergentes (popups) para generar el PDF.');
      return;
    }

    const htmlContent = this.buildReportHtml(data);
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Esperar a que carguen imágenes y fuentes antes de lanzar el diálogo de impresión / guardado PDF
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  }

  private buildReportHtml(d: SstPdfData): string {
    const total = d.items.length || 34;
    const seguro = d.items.filter((i) => i.valoracion === 'SEGURO').length;
    const riesgoso = d.items.filter((i) => i.valoracion === 'RIESGOSO').length;
    const na = d.items.filter((i) => i.valoracion === 'N_A' || i.valoracion === 'N/A').length;

    const evalCount = seguro + riesgoso;
    const percent =
      d.cumplimientoGlobal != null
        ? d.cumplimientoGlobal
        : evalCount > 0
          ? Math.round((seguro / evalCount) * 100)
          : 0;

    const nivelRiesgo =
      d.nivelRiesgo ||
      (Number(percent) >= 85 ? 'BAJO' : Number(percent) >= 70 ? 'MEDIO' : 'ALTO');

    const colorRiesgo =
      nivelRiesgo === 'BAJO' ? '#15803d' : nivelRiesgo === 'MEDIO' ? '#ca8a04' : '#b91c1c';

    const bgRiesgo =
      nivelRiesgo === 'BAJO' ? '#dcfce7' : nivelRiesgo === 'MEDIO' ? '#fef9c3' : '#fee2e2';

    // Agrupar ítems por categoría
    const categoriesMap = new Map<string, SstPdfItem[]>();
    for (const item of d.items) {
      const cat = item.categoria || 'Otras condiciones';
      const list = categoriesMap.get(cat) ?? [];
      list.push(item);
      categoriesMap.set(cat, list);
    }

    // Filtrar ítems riesgosos para la sección de hallazgos y fotos
    const hallazgosItems = d.items.filter((i) => i.valoracion === 'RIESGOSO');

    // Filas de las 34 preguntas
    let tableCategoriesHtml = '';
    for (const [catName, catItems] of categoriesMap.entries()) {
      tableCategoriesHtml += `
        <tr class="cat-header-row">
          <th colspan="3">${this.escape(catName)}</th>
        </tr>
      `;
      for (const it of catItems) {
        const valClass =
          it.valoracion === 'SEGURO'
            ? 'val-seguro'
            : it.valoracion === 'RIESGOSO'
              ? 'val-riesgoso'
              : 'val-na';
        const valLabel =
          it.valoracion === 'SEGURO'
            ? 'SEGURO'
            : it.valoracion === 'RIESGOSO'
              ? 'RIESGOSO'
              : 'N/A';

        tableCategoriesHtml += `
          <tr class="item-row ${it.valoracion === 'RIESGOSO' ? 'row-highlight-risk' : ''}">
            <td class="col-code">#${it.codigo}</td>
            <td class="col-desc">${this.escape(it.pregunta)}</td>
            <td class="col-val"><span class="badge-val ${valClass}">${valLabel}</span></td>
          </tr>
        `;
      }
    }

    // Sección de Hallazgos y Fotografías
    let hallazgosHtml = '';
    if (hallazgosItems.length > 0) {
      hallazgosHtml = `
        <div class="section-title">DETALLE DE HALLAZGOS Y EVIDENCIAS FOTOGRÁFICAS</div>
        <div class="hallazgos-grid">
          ${hallazgosItems
            .map((h) => {
              let photosHtml = '';
              if (h.evidencias && h.evidencias.length > 0) {
                photosHtml = `
                  <div class="photos-container">
                    ${h.evidencias
                      .map(
                        (src) => `
                      <div class="photo-card">
                        <img src="${src}" alt="Evidencia fotográfica" />
                        <div class="photo-caption">Evidencia # ${h.codigo}</div>
                      </div>
                    `,
                      )
                      .join('')}
                  </div>
                `;
              }

              return `
                <div class="hallazgo-card">
                  <div class="hallazgo-header">
                    <span class="hallazgo-badge">ÍTEM #${h.codigo}</span>
                    <span class="hallazgo-question">${this.escape(h.pregunta)}</span>
                  </div>
                  <div class="hallazgo-body">
                    <div class="h-row">
                      <strong class="label-danger">Hallazgo identificado:</strong>
                      <p class="h-text">${this.escape(h.hallazgo || 'Condición de riesgo observada')}</p>
                    </div>
                    <div class="h-row">
                      <strong class="label-success">Plan de acción propuesto:</strong>
                      <p class="h-text">${this.escape(h.planAccionPropuesto || 'Acción correctiva establecida')}</p>
                    </div>
                    <div class="h-meta-grid">
                      <div><strong>Responsable:</strong> ${this.escape(h.responsablePlanAccion || 'Operaciones / SST')}</div>
                      <div><strong>Fecha límite:</strong> ${this.escape(h.fechaCompromiso || 'Inmediato')}</div>
                    </div>
                    ${photosHtml}
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    } else {
      hallazgosHtml = `
        <div class="section-title">DETALLE DE HALLAZGOS Y EVIDENCIAS FOTOGRÁFICAS</div>
        <div class="no-hallazgos-box">
          ✓ No se evidenciaron hallazgos riesgosos durante la inspección planeada. Todas las condiciones evaluadas cumplen con los estándares de seguridad.
        </div>
      `;
    }

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>IPT_${this.cleanFileName(d.puestoNombre)}_${d.fecha}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
      font-size: 9.5pt;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #fff;
      line-height: 1.35;
    }

    /* Membrete Oficial */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f766e;
      margin-bottom: 12px;
    }
    .header-table td {
      padding: 6px 10px;
      border: 1px solid #0f766e;
      vertical-align: middle;
    }
    .logo-cell {
      width: 130px;
      text-align: center;
      background: #f8fafc;
    }
    .logo-img {
      max-width: 110px;
      max-height: 55px;
      object-fit: contain;
    }
    .title-cell {
      text-align: center;
    }
    .title-cell h1 {
      margin: 0;
      font-size: 11.5pt;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: 0.02em;
    }
    .title-cell h2 {
      margin: 2px 0 0;
      font-size: 8pt;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
    }
    .title-cell .slogan {
      font-size: 7.5pt;
      font-style: italic;
      color: #0f766e;
      margin-top: 1px;
    }
    .title-cell .supervigilancia {
      font-size: 6.8pt;
      color: #64748b;
      margin-top: 2px;
    }
    .meta-cell {
      width: 125px;
      font-size: 7.5pt;
      background: #f8fafc;
    }
    .meta-cell div {
      margin-bottom: 2px;
    }
    .meta-cell strong {
      color: #0f766e;
    }

    /* Ficha Técnica */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 10px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 10px;
      font-size: 8.5pt;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .info-val {
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Resumen de Cumplimiento */
    .kpi-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 12px;
      margin-bottom: 12px;
    }
    .kpi-stats {
      display: flex;
      gap: 12px;
      font-size: 8.5pt;
      font-weight: 600;
    }
    .kpi-cumplimiento {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pct-val {
      font-size: 13pt;
      font-weight: 800;
      color: #0f766e;
    }
    .risk-badge {
      font-size: 8pt;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid ${colorRiesgo};
      background: ${bgRiesgo};
      color: ${colorRiesgo};
      text-transform: uppercase;
    }

    /* Tabla de 34 Ítems */
    .section-title {
      font-size: 9pt;
      font-weight: 800;
      color: #0f766e;
      background: #f0fdfa;
      border-left: 4px solid #0f766e;
      padding: 3px 8px;
      margin: 10px 0 6px;
      text-transform: uppercase;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-bottom: 12px;
    }
    .items-table th, .items-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
    }
    .cat-header-row th {
      background: #e2e8f0;
      color: #1e293b;
      text-align: left;
      font-size: 8pt;
      font-weight: 700;
      padding: 4px 6px;
    }
    .col-code {
      width: 32px;
      text-align: center;
      font-weight: 800;
      color: #0f766e;
    }
    .col-desc {
      color: #1e293b;
    }
    .col-val {
      width: 80px;
      text-align: center;
    }
    .badge-val {
      display: inline-block;
      font-size: 7pt;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .val-seguro {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }
    .val-riesgoso {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fca5a5;
    }
    .val-na {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #cbd5e1;
    }
    .row-highlight-risk {
      background: #fff1f2;
    }

    /* Hallazgos y Fotos */
    .hallazgos-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 12px;
      page-break-inside: auto;
    }
    .hallazgo-card {
      border: 1.5px solid #f87171;
      border-radius: 5px;
      background: #fff;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .hallazgo-header {
      background: #fef2f2;
      border-bottom: 1px solid #fecaca;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .hallazgo-badge {
      background: #dc2626;
      color: #fff;
      font-size: 7pt;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .hallazgo-question {
      font-size: 8.5pt;
      font-weight: 700;
      color: #991b1b;
    }
    .hallazgo-body {
      padding: 6px 10px;
      font-size: 8pt;
    }
    .h-row {
      margin-bottom: 4px;
    }
    .label-danger { color: #dc2626; font-size: 7.5pt; text-transform: uppercase; }
    .label-success { color: #0f766e; font-size: 7.5pt; text-transform: uppercase; }
    .h-text {
      margin: 1px 0 0;
      color: #1e293b;
      font-weight: 500;
    }
    .h-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      background: #f8fafc;
      padding: 4px 8px;
      border-radius: 4px;
      margin-top: 4px;
      font-size: 7.5pt;
    }

    /* Galería de Fotos */
    .photos-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #cbd5e1;
    }
    .photo-card {
      width: 140px;
      height: 120px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      overflow: hidden;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
    }
    .photo-card img {
      width: 100%;
      height: 95px;
      object-fit: cover;
    }
    .photo-caption {
      font-size: 6.5pt;
      font-weight: 700;
      text-align: center;
      color: #475569;
      background: #f1f5f9;
      padding: 2px 0;
    }
    .no-hallazgos-box {
      background: #f0fdf4;
      border: 1px solid #86efac;
      color: #15803d;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 8.5pt;
      font-weight: 600;
      margin-bottom: 12px;
    }

    /* Observaciones */
    .obs-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 8pt;
      margin-bottom: 12px;
    }
    .obs-box strong {
      color: #0f766e;
      font-size: 7.5pt;
      text-transform: uppercase;
      display: block;
      margin-bottom: 2px;
    }

    /* Firmas */
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 16px;
      page-break-inside: avoid;
    }
    .sig-box {
      border-top: 1.5px solid #1e293b;
      padding-top: 4px;
      text-align: center;
      font-size: 8pt;
    }
    .sig-name {
      font-weight: 700;
      color: #0f172a;
    }
    .sig-role {
      font-size: 7.2pt;
      color: #64748b;
    }

    /* Pie de página membrete */
    .footer-bar {
      margin-top: 16px;
      padding-top: 6px;
      border-top: 1px solid #0f766e;
      text-align: center;
      font-size: 6.8pt;
      color: #64748b;
    }
    .footer-bar strong {
      color: #0f766e;
    }
  </style>
</head>
<body>

  <!-- Encabezado y Membrete Oficial Coraza -->
  <table class="header-table">
    <tr>
      <td class="logo-cell">
        <img src="/brand/membrete/image1.png" alt="Coraza Seguridad" class="logo-img" onerror="this.src='/brand/logo-coraza-cta.png'" />
      </td>
      <td class="title-cell">
        <h1>CORAZA SEGURIDAD C.T.A.</h1>
        <div class="slogan">"La Seguridad un Compromiso de Todos"</div>
        <h2>SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO</h2>
        <div style="font-weight: 700; font-size: 8.5pt; color: #1e293b; margin-top: 2px;">
          INFORME DE INSPECCIÓN PLANEADA DE PUESTO DE TRABAJO (IPT)
        </div>
        <div class="supervigilancia">Vigilado Supervigilancia — Resolución 6889 del 29 de septiembre de 2011</div>
      </td>
      <td class="meta-cell">
        <div><strong>CÓDIGO:</strong> F-SST-01</div>
        <div><strong>VERSIÓN:</strong> 02</div>
        <div><strong>FECHA:</strong> ${this.escape(d.fecha)}</div>
        <div><strong>PÁG:</strong> 1 de 1</div>
      </td>
    </tr>
  </table>

  <!-- Ficha Técnica del Puesto -->
  <div class="info-grid">
    <div class="info-item">
      <span class="info-label">Cliente / Razón Social</span>
      <span class="info-val">${this.escape(d.clienteNombre || 'Coraza Seguridad')}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Puesto de Trabajo</span>
      <span class="info-val">${this.escape(d.puestoNombre)}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Ciudad / Municipio</span>
      <span class="info-val">${this.escape(d.ciudad || 'Medellín')}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Tipo de Puesto</span>
      <span class="info-val">${this.escape(d.tipoPuesto || 'Servicio General')}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Tipo de Inspección</span>
      <span class="info-val">${d.tipo === 'SEGUIMIENTO' ? 'Seguimiento Preventivo' : 'IPT Inicial (34 Ítems)'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Inspector Responsable</span>
      <span class="info-val">${this.escape(d.responsableNombre)} ${d.responsableCargo ? '(' + this.escape(d.responsableCargo) + ')' : ''}</span>
    </div>
  </div>

  <!-- Resumen Ejecutivo KPI -->
  <div class="kpi-bar">
    <div class="kpi-stats">
      <span>Total Ítems: <strong>${total}</strong></span>
      <span>Seguros: <strong style="color: #15803d;">${seguro}</strong></span>
      <span>Riesgosos: <strong style="color: #b91c1c;">${riesgoso}</strong></span>
      <span>No Aplica: <strong style="color: #64748b;">${na}</strong></span>
    </div>
    <div class="kpi-cumplimiento">
      <span>Cumplimiento Global:</span>
      <span class="pct-val">${percent}%</span>
      <span class="risk-badge">${nivelRiesgo}</span>
    </div>
  </div>

  <!-- Tabla de 34 Ítems Normativos -->
  <div class="section-title">EVALUACIÓN DE CONDICIONES POR CATEGORÍA (34 ÍTEMS)</div>
  <table class="items-table">
    <thead>
      <tr style="background: #0f766e; color: #fff;">
        <th style="width: 32px; text-align: center; color: #fff;">#</th>
        <th style="text-align: left; color: #fff;">Aspecto / Condición Evaluada</th>
        <th style="width: 80px; text-align: center; color: #fff;">Calificación</th>
      </tr>
    </thead>
    <tbody>
      ${tableCategoriesHtml}
    </tbody>
  </table>

  <!-- Detalle de Hallazgos y Fotografías -->
  ${hallazgosHtml}

  <!-- Observaciones Generales -->
  ${
    d.observacionesGenerales
      ? `
    <div class="obs-box">
      <strong>Observaciones Generales de la Inspección:</strong>
      ${this.escape(d.observacionesGenerales)}
    </div>
  `
      : ''
  }

  <!-- Firmas Institucionales -->
  <div class="signatures-grid">
    <div class="sig-box">
      <div class="sig-name">${this.escape(d.responsableNombre)}</div>
      <div class="sig-role">${this.escape(d.responsableCargo || 'Inspector SST')} — Coraza Seguridad C.T.A.</div>
    </div>
    <div class="sig-box">
      <div class="sig-name">Responsable / Administrador del Puesto</div>
      <div class="sig-role">${this.escape(d.clienteNombre || 'Cliente')} — Recibido a Conformidad</div>
    </div>
  </div>

  <!-- Pie de Página Institucional -->
  <div class="footer-bar">
    <strong>CORAZA SEGURIDAD C.T.A.</strong> · PBX: (604) 444 79 29 · info@corazaseguridadcta.com · www.corazaseguridadcta.com · Medellín, Colombia
  </div>

</body>
</html>
    `;
  }

  private escape(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private cleanFileName(name: string): string {
    return (name || 'PUESTO')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toUpperCase()
      .slice(0, 30);
  }
}
