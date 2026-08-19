import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import {
  CreateOperacionesPostPayload,
  OperacionesApiService,
  OperacionesPost,
  PostStatus,
  PostType,
} from '../operaciones-api.service';

type Draft = CreateOperacionesPostPayload & { id?: string };

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'SERVICIO_ESPECIAL', label: 'Servicio especial' },
  { value: 'UNIDAD_RESIDENCIAL', label: 'Unidad residencial' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'UNIVERSIDAD', label: 'Universidad' },
  { value: 'OBRA', label: 'Obra' },
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
            Catálogo operativo. Los puestos <strong>ACTIVO</strong> aparecen en Programación
            (matriz / cuadro) y en Dotación.
          </p>
        </div>
        <div class="controls">
          <input
            type="search"
            placeholder="Buscar código, nombre o cliente…"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
          />
          <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
            <option value="">Todos</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
          @if (auth.hasPermission('posts.create')) {
            <button type="button" class="primary" (click)="startCreate()">Nuevo puesto</button>
          }
        </div>
      </header>

      @if (editing()) {
        <form class="form" (ngSubmit)="save()">
          <h3>{{ editing()!.id ? 'Editar puesto' : 'Nuevo puesto' }}</h3>
          <div class="grid">
            <label>
              Código *
              <input name="code" [(ngModel)]="editing()!.code" required maxlength="50" />
            </label>
            <label class="span-2">
              Nombre *
              <input name="name" [(ngModel)]="editing()!.name" required maxlength="200" />
            </label>
            <label>
              Tipo
              <select name="type" [(ngModel)]="editing()!.type">
                @for (t of types; track t.value) {
                  <option [value]="t.value">{{ t.label }}</option>
                }
              </select>
            </label>
            <label>
              Estado
              <select name="status" [(ngModel)]="editing()!.status">
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </label>
            <label class="span-2">
              Cliente
              <input name="clientName" [(ngModel)]="editing()!.clientName" maxlength="200" />
            </label>
            <label class="span-2">
              Dirección
              <input name="address" [(ngModel)]="editing()!.address" />
            </label>
            <label>
              Zona
              <input name="zone" [(ngModel)]="editing()!.zone" maxlength="80" />
            </label>
            <label>
              Contacto
              <input name="contactName" [(ngModel)]="editing()!.contactName" maxlength="120" />
            </label>
            <label>
              Teléfono
              <input name="phone" [(ngModel)]="editing()!.phone" maxlength="40" />
            </label>
            <label>
              Prioridad
              <select name="priority" [(ngModel)]="editing()!.priority">
                <option value="">—</option>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </label>
            <label>
              N.º contrato
              <input name="contractNumber" [(ngModel)]="editing()!.contractNumber" maxlength="80" />
            </label>
            <label>
              Tipo de servicio
              <input name="serviceType" [(ngModel)]="editing()!.serviceType" maxlength="80" />
            </label>
            <label class="check">
              <input type="checkbox" name="armed" [(ngModel)]="editing()!.armed" />
              Con armamento
            </label>
            <label class="span-3">
              Requisitos
              <textarea name="requirements" [(ngModel)]="editing()!.requirements" rows="2"></textarea>
            </label>
            <label class="span-3">
              Instrucciones
              <textarea name="instructions" [(ngModel)]="editing()!.instructions" rows="2"></textarea>
            </label>
            <label class="span-3">
              Notas
              <input name="notes" [(ngModel)]="editing()!.notes" />
            </label>
          </div>
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
                <th>Código</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Zona</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (p of filtered(); track p.id) {
                <tr [class.dim]="p.status !== 'ACTIVO'">
                  <td><code>{{ p.code }}</code></td>
                  <td><strong>{{ p.name }}</strong></td>
                  <td>{{ typeLabel(p.type) }}</td>
                  <td>{{ p.zone || '—' }}</td>
                  <td>{{ p.clientName || '—' }}</td>
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
    .head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: flex-start;
    }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    .head p { margin: 0; max-width: 42rem; color: var(--text-muted, #6b7280); font-size: 0.9rem; }
    .controls { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .controls input[type='search'],
    .controls select,
    .form input,
    .form select,
    .form textarea {
      border: 1px solid var(--border, #d1d5db);
      border-radius: 8px;
      padding: 0.45rem 0.65rem;
      background: var(--surface, #fff);
      color: inherit;
      font: inherit;
    }
    .controls input[type='search'] { min-width: 220px; }
    button.primary, button.ghost, button.link {
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
    }
    button.primary {
      background: var(--coraza-primary, #1d4ed8);
      color: #fff;
      padding: 0.5rem 0.9rem;
    }
    button.ghost {
      background: transparent;
      border: 1px solid var(--border, #d1d5db);
      padding: 0.5rem 0.9rem;
    }
    button.link {
      background: none;
      color: var(--coraza-primary, #1d4ed8);
      padding: 0;
    }
    button.link.danger { color: #b91c1c; }
    .form {
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 12px;
      padding: 1rem;
      background: var(--surface, #fff);
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .form h3 { margin: 0; font-size: 1rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
    }
    .grid label {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.8rem;
      color: var(--text-muted, #6b7280);
    }
    .check {
      flex-direction: row !important;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1.4rem;
    }
    .check input { width: auto; }
    .span-3 { grid-column: span 3; }
    .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .table-wrap { overflow: auto; border: 1px solid var(--border, #e5e7eb); border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 0.7rem 0.85rem; text-align: left; border-bottom: 1px solid var(--border, #eee); }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted, #6b7280); }
    .dim { opacity: 0.55; }
    .badge {
      display: inline-block;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      font-size: 0.72rem;
      background: #f3f4f6;
    }
    .badge.ok { background: #dcfce7; color: #166534; }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .empty, .error { color: var(--text-muted, #6b7280); }
    .error { color: #b91c1c; }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.85em;
    }
    @media (max-width: 800px) {
      .grid { grid-template-columns: 1fr; }
      .span-2, .span-3 { grid-column: span 1; }
    }
  `,
})
export class PuestosList implements OnInit {
  private readonly api = inject(OperacionesApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly types = POST_TYPES;
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
      return [p.code, p.name, p.clientName ?? '', p.address ?? '', p.zone ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  });

  ngOnInit(): void {
    this.reload();
  }

  typeLabel(type: PostType): string {
    return POST_TYPES.find((t) => t.value === type)?.label ?? type;
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
      address: '',
      clientName: '',
      notes: '',
      zone: '',
      contactName: '',
      phone: '',
      priority: '',
      contractNumber: '',
      serviceType: '',
      armed: false,
      requirements: '',
      instructions: '',
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
    });
  }

  cancel(): void {
    this.editing.set(null);
  }

  save(): void {
    const draft = this.editing();
    if (!draft?.code?.trim() || !draft?.name?.trim()) {
      this.toast.error('Código y nombre son obligatorios');
      return;
    }

    const payload: CreateOperacionesPostPayload = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      type: draft.type,
      status: draft.status,
      address: draft.address?.trim() || undefined,
      clientName: draft.clientName?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      zone: draft.zone?.trim() || undefined,
      contactName: draft.contactName?.trim() || undefined,
      phone: draft.phone?.trim() || undefined,
      priority: draft.priority?.trim() || undefined,
      contractNumber: draft.contractNumber?.trim() || undefined,
      serviceType: draft.serviceType?.trim() || undefined,
      armed: !!draft.armed,
      requirements: draft.requirements?.trim() || undefined,
      instructions: draft.instructions?.trim() || undefined,
    };

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
