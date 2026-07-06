import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  Package,
  PackageStatus,
  Resident,
  ResidentialApiService,
  ResidentialUnit,
} from '../residential-api.service';

@Component({
  selector: 'app-packages',
  imports: [FormsModule, DatePipe],
  template: `
    <section>
      <div class="filters">
        <label>
          Unidad
          <select [ngModel]="unitFilter()" (ngModelChange)="onUnitFilterChange($event)">
            <option value="">Todas</option>
            @for (u of units(); track u.id) {
              <option [value]="u.id">{{ unitLabel(u) }}</option>
            }
          </select>
        </label>
        <label>
          Estado
          <select [ngModel]="statusFilter()" (ngModelChange)="onStatusFilterChange($event)">
            <option value="">Todos</option>
            <option value="RECEIVED">Recibidos</option>
            <option value="DELIVERED">Entregados</option>
          </select>
        </label>
      </div>

      @if (formError()) {
        <p class="error">{{ formError() }}</p>
      }
      @if (formSuccess()) {
        <p class="success">{{ formSuccess() }}</p>
      }

      <div class="panel">
        <h3>Recibir paquete</h3>
        <form class="receive-form" (ngSubmit)="submitReceive()">
          <label>
            Unidad *
            <select [(ngModel)]="receive.unitId" name="unitId" required (ngModelChange)="onReceiveUnitChange($event)">
              <option value="">Seleccione...</option>
              @for (u of units(); track u.id) {
                <option [value]="u.id">{{ unitLabel(u) }}</option>
              }
            </select>
          </label>
          <label>
            Residente
            <select [(ngModel)]="receive.residentId" name="residentId">
              <option value="">—</option>
              @for (r of receiveResidents(); track r.id) {
                <option [value]="r.id">{{ r.name }}</option>
              }
            </select>
          </label>
          <label>
            Remitente
            <input [(ngModel)]="receive.sender" name="sender" maxlength="160" />
          </label>
          <label>
            Descripción
            <input [(ngModel)]="receive.description" name="description" />
          </label>
          <button type="submit" [disabled]="submitting()">Registrar recepción</button>
        </form>
      </div>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Recibido</th>
              <th>Unidad</th>
              <th>Residente</th>
              <th>Remitente</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            @for (p of packages(); track p.id) {
              <tr>
                <td>{{ p.receivedAt | date: 'short' }}</td>
                <td>{{ unitLabelById(p.unitId) }}</td>
                <td>{{ p.resident?.name ?? '—' }}</td>
                <td>{{ p.sender ?? '—' }}</td>
                <td>
                  <span class="badge" [class.delivered]="p.status === 'DELIVERED'">{{ p.status }}</span>
                </td>
                <td>
                  @if (p.status === 'RECEIVED') {
                    <button type="button" (click)="deliver(p.id)" [disabled]="submitting()">
                      Marcar entregado
                    </button>
                  } @else {
                    {{ p.deliveredAt ? (p.deliveredAt | date: 'short') : '—' }}
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">No hay paquetes registrados.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    header h2 { margin: 0; color: var(--primary-dark); font-weight: 600; }
    header p { color: var(--coraza-text-muted); margin: 0.25rem 0 1rem; }
    .subnav { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
    .subnav a {
      text-decoration: none;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      border: 1px solid var(--coraza-border);
      color: var(--primary-dark);
      font-size: 0.85rem;
    }
    .subnav a.active { background: var(--primary-50); border-color: var(--primary); }
    .filters { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
    input, select { padding: 0.45rem 0.6rem; border: 1px solid var(--coraza-border); border-radius: 8px; min-width: 180px; }
    .panel { margin-bottom: 1.5rem; padding: 1rem; background: var(--coraza-surface); border: 1px solid var(--coraza-border); border-radius: 8px; }
    .panel h3 { margin: 0 0 0.75rem; font-size: 1rem; }
    .receive-form { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; align-items: end; }
    button {
      padding: 0.45rem 0.85rem;
      border-radius: 8px;
      border: 1px solid var(--primary);
      background: var(--primary);
      color: #fff;
      cursor: pointer;
      font-size: 0.85rem;
    }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--coraza-border); text-align: left; }
    th { background: var(--primary-50); font-size: 0.75rem; text-transform: uppercase; }
    .badge { font-size: 0.75rem; background: #fff3cd; padding: 0.15rem 0.5rem; border-radius: 999px; }
    .badge.delivered { background: #d4edda; }
    .error { color: var(--coraza-error); }
    .success { color: #1b7a3d; }
  `,
})
export class Packages implements OnInit {
  private readonly api = inject(ResidentialApiService);

  readonly units = signal<ResidentialUnit[]>([]);
  readonly packages = signal<Package[]>([]);
  readonly receiveResidents = signal<Resident[]>([]);
  readonly unitFilter = signal('');
  readonly statusFilter = signal<PackageStatus | ''>('');
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formSuccess = signal<string | null>(null);

  receive = { unitId: '', residentId: '', sender: '', description: '' };

  ngOnInit(): void {
    this.api.listUnits().subscribe({
      next: (units) => {
        this.units.set(units);
        this.loadPackages();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las unidades');
      },
    });
  }

  onUnitFilterChange(unitId: string): void {
    this.unitFilter.set(unitId);
    this.loadPackages();
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status as PackageStatus | '');
    this.loadPackages();
  }

  onReceiveUnitChange(unitId: string): void {
    this.receive.residentId = '';
    if (!unitId) {
      this.receiveResidents.set([]);
      return;
    }
    this.api.listResidents(unitId).subscribe({
      next: (residents) => this.receiveResidents.set(residents),
      error: () => this.receiveResidents.set([]),
    });
  }

  submitReceive(): void {
    if (!this.receive.unitId) return;
    this.submitting.set(true);
    this.formError.set(null);
    this.formSuccess.set(null);

    this.api
      .receivePackage({
        unitId: this.receive.unitId,
        residentId: this.receive.residentId || undefined,
        sender: this.receive.sender || undefined,
        description: this.receive.description || undefined,
      })
      .subscribe({
        next: () => {
          this.receive = { unitId: '', residentId: '', sender: '', description: '' };
          this.receiveResidents.set([]);
          this.formSuccess.set('Paquete registrado');
          this.submitting.set(false);
          this.loadPackages();
        },
        error: () => {
          this.submitting.set(false);
          this.formError.set('No se pudo registrar el paquete');
        },
      });
  }

  deliver(packageId: string): void {
    this.submitting.set(true);
    this.formError.set(null);
    this.api.deliverPackage(packageId).subscribe({
      next: () => {
        this.formSuccess.set('Paquete entregado');
        this.submitting.set(false);
        this.loadPackages();
      },
      error: () => {
        this.submitting.set(false);
        this.formError.set('No se pudo marcar como entregado');
      },
    });
  }

  unitLabel(u: ResidentialUnit): string {
    const block = u.block ? `Bloque ${u.block} — ` : '';
    return `${block}Unidad ${u.number}`;
  }

  unitLabelById(unitId: string): string {
    const u = this.units().find((x) => x.id === unitId);
    return u ? this.unitLabel(u) : unitId.slice(0, 8);
  }

  private loadPackages(): void {
    this.loading.set(true);
    this.error.set(null);
    const unitId = this.unitFilter() || undefined;
    const status = this.statusFilter() || undefined;

    this.api.listPackages(unitId, status).subscribe({
      next: (packages) => {
        this.packages.set(packages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los paquetes');
      },
    });
  }
}
