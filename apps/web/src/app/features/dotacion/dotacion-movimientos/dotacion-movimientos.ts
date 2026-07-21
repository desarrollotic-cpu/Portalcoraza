import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Delivery, InventoryApiService, InventoryMovement } from '../inventory-api.service';

type ActivityKind = 'MOVEMENT_IN' | 'MOVEMENT_OUT' | 'MOVEMENT_ADJ' | 'DELIVERY' | 'REVERT' | 'PENDING';

interface ActivityRow {
  id: string;
  date: string;
  kind: ActivityKind;
  summary: string;
  detail: string;
  performer: string | null;
  quantity: number | null;
  link: string | null;
}

@Component({
  selector: 'app-dotacion-movimientos',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="dot-page">
      <header class="dot-dash-panel__head">
        <div>
          <h2 style="margin:0;font-size:1.1rem">Historial de movimientos</h2>
          <p class="dot-muted" style="margin:0.35rem 0 0">Ingresos, salidas, ajustes de inventario y entregas confirmadas o revertidas.</p>
        </div>
      </header>

      @if (loading()) {
        <div class="dot-skeleton" style="height:240px"></div>
      } @else if (error()) {
        <div class="dot-error">{{ error() }}</div>
      } @else {
        <div class="dot-filter-bar">
          <label>
            Tipo
            <select [value]="filterKind()" (change)="onFilterKind($event)">
              <option value="ALL">Todos</option>
              <option value="MOVEMENT">Movimientos de stock</option>
              <option value="DELIVERY">Entregas</option>
              <option value="REVERT">Reversiones</option>
            </select>
          </label>
          <span class="dot-muted">{{ filteredRows().length }} registro(s)</span>
        </div>

        <div class="dot-dash-panel" style="padding:0">
          <div class="dot-table-wrap">
            <table class="dot-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Responsable / detalle</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredRows(); track row.id) {
                  <tr>
                    <td>{{ row.date | date: 'short' }}</td>
                    <td>
                      <span class="dot-badge" [class]="kindClass(row.kind)">{{ kindLabel(row.kind) }}</span>
                    </td>
                    <td>{{ row.summary }}</td>
                    <td>{{ row.quantity ?? '—' }}</td>
                    <td>
                      @if (row.performer) {
                        <span>{{ row.performer }}</span>
                        @if (row.link) {
                          · <a [routerLink]="row.link">{{ row.detail }}</a>
                        }
                      } @else if (row.link) {
                        <a [routerLink]="row.link">{{ row.detail }}</a>
                      } @else {
                        <span class="dot-muted">{{ row.detail }}</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="dot-empty">No hay movimientos para mostrar.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class DotacionMovimientos implements OnInit {
  private readonly api = inject(InventoryApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filterKind = signal<'ALL' | 'MOVEMENT' | 'DELIVERY' | 'REVERT'>('ALL');
  readonly rows = signal<ActivityRow[]>([]);

  readonly filteredRows = computed(() => {
    const kind = this.filterKind();
    const all = this.rows();
    if (kind === 'ALL') return all;
    if (kind === 'MOVEMENT') {
      return all.filter((r) => r.kind.startsWith('MOVEMENT_'));
    }
    if (kind === 'DELIVERY') {
      return all.filter((r) => r.kind === 'DELIVERY' || r.kind === 'PENDING');
    }
    return all.filter((r) => r.kind === 'REVERT');
  });

  ngOnInit(): void {
    forkJoin({
      movements: this.api.listMovements(200),
      deliveries: this.api.listDeliveries(),
    }).subscribe({
      next: ({ movements, deliveries }) => {
        this.rows.set(this.buildTimeline(movements, deliveries));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'No se pudo cargar el historial.');
        this.loading.set(false);
      },
    });
  }

  onFilterKind(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'ALL' | 'MOVEMENT' | 'DELIVERY' | 'REVERT';
    this.filterKind.set(value);
  }

  kindClass(kind: ActivityKind): string {
    if (kind === 'MOVEMENT_IN') return 'dot-badge dot-badge--in';
    if (kind === 'MOVEMENT_OUT') return 'dot-badge dot-badge--out';
    if (kind === 'MOVEMENT_ADJ') return 'dot-badge dot-badge--adj';
    if (kind === 'DELIVERY') return 'dot-badge dot-badge--delivered';
    if (kind === 'REVERT') return 'dot-badge dot-badge--reverted';
    return 'dot-badge dot-badge--pending';
  }

  kindLabel(kind: ActivityKind): string {
    const labels: Record<ActivityKind, string> = {
      MOVEMENT_IN: 'Ingreso',
      MOVEMENT_OUT: 'Salida',
      MOVEMENT_ADJ: 'Ajuste',
      DELIVERY: 'Entrega',
      REVERT: 'Reversión',
      PENDING: 'Pendiente',
    };
    return labels[kind];
  }

  private buildTimeline(movements: InventoryMovement[], deliveries: Delivery[]): ActivityRow[] {
    const movementRows: ActivityRow[] = movements.map((m) => {
      const itemName = m.variant?.item?.name ?? m.variant?.sku ?? 'Variante';
      const attrs = m.variant?.attributes ? this.formatAttributes(m.variant.attributes) : '';
      const kind: ActivityKind =
        m.movementType === 'IN'
          ? 'MOVEMENT_IN'
          : m.movementType === 'OUT'
            ? 'MOVEMENT_OUT'
            : 'MOVEMENT_ADJ';

      return {
        id: `mov-${m.id}`,
        date: m.createdAt,
        kind,
        summary: `${itemName}${attrs ? ` (${attrs})` : ''}`,
        detail:
          [m.entryReason, m.observations].filter(Boolean).join(' — ') ||
          m.reason?.trim() ||
          'Movimiento manual',
        performer: m.performedByName ?? null,
        quantity: m.quantity,
        link: null,
      };
    });

    const deliveryRows: ActivityRow[] = deliveries.flatMap((d) => {
      const name = this.associateName(d);
      const details = d.details ?? [];

      let kind: ActivityKind | null = null;
      let date: string | null = null;
      let performerPrefix = '';

      if (d.status === 'DELIVERED' && d.deliveredAt) {
        kind = 'DELIVERY';
        date = d.deliveredAt;
        performerPrefix = 'Entrega a';
      } else if (d.status === 'REVERTED' && d.revertedAt) {
        kind = 'REVERT';
        date = d.revertedAt;
        performerPrefix = 'Revertida —';
      } else if (d.status === 'PENDING') {
        kind = 'PENDING';
        date = d.createdAt;
        performerPrefix = 'Pendiente —';
      }

      if (!kind || !date) return [];

      if (!details.length) {
        const fallback: ActivityRow = {
          id: `del-${d.id}`,
          date,
          kind,
          summary: name,
          detail: d.observations?.trim() || 'Sin detalle de ítems',
          performer: `${performerPrefix} ${name}`,
          quantity: null,
          link: kind === 'PENDING' ? `/dotacion/entregas/${d.id}/firmar` : '/dotacion/asociados',
        };
        return [fallback];
      }

      return details.map((detail): ActivityRow => {
        const itemName = detail.variant?.item?.name ?? detail.variant?.sku ?? 'Ítem';
        const sku = detail.variant?.sku ?? '';
        const attrs = detail.variant?.attributes
          ? this.formatAttributes(detail.variant.attributes)
          : '';

        return {
          id: `del-${d.id}-${detail.id}`,
          date,
          kind,
          summary: `${itemName}${attrs ? ` (${attrs})` : ''}`,
          detail: sku || d.observations?.trim() || 'Entrega',
          performer: `${performerPrefix} ${name}`,
          quantity: detail.quantity,
          link:
            kind === 'PENDING'
              ? `/dotacion/entregas/${d.id}/firmar`
              : '/dotacion/asociados',
        };
      });
    });

    return [...movementRows, ...deliveryRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  private associateName(d: Delivery): string {
    if (d.associate) {
      return [d.associate.firstName, d.associate.secondName, d.associate.firstLastName, d.associate.secondLastName]
        .filter(Boolean)
        .join(' ');
    }
    if (d.postId) return 'Entrega a puesto';
    return 'Sin asociado';
  }

  private formatAttributes(attrs: Record<string, unknown>): string {
    return Object.entries(attrs)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(', ');
  }
}
