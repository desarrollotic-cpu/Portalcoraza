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
          <button class="btn-primary" (click)="toggle()">{{ showForm() ? 'Cerrar' : 'Asignar código de carpeta' }}</button>
        }
      </div>
    </div>

    <div class="search-bar">
      <input
        type="search"
        [(ngModel)]="query"
        name="retiredSearch"
        placeholder="Buscar por nombre, cédula o # de carpeta..."
        (ngModelChange)="onSearch($event)"
        autocomplete="off"
      />
      <span class="muted">{{ items().length }} resultado(s)</span>
    </div>

    @if (showForm()) {
      <form class="card" (ngSubmit)="save()">
        <p class="alert-ok" style="grid-column:1/-1">
          Busca en Gestión Humana (cédula o nombre). Tú pones la <strong>fecha de archivo</strong>
          y al guardar Documental asigna el siguiente código de la secuencia.
        </p>
        @if (nextCode()) {
          <p class="code-preview">Próxima carpeta: #{{ nextCode() }}</p>
        }

        <div class="lookup-row" style="grid-column:1/-1">
          <label style="flex:1">
            Buscar en Gestión Humana (cédula o nombre) *
            <div class="lookup-input-wrap">
              <input
                [(ngModel)]="ghQuery"
                name="ghQuery"
                placeholder="Ej: 98498483 o CANO GARCIA"
                (keydown.enter)="$event.preventDefault(); buscarGh()"
              />
              <button type="button" class="btn-primary btn-sm" (click)="buscarGh()" [disabled]="lookupLoading()">
                {{ lookupLoading() ? 'Buscando...' : 'Buscar' }}
              </button>
            </div>
          </label>
        </div>

        @if (ghMatches().length > 1) {
          <div class="pick-list" style="grid-column:1/-1">
            <p class="muted">Varias coincidencias en Gestión Humana. Elige a la persona:</p>
            @for (m of ghMatches(); track m.idNumber) {
              <button type="button" class="pick-item" (click)="pickGh(m)">
                <strong>{{ m.fullName }}</strong>
                <span>CC {{ m.idNumber }} · {{ m.rrhhStatus || 'RRHH' }}</span>
                @if (m.alreadyRegistered) {
                  <span class="badge warn">Ya carpeta #{{ m.existingCode }}</span>
                }
              </button>
            }
          </div>
        }

        @if (alreadyRegistered()) {
          <div class="alert-warn" style="grid-column:1/-1">
            Esta cédula ya tiene carpeta en Documental: <strong>#{{ existingCode() }}</strong> — {{ model.fullName }}.
            Búscala arriba en la lista e imprime el rótulo. No se crea otra carpeta.
          </div>
        }

        @if (lookupDone() && !foundInRrhh() && !alreadyRegistered() && ghMatches().length === 0) {
          <div class="alert-info" style="grid-column:1/-1">
            No está en Gestión Humana con ese dato. Completa nombre y cédula a mano solo si es un caso excepcional.
          </div>
        }

        @if (lookupDone() && foundInRrhh() && !alreadyRegistered()) {
          <div class="alert-ok" style="grid-column:1/-1">
            {{ model.fullName }} — CC {{ model.idNumber }} ({{ rrhhStatus() || 'RRHH' }}).
            Define la fecha de archivo. Al guardar: carpeta <strong>#{{ nextCode() }}</strong>.
          </div>
        }

        @if (!alreadyRegistered()) {

          <label>
            Cédula / Documento *
            <input [(ngModel)]="model.idNumber" name="idNumber" required placeholder="Cédula" [readonly]="foundInRrhh()" />
          </label>

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

          <label>
            Fecha de archivo *
            <input type="date" [(ngModel)]="model.retirementDate" name="retirementDate" required />
            <span class="muted">
              La defines tú. El código lo pone la secuencia de Documental
              @if (nextCode()) { (#{{ nextCode() }}) }.
            </span>
            @if (ghRetirementDate()) {
              <span class="muted">En Gestión Humana consta retiro: {{ ghRetirementDate() }}</span>
            }
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
            <button type="submit" class="btn-primary" [disabled]="saving() || !lookupDone() || alreadyRegistered()">
              Asignar carpeta {{ nextCode() ? '#' + nextCode() : '' }}
            </button>
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
            <tr><td colspan="6" class="muted">{{ query.trim() ? 'Sin coincidencias. Prueba nombre, cédula o número de carpeta.' : 'Sin asociados retirados.' }}</td></tr>
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
    .search-bar {
      display:flex; flex-wrap:wrap; align-items:center; gap:.75rem;
      margin-bottom:1rem;
    }
    .search-bar input[type="search"] {
      flex:1; min-width:240px; max-width:420px;
      padding:.55rem .85rem; border:1px solid #cbd5e1; border-radius:.55rem;
      font-size:.92rem;
    }
    .pick-list { display:flex; flex-direction:column; gap:.4rem; }
    .pick-item {
      display:flex; flex-wrap:wrap; gap:.5rem; align-items:center;
      text-align:left; padding:.55rem .75rem; border:1px solid #cbd5e1;
      border-radius:.55rem; background:#fff; cursor:pointer; font-size:.85rem;
    }
    .pick-item:hover { border-color:#0369a1; background:#f0f9ff; }
    label .muted { display:block; font-size:.8rem; margin-top:.2rem; }
    .code-preview {
      grid-column:1/-1; font-size:1.35rem; font-weight:800; color:#0f172a;
      letter-spacing:.02em;
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
  readonly rrhhStatus = signal<string | null>(null);
  readonly ghRetirementDate = signal<string | null>(null);
  readonly nextCode = signal<number | null>(null);
  readonly ghMatches = signal<
    Array<{
      idNumber: string;
      fullName: string;
      rrhhStatus: string | null;
      retirementDate: string | null;
      alreadyRegistered: boolean;
      existingCode: number | null;
    }>
  >([]);

  model = this.emptyModel();
  query = '';
  ghQuery = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.queueCount.set(getPrintQueue().length);
    this.load();
  }

  toggle(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) {
      this.resetLookup();
      return;
    }
    this.api.searchFromHr('.').subscribe({
      next: (r) => this.nextCode.set(r.nextCode),
      error: () => {},
    });
  }

  buscarGh(): void {
    const q = this.ghQuery.trim();
    if (q.length < 3) {
      this.error.set('Escribe al menos 3 letras o una cédula.');
      return;
    }
    this.lookupLoading.set(true);
    this.error.set(null);
    this.api.searchFromHr(q).subscribe({
      next: (res) => {
        this.lookupLoading.set(false);
        this.nextCode.set(res.nextCode);
        this.ghMatches.set(res.matches);
        this.lookupDone.set(true);
        if (res.matches.length === 1) this.pickGh(res.matches[0]);
        else if (res.matches.length === 0) {
          this.foundInRrhh.set(false);
          this.alreadyRegistered.set(false);
        }
      },
      error: () => {
        this.lookupLoading.set(false);
        this.lookupDone.set(false);
        this.foundInRrhh.set(false);
      },
    });
  }

  pickGh(m: {
    idNumber: string;
    fullName: string;
    rrhhStatus: string | null;
    retirementDate: string | null;
    alreadyRegistered: boolean;
    existingCode: number | null;
  }): void {
    this.model.idNumber = m.idNumber;
    this.model.fullName = m.fullName;
    if (!this.model.retirementDate) this.model.retirementDate = this.todayIso();
    this.model.personType = 'ASOCIADO';
    this.foundInRrhh.set(true);
    this.alreadyRegistered.set(m.alreadyRegistered);
    this.existingCode.set(m.existingCode);
    this.rrhhStatus.set(m.rrhhStatus);
    this.ghRetirementDate.set(m.retirementDate);
    this.lookupDone.set(true);
    this.ghMatches.set(m.alreadyRegistered ? this.ghMatches() : []);
  }

  resetLookup(): void {
    this.ghQuery = '';
    this.lookupDone.set(false);
    this.foundInRrhh.set(false);
    this.alreadyRegistered.set(false);
    this.existingCode.set(null);
    this.rrhhStatus.set(null);
    this.ghRetirementDate.set(null);
    this.ghMatches.set([]);
    this.model = this.emptyModel();
    this.error.set(null);
  }

  onSearch(_value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 280);
  }

  private load(): void {
    this.loading.set(true);
    this.api.listRetired(this.query).subscribe({
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
      this.error.set('Debes completar todos los campos obligatorios (*): Nombre, Cédula, Fecha de archivo, Tipo, Motivo y Ubicación en Estante.');
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

  private todayIso(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  private emptyModel() {
    return {
      fullName: '',
      idNumber: '',
      retirementDate: this.todayIso(),
      personType: 'ASOCIADO',
      retirementReason: '',
      observations: '',
      voxelsera: '',
    };
  }
}
