import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { HrPageHeader } from '../../../../shared/components/hr-page-header/hr-page-header';
import { ToastService } from '../../../../shared/services/toast.service';
import { HrApiService } from '../../services/hr-api.service';
import type { WorkCenter } from '../../services/hr.types';

/**
 * Administración de centros de trabajo (clientes / lugares donde presta el
 * servicio la cooperativa).
 */
@Component({
  selector: 'app-work-centers-admin',
  imports: [CommonModule, FormsModule, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header title="Centros de trabajo">
        @if (auth.hasPermission('work_centers.create')) {
          <div actions>
            <button type="button" class="hr-btn hr-btn-primary" (click)="startCreate()">Nuevo centro</button>
          </div>
        }
      </app-hr-page-header>

      @if (editing() !== null) {
        <form class="hr-detail-card" (ngSubmit)="save()">
          <h3>{{ editing()!.id ? 'Editar centro' : 'Nuevo centro' }}</h3>
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
                <td>
                  @if (auth.hasPermission('work_centers.edit')) {
                    <button type="button" class="hr-btn-link" (click)="edit(wc)">Editar</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty-cell">Sin centros configurados</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class WorkCentersAdmin implements OnInit {
  private readonly api = inject(HrApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly centers = signal<WorkCenter[]>([]);
  readonly editing = signal<Partial<WorkCenter> | null>(null);
  readonly saving = signal(false);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.listWorkCenters().subscribe({ next: (rows) => this.centers.set(rows) });
  }

  startCreate(): void {
    this.editing.set({ code: '', clientName: '', address: '', zone: '', notes: '', isActive: true });
  }

  edit(wc: WorkCenter): void { this.editing.set({ ...wc }); }
  cancel(): void { this.editing.set(null); }

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
        this.toast.success(draft.id ? 'Centro actualizado' : 'Centro creado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('No se pudo guardar el centro', err.error?.message ?? undefined);
      },
    });
  }
}
