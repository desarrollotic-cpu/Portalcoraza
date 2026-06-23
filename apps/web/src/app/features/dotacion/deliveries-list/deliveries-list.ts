import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Associate, AssociatesApiService } from '../../rrhh/associates-api.service';
import { Delivery, InventoryApiService } from '../inventory-api.service';

@Component({
  selector: 'app-deliveries-list',
  imports: [RouterLink, DatePipe],
  template: `
    <section>
      <header>
        <h2>Dotación — Entregas</h2>
        <p>Entregas pendientes y confirmadas con firma.</p>
        <div class="header-actions">
          <a routerLink="/dotacion/entregas/nueva">Nueva entrega</a>
          <a routerLink="/dotacion">Volver a inventario</a>
        </div>
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Asociado</th>
              <th>Estado</th>
              <th>Ítems</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (d of deliveries(); track d.id) {
              <tr>
                <td>{{ d.createdAt | date: 'short' }}</td>
                <td>{{ associateName(d.associateId) }}</td>
                <td><span class="badge" [class.delivered]="d.status === 'DELIVERED'">{{ d.status }}</span></td>
                <td>{{ d.details.length }} línea(s)</td>
                <td>
                  @if (d.status === 'PENDING') {
                    <a [routerLink]="['/dotacion/entregas', d.id, 'firmar']">Firmar</a>
                  } @else if (d.signatureUrl) {
                    <a [href]="d.signatureUrl" target="_blank" rel="noopener">Ver firma</a>
                  } @else {
                    —
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">No hay entregas registradas.</td>
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
    .header-actions { display: flex; gap: 1rem; margin-bottom: 1rem; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface);
      border-radius: var(--coraza-radius);
      border: 1px solid var(--coraza-border);
      box-shadow: var(--coraza-shadow);
    }
    th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid var(--coraza-border); }
    th { background: var(--primary-50); font-size: 0.75rem; text-transform: uppercase; color: var(--primary-dark); }
    .badge { font-size: 0.75rem; background: #fff3cd; padding: 0.15rem 0.5rem; border-radius: 999px; }
    .badge.delivered { background: #d4edda; }
    .error { color: var(--coraza-error); }
  `,
})
export class DeliveriesList implements OnInit {
  private readonly api = inject(InventoryApiService);
  private readonly associatesApi = inject(AssociatesApiService);

  readonly deliveries = signal<Delivery[]>([]);
  readonly associates = signal<Associate[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    forkJoin({
      deliveries: this.api.listDeliveries(),
      associates: this.associatesApi.list(),
    }).subscribe({
      next: ({ deliveries, associates }) => {
        this.deliveries.set(deliveries);
        this.associates.set(associates);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las entregas');
      },
    });
  }

  associateName(id: string): string {
    const a = this.associates().find((x) => x.id === id);
    if (!a) return id.slice(0, 8);
    const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
    return name || a.documentNumber || '—';
  }
}
