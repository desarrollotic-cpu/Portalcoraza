import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  Resident,
  ResidentialApiService,
  ResidentialUnit,
  VirtualLogEntry,
  Visitor,
} from '../residential-api.service';

@Component({
  selector: 'app-visitors-log',
  imports: [RouterLink, RouterLinkActive, FormsModule, DatePipe],
  template: `
    <section>
      <header>
        <h2>Residencial — Visitantes</h2>
        <p>Registro de entrada/salida y libro virtual.</p>
        <nav class="subnav">
          <a routerLink="/residential" routerLinkActive="active">Unidades</a>
          <a
            routerLink="/residential/visitantes"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            Visitantes
          </a>
          <a routerLink="/residential/paquetes" routerLinkActive="active">Paquetes</a>
          <a routerLink="/residential/reservas" routerLinkActive="active">Reservas</a>
        </nav>
      </header>

      <div class="filters">
        <label>
          Filtrar por unidad
          <select [ngModel]="unitFilter()" (ngModelChange)="onUnitFilterChange($event)">
            <option value="">Todas</option>
            @for (u of units(); track u.id) {
              <option [value]="u.id">{{ unitLabel(u) }}</option>
            }
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
        <h3>Registrar entrada</h3>
        <form class="entry-form" (ngSubmit)="submitEntry()">
          <label>
            Unidad *
            <select [(ngModel)]="entry.unitId" name="unitId" required (ngModelChange)="onEntryUnitChange($event)">
              <option value="">Seleccione...</option>
              @for (u of units(); track u.id) {
                <option [value]="u.id">{{ unitLabel(u) }}</option>
              }
            </select>
          </label>
          <label>
            Residente anfitrión
            <select [(ngModel)]="entry.hostResidentId" name="hostResidentId">
              <option value="">—</option>
              @for (r of entryResidents(); track r.id) {
                <option [value]="r.id">{{ r.name }}</option>
              }
            </select>
          </label>
          <label>
            Nombre visitante *
            <input [(ngModel)]="entry.fullName" name="fullName" required maxlength="160" />
          </label>
          <label>
            Documento
            <input [(ngModel)]="entry.documentNumber" name="documentNumber" maxlength="40" />
          </label>
          <label>
            Placa
            <input [(ngModel)]="entry.plate" name="plate" maxlength="20" />
          </label>
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="entry.useParking" name="useParking" />
            Usar parqueadero visitante
          </label>
          <button type="submit" [disabled]="submitting()">Registrar entrada</button>
        </form>
      </div>

      <div class="panel">
        <h3>Visitantes activos</h3>
        @if (loading()) {
          <p>Cargando...</p>
        } @else if (error()) {
          <p class="error">{{ error() }}</p>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Visitante</th>
                <th>Unidad</th>
                <th>Entrada</th>
                <th>Placa</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (v of activeVisitors(); track v.id) {
                <tr>
                  <td>{{ v.fullName }}</td>
                  <td>{{ unitLabelById(v.unitId) }}</td>
                  <td>{{ v.entryTime | date: 'short' }}</td>
                  <td>{{ v.plate ?? '—' }}</td>
                  <td>
                    <button type="button" (click)="exitVisitor(v.id)" [disabled]="submitting()">
                      Registrar salida
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">No hay visitantes activos.</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <div class="panel">
        <h3>Historial reciente</h3>
        <table>
          <thead>
            <tr>
              <th>Visitante</th>
              <th>Unidad</th>
              <th>Entrada</th>
              <th>Salida</th>
            </tr>
          </thead>
          <tbody>
            @for (v of visitorHistory(); track v.id) {
              <tr>
                <td>{{ v.fullName }}</td>
                <td>{{ unitLabelById(v.unitId) }}</td>
                <td>{{ v.entryTime | date: 'short' }}</td>
                <td>{{ v.exitTime ? (v.exitTime | date: 'short') : '—' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4">Sin historial.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (unitFilter()) {
        <div class="panel">
          <h3>Libro virtual — {{ unitLabelById(unitFilter()) }}</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              @for (e of virtualLog(); track e.id) {
                <tr>
                  <td>{{ e.createdAt | date: 'short' }}</td>
                  <td>{{ e.entryType }}</td>
                  <td>{{ formatPayload(e.payload) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3">Sin entradas en el libro virtual.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
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
    .filters { margin-bottom: 1rem; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
    input, select { padding: 0.45rem 0.6rem; border: 1px solid var(--coraza-border); border-radius: 8px; }
    .panel { margin-bottom: 1.5rem; padding: 1rem; background: var(--coraza-surface); border: 1px solid var(--coraza-border); border-radius: 8px; }
    .panel h3 { margin: 0 0 0.75rem; font-size: 1rem; color: var(--primary-dark); }
    .entry-form { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; align-items: end; }
    .checkbox { flex-direction: row; align-items: center; gap: 0.5rem; }
    button[type="submit"], button[type="button"] {
      padding: 0.45rem 0.85rem;
      border-radius: 8px;
      border: 1px solid var(--primary);
      background: var(--primary);
      color: #fff;
      cursor: pointer;
      font-size: 0.85rem;
    }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--coraza-border); text-align: left; font-size: 0.9rem; }
    th { font-size: 0.75rem; text-transform: uppercase; background: var(--primary-50); }
    .error { color: var(--coraza-error); }
    .success { color: #1b7a3d; }
  `,
})
export class VisitorsLog implements OnInit {
  private readonly api = inject(ResidentialApiService);

