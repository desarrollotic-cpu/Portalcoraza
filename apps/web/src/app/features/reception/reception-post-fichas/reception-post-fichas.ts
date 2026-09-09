import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  OperacionesApiService,
  OperacionesPost,
  PostContractRow,
} from '../../operaciones/operaciones-api.service';

function zoneNumber(zone: string | null | undefined): number {
  const n = Number(String(zone ?? '').match(/\d+/)?.[0]);
  return Number.isFinite(n) ? n : -1;
}

function bascLabel(v: string | boolean | null | undefined): string {
  if (v === 'SI' || v === true) return 'Sí';
  if (v === 'NO_APLICA' || v === false) return 'No aplica';
  return '—';
}

function dash(v: string | null | undefined): string {
  const t = v?.trim();
  return t ? t : '—';
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

@Component({
  selector: 'app-reception-post-fichas',
  imports: [FormsModule, DatePipe],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Fichas de puestos</h2>
          <p>Consulta la ficha completa. Para crear o editar usa Gestionar puestos.</p>
        </div>
        <input
          type="search"
          placeholder="Buscar nombre, NIT o cliente…"
          [ngModel]="query()"
          (ngModelChange)="query.set($event)"
        />
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>NIT</th>
                <th>Zona</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (p of filtered(); track p.id) {
                <tr [class.active]="selected()?.id === p.id">
                  <td><strong>{{ p.name }}</strong></td>
                  <td>{{ p.nit || '—' }}</td>
                  <td>{{ p.zone || '—' }}</td>
                  <td>{{ p.status }}</td>
                  <td>
                    <button type="button" class="link" (click)="openFicha(p)">Ver ficha</button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="muted">No hay puestos con ese filtro.</td></tr>
              }
            </tbody>
          </table>
        </div>

        @if (selected(); as p) {
          <article class="ficha">
            <header>
              <h3>{{ p.name }}</h3>
              <p class="muted">{{ p.status }} · actualizado {{ p.updatedAt | date: 'dd/MM/yyyy' }}</p>
            </header>

            <section>
              <h4>Identificación</h4>
              <dl>
                <dt>Nombre</dt><dd>{{ dash(p.name) }}</dd>
                <dt>NIT</dt><dd>{{ dash(p.nit) }}</dd>
                <dt>Sector</dt><dd>{{ dash(p.sector) }}</dd>
                <dt>Estado</dt><dd>{{ p.status }}</dd>
                <dt>Cliente</dt><dd>{{ dash(p.clientName) }}</dd>
              </dl>
            </section>

            <section>
              <h4>Contratos</h4>
              @for (c of contractsOf(p); track $index) {
                <div class="card">
                  <strong>Contrato {{ $index + 1 }}</strong>
                  <dl>
                    <dt>N.º contrato</dt><dd>{{ dash(c.contractNumber) }}</dd>
                    <dt>Fecha inicial</dt><dd>{{ dash(c.contractStart) }}</dd>
                    <dt>Tiempo del ctto</dt><dd>{{ dash(c.contractTerm) }}</dd>
                    <dt>Fecha final</dt><dd>{{ dash(c.contractEnd) }}</dd>
                    <dt>BASC</dt><dd>{{ bascLabel(c.basc) }}</dd>
                    <dt>Tipo de servicio</dt><dd>{{ dash(c.serviceType) }}</dd>
                    <dt>Valor</dt><dd>{{ dash(c.invoiceValue) }}</dd>
                    <dt>Armamento</dt><dd>{{ c.armed ? 'Sí' : 'No' }}</dd>
                  </dl>
                </div>
              } @empty {
                <p class="muted">Sin contratos.</p>
              }
            </section>

            <section>
              <h4>Otrosí</h4>
              @for (o of p.otrosi ?? []; track $index) {
                <div class="card">
                  <strong>Otro sí {{ $index + 1 }}</strong>
                  <dl>
                    <dt>N.º otro sí</dt><dd>{{ dash(o.number) }}</dd>
                    <dt>Tipo de otro sí</dt><dd>{{ dash(o.typeText) }}</dd>
                    <dt>Fecha</dt><dd>{{ dash(o.dateText) }}</dd>
                    <dt>Valor</dt><dd>{{ dash(o.invoiceValue) }}</dd>
                    <dt>Tipo de servicio</dt><dd>{{ dash(o.serviceType) }}</dd>
                  </dl>
                </div>
              } @empty {
                <p class="muted">Sin otrosí.</p>
              }
            </section>

            <section>
              <h4>Ubicación</h4>
              <dl>
                <dt>Dirección</dt><dd>{{ dash(p.address) }}</dd>
                <dt>Ciudad</dt><dd>{{ dash(p.city) }}</dd>
                <dt>Zona</dt><dd>{{ dash(p.zone) }}</dd>
              </dl>
            </section>

            <section>
              <h4>Representante legal y contacto</h4>
              <dl>
                <dt>Nombre representante legal</dt><dd>{{ dash(p.legalRepName) }}</dd>
                <dt>Cédula representante legal</dt><dd>{{ dash(p.legalRepId) }}</dd>
                <dt>Nombre del contacto</dt><dd>{{ dash(p.contactName) }}</dd>
                <dt>Teléfono</dt><dd>{{ dash(p.phone) }}</dd>
                <dt>Email</dt><dd>{{ dash(p.contactEmail) }}</dd>
              </dl>
            </section>

            <section>
              <h4>Documentación</h4>
              <dl>
                @for (d of docFields; track d.key) {
                  <dt>{{ d.label }}</dt><dd>{{ field(p, d.key) }}</dd>
                }
              </dl>
            </section>

            @for (g of verifGroups; track g.title) {
              <section>
                <h4>Verificación — {{ g.title }}</h4>
                <dl>
                  @for (v of g.items; track v.key) {
                    <dt>{{ v.label }}</dt><dd>{{ field(p, v.key) }}</dd>
                  }
                </dl>
              </section>
            }

            <section>
              <h4>Requisitos, instrucciones y observaciones</h4>
              <dl>
                <dt>Requisitos</dt><dd class="pre">{{ dash(p.requirements) }}</dd>
                <dt>Instrucciones</dt><dd class="pre">{{ dash(p.instructions) }}</dd>
                <dt>Observaciones</dt><dd class="pre">{{ dash(p.observations) }}</dd>
                <dt>Notas</dt><dd>{{ dash(p.notes) }}</dd>
              </dl>
            </section>
          </article>
        }
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    .head p { margin: 0; color: var(--text-muted, #6b7280); font-size: 0.9rem; max-width: 36rem; }
    input[type='search'] {
      border: 1px solid var(--border, #d1d5db); border-radius: 8px;
      padding: 0.45rem 0.65rem; min-width: 240px; font: inherit;
    }
    .table-wrap { overflow: auto; border: 1px solid var(--border, #e5e7eb); border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 0.65rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border, #eee); }
    tr.active { background: color-mix(in srgb, var(--primary, #1d4ed8) 8%, #fff); }
    button.link { border: none; background: none; color: var(--coraza-primary, #1d4ed8); cursor: pointer; font: inherit; }
    .ficha {
      border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 1.1rem 1.25rem;
      background: #fff; display: flex; flex-direction: column; gap: 1.1rem;
    }
    .ficha h3 { margin: 0; }
    .ficha h4 { margin: 0 0 0.45rem; font-size: 0.95rem; }
    .card { border: 1px solid var(--border, #eee); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.55rem; }
    dl {
      display: grid; grid-template-columns: minmax(12rem, 16rem) 1fr;
      gap: 0.35rem 1rem; margin: 0.35rem 0 0; font-size: 0.88rem;
    }
    dt { color: var(--text-muted, #6b7280); }
    dd { margin: 0; word-break: break-word; }
    .pre { white-space: pre-wrap; }
    .muted { color: var(--text-muted, #6b7280); }
    .error { color: #b91c1c; }
  `,
})
export class ReceptionPostFichas implements OnInit {
  private readonly api = inject(OperacionesApiService);

  readonly posts = signal<OperacionesPost[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly selected = signal<OperacionesPost | null>(null);
  readonly bascLabel = bascLabel;
  readonly dash = dash;
  readonly docFields = DOC_FIELDS;
  readonly verifGroups = VERIF_GROUPS;

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.posts()
      .filter((p) => {
        if (!q) return true;
        return [p.name, p.nit ?? '', p.clientName ?? '', p.zone ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const z = zoneNumber(b.zone) - zoneNumber(a.zone);
        return z || a.name.localeCompare(b.name, 'es');
      });
  });

  ngOnInit(): void {
    this.api.listPosts().subscribe({
      next: (rows) => {
        this.posts.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las fichas.');
      },
    });
  }

  openFicha(p: OperacionesPost): void {
    this.selected.set(p);
    this.api.getPost(p.id).subscribe({
      next: (full) => this.selected.set(full),
    });
    queueMicrotask(() => {
      document.querySelector('article.ficha')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  field(p: OperacionesPost, key: keyof OperacionesPost): string {
    const v = p[key];
    if (typeof v === 'string' || typeof v === 'number') return dash(String(v));
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    return '—';
  }

  contractsOf(p: OperacionesPost): PostContractRow[] {
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
}
