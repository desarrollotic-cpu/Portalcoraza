import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentalApiService, RetiredPersonnel } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';
import { addToPrintQueue, getPrintQueue, printQueue, printRotulo } from '../rotulo-print';

@Component({
  selector: 'app-doc-retired',
  imports: [FormsModule],
  template: `
    <div class="toolbar">
      <h3>Asociados Retirados</h3>
      <div class="actions-inline">
        @if (queueCount() > 0) {
          <button type="button" class="btn-ghost" (click)="printCola()">Cola ({{ queueCount() }})</button>
        }
        @if (canCreate()) {
          <button class="btn-primary" (click)="toggle()">{{ showForm() ? 'Cerrar' : 'Nuevo registro' }}</button>
        }
      </div>
    </div>

    @if (showForm()) {
      <form class="card" (ngSubmit)="save()">
        <label>Nombre Completo *<input [(ngModel)]="model.fullName" name="fullName" required placeholder="Nombres y apellidos completos" /></label>
        <label>Cédula / Documento *<input [(ngModel)]="model.idNumber" name="idNumber" required placeholder="Número de cédula de ciudadanía" /></label>
        <label>Fecha de Baja / Retiro *<input type="date" [(ngModel)]="model.retirementDate" name="retirementDate" required /></label>
        <label>
          Tipo de Persona *
          <select [(ngModel)]="model.personType" name="personType" required>
            <option value="ASOCIADO">👥 Asociado CTA</option>
            <option value="EMPLEADO">👔 Empleado / Administrativo</option>
            <option value="CONTRATISTA">🛠️ Contratista / Externo</option>
          </select>
        </label>
        <label>
          Motivo de Retiro / Baja *
          <select [(ngModel)]="model.retirementReason" name="retirementReason" required>
            <option value="">-- Seleccionar Motivo de Retiro * --</option>
            <option value="Retiro Voluntario">🚪 Retiro Voluntario</option>
            <option value="Terminación de Convenio / Contrato">📄 Terminación de Convenio / Contrato</option>
            <option value="Pensión / Jubilación">👴 Pensión / Jubilación</option>
            <option value="Mutuo Acuerdo">🤝 Mutuo Acuerdo</option>
            <option value="Fallecimiento">🕊️ Fallecimiento</option>
            <option value="Justa Causa / Sancionatorio">⚖️ Justa Causa / Sancionatorio</option>
            <option value="Otro">📁 Otro Motivo</option>
          </select>
        </label>
        <label>
          Ubicación en Archivo (Voxelsera) *
          <select [(ngModel)]="model.voxelsera" name="voxelsera" required>
            <option value="">-- Selecciona una casilla obligatoria * --</option>
            <option value="VOXEL_B1">🤝 Estante B — Casilla B1 (Asociados Retirados)</option>
            <option value="VOXEL_B2">🤝 Estante B — Casilla B2 (Asociados Retirados)</option>
            <option value="VOXEL_B3">🤝 Estante B — Casilla B3 (Asociados Retirados)</option>
            <option value="VOXEL_B4">🤝 Estante B — Casilla B4 (Asociados Retirados)</option>
            <option value="VOXEL_B5">🤝 Estante B — Casilla B5 (Asociados Retirados)</option>
            <option value="VOXEL_B6">🤝 Estante B — Casilla B6 (Asociados Retirados)</option>
            <option value="VOXEL_B7">🤝 Estante B — Casilla B7 (Asociados Retirados)</option>
            <option value="VOXEL_B8">🤝 Estante B — Casilla B8 (Asociados Retirados)</option>
            <option value="VOXEL_B9">🤝 Estante B — Casilla B9 (Asociados Retirados)</option>
          </select>
        </label>
        <label class="full">Observaciones (Opcional)<textarea [(ngModel)]="model.observations" name="observations" rows="2" placeholder="Observaciones de paz y salvo, liquidación..."></textarea></label>
        <div class="actions">
          <button type="submit" class="btn-primary" [disabled]="saving()">Guardar Asociado Retirado</button>
          @if (error()) { <span class="error">{{ error() }}</span> }
        </div>
      </form>
    }

    @if (lastSaved()) {
      <div class="toast-ok">
        Expediente <strong>#{{ lastSaved()!.numericCode }}</strong> — {{ lastSaved()!.fullName }} en cola de impresión.
        <button type="button" class="btn-primary" (click)="printOne(lastSaved()!)">Imprimir rótulo</button>
        <button type="button" class="btn-ghost" (click)="lastSaved.set(null)">Cerrar</button>
      </div>
    }

    @if (loading()) {
      <p>Cargando...</p>
    } @else {
      <table>
        <thead><tr><th>Carpeta</th><th>Nombre</th><th>Cédula</th><th>Tipo</th><th>Fecha baja</th><th>Rótulo</th></tr></thead>
        <tbody>
          @for (p of items(); track p.id) {
            <tr>
              <td>{{ p.numericCode ? '#' + p.numericCode : '—' }}</td>
              <td>{{ p.fullName }}</td>
              <td>{{ p.idNumber }}</td>
              <td>{{ p.personType }}</td>
              <td>{{ p.retirementDate ?? '—' }}</td>
              <td><button type="button" class="btn-ghost" (click)="printOne(p)">Imprimir rótulo</button></td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="muted">Sin asociados retirados.</td></tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [
    DOC_STYLES,
    `
    .actions-inline { display:flex; gap:.5rem; flex-wrap:wrap; align-items:center; }
    .toast-ok {
      display:flex; flex-wrap:wrap; align-items:center; gap:.75rem;
      margin-bottom:1rem; padding:.85rem 1rem;
      background:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px; font-size:.9rem;
    }
  `,
  ],
})
export class RetiredPersonnelScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly items = signal<RetiredPersonnel[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastSaved = signal<RetiredPersonnel | null>(null);
  readonly queueCount = signal(0);
  readonly canCreate = computed(() => this.auth.hasPermission('documental.create'));

  model = {
    fullName: '',
    idNumber: '',
    retirementDate: '',
    personType: 'EMPLEADO',
    retirementReason: '',
    observations: '',
    voxelsera: '',
  };

  ngOnInit(): void {
    this.queueCount.set(getPrintQueue().length);
    this.load();
  }

  toggle(): void {
    this.showForm.update((v) => !v);
  }

  private load(): void {
    this.loading.set(true);
    this.api.listRetired().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    if (
      !this.model.fullName?.trim() ||
      !this.model.idNumber?.trim() ||
      !this.model.retirementDate ||
      !this.model.personType ||
      !this.model.retirementReason ||
      !this.model.voxelsera
    ) {
      this.error.set('⚠️ Debes completar todos los campos obligatorios (*): Nombre, Cédula, Fecha de Retiro, Tipo, Motivo y Ubicación en Estante.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const payload = Object.fromEntries(Object.entries(this.model).filter(([, v]) => v !== ''));
    this.api.createRetired(payload).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.showForm.set(false);
        addToPrintQueue({
          id: saved.id,
          modulo: 'PERSONAL',
          codigo: String(saved.numericCode ?? saved.id),
          titulo: saved.fullName,
          nit: saved.idNumber,
          fechas: saved.retirementDate ? `Retiro: ${saved.retirementDate}` : '',
          slotFisico: saved.voxelsera || 'Estante B',
        });
        this.queueCount.set(getPrintQueue().length);
        this.lastSaved.set(saved);
        this.model = {
          fullName: '',
          idNumber: '',
          retirementDate: '',
          personType: 'EMPLEADO',
          retirementReason: '',
          observations: '',
          voxelsera: '',
        };
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo registrar (¿cédula duplicada?).');
      },
    });
  }

  printOne(p: RetiredPersonnel): void {
    printRotulo({
      modulo: 'PERSONAL',
      codigo: String(p.numericCode ?? p.id),
      titulo: p.fullName,
      nit: p.idNumber,
      fechas: p.retirementDate ? `Retiro: ${p.retirementDate}` : '',
      slotFisico: p.voxelsera || 'Estante B',
    });
  }

  printCola(): void {
    printQueue();
  }
}
