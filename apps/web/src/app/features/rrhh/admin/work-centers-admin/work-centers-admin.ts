import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { HrPageHeader } from '../../../../shared/components/hr-page-header/hr-page-header';
import { ToastService } from '../../../../shared/services/toast.service';
import { HrApiService } from '../../services/hr-api.service';
import type { WorkCenter } from '../../services/hr.types';

/**
 * Administración de centros de trabajo (puestos / clientes).
 * Solo RRHH (y Gerencia) crea, edita o desactiva.
 * Dotación y Programación solo los consultan.
 */
@Component({
  selector: 'app-work-centers-admin',
  imports: [CommonModule, FormsModule, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header title="Centros de trabajo (puestos)">
        @if (auth.hasPermission('work_centers.create')) {
          <div actions>
            <button type="button" class="hr-btn hr-btn-primary" (click)="startCreate()">
              Nuevo puesto
            </button>
          </div>
        }
      </app-hr-page-header>
      <p class="hr-muted sync-hint">
        Solo <strong>RRHH</strong> puede crear, editar o desactivar puestos. Cada centro activo se
        refleja automáticamente en <strong>Programación</strong> (turnos) y en
        <strong>Dotación</strong> (entrega de elementos). Dotación no crea puestos: solo entrega.
      </p>

      @if (editing() !== null) {
        <form class="hr-detail-card" (ngSubmit)="save()">
          <h3>{{ editing()!.id ? 'Editar puesto' : 'Nuevo puesto' }}</h3>
          <div class="hr-form-grid-3">
            <div class="hr-field">
              <label>Código *</label>
              <input type="text" [(ngModel)]="editing()!.code" name="code" required />
            </div>
            <div class="hr-field col-2">
              <label>Cliente *</label>
              <input type="text" [(ngModel)]="editing()!.clientName" name="client" required />
            </div>
            <div class="hr-field col-2">
              <label>Dirección</label>
              <input type="text" [(ngModel)]="editing()!.address" name="address" />
            </div>
            <div class="hr-field">
              <label>Zona</label>
              <input type="text" [(ngModel)]="editing()!.zone" name="zone" />
            </div>
            <div class="hr-field col-3">
              <label>Notas</label>
              <input type="text" [(ngModel)]="editing()!.notes" name="notes" />
            </div>
          </div>
          <div class="hr-form-actions">
            <button type="button" class="hr-btn hr-btn-ghost" (click)="cancel()">Cancelar</button>
            <button type="submit" class="hr-btn hr-btn-primary" [disabled]="saving()">Guardar</button>
          </div>
        </form>
      }

      <div class="hr-table-wrap">
        <table class="hr-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Zona</th>
              <th>Dirección</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (wc of centers(); track wc.id) {
              <tr [class.dim]="!wc.isActive">
                <td><span class="hr-code-badge">{{ wc.code }}</span></td>
                <td><strong>{{ wc.clientName }}</strong></td>
                <td>{{ wc.zone ?? '—' }}</td>
                <td>{{ wc.address ?? '—' }}</td>
                <td>{{ wc.isActive ? 'Activo' : 'Inactivo' }}</td>
                <td class="actions">
                  @if (auth.hasPermission('work_centers.edit')) {
                    <button type="button" class="hr-btn-link" (click)="edit(wc)">Editar</button>
                    @if (wc.isActive) {
                      <button type="button" class="hr-btn-link danger" (click)="deactivate(wc)">
                        Desactivar
                      </button>
                    } @else {
                      <button type="button" class="hr-btn-link" (click)="reactivate(wc)">
                        Reactivar
                      </button>
                    }
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty-cell">Sin puestos configurados</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    .actions { display: flex; gap: 0.65rem; flex-wrap: wrap; }
    .hr-btn-link.danger { color: #b91c1c; }
    .dim { opacity: 0.55; }
  `,
})
export class WorkCentersAdmin implements OnInit {
  private readonly api = inject(HrApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly centers = signal<WorkCenter[]>([]);
  readonly editing = signal<Partial<WorkCenter> | null>(null);
  readonly saving = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.listWorkCenters(true).subscribe({ next: (rows) => this.centers.set(rows) });
  }

  startCreate(): void {
    this.editing.set({
      code: '',
      clientName: '',
      address: '',
      zone: '',
      notes: '',
      isActive: true,
    });
  }

  edit(wc: WorkCenter): void {
    this.editing.set({ ...wc });
  }

  cancel(): void {
    this.editing.set(null);
  }

  save(): void {
    const draft = this.editing();
    if (!draft || !draft.code || !draft.clientName) return;
    this.saving.set(true);
    const req = draft.id
      ? this.api.updateWorkCenter(draft.id, draft)
      : this.api.createWorkCenter(draft);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success(draft.id ? 'Puesto actualizado' : 'Puesto creado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('No se pudo guardar el puesto', err.error?.message ?? undefined);
      },
    });
  }

  deactivate(wc: WorkCenter): void {
    if (
      !window.confirm(
        `¿Desactivar el puesto "${wc.clientName}"? Dejará de aparecer en Programación y Dotación.`,
      )
    ) {
      return;
    }
    this.api.updateWorkCenter(wc.id, { isActive: false }).subscribe({
      next: () => {
        this.toast.success('Puesto desactivado');
        this.load();
      },
      error: (err) => {
        this.toast.error('No se pudo desactivar', err.error?.message ?? undefined);
      },
    });
  }

  reactivate(wc: WorkCenter): void {
    this.api.updateWorkCenter(wc.id, { isActive: true }).subscribe({
      next: () => {
        this.toast.success('Puesto reactivado');
        this.load();
      },
      error: (err) => {
        this.toast.error('No se pudo reactivar', err.error?.message ?? undefined);
      },
    });
  }
}
