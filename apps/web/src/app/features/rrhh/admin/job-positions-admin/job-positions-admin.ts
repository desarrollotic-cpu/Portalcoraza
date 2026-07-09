import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { HrPageHeader } from '../../../../shared/components/hr-page-header/hr-page-header';
import { ToastService } from '../../../../shared/services/toast.service';
import { HrApiService } from '../../services/hr-api.service';
import type { JobPosition } from '../../services/hr.types';

/**
 * Administración de cargos. Un cargo se marca como "crítico" cuando requiere
 * reentrenamiento anual (SST). La frecuencia solo admite 1 o 2 años.
 */
@Component({
  selector: 'app-job-positions-admin',
  imports: [CommonModule, FormsModule, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header title="Cargos">
        @if (auth.hasPermission('job_positions.create')) {
          <div actions>
            <button type="button" class="hr-btn hr-btn-primary" (click)="startCreate()">Nuevo cargo</button>
          </div>
        }
      </app-hr-page-header>

      @if (editing() !== null) {
        <form class="hr-detail-card" (ngSubmit)="save()">
          <h3>{{ editing()!.id ? 'Editar cargo' : 'Nuevo cargo' }}</h3>
          <div class="hr-form-grid-3">
            <div class="hr-field col-2">
              <label>Nombre *</label>
              <input type="text" [(ngModel)]="editing()!.name" name="name" required />
            </div>
            <div class="hr-field">
              <label>Frecuencia (años)</label>
              <select [(ngModel)]="editing()!.refreshFrequencyYears" name="freq">
                <option [ngValue]="1">1 (crítico)</option>
                <option [ngValue]="2">2 (regular)</option>
              </select>
            </div>
            <div class="hr-field col-3">
              <label>Descripción</label>
              <input type="text" [(ngModel)]="editing()!.description" name="desc" />
            </div>
            <div class="hr-field checkbox col-3">
              <label>
                <input type="checkbox" [(ngModel)]="editing()!.isCritical" name="critical" />
                Marcar como crítico (reentrenamiento SST anual)
              </label>
            </div>
          </div>
          <div class="hr-form-actions">
            <button type="button" class="hr-btn hr-btn-ghost" (click)="cancel()">Cancelar</button>
            <button type="submit" class="hr-btn hr-btn-primary" [disabled]="saving()">
              {{ saving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      }

      <div class="hr-table-wrap">
        <table class="hr-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Crítico</th>
              <th>Frecuencia</th>
              <th>Activo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (p of positions(); track p.id) {
              <tr [class.dim]="!p.isActive">
                <td>
                  <strong>{{ p.name }}</strong>
                  @if (p.description) { <div class="desc">{{ p.description }}</div> }
                </td>
                <td>
                  @if (p.isCritical) {
                    <span class="hr-pill hr-pill-critical">Crítico</span>
                  } @else {
                    <span class="hr-pill">Regular</span>
                  }
                </td>
                <td>{{ p.refreshFrequencyYears }} año(s)</td>
                <td>{{ p.isActive ? '✓' : '—' }}</td>
                <td>
                  @if (auth.hasPermission('job_positions.edit')) {
                    <button type="button" class="hr-btn-link" (click)="edit(p)">Editar</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty-cell">Sin cargos configurados</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class JobPositionsAdmin implements OnInit {
  private readonly api = inject(HrApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly positions = signal<JobPosition[]>([]);
  readonly editing = signal<Partial<JobPosition> | null>(null);
  readonly saving = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.listJobPositions().subscribe({ next: (rows) => this.positions.set(rows) });
  }

  startCreate(): void {
    this.editing.set({
      name: '',
      isCritical: false,
      refreshFrequencyYears: 2,
      description: '',
      isActive: true,
    });
  }

  edit(p: JobPosition): void {
    this.editing.set({ ...p });
  }

  cancel(): void {
    this.editing.set(null);
  }

  save(): void {
    const draft = this.editing();
    if (!draft || !draft.name) return;
    this.saving.set(true);
    const req = draft.id
      ? this.api.updateJobPosition(draft.id, draft)
      : this.api.createJobPosition(draft);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success(draft.id ? 'Cargo actualizado' : 'Cargo creado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('No se pudo guardar el cargo', err.error?.message ?? undefined);
      },
    });
  }
}
