import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { SstApiService, SstInspectionType, SstWorkplace } from '../sst-api.service';

@Component({
  selector: 'app-sst-inspection-new',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Nueva inspección</h2>
          <p>
            <strong>IPT inicial:</strong> primera evaluación del puesto (34 ítems).
            <strong>Seguimiento:</strong> requiere IPT previa COMPLETADA/CERRADA; precarga hallazgos
            RIESGOSO.
          </p>
        </div>
      </header>

      @if (!loading() && workplaces().length === 0) {
        <div class="warn">
          <p>No hay puestos SST. Primero crea un cliente y al menos un puesto.</p>
          <div class="row">
            @if (auth.hasPermission('sst.manage')) {
              <a class="btn" routerLink="/sst/puestos">Ir a clientes y puestos</a>
              <button type="button" class="btn ghost" [disabled]="seeding()" (click)="seedDemo()">
                Crear puestos demo Coraza
              </button>
            }
          </div>
        </div>
      } @else {
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
          <button type="submit" class="btn" [disabled]="busy() || !workplaces().length">
            Crear y abrir checklist
          </button>
        </form>
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 560px; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    .head p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.9rem; }
    .card, .warn {
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;
    }
    .warn p { margin: 0; }
    .row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; }
    input, select {
      font: inherit; font-weight: 400; padding: 0.5rem 0.65rem; border-radius: 0.45rem;
      border: 1px solid var(--border, #cbd5e1);
    }
    .btn {
      align-self: flex-start; padding: 0.55rem 1rem; border: 0; border-radius: 0.5rem;
      background: var(--brand, #0f766e); color: #fff; font-weight: 600; cursor: pointer;
      text-decoration: none; display: inline-flex;
    }
    .btn.ghost { background: transparent; color: var(--brand, #0f766e); border: 1px solid var(--border, #cbd5e1); }
    .btn:disabled { opacity: 0.6; }
  `,
})
export class SstInspectionNew implements OnInit {
  private readonly api = inject(SstApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly workplaces = signal<SstWorkplace[]>([]);
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly seeding = signal(false);

  workplaceId = '';
  tipo: SstInspectionType = 'IPT_INICIAL';
  fecha = new Date().toISOString().slice(0, 10);
  responsableNombre = this.auth.currentUser()?.fullName || '';
  responsableCargo = 'Inspector SST';

  ngOnInit(): void {
    this.reloadWorkplaces();
  }

  seedDemo(): void {
    this.seeding.set(true);
    this.api.bootstrapDemo().subscribe({
      next: () => {
        this.seeding.set(false);
        this.toast.success('Puestos demo listos');
        this.reloadWorkplaces();
      },
      error: (e) => {
        this.seeding.set(false);
        this.toast.error(e?.error?.message || 'No se pudieron crear puestos');
      },
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
          this.toast.success('Inspección creada — completa los 34 ítems');
          void this.router.navigate(['/sst/inspecciones', insp.id]);
        },
        error: (e) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo crear la inspección');
        },
      });
  }

  private reloadWorkplaces(): void {
    this.loading.set(true);
    this.api.listWorkplaces().subscribe({
      next: (w) => {
        this.workplaces.set(w);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.error(e?.error?.message || 'Error cargando puestos');
      },
    });
  }
}
