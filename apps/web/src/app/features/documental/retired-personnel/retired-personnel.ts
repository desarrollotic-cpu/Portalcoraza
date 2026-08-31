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

        <!-- PASO 1: Cédula con autocomplete -->
        <div class="lookup-row">
          <label style="flex:1">
            Cédula / Documento *
            <div class="lookup-input-wrap">
              <input
                [(ngModel)]="model.idNumber"
                name="idNumber"
                required
                placeholder="Escribe la cédula y presiona Enter o Tab"
                (keydown.enter)="$event.preventDefault(); buscarCedula()"
                (blur)="buscarCedula()"
                [readonly]="lookupDone()"
              />
              @if (lookupDone()) {
                <button type="button" class="btn-ghost btn-sm" (click)="resetLookup()" title="Cambiar cédula">✕ Cambiar</button>
              }
            </div>
          </label>
          @if (lookupLoading()) {
            <span class="lookup-status buscando">🔍 Buscando en RRHH...</span>
          }
        </div>

        <!-- Alerta: ya registrado en Documental -->
        @if (alreadyRegistered()) {
          <div class="alert-warn">
            ⚠️ Esta cédula ya tiene carpeta en Gestión Documental: <strong>Carpeta #{{ existingCode() }}</strong> — {{ model.fullName }}.
            No es necesario crear un nuevo registro.
          </div>
        }

        <!-- Alerta: no encontrado en RRHH (llenar manual) -->
        @if (lookupDone() && !foundInRrhh() && !alreadyRegistered()) {
          <div class="alert-info">
            ℹ️ Cédula no encontrada en RRHH. Completa los datos manualmente.
          </div>
        }

        <!-- Alerta: encontrado en RRHH, datos autocompletos -->
        @if (lookupDone() && foundInRrhh() && !alreadyRegistered()) {
          <div class="alert-ok">
            ✅ Datos traídos de RRHH. Verifica la fecha de retiro, selecciona el motivo y la ubicación.
          </div>
        }

        <!-- Solo mostrar el resto del formulario si no está ya registrado -->
        @if (!alreadyRegistered()) {

          <label>
            Nombre Completo *
            <input
              [(ngModel)]="model.fullName"
              name="fullName"
              required
              placeholder="Nombres y apellidos completos"
              [readonly]="foundInRrhh() && lookupDone()"
            />
          </label>

          <label>Fecha de Baja / Retiro *
            <input type="date" [(ngModel)]="model.retirementDate" name="retirementDate" required />
          </label>

          <label>
            Tipo de Persona *
            <select [(ngModel)]="model.personType" name="personType" required>
              <option value="ASOCIADO"> Asociado CTA</option>
              <option value="EMPLEADO"> Empleado / Administrativo</option>
              <option value="CONTRATISTA"> Contratista / Externo</option>
            </select>
          </label>

          <label>
            Motivo de Retiro / Baja *
            <select [(ngModel)]="model.retirementReason" name="retirementReason" required>
              <option value="">-- Seleccionar Motivo de Retiro * --</option>
              <option value="Retiro Voluntario"> Retiro Voluntario</option>
              <option value="Terminación de Convenio / Contrato"> Terminación de Convenio / Contrato</option>
              <option value="Pensión / Jubilación"> Pensión / Jubilación</option>
              <option value="Mutuo Acuerdo"> Mutuo Acuerdo</option>
              <option value="Fallecimiento"> Fallecimiento</option>
              <option value="Justa Causa / Sancionatorio"> Justa Causa / Sancionatorio</option>
              <option value="Otro"> Otro Motivo</option>
            </select>
          </label>

          <label>
            Ubicación en Archivo (Voxelsera) *
            <select [(ngModel)]="model.voxelsera" name="voxelsera" required>
              <option value="">-- Selecciona una casilla obligatoria * --</option>
              <option value="VOXEL_B1"> Estante B — Casilla B1 (Asociados Retirados)</option>
              <option value="VOXEL_B2"> Estante B — Casilla B2 (Asociados Retirados)</option>
              <option value="VOXEL_B3"> Estante B — Casilla B3 (Asociados Retirados)</option>
              <option value="VOXEL_B4"> Estante B — Casilla B4 (Asociados Retirados)</option>
              <option value="VOXEL_B5"> Estante B — Casilla B5 (Asociados Retirados)</option>
              <option value="VOXEL_B6"> Estante B — Casilla B6 (Asociados Retirados)</option>
              <option value="VOXEL_B7"> Estante B — Casilla B7 (Asociados Retirados)</option>
              <option value="VOXEL_B8"> Estante B — Casilla B8 (Asociados Retirados)</option>
              <option value="VOXEL_B9"> Estante B — Casilla B9 (Asociados Retirados)</option>
            </select>
          </label>

          <label class="full">Observaciones (Opcional)
            <textarea [(ngModel)]="model.observations" name="observations" rows="2" placeholder="Observaciones de paz y salvo, liquidación..."></textarea>
          </label>

          <div class="actions">
            <button type="submit" class="btn-primary" [disabled]="saving() || !lookupDone()">Guardar Asociado Retirado</button>
            @if (error()) { <span class="error">{{ error() }}</span> }
          </div>
        }
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
    .lookup-row { display:flex; flex-wrap:wrap; align-items:flex-end; gap:.75rem; }
    .lookup-input-wrap { display:flex; gap:.5rem; align-items:center; }
    .lookup-input-wrap input { flex:1; }
    .btn-sm { padding:.25rem .6rem; font-size:.8rem; }
    .lookup-status { font-size:.85rem; padding:.3rem .6rem; border-radius:6px; }
    .lookup-status.buscando { background:#fef9c3; color:#854d0e; }
    .alert-warn {
      padding:.75rem 1rem; background:#fef2f2; border:1px solid #fca5a5;
      border-radius:8px; color:#991b1b; font-size:.9rem; margin-bottom:.5rem;
    }
    .alert-info {
      padding:.75rem 1rem; background:#eff6ff; border:1px solid #93c5fd;
      border-radius:8px; color:#1e40af; font-size:.9rem; margin-bottom:.5rem;
    }
    .alert-ok {
      padding:.75rem 1rem; background:#f0fdf4; border:1px solid #86efac;
      border-radius:8px; color:#166534; font-size:.9rem; margin-bottom:.5rem;
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

  // Estado del lookup
  readonly lookupLoading = signal(false);
  readonly lookupDone = signal(false);
  readonly foundInRrhh = signal(false);
  readonly alreadyRegistered = signal(false);
  readonly existingCode = signal<number | null>(null);

  model = this.emptyModel();

  ngOnInit(): void {
    this.queueCount.set(getPrintQueue().length);
    this.load();
  }

  toggle(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) this.resetLookup();
  }

  buscarCedula(): void {
    const cedula = this.model.idNumber?.trim();
    if (!cedula || cedula.length < 5 || this.lookupDone()) return;

    this.lookupLoading.set(true);
    this.error.set(null);

    this.api.lookupAssociate(cedula).subscribe({
      next: (res) => {
        this.lookupLoading.set(false);
        this.lookupDone.set(true);
        this.foundInRrhh.set(res.found);
        this.alreadyRegistered.set(res.alreadyRegistered);
        this.existingCode.set(res.existingCode);

        if (res.found) {
          if (res.fullName) this.model.fullName = res.fullName;
          if (res.retirementDate) this.model.retirementDate = res.retirementDate;
          if (res.personType) this.model.personType = res.personType;
        }
      },
      error: () => {
        this.lookupLoading.set(false);
        this.lookupDone.set(true);
        this.foundInRrhh.set(false);
      },
    });
  }

  resetLookup(): void {
    this.lookupDone.set(false);
    this.foundInRrhh.set(false);
    this.alreadyRegistered.set(false);
    this.existingCode.set(null);
    this.model = this.emptyModel();
    this.error.set(null);
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
      this.error.set(' Debes completar todos los campos obligatorios (*): Nombre, Cédula, Fecha de Retiro, Tipo, Motivo y Ubicación en Estante.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const payload = Object.fromEntries(Object.entries(this.model).filter(([, v]) => v !== ''));
    this.api.createRetired(payload).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.showForm.set(false);
        this.resetLookup();
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
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo registrar. Verifica los datos e intenta de nuevo.');
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

  private emptyModel() {
    return {
      fullName: '',
      idNumber: '',
      retirementDate: '',
      personType: 'ASOCIADO',
      retirementReason: '',
      observations: '',
      voxelsera: '',
    };
  }
}
