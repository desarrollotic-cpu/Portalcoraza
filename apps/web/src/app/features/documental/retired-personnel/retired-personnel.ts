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
      </div>
    </div>

    <div class="search-bar">
      <input
        type="search"
        [(ngModel)]="query"
        name="retiredSearch"
        placeholder="Cédula o nombre (Gestión Humana)"
        (ngModelChange)="onSearch($event)"
        (keydown.enter)="$event.preventDefault(); buscar()"
        autocomplete="off"
      />
      <button type="button" class="btn-primary" (click)="buscar()" [disabled]="lookupLoading()">
        {{ lookupLoading() ? 'Buscando...' : 'Buscar' }}
      </button>
      <span class="muted">{{ items().length }} en archivo</span>
    </div>

    @if (canCreate()) {
      <form class="card" (ngSubmit)="save()">
        @if (nextCode()) {
          <p class="code-preview">Próxima carpeta: #{{ nextCode() }}</p>
        }

        @if (ghMatches().length > 1) {
          <div class="pick-list" style="grid-column:1/-1">
            <p class="muted">Varias personas en Gestión Humana. Elige una:</p>
            @for (m of ghMatches(); track m.idNumber) {
              <button type="button" class="pick-item" (click)="pickGh(m)">
                <strong>{{ m.fullName }}</strong>
                <span>CC {{ m.idNumber }} · {{ m.rrhhStatus || 'RRHH' }}</span>
                @if (m.alreadyRegistered) {
                  <span class="badge warn">Tenía #{{ m.existingCode }}</span>
                }
              </button>
            }
          </div>
        }

        @if (foundInRrhh()) {
          <div class="alert-ok" style="grid-column:1/-1">
            {{ model.fullName }} — CC {{ model.idNumber }} ({{ rrhhStatus() || 'RRHH' }}).
            Pon la fecha y al guardar se asigna <strong>#{{ nextCode() }}</strong>.
          </div>
        }

        @if (existingCode()) {
          <div class="alert-info" style="grid-column:1/-1">
            Tenía carpeta <strong>#{{ existingCode() }}</strong>. Al guardar se le asigna el código nuevo
            <strong>#{{ nextCode() }}</strong> (secuencia de Documental).
          </div>
        }

        @if (lookupDone() && !foundInRrhh() && ghMatches().length === 0) {
          <div class="alert-info" style="grid-column:1/-1">
            No está en Gestión Humana con ese dato. Completa nombre y cédula a mano solo si es excepcional.
          </div>
        }

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
            placeholder="Nombres y apellidos"
            [readonly]="foundInRrhh()"
          />
        </label>

        <label>
          Fecha de archivo *
          <input type="date" [(ngModel)]="model.retirementDate" name="retirementDate" required />
          @if (ghRetirementDate()) {
            <span class="muted">En GH consta retiro: {{ ghRetirementDate() }}</span>
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
            <option value="">-- Seleccionar Motivo *</option>
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
          Ubicación en Archivo *
          <select [(ngModel)]="model.voxelsera" name="voxelsera" required>
            <option value="">-- Casilla *</option>
            <option value="VOXEL_B1"> Estante B — B1</option>
            <option value="VOXEL_B2"> Estante B — B2</option>
            <option value="VOXEL_B3"> Estante B — B3</option>
            <option value="VOXEL_B4"> Estante B — B4</option>
            <option value="VOXEL_B5"> Estante B — B5</option>
            <option value="VOXEL_B6"> Estante B — B6</option>
            <option value="VOXEL_B7"> Estante B — B7</option>
            <option value="VOXEL_B8"> Estante B — B8</option>
            <option value="VOXEL_B9"> Estante B — B9</option>
          </select>
        </label>

        <label class="full">Observaciones (Opcional)
          <textarea [(ngModel)]="model.observations" name="observations" rows="2" placeholder="Paz y salvo, liquidación..."></textarea>
        </label>

        <div class="actions">
          <button type="submit" class="btn-primary" [disabled]="saving() || !model.fullName || !model.idNumber">
            Asignar carpeta {{ nextCode() ? '#' + nextCode() : '' }}
          </button>
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
        <thead><tr><th>Carpeta</th><th>Nombre</th><th>Cédula</th><th>Tipo</th><th>Fecha archivo</th><th>Rótulo</th></tr></thead>
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
            <tr><td colspan="6" class="muted">{{ query.trim() ? 'Sin carpetas con ese dato.' : 'Sin asociados retirados.' }}</td></tr>
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
    .alert-info {
      padding:.75rem 1rem; background:#eff6ff; border:1px solid #93c5fd;
      border-radius:8px; color:#1e40af; font-size:.9rem;
    }
    .alert-ok {
      padding:.75rem 1rem; background:#f0fdf4; border:1px solid #86efac;
      border-radius:8px; color:#166534; font-size:.9rem;
    }
    .search-bar {
      display:flex; flex-wrap:wrap; align-items:center; gap:.75rem;
      margin-bottom:1rem;
    }
    .search-bar input[type="search"] {
      flex:1; min-width:240px; max-width:480px;
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
      letter-spacing:.02em; margin:0;
    }
  `,
  ],
})
export class RetiredPersonnelScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly items = signal<RetiredPersonnel[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastSaved = signal<RetiredPersonnel | null>(null);
  readonly queueCount = signal(0);
  readonly canCreate = computed(() => this.auth.hasPermission('documental.create'));

  readonly lookupLoading = signal(false);
  readonly lookupDone = signal(false);
  readonly foundInRrhh = signal(false);
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
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.queueCount.set(getPrintQueue().length);
    this.load();
    this.api.searchFromHr('').subscribe({
      next: (r) => this.nextCode.set(r.nextCode),
      error: () => {},
    });
  }

  buscar(): void {
    this.load();
    const q = this.query.trim();
    if (q.length < 3) {
      this.resetPerson();
      this.error.set(q ? 'Escribe al menos 3 letras o una cédula.' : null);
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
          this.existingCode.set(null);
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
    this.existingCode.set(m.existingCode);
    this.rrhhStatus.set(m.rrhhStatus);
    this.ghRetirementDate.set(m.retirementDate);
    this.lookupDone.set(true);
    this.ghMatches.set([]);
  }

  onSearch(_value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.buscar(), 400);
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
      this.error.set('Completa fecha, motivo y casilla. El código lo pone Documental.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const payload = Object.fromEntries(Object.entries(this.model).filter(([, v]) => v !== ''));
    this.api.createRetired(payload).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.resetPerson();
        addToPrintQueue({
          id: saved.id,
          modulo: 'PERSONAL',
          codigo: String(saved.numericCode ?? saved.id),
          titulo: saved.fullName,
          nit: saved.idNumber,
          fechas: saved.retirementDate ? `Archivo: ${saved.retirementDate}` : '',
          slotFisico: saved.voxelsera || 'Estante B',
        });
        this.queueCount.set(getPrintQueue().length);
        this.lastSaved.set(saved);
        this.nextCode.set((saved.numericCode ?? 0) + 1);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'No se pudo asignar el código.');
      },
    });
  }

  printOne(p: RetiredPersonnel): void {
    printRotulo({
      modulo: 'PERSONAL',
      codigo: String(p.numericCode ?? p.id),
      titulo: p.fullName,
      nit: p.idNumber,
      fechas: p.retirementDate ? `Archivo: ${p.retirementDate}` : '',
      slotFisico: p.voxelsera || 'Estante B',
    });
  }

  printCola(): void {
    printQueue();
  }

  private resetPerson(): void {
    this.lookupDone.set(false);
    this.foundInRrhh.set(false);
    this.existingCode.set(null);
    this.rrhhStatus.set(null);
    this.ghRetirementDate.set(null);
    this.ghMatches.set([]);
    this.model = this.emptyModel();
    this.error.set(null);
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
