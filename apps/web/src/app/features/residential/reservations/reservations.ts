import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  Reservation,
  ReservationStatus,
  ResidentialApiService,
  ResidentialUnit,
} from '../residential-api.service';

@Component({
  selector: 'app-reservations',
  imports: [RouterLink, RouterLinkActive, FormsModule, DatePipe],
  template: `
    <section>
      <header>
        <h2>Residencial — Reservas</h2>
        <p>Gestión de reservas por recurso configurable.</p>
        <nav class="subnav">
          <a routerLink="/residential" routerLinkActive="active">Unidades</a>
          <a routerLink="/residential/visitantes" routerLinkActive="active">Visitantes</a>
          <a routerLink="/residential/paquetes" routerLinkActive="active">Paquetes</a>
          <a
            routerLink="/residential/reservas"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            Reservas
          </a>
        </nav>
      </header>

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
            <option value="PENDING">Pendiente</option>
            <option value="APPROVED">Aprobada</option>
            <option value="REJECTED">Rechazada</option>
            <option value="CANCELLED">Cancelada</option>
            <option value="COMPLETED">Completada</option>
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
        <h3>Nueva reserva</h3>
        <form class="create-form" (ngSubmit)="submitCreate()">
          <label>
            Unidad *
            <select [(ngModel)]="create.unitId" name="unitId" required>
              <option value="">Seleccione...</option>
              @for (u of units(); track u.id) {
                <option [value]="u.id">{{ unitLabel(u) }}</option>
              }
            </select>
          </label>
          <label>
            Recurso *
            <input [(ngModel)]="create.resourceCode" name="resourceCode" required maxlength="60" placeholder="Ej. SALON_SOCIAL" />
          </label>
          <label>
            Inicio *
            <input type="datetime-local" [(ngModel)]="create.startsAt" name="startsAt" required />
          </label>
          <label>
            Fin *
            <input type="datetime-local" [(ngModel)]="create.endsAt" name="endsAt" required />
          </label>
          <button type="submit" [disabled]="submitting()">Crear reserva</button>
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
              <th>Recurso</th>
              <th>Unidad</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (r of reservations(); track r.id) {
              <tr>
                <td>{{ r.resourceCode }}</td>
                <td>{{ unitLabelById(r.unitId) }}</td>
                <td>{{ r.startsAt | date: 'short' }}</td>
                <td>{{ r.endsAt | date: 'short' }}</td>
                <td><span class="badge status-{{ r.status.toLowerCase() }}">{{ r.status }}</span></td>
                <td class="actions">
                  @if (r.status === 'PENDING') {
                    <button type="button" (click)="updateStatus(r.id, 'APPROVED')" [disabled]="submitting()">Aprobar</button>
                    <button type="button" class="secondary" (click)="updateStatus(r.id, 'REJECTED')" [disabled]="submitting()">Rechazar</button>
                  }
                  @if (r.status === 'APPROVED') {
                    <button type="button" (click)="updateStatus(r.id, 'COMPLETED')" [disabled]="submitting()">Completar</button>
                    <button type="button" class="secondary" (click)="updateStatus(r.id, 'CANCELLED')" [disabled]="submitting()">Cancelar</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">No hay reservas registradas.</td>
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
    .create-form { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; align-items: end; }
    button {
      padding: 0.45rem 0.85rem;
      border-radius: 8px;
      border: 1px solid var(--primary);
      background: var(--primary);
      color: #fff;
      cursor: pointer;
      font-size: 0.85rem;
    }
    button.secondary { background: transparent; color: var(--primary-dark); }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.35rem; }
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
    .badge { font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 999px; background: #e9ecef; }
    .badge.status-pending { background: #fff3cd; }
    .badge.status-approved { background: #d4edda; }
    .badge.status-rejected { background: #f8d7da; }
    .badge.status-cancelled { background: #e2e3e5; }
    .badge.status-completed { background: #cce5ff; }
    .error { color: var(--coraza-error); }
    .success { color: #1b7a3d; }
  `,
})
export class Reservations implements OnInit {
  private readonly api = inject(ResidentialApiService);

  readonly units = signal<ResidentialUnit[]>([]);
  readonly reservations = signal<Reservation[]>([]);
  readonly unitFilter = signal('');
  readonly statusFilter = signal<ReservationStatus | ''>('');
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formSuccess = signal<string | null>(null);

  create = { unitId: '', resourceCode: '', startsAt: '', endsAt: '' };

  ngOnInit(): void {
    this.api.listUnits().subscribe({
      next: (units) => {
        this.units.set(units);
        this.loadReservations();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las unidades');
      },
    });
  }

  onUnitFilterChange(unitId: string): void {
    this.unitFilter.set(unitId);
    this.loadReservations();
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status as ReservationStatus | '');
    this.loadReservations();
  }

  submitCreate(): void {
    if (!this.create.unitId || !this.create.resourceCode || !this.create.startsAt || !this.create.endsAt) {
      return;
    }
    this.submitting.set(true);
    this.formError.set(null);
    this.formSuccess.set(null);

    this.api
      .createReservation({
        unitId: this.create.unitId,
        resourceCode: this.create.resourceCode.trim(),
        startsAt: new Date(this.create.startsAt).toISOString(),
        endsAt: new Date(this.create.endsAt).toISOString(),
      })
      .subscribe({
        next: () => {
          this.create = { unitId: '', resourceCode: '', startsAt: '', endsAt: '' };
          this.formSuccess.set('Reserva creada');
          this.submitting.set(false);
          this.loadReservations();
        },
        error: () => {
          this.submitting.set(false);
          this.formError.set('No se pudo crear la reserva (verifique horario y conflictos)');
        },
      });
  }

  updateStatus(reservationId: string, status: ReservationStatus): void {
    this.submitting.set(true);
    this.formError.set(null);
    this.api.updateReservationStatus(reservationId, status).subscribe({
      next: () => {
        this.formSuccess.set(`Estado actualizado a ${status}`);
        this.submitting.set(false);
        this.loadReservations();
      },
      error: () => {
        this.submitting.set(false);
        this.formError.set('No se pudo actualizar el estado');
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

  private loadReservations(): void {
    this.loading.set(true);
    this.error.set(null);
    const unitId = this.unitFilter() || undefined;
    const status = this.statusFilter() || undefined;

    this.api.listReservations(unitId, status).subscribe({
      next: (reservations) => {
        this.reservations.set(reservations);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las reservas');
      },
    });
  }
}
