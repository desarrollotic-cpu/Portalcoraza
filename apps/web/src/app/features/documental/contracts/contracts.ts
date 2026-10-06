import { Component, OnInit, computed, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Contract, DocumentalApiService } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';
import { addToPrintQueue, getPrintQueue, printQueue, printRotulo } from '../rotulo-print';

@Component({
  selector: 'app-doc-contracts',
  imports: [FormsModule],
  template: `
    <div class="toolbar">
      <h3>Contratos</h3>
      <div class="actions-inline">
        @if (queueCount() > 0) {
          <button type="button" class="btn-ghost" (click)="printCola()">Cola ({{ queueCount() }})</button>
        }
        @if (canCreate()) {
          <button class="btn-primary" (click)="toggle()">{{ showForm() ? 'Cerrar' : 'Nuevo contrato' }}</button>
        }
      </div>
    </div>

    <div class="search-bar">
      <input
        type="search"
        [(ngModel)]="query"
        name="contractSearch"
        placeholder="Buscar por cliente, NIT o número de contrato..."
        (ngModelChange)="onSearch($event)"
        autocomplete="off"
      />
      <span class="muted">{{ items().length }} resultado(s)</span>
    </div>

    @if (showForm()) {
      <form class="card" (ngSubmit)="save()">
        @if (editingId()) {
          <p class="code-preview">Editando carpeta #{{ nextCode() }} — el código no cambia</p>
        } @else if (nextCode()) {
          <p class="code-preview">Código de carpeta (Documental): #{{ nextCode() }}</p>
        }
        <p class="muted" style="grid-column:1/-1;margin:0">
          El <strong>número de contrato</strong> es el del cliente (1047, 0919…). El <strong>código</strong> lo asigna Documental para el archivo y la marquilla.
        </p>
        <label>
          Tipo de Contrato *
          <select [(ngModel)]="model.contractType" name="contractType" required>
            <option value="">-- Seleccionar Tipo de Contrato * --</option>
            <option value="VIGILANCIA FIJA"> Vigilancia Fija y Control de Acceso</option>
            <option value="VIGILANCIA MOVIL"> Vigilancia Móvil / Patrullaje</option>
            <option value="ESCOLTA"> Escolta a Personas y Mercancías</option>
            <option value="SEGURIDAD ELECTRONICA"> Seguridad Electrónica y CCTV</option>
            <option value="CONSULTORIA"> Consultoría y Asesoría en Seguridad</option>
            <option value="CONVENIO CTA"> Convenio de Trabajo Asociado (CTA)</option>
            <option value="ARRENDAMIENTO"> Arrendamiento / Inmueble</option>
            <option value="PROVEEDOR"> Proveedor / Suministros</option>
            <option value="OTRO"> Otro Contrato</option>
          </select>
        </label>
        <label>Número de contrato (el del cliente)<input [(ngModel)]="model.contractNumber" name="contractNumber" placeholder="Ej: 1047" /></label>
        <label>Parte A (Contratante)<input [(ngModel)]="model.partyA" name="partyA" placeholder="CORAZA SEGURIDAD C.T.A." /></label>
        <label>Parte B (Cliente / Proveedor) *
          <div class="client-pick">
            <input
              [(ngModel)]="clientFilter"
              name="partyB"
              required
              placeholder="Escriba para buscar el cliente"
              autocomplete="off"
              (ngModelChange)="onClientInput($event)"
              (focus)="clientOpen = true"
              (blur)="clientOpen = false"
              (keydown.enter)="onClientEnter($event)"
            />
            @if (clientOpen && clientFilter.trim()) {
              <ul class="client-results">
                @for (c of visibleClients(); track c.name) {
                  <li><button type="button" (mousedown)="$event.preventDefault(); chooseClient(c)">{{ c.name }}{{ c.nit ? ' · ' + c.nit : '' }}</button></li>
                } @empty {
                  @if (clients().length) {
                    <li class="client-empty">No está en la lista. Se guardará este nombre.</li>
                  }
                }
              </ul>
            }
          </div>
        </label>
        <label>NIT / Cédula Cliente *<input [(ngModel)]="model.nit" name="nit" required placeholder="Ej: 900.123.456-7" /></label>
        <label>Valor Total COP (Opcional)<input type="text" inputmode="decimal" [(ngModel)]="model.contractValue" name="contractValue" placeholder="Ej: 15000000" /></label>
        <label>Fecha de Inicio *<input type="date" [(ngModel)]="model.startDate" name="startDate" required /></label>
        <label>Fecha de Terminación *<input type="date" [(ngModel)]="model.endDate" name="endDate" required /></label>
        <label>
          Ubicación en Archivo (Voxelsera) *
          <select [(ngModel)]="model.voxelsera" name="voxelsera" required>
            <option value="">-- Selecciona una casilla obligatoria * --</option>
            <option value="VOXEL_C1"> Estante C — Casilla C1 (Contratos)</option>
            <option value="VOXEL_C2"> Estante C — Casilla C2 (Contratos)</option>
            <option value="VOXEL_C3"> Estante C — Casilla C3 (Contratos)</option>
            <option value="VOXEL_C4"> Estante C — Casilla C4 (Contratos)</option>
            <option value="VOXEL_C5"> Estante C — Casilla C5 (Contratos)</option>
            <option value="VOXEL_C6"> Estante C — Casilla C6 (Contratos)</option>
            <option value="VOXEL_C7"> Estante C — Casilla C7 (Contratos)</option>
            <option value="VOXEL_C8"> Estante C — Casilla C8 (Contratos)</option>
            <option value="VOXEL_C9"> Estante C — Casilla C9 (Contratos)</option>
          </select>
        </label>
        <label class="full">Objeto del Contrato (Opcional)<textarea [(ngModel)]="model.contractObject" name="contractObject" rows="2" placeholder="Descripción del servicio contratado..."></textarea></label>
        <div class="actions">
          <button type="submit" class="btn-primary" [disabled]="saving()">
            {{ editingId() ? 'Guardar cambios' : 'Guardar contrato' }}
          </button>
          @if (!editingId()) {
            <button type="button" class="btn-ghost" [disabled]="saving()" (click)="save(true)">
              Guardar y otro
            </button>
          }
          <span class="muted">Valor &gt; $1.000.000 genera workflow de aprobación.</span>
          @if (error()) { <span class="error">{{ error() }}</span> }
        </div>
      </form>
    }

    @if (lastSaved()) {
      <div class="toast-ok">
        Contrato <strong>{{ lastSaved()!.contractNumber || 's/n' }}</strong>
        — carpeta <strong>#{{ lastSaved()!.numericCode }}</strong>.
        <button type="button" class="btn-primary" (click)="printOne(lastSaved()!)">Imprimir rótulo</button>
        <button type="button" class="btn-ghost" (click)="lastSaved.set(null)">Cerrar</button>
      </div>
    }

    @if (expiring().length > 0) {
      <div class="expiring-banner">
        <span class="expiring-icon">⚠️</span>
        <strong>{{ expiring().length }} contrato{{ expiring().length > 1 ? 's' : '' }} vence{{ expiring().length === 1 ? '' : 'n' }} en los próximos 30 días:</strong>
        <ul class="expiring-list">
          @for (c of expiring(); track c.id) {
            <li><strong>{{ c.contractNumber }}</strong> — {{ c.partyB ?? c.partyA }} · Vence: <span class="date-warn">{{ c.endDate }}</span></li>
          }
        </ul>
      </div>
    }

    @if (loading()) {
      <p>Cargando...</p>
    } @else {
      <table>
        <thead><tr><th>Carpeta</th><th>N° contrato</th><th>Cliente</th><th>Valor</th><th>Vigencia</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          @for (c of items(); track c.id) {
            <tr>
              <td>{{ c.numericCode ? '#' + c.numericCode : '—' }}</td>
              <td>{{ c.contractNumber ?? '—' }}</td>
              <td>{{ c.partyB ?? c.partyA ?? '—' }}</td>
              <td>{{ c.contractValue ?? '—' }}</td>
              <td>{{ c.startDate ?? '—' }} → {{ c.endDate ?? 'Indef.' }}</td>
              <td><span class="badge ok">{{ c.status }}</span></td>
              <td>
                @if (canCreate()) {
                  <button type="button" class="btn-ghost" (click)="startEdit(c)">Editar</button>
                }
                <button type="button" class="btn-ghost" (click)="printOne(c)">Imprimir rótulo</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="muted">{{ query.trim() ? 'Sin coincidencias. Prueba cliente, NIT o número.' : 'Sin contratos registrados.' }}</td></tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [
    DOC_STYLES,
    `
    .actions-inline { display:flex; gap:.5rem; flex-wrap:wrap; align-items:center; }
    .expiring-banner {
      display:flex; flex-wrap:wrap; gap:.5rem; align-items:flex-start;
      margin-bottom:1rem; padding:.9rem 1rem;
      background:#fffbeb; border:1px solid #fcd34d; border-left:4px solid #f59e0b;
      border-radius:10px; font-size:.88rem; color:#92400e;
    }
    .expiring-icon { font-size:1.1rem; }
    .expiring-list { margin:.35rem 0 0 1rem; padding:0; list-style:disc; width:100%; }
    .expiring-list li { margin:.15rem 0; }
    .date-warn { color:#b45309; font-weight:700; }
    .toast-ok {
      display:flex; flex-wrap:wrap; align-items:center; gap:.75rem;
      margin-bottom:1rem; padding:.85rem 1rem;
      background:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px; font-size:.9rem;
    }
    .code-preview {
      grid-column:1/-1; font-size:1.35rem; font-weight:800; color:#0f172a;
      letter-spacing:.02em; margin:0;
    }
    .client-pick { position: relative; }
    .client-results {
      position: absolute; z-index: 30; left: 0; right: 0; top: calc(100% + 4px);
      margin: 0; padding: 0; list-style: none; max-height: 220px; overflow: auto;
      background: #fff; border: 1px solid #cbd5e1; border-radius: 8px;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
    }
    .client-results button {
      display: block; width: 100%; text-align: left; padding: .45rem .65rem;
      border: 0; background: #fff; cursor: pointer; font: inherit; color: #0f172a;
    }
    .client-results button:hover { background: #e2e8f0; }
    .client-empty { padding: .45rem .65rem; color: #64748b; font-size: .82rem; }
  `,
  ],
})
export class ContractsScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly items = signal<Contract[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly nextCode = signal<number | null>(null);
  readonly lastSaved = signal<Contract | null>(null);
  readonly queueCount = signal(0);
  readonly canCreate = computed(() => this.auth.hasPermission('documental.create'));
  readonly expiring = signal<Contract[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly clients = signal<{ name: string; nit: string | null }[]>([]);

  model = {
    contractType: '',
    contractNumber: '',
    partyA: '',
    partyB: '',
    nit: '',
    contractValue: '',
    startDate: '',
    endDate: '',
    contractObject: '',
    voxelsera: '',
  };
  query = '';
  clientFilter = '';
  clientOpen = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  visibleClients(): { name: string; nit: string | null }[] {
    const q = this.clientFilter.trim().toLowerCase();
    if (!q) return [];
    return this.clients()
      .filter((c) => c.name.toLowerCase().includes(q) || (c.nit || '').toLowerCase().includes(q))
      .slice(0, 15);
  }

  onClientInput(value: string): void {
    this.model.partyB = value.trim();
    this.clientOpen = true;
    const exact = this.clients().find((c) => c.name.toLowerCase() === value.trim().toLowerCase());
    if (exact?.nit) this.model.nit = exact.nit;
  }

  chooseClient(c: { name: string; nit: string | null }): void {
    this.clientFilter = c.name;
    this.model.partyB = c.name;
    if (c.nit) this.model.nit = c.nit;
    this.clientOpen = false;
  }

  onClientEnter(event: Event): void {
    const matches = this.visibleClients();
    if (!matches.length) return;
    event.preventDefault();
    const typed = this.clientFilter.trim().toLowerCase();
    this.chooseClient(matches.find((c) => c.name.toLowerCase() === typed) || matches[0]);
  }

  ngOnInit(): void {
    this.queueCount.set(getPrintQueue().length);
    this.load();
    this.api.expiringContracts(30).subscribe({ next: (r) => this.expiring.set(r) });
    this.api.listContractClients().subscribe({
      next: (rows) => this.clients.set(rows),
      error: () => this.clients.set([]),
    });
  }

  toggle(): void {
    if (this.showForm()) {
      this.showForm.set(false);
      this.resetForm();
      return;
    }
    this.resetForm();
    this.showForm.set(true);
    this.api.nextContractCode().subscribe({
      next: (r) => this.nextCode.set(r.numeric),
    });
  }

  startEdit(c: Contract): void {
    this.editingId.set(c.id);
    this.nextCode.set(c.numericCode);
    this.model = {
      contractType: c.contractType ?? '',
      contractNumber: c.contractNumber ?? '',
      partyA: c.partyA ?? '',
      partyB: c.partyB ?? '',
      nit: c.nit ?? '',
      contractValue: c.contractValue ?? '',
      startDate: (c.startDate ?? '').slice(0, 10),
      endDate: (c.endDate ?? '').slice(0, 10),
      contractObject: c.contractObject ?? '',
      voxelsera: c.voxelsera ?? '',
    };
    this.clientFilter = c.partyB ?? '';
    this.clientOpen = false;
    this.error.set(null);
    this.showForm.set(true);
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.nextCode.set(null);
    this.clientOpen = false;
    this.model = {
      contractType: localStorage.getItem('doc-contract-type') || '',
      contractNumber: '',
      partyA: localStorage.getItem('doc-contract-party-a') || 'CORAZA SEGURIDAD C.T.A.',
      partyB: '',
      nit: '',
      contractValue: '',
      startDate: '',
      endDate: '',
      contractObject: '',
      voxelsera: localStorage.getItem('doc-contract-voxel') || '',
    };
    this.clientFilter = '';
    this.error.set(null);
  }

  onSearch(_value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 280);
  }

  private load(): void {
    this.loading.set(true);
    this.api.listContracts(this.query).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(andAnother = false): void {
    if (
      !this.model.contractType ||
      !this.model.partyB?.trim() ||
      !this.model.nit?.trim() ||
      !this.model.startDate ||
      !this.model.endDate ||
      !this.model.voxelsera
    ) {
      this.error.set(' Debes completar todos los campos obligatorios (*): Tipo, Cliente/Parte B, NIT/Cédula, Fecha Inicio, Fecha Terminación y Ubicación en Estante.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.model)) {
      if (v !== '') payload[k] = String(v);
    }
    const editId = this.editingId();
    const req = editId ? this.api.updateContract(editId, payload) : this.api.createContract(payload);
    req.subscribe({
      next: (saved) => {
        this.saving.set(false);
        if (!editId) {
          localStorage.setItem('doc-contract-type', this.model.contractType);
          localStorage.setItem('doc-contract-party-a', this.model.partyA);
          localStorage.setItem('doc-contract-voxel', this.model.voxelsera);
          const name = this.model.partyB.trim();
          if (name && !this.clients().some((c) => c.name.toLowerCase() === name.toLowerCase())) {
            this.clients.update((list) => [...list, { name, nit: this.model.nit || null }]);
          }
          addToPrintQueue({
            id: saved.id,
            modulo: 'CONTRATOS',
            codigo: String(saved.numericCode ?? saved.contractNumber ?? saved.id),
            titulo: saved.partyB || saved.partyA || 'CONTRATO',
            nit: saved.nit || undefined,
            numContrato: saved.contractNumber || undefined,
            fechas: `${saved.startDate || ''} -- ${saved.endDate || ''}`,
            slotFisico: saved.voxelsera || 'Estante C',
          });
          this.queueCount.set(getPrintQueue().length);
          this.lastSaved.set(saved);
        }
        if (andAnother && !editId) {
          this.model.contractNumber = '';
          this.model.partyB = '';
          this.model.nit = '';
          this.model.contractValue = '';
          this.model.startDate = '';
          this.model.endDate = '';
          this.model.contractObject = '';
          this.clientFilter = '';
          this.clientOpen = false;
          this.showForm.set(true);
          this.api.nextContractCode().subscribe({ next: (r) => this.nextCode.set(r.numeric) });
        } else {
          this.showForm.set(false);
          this.resetForm();
        }
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.error.set(editId ? 'No se pudo guardar el contrato.' : 'No se pudo registrar el contrato.');
      },
    });
  }

  printOne(c: Contract): void {
    printRotulo({
      modulo: 'CONTRATOS',
      codigo: String(c.numericCode ?? c.contractNumber ?? c.id),
      titulo: c.partyB || c.partyA || 'CONTRATO',
      nit: c.nit || undefined,
      numContrato: c.contractNumber || undefined,
      fechas: `${c.startDate || ''} -- ${c.endDate || ''}`,
      slotFisico: c.voxelsera || 'Estante C',
    });
  }

  printCola(): void {
    printQueue();
  }
}
