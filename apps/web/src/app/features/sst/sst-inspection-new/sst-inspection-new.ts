import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { SstApiService, SstInspectionType, SstWorkplace } from '../sst-api.service';

@Component({
  selector: 'app-sst-inspection-new',
  imports: [FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Nueva inspección</h2>
          <p>Crea IPT inicial o seguimiento (requiere inspección previa cerrada/completada).</p>
        </div>
      </header>

      <form class="card" (ngSubmit)="submit()">
        <label>
          Puesto
          <select [(ngModel)]="workplaceId" name="workplaceId" required>
            <option value="">Seleccione…</option>
            @for (w of workplaces(); track w.id) {
              <option [value]="w.id">{{ w.client?.nombre }} — {{ w.nombre }}</option>
            }
          </select>
        </label>
        <label>
          Tipo
          <select [(ngModel)]="tipo" name="tipo">
            <option value="IPT_INICIAL">IPT inicial</option>
            <option value="SEGUIMIENTO">Seguimiento</option>
          </select>
        </label>
        <label>
          Fecha
          <input type="date" [(ngModel)]="fecha" name="fecha" />
        </label>
        <label>
          Responsable
          <input [(ngModel)]="responsableNombre" name="responsableNombre" required />
        </label>
        <label>
          Cargo
          <input [(ngModel)]="responsableCargo" name="responsableCargo" />
        </label>
        <button type="submit" class="btn" [disabled]="busy()">Crear y abrir checklist</button>
      </form>
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 560px; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    .head p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.9rem; }
    .card {
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;
    }
    label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; }
    input, select {
      font: inherit; font-weight: 400; padding: 0.5rem 0.65rem; border-radius: 0.45rem;
      border: 1px solid var(--border, #cbd5e1);
    }
    .btn {
      align-self: flex-start; padding: 0.55rem 1rem; border: 0; border-radius: 0.5rem;
      background: var(--brand, #0f766e); color: #fff; font-weight: 600; cursor: pointer;
    }
    .btn:disabled { opacity: 0.6; }
  `,
})
export class SstInspectionNew implements OnInit {
  private readonly api = inject(SstApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly workplaces = signal<SstWorkplace[]>([]);
  readonly busy = signal(false);

  workplaceId = '';
  tipo: SstInspectionType = 'IPT_INICIAL';
  fecha = new Date().toISOString().slice(0, 10);
  responsableNombre = this.auth.currentUser()?.fullName || '';
  responsableCargo = 'Inspector SST';

  ngOnInit(): void {
    this.api.listWorkplaces().subscribe({
      next: (w) => this.workplaces.set(w),
      error: (e) => this.toast.error(e?.error?.message || 'Error cargando puestos'),
    });
  }

  submit(): void {
    if (!this.workplaceId || !this.responsableNombre.trim()) return;
    this.busy.set(true);
    this.api
      .createInspection({
        workplaceId: this.workplaceId,
        tipo: this.tipo,
        fecha: this.fecha || undefined,
        responsableNombre: this.responsableNombre.trim(),
        responsableCargo: this.responsableCargo.trim() || undefined,
      })
      .subscribe({
        next: (insp) => {
          this.busy.set(false);
          this.toast.success('Inspección creada');
          void this.router.navigate(['/sst/inspecciones', insp.id]);
        },
        error: (e) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo crear la inspección');
        },
      });
  }
}
