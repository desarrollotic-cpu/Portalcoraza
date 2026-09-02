import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import {
  CreateOperacionesPostPayload,
  OperacionesApiService,
  OperacionesPost,
  PostStatus,
} from '../operaciones-api.service';

type Draft = CreateOperacionesPostPayload & { id?: string };

/** Sectores tal como vienen del archivo LISTADO_ASOCIADOS_DE_NEGOCIO_CLIENTES. */
const SECTORS = ['RESIDENCIAL', 'COMERCIAL', 'EDUCATIVO', 'OBRA', 'MIXTA', 'INDUSTRIAL', 'SALUD'];

/** Valores reales del archivo (no son solo SI/NO). */
const STATUS_HINTS = [
  'SI',
  'NO',
  'PDT',
  'SOLICITUD',
  'SE HIZO LA SOLICITUD',
  'PARA FIRMAR',
];

const DOC_FIELDS: { key: keyof CreateOperacionesPostPayload; label: string }[] = [
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

/** Fechas de verificación agrupadas por autoridad. */
const VERIF_GROUPS: { title: string; items: { key: keyof CreateOperacionesPostPayload; label: string }[] }[] = [
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
  selector: 'app-puestos-list',
  imports: [FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Puestos de trabajo</h2>
          <p>
            Catálogo de asociados de negocio. Los puestos <strong>ACTIVO</strong> aparecen en
            Programación y en Dotación.
          </p>
        </div>
        <div class="controls">
          <input
            type="search"
            placeholder="Buscar nombre, NIT o cliente…"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
          />
          <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
            <option value="">Todos</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
          @if (canCreatePosts()) {
            <button type="button" class="primary" (click)="startCreate()">Nuevo puesto</button>
          }
        </div>
      </header>

      @if (editing()) {
        <form class="form" (ngSubmit)="save()" #f="ngForm">
          <h3>{{ editing()!.id ? 'Editar puesto' : 'Nuevo puesto' }}</h3>

          <!-- 1. Identificación -->
          <details open>
            <summary>Identificación</summary>
            <div class="grid">
              <label class="span-2">
                Nombre *
                <input name="name" [(ngModel)]="editing()!.name" required maxlength="200" />
              </label>
              <label>
                NIT
                <input name="nit" [(ngModel)]="editing()!.nit" maxlength="30" />
              </label>
              <label>
                Sector
                <input name="sector" [(ngModel)]="editing()!.sector" maxlength="30" list="sector-hints" />
              </label>
              <label>
                Estado
                <select name="status" [(ngModel)]="editing()!.status">
                  <option [ngValue]="'ACTIVO'">ACTIVO</option>
                  <option [ngValue]="'INACTIVO'">INACTIVO</option>
                </select>
              </label>
              <label class="span-2">
                Cliente (nombre comercial)
                <input name="clientName" [(ngModel)]="editing()!.clientName" maxlength="200" />
              </label>
            </div>
          </details>

          <!-- 2. Contrato -->
          <details open>
            <summary>Contrato</summary>
            <div class="grid">
              <label>
                N.º contrato
                <input name="contractNumber" [(ngModel)]="editing()!.contractNumber" maxlength="80" />
              </label>
              <label>
                Fecha inicial ctto
                <input
                  name="contractStart"
                  [(ngModel)]="editing()!.contractStart"
                  maxlength="80"
                  placeholder="2022-09-07 o tal cual el archivo"
                />
              </label>
              <label>
                Tiempo del ctto
                <input
                  name="contractTerm"
                  [(ngModel)]="editing()!.contractTerm"
                  maxlength="80"
                  list="term-hints"
                  placeholder="INDEFINIDO, 24 MESES, 2027-11-30 00:00:00…"
                />
              </label>
              <label>
                Fecha final ccto
                <input
                  name="contractEnd"
                  [(ngModel)]="editing()!.contractEnd"
                  maxlength="80"
                  placeholder="INDEFINIDO, 24 MESES, 2027-11-30 00:00:00…"
                />
              </label>
              <label>
                BASC
                <select name="basc" [ngModel]="boolStr(editing()!.basc)" (ngModelChange)="editing()!.basc = strBool($event)">
                  <option [ngValue]="''">—</option>
                  <option [ngValue]="'true'">SI</option>
                  <option [ngValue]="'false'">NO</option>
                </select>
              </label>
              <label>
                Tipo de servicio
                <input name="serviceType" [(ngModel)]="editing()!.serviceType" maxlength="80" />
              </label>
              <label>
                Prioridad
                <select name="priority" [(ngModel)]="editing()!.priority">
                  <option [ngValue]="undefined">—</option>
                  <option [ngValue]="'baja'">Baja</option>
                  <option [ngValue]="'media'">Media</option>
                  <option [ngValue]="'alta'">Alta</option>
                  <option [ngValue]="'critica'">Crítica</option>
                </select>
              </label>
              <label class="check">
                <input type="checkbox" name="armed" [(ngModel)]="editing()!.armed" />
                Con armamento
              </label>
            </div>
          </details>

          <!-- 3. Ubicación -->
          <details [attr.open]="!editing()!.id ? '' : null">
            <summary>Ubicación</summary>
            <div class="grid">
              <label class="span-2">
                Dirección
                <input name="address" [(ngModel)]="editing()!.address" />
              </label>
              <label>
                Ciudad
                <input name="city" [(ngModel)]="editing()!.city" maxlength="120" />
              </label>
              <label>
                Zona
                <input name="zone" [(ngModel)]="editing()!.zone" maxlength="80" />
              </label>
            </div>
          </details>

          <!-- 4. Rep. legal y contacto -->
          <details [attr.open]="!editing()!.id ? '' : null">
            <summary>Representante legal y contacto</summary>
            <div class="grid">
              <label class="span-2">
                Nombre representante legal
                <input name="legalRepName" [(ngModel)]="editing()!.legalRepName" maxlength="200" />
              </label>
              <label>
                Cédula representante legal
                <input name="legalRepId" [(ngModel)]="editing()!.legalRepId" maxlength="30" />
              </label>
              <label class="span-2">
                Nombre del contacto
                <input name="contactName" [(ngModel)]="editing()!.contactName" maxlength="200" />
              </label>
              <label>
                Teléfono
                <input name="phone" [(ngModel)]="editing()!.phone" maxlength="200" />
              </label>
              <label class="span-2">
                Email
                <input name="contactEmail" [(ngModel)]="editing()!.contactEmail" maxlength="500" placeholder="uno o varios, separados por coma" />
              </label>
            </div>
          </details>

          <!-- 5. Documentación -->
          <details [attr.open]="!editing()!.id ? '' : null">
            <summary>Documentación (SI / NO / PDT / SOLICITUD…)</summary>
            <datalist id="sector-hints">
              @for (s of sectors; track s) { <option [value]="s"></option> }
            </datalist>
            <datalist id="doc-status">
              @for (s of statusHints; track s) {
                <option [value]="s"></option>
              }
            </datalist>
            <datalist id="term-hints">
              <option value="INDEFINIDO"></option>
              <option value="12 MESES"></option>
              <option value="24 MESES"></option>
              <option value="36 MESES"></option>
              <option value="2 AÑOS"></option>
              <option value="AUTOMATICO"></option>
            </datalist>
            <div class="grid">
              @for (d of docFields; track d.key) {
                <label>
                  {{ d.label }}
                  <input
                    [name]="d.key"
                    [ngModel]="getStr(d.key)"
                    (ngModelChange)="setStr(d.key, $event)"
                    list="doc-status"
                    maxlength="80"
                    placeholder="SI, NO, PDT, SOLICITUD…"
                  />
                </label>
              }
            </div>
          </details>

          <!-- 6. Fechas de verificación -->
          @for (g of verifGroups; track g.title) {
            <details [attr.open]="!editing()!.id ? '' : null">
              <summary>Verificación — {{ g.title }}</summary>
              <div class="grid">
                @for (v of g.items; track v.key) {
                  <label>
                    {{ v.label }}
                    <input
                      [name]="v.key"
                      [ngModel]="getStr(v.key)"
                      (ngModelChange)="setStr(v.key, $event)"
                      maxlength="30"
                      placeholder="YYYY-MM-DD, PDT, NO, SI…"
                    />
                  </label>
                }
              </div>
            </details>
          }

          <!-- 7. Notas -->
          <details [attr.open]="!editing()!.id ? '' : null">
            <summary>Requisitos, instrucciones y observaciones</summary>
            <div class="grid">
              <label class="span-3">
                Requisitos
                <textarea name="requirements" [(ngModel)]="editing()!.requirements" rows="2"></textarea>
              </label>
              <label class="span-3">
                Instrucciones
                <textarea name="instructions" [(ngModel)]="editing()!.instructions" rows="2"></textarea>
              </label>
              <label class="span-3">
                Observaciones (uso interno)
                <textarea name="observations" [(ngModel)]="editing()!.observations" rows="2"></textarea>
              </label>
              <label class="span-3">
                Notas
                <input name="notes" [(ngModel)]="editing()!.notes" />
              </label>
            </div>
          </details>

          <div class="form-actions">
            <button type="button" class="ghost" (click)="cancel()">Cancelar</button>
            <button type="submit" class="primary" [disabled]="saving()">Guardar</button>
          </div>
        </form>
      }

      @if (loading()) {
        <p>Cargando puestos…</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>NIT</th>
                <th>Sector</th>
                <th>Ciudad</th>
                <th>Zona</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (p of filtered(); track p.id) {
                <tr [class.dim]="p.status !== 'ACTIVO'">
                  <td><strong>{{ p.name }}</strong></td>
                  <td>{{ p.nit || '—' }}</td>
                  <td>{{ p.sector || '—' }}</td>
                  <td>{{ p.city || '—' }}</td>
                  <td>{{ p.zone || '—' }}</td>
                  <td>
                    <span class="badge" [class.ok]="p.status === 'ACTIVO'">{{ p.status }}</span>
                  </td>
                  <td class="actions">
                    @if (auth.hasPermission('posts.edit')) {
                      <button type="button" class="link" (click)="edit(p)">Editar</button>
                      @if (p.status === 'ACTIVO') {
                        <button type="button" class="link danger" (click)="setStatus(p, 'INACTIVO')">
                          Desactivar
                        </button>
                      } @else {
                        <button type="button" class="link" (click)="setStatus(p, 'ACTIVO')">
                          Activar
                        </button>
                      }
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="empty">No hay puestos con ese filtro.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    .head p { margin: 0; max-width: 42rem; color: var(--text-muted, #6b7280); font-size: 0.9rem; }
    .controls { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .controls input[type='search'], .controls select,
    .form input, .form select, .form textarea {
      border: 1px solid var(--border, #d1d5db); border-radius: 8px;
      padding: 0.45rem 0.65rem; background: var(--surface, #fff); color: inherit; font: inherit;
    }
    .controls input[type='search'] { min-width: 240px; }
    button.primary, button.ghost, button.link {
      border: none; border-radius: 8px; cursor: pointer; font: inherit;
    }
    button.primary { background: var(--coraza-primary, #1d4ed8); color: #fff; padding: 0.5rem 0.9rem; }
    button.ghost { background: transparent; border: 1px solid var(--border, #d1d5db); padding: 0.5rem 0.9rem; }
    button.link { background: none; color: var(--coraza-primary, #1d4ed8); padding: 0; }
    button.link.danger { color: #b91c1c; }
    .form {
      border: 1px solid var(--border, #e5e7eb); border-radius: 12px;
      padding: 1rem; background: var(--surface, #fff);
      display: flex; flex-direction: column; gap: 0.75rem;
    }
    .form h3 { margin: 0 0 0.25rem; font-size: 1rem; }
    details {
      border: 1px solid var(--border, #e5e7eb); border-radius: 10px; padding: 0.5rem 0.75rem;
      background: var(--surface-alt, #fafafa);
    }
    details[open] { padding-bottom: 0.9rem; }
    details > summary {
      cursor: pointer; font-weight: 600; font-size: 0.88rem; padding: 0.35rem 0;
      color: var(--text, #111827);
    }
    .grid {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem; margin-top: 0.5rem;
    }
    .grid label {
      display: flex; flex-direction: column; gap: 0.3rem;
      font-size: 0.78rem; color: var(--text-muted, #6b7280);
    }
    .check { flex-direction: row !important; align-items: center; gap: 0.5rem; margin-top: 1.4rem; }
    .check input { width: auto; }
    .span-2 { grid-column: span 2; }
    .span-3 { grid-column: span 3; }
    .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .table-wrap { overflow: auto; border: 1px solid var(--border, #e5e7eb); border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 0.7rem 0.85rem; text-align: left; border-bottom: 1px solid var(--border, #eee); }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted, #6b7280); }
    .dim { opacity: 0.55; }
    .badge {
      display: inline-block; padding: 0.15rem 0.45rem; border-radius: 999px;
      font-size: 0.72rem; background: #f3f4f6;
    }
    .badge.ok { background: #dcfce7; color: #166534; }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .empty, .error { color: var(--text-muted, #6b7280); }
    .error { color: #b91c1c; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.85em; }
    @media (max-width: 800px) {
      .grid { grid-template-columns: 1fr; }
      .span-2, .span-3 { grid-column: span 1; }
    }
  `,
})
export class PuestosList implements OnInit {
  private readonly api = inject(OperacionesApiService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly sectors = SECTORS;
  readonly statusHints = STATUS_HINTS;
  readonly docFields = DOC_FIELDS;
  readonly verifGroups = VERIF_GROUPS;

  readonly posts = signal<OperacionesPost[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly editing = signal<Draft | null>(null);
  readonly query = signal('');
  readonly statusFilter = signal<'' | PostStatus>('');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const st = this.statusFilter();
    return this.posts().filter((p) => {
      if (st && p.status !== st) return false;
      if (!q) return true;
      return [p.code, p.name, p.clientName ?? '', p.address ?? '', p.zone ?? '', p.nit ?? '', p.city ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  });

  ngOnInit(): void {
    this.reload();
    // Si venimos del atajo "+ Nuevo puesto" del dashboard (?nuevo=1),
    // abrimos el formulario en pantalla y hacemos scroll a él.
    if (this.route.snapshot.queryParamMap.get('nuevo') === '1' && this.canCreatePosts()) {
      this.startCreate();
      queueMicrotask(() => {
        document.querySelector('form.form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  canCreatePosts(): boolean {
    return this.auth.hasPermission('posts.create') && this.router.url.startsWith('/recepcion');
  }

  boolStr(v: boolean | null | undefined): string {
    return v === true ? 'true' : v === false ? 'false' : '';
  }

  strBool(v: string): boolean | undefined {
    return v === 'true' ? true : v === 'false' ? false : undefined;
  }

  getStr(key: keyof CreateOperacionesPostPayload): string {
    const draft = this.editing();
    if (!draft) return '';
    return ((draft[key] as string | null | undefined) ?? '').toString();
  }

  setStr(key: keyof CreateOperacionesPostPayload, v: string): void {
    const draft = this.editing();
    if (!draft) return;
    (draft as Record<string, unknown>)[key] = v || undefined;
    this.editing.set({ ...draft });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listPosts().subscribe({
      next: (rows) => {
        this.posts.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los puestos.');
      },
    });
  }

  startCreate(): void {
    this.editing.set({
      code: '',
      name: '',
      type: 'SERVICIO_ESPECIAL',
      status: 'ACTIVO',
      armed: false,
    });
  }

  edit(p: OperacionesPost): void {
    this.editing.set({
      id: p.id,
      code: p.code,
      name: p.name,
      type: p.type,
      status: p.status,
      address: p.address ?? '',
      clientName: p.clientName ?? '',
      notes: p.notes ?? '',
      zone: p.zone ?? '',
      contactName: p.contactName ?? '',
      phone: p.phone ?? '',
      priority: p.priority ?? '',
      contractNumber: p.contractNumber ?? '',
      serviceType: p.serviceType ?? '',
      armed: !!p.armed,
      requirements: p.requirements ?? '',
      instructions: p.instructions ?? '',
      nit: p.nit ?? '',
      sector: p.sector ?? undefined,
      basc: p.basc,
      contractStart: p.contractStart ?? '',
      contractEnd: p.contractEnd ?? '',
      contractTerm: p.contractTerm ?? '',
      city: p.city ?? '',
      legalRepName: p.legalRepName ?? '',
      legalRepId: p.legalRepId ?? '',
      contactEmail: p.contactEmail ?? '',
      observations: p.observations ?? '',
      docCamaraComercio: p.docCamaraComercio ?? '',
      docRut: p.docRut ?? '',
      docCcRepLegal: p.docCcRepLegal ?? '',
      docTratamientoDatos: p.docTratamientoDatos ?? '',
      docFormularioAsociado: p.docFormularioAsociado ?? '',
      docAcuerdoSeguridad: p.docAcuerdoSeguridad ?? '',
      docVisitaCliente: p.docVisitaCliente ?? '',
      docEstadosFinancieros: p.docEstadosFinancieros ?? '',
      docRuesCamara: p.docRuesCamara ?? '',
      verifEncuestaSatisfaccion: p.verifEncuestaSatisfaccion ?? '',
      verifOfacRl: p.verifOfacRl ?? '',
      verifOfacPersonaJuridica: p.verifOfacPersonaJuridica ?? '',
      verifCentralRiesgosPn: p.verifCentralRiesgosPn ?? '',
      verifCentralRiesgosNit: p.verifCentralRiesgosNit ?? '',
      verifProcuraduriaNit: p.verifProcuraduriaNit ?? '',
      verifProcuraduriaRl: p.verifProcuraduriaRl ?? '',
      verifProcuraduriaRls: p.verifProcuraduriaRls ?? '',
      verifProcuraduriaRevFiscalPpal: p.verifProcuraduriaRevFiscalPpal ?? '',
      verifProcuraduriaRevFiscalSup: p.verifProcuraduriaRevFiscalSup ?? '',
      verifProcuraduriaMiembrosJunta: p.verifProcuraduriaMiembrosJunta ?? '',
      verifPoliciaRp: p.verifPoliciaRp ?? '',
      verifPoliciaRpSup: p.verifPoliciaRpSup ?? '',
      verifPoliciaRevFiscal: p.verifPoliciaRevFiscal ?? '',
      verifPoliciaRevFiscalSup: p.verifPoliciaRevFiscalSup ?? '',
      verifPoliciaMiembrosJunta: p.verifPoliciaMiembrosJunta ?? '',
      verifContraloriaRp: p.verifContraloriaRp ?? '',
      verifContraloriaRpSup: p.verifContraloriaRpSup ?? '',
      verifContraloriaRevFiscal: p.verifContraloriaRevFiscal ?? '',
      verifContraloriaRevFiscalSup: p.verifContraloriaRevFiscalSup ?? '',
      verifContraloriaMiembrosJunta: p.verifContraloriaMiembrosJunta ?? '',
      verifSupersociedades: p.verifSupersociedades ?? '',
    });
  }

  cancel(): void {
    this.editing.set(null);
  }

  /** Código interno no visible; la BD lo exige único. */
  private autoCode(name: string): string {
    const slug = name
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24);
    return `P-${Date.now().toString(36)}${slug ? `-${slug}` : ''}`.slice(0, 50);
  }

  save(): void {
    const draft = this.editing();
    if (!draft?.name?.trim()) {
      this.toast.error('El nombre es obligatorio');
      return;
    }

    if (!draft.id && !this.canCreatePosts()) {
      this.toast.error('Solo Recepción puede crear puestos de trabajo');
      return;
    }

    // Limpia strings vacíos → undefined (evita enviarlos al backend).
    const trimStr = (v: string | null | undefined): string | undefined => {
      if (v === null || v === undefined) return undefined;
      const t = String(v).trim();
      return t.length ? t : undefined;
    };

    const payload: CreateOperacionesPostPayload = {
      ...draft,
      code: draft.id ? (draft.code?.trim() || this.autoCode(draft.name)) : this.autoCode(draft.name),
      name: draft.name.trim(),
      address: trimStr(draft.address),
      clientName: trimStr(draft.clientName),
      notes: trimStr(draft.notes),
      zone: trimStr(draft.zone),
      contactName: trimStr(draft.contactName),
      phone: trimStr(draft.phone),
      priority: trimStr(draft.priority),
      contractNumber: trimStr(draft.contractNumber),
      serviceType: trimStr(draft.serviceType),
      requirements: trimStr(draft.requirements),
      instructions: trimStr(draft.instructions),
      nit: trimStr(draft.nit),
      sector: trimStr(draft.sector),
      city: trimStr(draft.city),
      legalRepName: trimStr(draft.legalRepName),
      legalRepId: trimStr(draft.legalRepId),
      contactEmail: trimStr(draft.contactEmail),
      observations: trimStr(draft.observations),
      docEstadosFinancieros: trimStr(draft.docEstadosFinancieros),
      contractStart: trimStr(draft.contractStart),
      contractEnd: trimStr(draft.contractEnd),
      contractTerm: trimStr(draft.contractTerm),
      docCamaraComercio: trimStr(draft.docCamaraComercio as string | undefined),
      docRut: trimStr(draft.docRut as string | undefined),
      docCcRepLegal: trimStr(draft.docCcRepLegal as string | undefined),
      docTratamientoDatos: trimStr(draft.docTratamientoDatos as string | undefined),
      docFormularioAsociado: trimStr(draft.docFormularioAsociado as string | undefined),
      docAcuerdoSeguridad: trimStr(draft.docAcuerdoSeguridad as string | undefined),
      docVisitaCliente: trimStr(draft.docVisitaCliente as string | undefined),
      docRuesCamara: trimStr(draft.docRuesCamara as string | undefined),
    };

    // Fechas de verificación: si vienen vacías, no enviar.
    for (const g of VERIF_GROUPS) {
      for (const it of g.items) {
        const key = it.key as keyof CreateOperacionesPostPayload;
        const v = (payload as Record<string, unknown>)[key];
        if (typeof v === 'string' && !v.trim()) {
          (payload as Record<string, unknown>)[key] = undefined;
        }
      }
    }

    delete (payload as { id?: string }).id;

    this.saving.set(true);
    const req = draft.id
      ? this.api.updatePost(draft.id, payload)
      : this.api.createPost(payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success(draft.id ? 'Puesto actualizado' : 'Puesto creado');
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(
          'No se pudo guardar el puesto',
          err.error?.message ?? undefined,
        );
      },
    });
  }

  setStatus(p: OperacionesPost, status: PostStatus): void {
    if (status === 'INACTIVO') {
      const ok = window.confirm(
        `¿Desactivar el puesto "${p.name}"? Dejará de aparecer como activo en Programación.`,
      );
      if (!ok) return;
    }
    this.api.updatePost(p.id, { status }).subscribe({
      next: () => {
        this.toast.success(status === 'ACTIVO' ? 'Puesto activado' : 'Puesto desactivado');
        this.reload();
      },
      error: (err) => {
        this.toast.error('No se pudo cambiar el estado', err.error?.message ?? undefined);
      },
    });
  }
}
