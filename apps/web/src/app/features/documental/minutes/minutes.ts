import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentalApiService, Minute } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';
import { addToPrintQueue, getPrintQueue, printQueue, printRotulo } from '../rotulo-print';

@Component({
  selector: 'app-doc-minutes',
  imports: [FormsModule],
  template: `
    <div class="toolbar">
      <h3>Minutas</h3>
      <div class="actions-inline">
        @if (queueCount() > 0) {
          <button type="button" class="btn-ghost" (click)="printCola()">
            Cola de impresión ({{ queueCount() }})
          </button>
        }
        @if (canCreate()) {
          <button class="btn-primary" (click)="toggle()">{{ showForm() ? 'Cerrar' : 'Nueva minuta' }}</button>
        }
      </div>
    </div>

    @if (showForm()) {
      <form class="card" (ngSubmit)="save()">
        <label>Tipo de minuta
          <select [(ngModel)]="model.minuteType" name="minuteType" required>
            <option value="SERVICIO">Servicio</option>
            <option value="VISITANTES">Visitantes</option>
            <option value="CORRESPONDENCIA">Correspondencia</option>
          </select>
        </label>
        <label>Puesto<input [(ngModel)]="model.postName" name="postName" /></label>
        <label>Fecha inicio<input type="date" [(ngModel)]="model.startDate" name="startDate" /></label>
        <label>Fecha cierre<input type="date" [(ngModel)]="model.closeDate" name="closeDate" /></label>
        <label>Ubicación VOXELSERA
          <input [(ngModel)]="model.voxelsera" name="voxelsera" placeholder="VOXEL_A1 / A-1" />
        </label>
        <label class="full">Observaciones<textarea [(ngModel)]="model.observations" name="observations" rows="2"></textarea></label>
        <div class="actions">
          <button type="submit" class="btn-primary" [disabled]="saving()">Guardar</button>
          @if (error()) { <span class="error">{{ error() }}</span> }
        </div>
      </form>
    }

    @if (lastSaved()) {
      <div class="toast-ok">
        Minuta <strong>{{ lastSaved()!.uniqueCode }}</strong> registrada y agregada a la cola de impresión.
        <button type="button" class="btn-primary" (click)="printSaved()">Imprimir rótulo</button>
        <button type="button" class="btn-ghost" (click)="lastSaved.set(null)">Cerrar</button>
      </div>
    }

    @if (loading()) {
      <p>Cargando...</p>
    } @else {
      <table>
        <thead><tr><th>Código</th><th>Tipo</th><th>Puesto</th><th>Inicio</th><th>Estado</th><th>Rótulo</th></tr></thead>
        <tbody>
          @for (m of items(); track m.id) {
            <tr>
              <td>{{ m.uniqueCode ?? '—' }}</td>
              <td>{{ m.minuteType }}</td>
              <td>{{ m.postName ?? '—' }}</td>
              <td>{{ m.startDate ?? '—' }}</td>
              <td><span class="badge ok">{{ m.status }}</span></td>
              <td>
                <button type="button" class="btn-ghost" (click)="printOne(m)" title="Generar rótulo para imprimir">
                  Imprimir rótulo
                </button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="muted">Sin minutas registradas.</td></tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [
    DOC_STYLES,
    `
    .actions-inline { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
    .toast-ok {
      display: flex; flex-wrap: wrap; align-items: center; gap: .75rem;
      margin-bottom: 1rem; padding: .85rem 1rem;
      background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px;
      font-size: .9rem;
    }
  `,
  ],
})
export class MinutesScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly items = signal<Minute[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastSaved = signal<Minute | null>(null);
  readonly queueCount = signal(0);
  readonly canCreate = computed(() => this.auth.hasPermission('documental.create'));

  model = {
    minuteType: 'SERVICIO',
    postName: '',
    startDate: '',
    closeDate: '',
    voxelsera: '',
    observations: '',
  };

  ngOnInit(): void {
    this.refreshQueue();
    this.load();
  }

  toggle(): void {
    this.showForm.update((v) => !v);
  }

  private refreshQueue(): void {
    this.queueCount.set(getPrintQueue().length);
  }

  private load(): void {
    this.loading.set(true);
    this.api.listMinutes().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    const payload = Object.fromEntries(Object.entries(this.model).filter(([, v]) => v !== ''));
    this.api.createMinute(payload).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.showForm.set(false);
        const slot = saved.voxelsera || this.model.voxelsera || 'Estante A';
        addToPrintQueue({
          id: saved.id,
          modulo: 'MINUTAS',
          codigo: saved.uniqueCode || String(saved.numericCode ?? saved.id),
          titulo: saved.postName || this.model.postName || 'MINUTA',
          fechas: `${saved.startDate || this.model.startDate || ''} -- ${saved.closeDate || this.model.closeDate || ''}`,
          slotFisico: slot,
        });
        this.refreshQueue();
        this.lastSaved.set(saved);
        this.model = {
          minuteType: 'SERVICIO',
          postName: '',
          startDate: '',
          closeDate: '',
          voxelsera: '',
          observations: '',
        };
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo registrar la minuta.');
      },
    });
  }

  printOne(m: Minute): void {
    printRotulo({
      modulo: 'MINUTAS',
      codigo: m.uniqueCode || String(m.numericCode ?? m.id),
      titulo: m.postName || 'MINUTA',
      fechas: `${m.startDate || ''} -- ${m.closeDate || ''}`,
      slotFisico: m.voxelsera || 'Estante A',
    });
  }

  printSaved(): void {
    const m = this.lastSaved();
    if (m) this.printOne(m);
  }

  printCola(): void {
    printQueue();
  }
}
