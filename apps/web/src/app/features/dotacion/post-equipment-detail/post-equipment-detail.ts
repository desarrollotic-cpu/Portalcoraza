import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import {
  CreateAssignmentPayload,
  PostEquipmentApiService,
  PostEquipmentAssignment,
  PostEquipmentPostDetail,
  PostEquipmentUnit,
  ReturnAssignmentPayload,
} from '../post-equipment-api.service';
import { PostEquipmentTabs } from '../post-equipment-tabs/post-equipment-tabs';

@Component({
  selector: 'app-post-equipment-detail',
  imports: [FormsModule, RouterLink, DatePipe, PostEquipmentTabs],
  template: `
    <section>
      <app-post-equipment-tabs />
      <a class="back" routerLink="/dotacion/elementos/puestos">← Volver a puestos</a>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (detail(); as d) {
        <header class="page-head">
          <div>
            <span class="code">{{ d.post.code }}</span>
            <h2>{{ d.post.name }}</h2>
            @if (d.post.clientName) {
              <p>{{ d.post.clientName }}</p>
            }
          </div>
          <div class="summary">
            <strong>{{ d.summary.assignedItems }}</strong>
            <span>elementos en este puesto</span>
          </div>
        </header>

        @if (auth.hasPermission('post_equipment.assign')) {
          <div class="panel">
            <h3>Asignar unidad a este puesto</h3>
            <p class="hint">
              Solo aparecen unidades disponibles. Si faltan, créalas en
              <a routerLink="/dotacion/elementos">Inventario de elementos</a>.
            </p>
            <form class="form" (ngSubmit)="submitAssign()">
              <label class="wide">
                Unidad disponible
                <select [(ngModel)]="form.unitId" name="unitId" required>
                  <option value="">— Selecciona —</option>
                  @for (u of available(); track u.id) {
                    <option [value]="u.id">
                      {{ u.catalogName }} — {{ u.unitCode }}
                    </option>
                  }
                </select>
              </label>
              <label>
                Condición al entregar
                <select [(ngModel)]="form.conditionOnDelivery" name="condition">
                  <option value="">—</option>
                  <option value="BUENO">Bueno</option>
                  <option value="REGULAR">Regular</option>
                  <option value="MALO">Malo</option>
                </select>
              </label>
              <label class="wide">
                Notas
                <input [(ngModel)]="form.notes" name="notes" />
              </label>
              <button type="submit" class="btn" [disabled]="saving() || !form.unitId">
                Asignar al puesto
              </button>
            </form>
            @if (formError()) {
              <p class="error">{{ formError() }}</p>
            }
          </div>
        }

        <h3 class="section-title">Unidades en este puesto</h3>
        <table>
          <thead>
            <tr>
              <th>Elemento</th>
              <th>Código</th>
              <th>Entregado</th>
              <th>Condición</th>
              @if (auth.hasPermission('post_equipment.return')) {
                <th></th>
              }
            </tr>
          </thead>
          <tbody>
            @for (a of assigned(); track a.id) {
              <tr>
                <td>
                  <strong>{{ a.displayName }}</strong>
                  @if (a.notes) {
                    <div class="note">{{ a.notes }}</div>
                  }
                </td>
                <td>{{ a.unitCode ?? a.serialOrTag ?? '—' }}</td>
                <td>{{ a.deliveredAt | date: 'shortDate' }}</td>
                <td>{{ a.conditionOnDelivery ?? '—' }}</td>
                @if (auth.hasPermission('post_equipment.return')) {
                  <td class="actions">
                    <button type="button" class="btn-sm" (click)="returnItem(a, 'RETURNED')">
                      Devolver
                    </button>
                    <button type="button" class="btn-sm danger" (click)="returnItem(a, 'LOST')">
                      Perdido
                    </button>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="auth.hasPermission('post_equipment.return') ? 5 : 4">
                  No hay unidades asignadas a este puesto.
                </td>
              </tr>
            }
          </tbody>
        </table>

        <h3 class="section-title">Historial</h3>
        <table>
          <thead>
            <tr>
              <th>Elemento</th>
              <th>Estado</th>
              <th>Entregado</th>
              <th>Cerrado</th>
            </tr>
          </thead>
          <tbody>
            @for (a of history(); track a.id) {
              <tr>
                <td>{{ a.displayName }}</td>
                <td>{{ statusLabel(a.status) }}</td>
                <td>{{ a.deliveredAt | date: 'shortDate' }}</td>
                <td>{{ a.returnedAt ? (a.returnedAt | date: 'shortDate') : '—' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4">Sin historial todavía.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    .back {
      display: inline-block;
      margin-bottom: 0.85rem;
      color: var(--primary);
      text-decoration: none;
      font-size: 0.9rem;
    }
    .page-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .code {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--primary);
    }
    .page-head h2 { margin: 0.15rem 0; color: var(--primary-dark); }
    .page-head p { margin: 0; color: var(--coraza-text-muted, #64748b); }
    .summary {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 0.65rem 0.9rem;
      border-radius: 10px;
      background: color-mix(in srgb, #f59e0b 12%, #fff);
      border: 1px solid color-mix(in srgb, #f59e0b 30%, #fde68a);
    }
    .summary strong { font-size: 1.4rem; color: #b45309; }
    .summary span { font-size: 0.75rem; color: #92400e; }
    .panel {
      margin-bottom: 1.5rem;
      padding: 1rem 1.1rem;
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
      background: var(--coraza-surface, #fff);
    }
    .panel h3, .section-title {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      color: var(--primary-dark);
    }
    .hint { margin: 0 0 0.75rem; font-size: 0.85rem; color: var(--coraza-text-muted, #64748b); }
    .hint a { color: var(--primary); font-weight: 600; }
    .section-title { margin-top: 1.5rem; }
    .form {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.75rem;
      align-items: end;
    }
    .form .wide { grid-column: 1 / -1; }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.85rem;
      color: var(--coraza-text-muted, #64748b);
    }
    input, select {
      padding: 0.5rem 0.65rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      font: inherit;
    }
    .btn {
      padding: 0.5rem 0.95rem;
      border-radius: 8px;
      border: 1px solid var(--primary);
      background: var(--primary);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-sm {
      padding: 0.28rem 0.65rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--coraza-border));
      background: color-mix(in srgb, var(--primary) 8%, #fff);
      color: var(--primary-dark);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-sm.danger {
      border-color: color-mix(in srgb, #dc2626 35%, #fecaca);
      background: color-mix(in srgb, #dc2626 8%, #fff);
      color: #b91c1c;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }
    th, td {
      padding: 0.65rem 0.8rem;
      border-bottom: 1px solid var(--coraza-border);
      text-align: left;
      vertical-align: middle;
    }
    th {
      background: var(--primary-50);
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--primary-dark);
    }
    .actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .note { font-size: 0.78rem; color: var(--coraza-text-muted, #64748b); margin-top: 0.15rem; }
    .error { color: var(--coraza-error); }
  `,
})
export class PostEquipmentDetail implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(PostEquipmentApiService);
  private readonly route = inject(ActivatedRoute);

  readonly detail = signal<PostEquipmentPostDetail | null>(null);
  readonly available = signal<PostEquipmentUnit[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);

  form = {
    unitId: '',
    conditionOnDelivery: '',
    notes: '',
  };

  ngOnInit(): void {
    const postId = this.route.snapshot.paramMap.get('postId');
    if (!postId) {
      this.error.set('Puesto no válido');
      this.loading.set(false);
      return;
    }
    this.reloadAll(postId);
  }

  assigned(): PostEquipmentAssignment[] {
    return (this.detail()?.assignments ?? []).filter((a) => a.status === 'ASSIGNED');
  }

  history(): PostEquipmentAssignment[] {
    return (this.detail()?.assignments ?? []).filter((a) => a.status !== 'ASSIGNED');
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'RETURNED':
        return 'Devuelto';
      case 'LOST':
        return 'Perdido';
      case 'WRITTEN_OFF':
        return 'Baja';
      default:
        return status;
    }
  }

  submitAssign(): void {
    const postId = this.detail()?.post.id;
    if (!postId || !this.form.unitId) return;

    this.saving.set(true);
    this.formError.set(null);

    const payload: CreateAssignmentPayload = {
      postId,
      unitId: this.form.unitId,
    };
    if (this.form.conditionOnDelivery) payload.conditionOnDelivery = this.form.conditionOnDelivery;
    if (this.form.notes.trim()) payload.notes = this.form.notes.trim();

    this.api.createAssignment(payload).subscribe({
      next: () => {
        this.form = { unitId: '', conditionOnDelivery: '', notes: '' };
        this.reloadAll(postId);
        this.saving.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'No se pudo asignar la unidad');
      },
    });
  }

  returnItem(a: PostEquipmentAssignment, status: 'RETURNED' | 'LOST'): void {
    const label = status === 'RETURNED' ? 'devolver' : 'marcar como perdido';
    if (!window.confirm(`¿Seguro que deseas ${label} "${a.displayName}"?`)) return;

    const payload: ReturnAssignmentPayload = { status };
    this.api.returnAssignment(a.id, payload).subscribe({
      next: () => {
        const postId = this.detail()?.post.id;
        if (postId) this.reloadAll(postId);
      },
      error: (err) => {
        window.alert(err?.error?.message ?? 'No se pudo cerrar el elemento');
      },
    });
  }

  private reloadAll(postId: string): void {
    forkJoin({
      detail: this.api.getPostDetail(postId),
      available: this.api.listAvailableUnits(),
    }).subscribe({
      next: ({ detail, available }) => {
        this.detail.set(detail);
        this.available.set(available);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el puesto');
      },
    });
  }
}