  readonly units = signal<ResidentialUnit[]>([]);
  readonly activeVisitors = signal<Visitor[]>([]);
  readonly visitorHistory = signal<Visitor[]>([]);
  readonly virtualLog = signal<VirtualLogEntry[]>([]);
  readonly entryResidents = signal<Resident[]>([]);
  readonly unitFilter = signal('');
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formSuccess = signal<string | null>(null);

  entry = {
    unitId: '',
    hostResidentId: '',
    fullName: '',
    documentNumber: '',
    plate: '',
    useParking: false,
  };

  ngOnInit(): void {
    this.api.listUnits().subscribe({
      next: (units) => {
        this.units.set(units);
        this.reload();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las unidades');
      },
    });
  }

  onUnitFilterChange(unitId: string): void {
    this.unitFilter.set(unitId);
    this.reload();
  }

  onEntryUnitChange(unitId: string): void {
    this.entry.hostResidentId = '';
    if (!unitId) {
      this.entryResidents.set([]);
      return;
    }
    this.api.listResidents(unitId).subscribe({
      next: (residents) => this.entryResidents.set(residents),
      error: () => this.entryResidents.set([]),
    });
  }

  submitEntry(): void {
    if (!this.entry.unitId || !this.entry.fullName.trim()) return;
    this.submitting.set(true);
    this.formError.set(null);
    this.formSuccess.set(null);

    this.api
      .registerVisitorEntry({
        unitId: this.entry.unitId,
        fullName: this.entry.fullName.trim(),
        hostResidentId: this.entry.hostResidentId || undefined,
        documentNumber: this.entry.documentNumber || undefined,
        plate: this.entry.plate || undefined,
        useParking: this.entry.useParking,
      })
      .subscribe({
        next: () => {
          this.entry = {
            unitId: '',
            hostResidentId: '',
            fullName: '',
            documentNumber: '',
            plate: '',
            useParking: false,
          };
          this.entryResidents.set([]);
          this.formSuccess.set('Entrada registrada correctamente');
          this.submitting.set(false);
          this.reload();
        },
        error: () => {
          this.submitting.set(false);
          this.formError.set('No se pudo registrar la entrada');
        },
      });
  }

  exitVisitor(visitorId: string): void {
    this.submitting.set(true);
    this.formError.set(null);
    this.api.registerVisitorExit(visitorId).subscribe({
      next: () => {
        this.formSuccess.set('Salida registrada');
        this.submitting.set(false);
        this.reload();
      },
      error: () => {
        this.submitting.set(false);
        this.formError.set('No se pudo registrar la salida');
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

  formatPayload(payload: Record<string, unknown> | null): string {
    if (!payload) return '—';
    try {
      return JSON.stringify(payload);
    } catch {
      return '—';
    }
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const unitId = this.unitFilter() || undefined;

    const active$ = this.api.listActiveVisitors(unitId);
    const history$ = this.api.listVisitorHistory(unitId);

    if (unitId) {
      forkJoin({
        active: active$,
        history: history$,
        log: this.api.listVirtualLog(unitId),
      }).subscribe({
        next: ({ active, history, log }) => {
          this.activeVisitors.set(active);
          this.visitorHistory.set(history.slice(0, 20));
          this.virtualLog.set(log);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudo cargar visitantes');
        },
      });
      return;
    }

    forkJoin({ active: active$, history: history$ }).subscribe({
      next: ({ active, history }) => {
        this.activeVisitors.set(active);
        this.visitorHistory.set(history.slice(0, 20));
        this.virtualLog.set([]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar visitantes');
      },
    });
  }
}
