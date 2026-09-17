import { Injectable } from '@angular/core';
import {
  OperacionesPost,
  PostContractRow,
  PostOtrosiRow,
} from '../../operaciones/operaciones-api.service';

function esc(v: unknown): string {
  const s = v == null ? '' : String(v);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dash(v: string | null | undefined): string {
  const t = v?.trim();
  if (!t) return '—';
  return /^\d+\.0+$/.test(t) ? t.replace(/\.0+$/, '') : t;
}

function bascLabel(v: string | boolean | null | undefined): string {
  if (v === 'SI' || v === true) return 'Sí';
  if (v === 'NO_APLICA' || v === false) return 'No aplica';
  return '—';
}

const DOC_FIELDS: { key: keyof OperacionesPost; label: string }[] = [
  { key: 'docCamaraComercio', label: 'Cámara de comercio / Personería jurídica' },
  { key: 'docRut', label: 'RUT' },
  { key: 'docCcRepLegal', label: 'CC representante legal' },
  { key: 'docTratamientoDatos', label: 'Tratamiento de datos' },
  { key: 'docFormularioAsociado', label: 'Formulario asociado de negocio' },
  { key: 'docAcuerdoSeguridad', label: 'Acuerdo de seguridad' },
  { key: 'docVisitaCliente', label: 'Visita cliente' },
  { key: 'docEstadosFinancieros', label: 'Estados financieros' },
  { key: 'docRuesCamara', label: 'RUES / Cámara (fecha o estado)' },
];

const VERIF_GROUPS: { title: string; items: { key: keyof OperacionesPost; label: string }[] }[] = [
  {
    title: 'OFAC / Centrales de riesgo / Otras',
    items: [
      { key: 'verifEncuestaSatisfaccion', label: 'Encuesta de satisfacción' },
      { key: 'verifOfacRl', label: 'OFAC representante legal' },
      { key: 'verifOfacPersonaJuridica', label: 'OFAC persona jurídica' },
      { key: 'verifCentralRiesgosPn', label: 'Central de riesgos PN' },
      { key: 'verifCentralRiesgosNit', label: 'Central de riesgos NIT' },
      { key: 'verifSupersociedades', label: 'Supersociedades / Turismo / Comercio' },
    ],
  },
  {
    title: 'Procuraduría',
    items: [
      { key: 'verifProcuraduriaNit', label: 'NIT' },
      { key: 'verifProcuraduriaRl', label: 'RL' },
      { key: 'verifProcuraduriaRls', label: 'RLS' },
      { key: 'verifProcuraduriaRevFiscalPpal', label: 'Revisor fiscal principal' },
      { key: 'verifProcuraduriaRevFiscalSup', label: 'Revisor fiscal suplente' },
      { key: 'verifProcuraduriaMiembrosJunta', label: 'Miembros de junta' },
    ],
  },
  {
    title: 'Policía',
    items: [
      { key: 'verifPoliciaRp', label: 'RP' },
      { key: 'verifPoliciaRpSup', label: 'RP suplente' },
      { key: 'verifPoliciaRevFiscal', label: 'Revisor fiscal' },
      { key: 'verifPoliciaRevFiscalSup', label: 'Revisor fiscal suplente' },
      { key: 'verifPoliciaMiembrosJunta', label: 'Miembros de junta' },
    ],
  },
  {
    title: 'Contraloría',
    items: [
      { key: 'verifContraloriaRp', label: 'RP' },
      { key: 'verifContraloriaRpSup', label: 'RP suplente' },
      { key: 'verifContraloriaRevFiscal', label: 'Revisor fiscal' },
      { key: 'verifContraloriaRevFiscalSup', label: 'Revisor fiscal suplente' },
      { key: 'verifContraloriaMiembrosJunta', label: 'Miembros de junta' },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class PostFichaPdfService {
  /**
   * Abre la ficha técnica corporativa lista para imprimir / guardar como PDF.
   */
  generateAndPrint(p: OperacionesPost): void {
    const w = window.open('', '_blank');
    if (!w) {
      alert('Permite ventanas emergentes para generar el PDF de la ficha.');
      return;
    }
    w.document.open();
    w.document.write(this.buildHtml(p));
    w.document.close();
    w.onload = () => {
      setTimeout(() => {
        w.focus();
        w.print();
      }, 400);
    };
  }

  private field(p: OperacionesPost, key: keyof OperacionesPost): string {
    const v = p[key];
    if (typeof v === 'string' || typeof v === 'number') return dash(String(v));
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    return '—';
  }

  private contractsOf(p: OperacionesPost): PostContractRow[] {
    if (p.contracts?.length) return p.contracts;
    if (p.contractNumber || p.contractStart || p.serviceType) {
      return [
        {
          contractNumber: p.contractNumber,
          contractStart: p.contractStart,
          contractTerm: p.contractTerm,
          contractEnd: p.contractEnd,
          basc: p.basc === true ? 'SI' : p.basc === false ? 'NO_APLICA' : null,
          serviceType: p.serviceType,
          invoiceValue: null,
          armed: !!p.armed,
        },
      ];
    }
    return [];
  }

  private dlRows(pairs: [string, string][]): string {
    return pairs
      .map(
        ([k, v]) =>
          `<div class="row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`,
      )
      .join('');
  }

  private section(title: string, body: string): string {
    return `<section class="sec"><h2>${esc(title)}</h2>${body}</section>`;
  }

  private buildHtml(p: OperacionesPost): string {
    const generated = new Date().toLocaleString('es-CO', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
    const contracts = this.contractsOf(p);
    const otrosi: PostOtrosiRow[] = p.otrosi ?? [];

    const idBody = this.dlRows([
      ['Nombre', dash(p.name)],
      ['NIT', dash(p.nit)],
      ['Sector', dash(p.sector)],
      ['Estado', p.status],
      ['Cliente', dash(p.clientName)],
      ['Código', dash(p.code)],
    ]);

    const contractsBody =
      contracts.length === 0
        ? '<p class="muted">Sin contratos.</p>'
        : contracts
            .map((c, i) => {
              const rows = this.dlRows([
                ['N.º contrato', dash(c.contractNumber)],
                ['Fecha inicial', dash(c.contractStart)],
                ['Tiempo del ctto', dash(c.contractTerm)],
                ['Fecha final', dash(c.contractEnd)],
                ['BASC', bascLabel(c.basc)],
                ['Tipo de servicio', dash(c.serviceType)],
                ['Valor', dash(c.invoiceValue)],
                ['Armamento', c.armed ? 'Sí' : 'No'],
              ]);
              return `<div class="card"><h3>Contrato ${i + 1}</h3>${rows}</div>`;
            })
            .join('');

    const otrosiBody =
      otrosi.length === 0
        ? '<p class="muted">Sin otrosí.</p>'
        : otrosi
            .map((o, i) => {
              const rows = this.dlRows([
                ['N.º otro sí', dash(o.number)],
                ['Tipo', dash(o.typeText)],
                ['Fecha inicial', dash(o.dateText)],
                ['Tiempo', dash(o.term)],
                ['Fecha final', dash(o.dateEnd)],
                ['Valor', dash(o.invoiceValue)],
                ['Tipo de servicio', dash(o.serviceType)],
              ]);
              return `<div class="card"><h3>Otro sí ${i + 1}</h3>${rows}</div>`;
            })
            .join('');

    const ubicBody = this.dlRows([
      ['Dirección', dash(p.address)],
      ['Ciudad', dash(p.city)],
      ['Zona', dash(p.zone)],
    ]);

    const contactBody = this.dlRows([
      ['Nombre representante legal', dash(p.legalRepName)],
      ['Cédula representante legal', dash(p.legalRepId)],
      ['Nombre del contacto', dash(p.contactName)],
      ['Teléfono', dash(p.phone)],
      ['Email', dash(p.contactEmail)],
    ]);

    const docsBody = this.dlRows(
      DOC_FIELDS.map((d) => [d.label, this.field(p, d.key)] as [string, string]),
    );

    const verifBody = VERIF_GROUPS.map((g) => {
      const rows = this.dlRows(
        g.items.map((it) => [it.label, this.field(p, it.key)] as [string, string]),
      );
      return `<div class="card"><h3>${esc(g.title)}</h3>${rows}</div>`;
    }).join('');

    const obsBody = this.dlRows([
      ['Requisitos', dash(p.requirements)],
      ['Instrucciones', dash(p.instructions)],
      ['Observaciones', dash(p.observations)],
      ['Notas', dash(p.notes)],
    ]);

    const origin = typeof location !== 'undefined' ? location.origin : '';
    const logo = `${origin}/brand/logo-coraza-cta.png`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ficha técnica — ${esc(p.name)}</title>
  <style>
    @page { size: letter; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      color: #1e293b;
      font-size: 10.5pt;
      line-height: 1.35;
      background: #fff;
    }
    .sheet { max-width: 190mm; margin: 0 auto; }
    .brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-bottom: 0.65rem;
      border-bottom: 3px solid #0369a1;
      margin-bottom: 0.85rem;
    }
    .brand-left { display: flex; align-items: center; gap: 0.75rem; }
    .brand img { height: 42px; width: auto; }
    .brand-title { margin: 0; font-size: 1.05rem; color: #0c4a6e; font-weight: 800; letter-spacing: 0.01em; }
    .brand-sub { margin: 0.1rem 0 0; font-size: 0.78rem; color: #64748b; }
    .meta {
      text-align: right;
      font-size: 0.75rem;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      margin-top: 0.25rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 700;
      font-size: 0.72rem;
    }
    h1 {
      margin: 0 0 0.85rem;
      font-size: 1.15rem;
      color: #0f172a;
      font-weight: 800;
    }
    .sec {
      margin-bottom: 0.85rem;
      break-inside: avoid;
    }
    .sec h2 {
      margin: 0 0 0.4rem;
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #0369a1;
      border-left: 3px solid #0369a1;
      padding-left: 0.45rem;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.5rem 0.65rem;
      margin-bottom: 0.45rem;
      background: #f8fafc;
    }
    .card h3 {
      margin: 0 0 0.35rem;
      font-size: 0.85rem;
      color: #0f172a;
    }
    .row {
      display: grid;
      grid-template-columns: 11.5rem 1fr;
      gap: 0.2rem 0.75rem;
      padding: 0.12rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .row:last-child { border-bottom: none; }
    .k { color: #64748b; font-size: 0.78rem; }
    .v { color: #0f172a; font-weight: 600; font-size: 0.82rem; white-space: pre-wrap; word-break: break-word; }
    .muted { color: #94a3b8; font-size: 0.85rem; margin: 0.25rem 0; }
    .foot {
      margin-top: 1.1rem;
      padding-top: 0.5rem;
      border-top: 2px solid #0369a1;
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      color: #64748b;
    }
    @media print {
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="brand">
      <div class="brand-left">
        <img src="${esc(logo)}" alt="Coraza Seguridad CTA" onerror="this.style.display='none'" />
        <div>
          <p class="brand-title">Coraza Seguridad CTA</p>
          <p class="brand-sub">Portal Coraza · Ficha técnica de puesto</p>
        </div>
      </div>
      <div class="meta">
        <div>Generado: ${esc(generated)}</div>
        <span class="badge">${esc(p.status)}</span>
      </div>
    </header>

    <h1>${esc(dash(p.name))}</h1>

    ${this.section('Identificación', idBody)}
    ${this.section('Contratos', contractsBody)}
    ${this.section('Otrosí', otrosiBody)}
    ${this.section('Ubicación', ubicBody)}
    ${this.section('Representante legal y contacto', contactBody)}
    ${this.section('Documentación', docsBody)}
    ${this.section('Verificaciones', verifBody)}
    ${this.section('Requisitos, instrucciones y observaciones', obsBody)}

    <footer class="foot">
      <span>Documento interno · uso operativo</span>
      <span>www.corazaseguridadcta.com</span>
    </footer>
  </div>
</body>
</html>`;
  }
}
