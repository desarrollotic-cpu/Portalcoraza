import { Component, OnInit, computed, inject, signal } from '@angular/core';
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

    @if (showForm()) {
      <form class="card" (ngSubmit)="save()">
        <label>Tipo de contrato<input [(ngModel)]="model.contractType" name="contractType" /></label>
        <label>Número (auto si vacío)<input [(ngModel)]="model.contractNumber" name="contractNumber" [placeholder]="suggested()" /></label>
        <label>Parte A<input [(ngModel)]="model.partyA" name="partyA" /></label>
        <label>Parte B (cliente)<input [(ngModel)]="model.partyB" name="partyB" /></label>
        <label>NIT<input [(ngModel)]="model.nit" name="nit" /></label>
        <label>Valor (COP)<input type="text" inputmode="decimal" [(ngModel)]="model.contractValue" name="contractValue" /></label>
        <label>Inicio<input type="date" [(ngModel)]="model.startDate" name="startDate" /></label>
        <label>Fin<input type="date" [(ngModel)]="model.endDate" name="endDate" /></label>
        <label>VOXELSERA<input [(ngModel)]="model.voxelsera" name="voxelsera" placeholder="VOXEL_C1" /></label>
        <label class="full">Objeto<textarea [(ngModel)]="model.contractObject" name="contractObject" rows="2"></textarea></label>
        <div class="actions">
          <button type="submit" class="btn-primary" [disabled]="saving()">Guardar</button>
          <span class="muted">Valor &gt; $1.000.000 genera workflow de aprobación.</span>
          @if (error()) { <span class="error">{{ error() }}</span> }
        </div>
      </form>
    }

    @if (lastSaved()) {
      <div class="toast-ok">
        Contrato <strong>{{ lastSaved()!.contractNumber }}</strong> registrado.
        <button type="button" class="btn-primary" (click)="printOne(lastSaved()!)">Imprimir rótulo</button>
        <button type="button" class="btn-ghost" (click)="lastSaved.set(null)">Cerrar</button>
      </div>
    }

    @if (loading()) {
      <p>Cargando...</p>
    } @else {
      <table>
        <thead><tr><th>#</th><th>Número</th><th>Cliente</th><th>Valor</th><th>Vigencia</th><th>Estado</th><th>Rótulo</th></tr></thead>
        <tbody>
          @for (c of items(); track c.id) {
            <tr>
              <td>{{ c.numericCode ?? '—' }}</td>
              <td>{{ c.contractNumber ?? '—' }}</td>
              <td>{{ c.partyB ?? c.partyA ?? '—' }}</td>
              <td>{{ c.contractValue ?? '—' }}</td>
              <td>{{ c.startDate ?? '—' }} → {{ c.endDate ?? 'Indef.' }}</td>
              <td><span class="badge ok">{{ c.status }}</span></td>
              <td><button type="button" class="btn-ghost" (click)="printOne(c)">Imprimir rótulo</button></td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="muted">Sin contratos registrados.</td></tr>
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
export class ContractsScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly items = signal<Contract[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly suggested = signal('');
  readonly lastSaved = signal<Contract | null>(null);
  readonly queueCount = signal(0);
  readonly canCreate = computed(() => this.auth.hasPermission('documental.create'));

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

  ngOnInit(): void {
    this.queueCount.set(getPrintQueue().length);
    this.load();
  }

  toggle(): void {
    this.showForm.update((v) => !v);
    if (this.showForm()) {
      this.api.nextContractCode().subscribe({ next: (r) => this.suggested.set(r.suggested) });
    }
  }

  private load(): void {
    this.loading.set(true);
    this.api.listContracts().subscribe({
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
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.model)) {
      if (v !== '') payload[k] = String(v);
    }
    this.api.createContract(payload).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.showForm.set(false);
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
        this.model = {
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
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo registrar el contrato.');
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
