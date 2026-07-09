import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { forkJoin } from 'rxjs';
import { DeliveryDialog } from '../delivery-dialog/delivery-dialog';
import { DeliverableAssociate, Delivery, InventoryApiService } from '../inventory-api.service';
import { SignatureViewer } from '../signature-viewer/signature-viewer';

@Component({
  selector: 'app-deliveries-list',
  imports: [RouterLink, DatePipe, DeliveryDialog, SignatureViewer],
  template: `
    <section>
      <header class="toolbar">
        @if (auth.hasPermission('deliveries.create')) {
          <button type="button" class="btn-primary" (click)="openNewDelivery()">Nueva entrega</button>
        }
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
                <td>{{ associateName(d) }}</td>
                <td>
                  <span
                    class="badge"
                    [class.delivered]="d.status === 'DELIVERED'"
                    [class.reverted]="d.status === 'REVERTED'"
                  >{{ d.status }}</span>
                </td>
                <td>{{ d.details.length }} línea(s)</td>
                <td>
                  @if (d.status === 'PENDING') {
                    <a [routerLink]="['/dotacion/entregas', d.id, 'firmar']">Firmar</a>
                  } @else if (d.signatureUrl) {
                    <app-signature-viewer [url]="d.signatureUrl" />
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

    <app-delivery-dialog
      [open]="dialogOpen()"
      [associateId]="dialogAssociateId()"
      [subjectLabel]="dialogSubject()"
      (completed)="onDeliveryCompleted()"
      (dismissed)="closeDialog()"
    />
  `,
  styles: `
    .toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 1rem;
    }
    .btn-primary {
      padding: 0.5rem 1rem;
      background: var(--primary);
      color: var(--text-on-primary);
      border: none;
      border-radius: var(--coraza-radius);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: transparent;
      border-radius: var(--coraza-radius);
      border: 1px solid var(--coraza-border);
    }
    th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid var(--coraza-border); }
    th { background: var(--primary-50); font-size: 0.75rem; text-transform: uppercase; color: var(--primary-dark); }
    .badge { font-size: 0.75rem; background: #fff3cd; padding: 0.15rem 0.5rem; border-radius: 999px; }
    .badge.delivered { background: #d4edda; }
    .badge.reverted { background: #f8d7da; }
    .error { color: var(--coraza-error); }
  `,
})
export class DeliveriesList implements OnInit {
  private readonly api = inject(InventoryApiService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly deliveries = signal<Delivery[]>([]);
  readonly deliverable = signal<DeliverableAssociate[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly dialogOpen = signal(false);
  readonly dialogAssociateId = signal<string | null>(null);
  readonly dialogSubject = signal('');

  ngOnInit(): void {
    forkJoin({
      deliveries: this.api.listDeliveries(),
      deliverable: this.api.listEligibleAssociates(),
    }).subscribe({
      next: ({ deliveries, deliverable }) => {
        this.deliveries.set(deliveries);
        this.deliverable.set(deliverable);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las entregas');
      },
    });
  }

  associateName(d: Delivery): string {
    if (!d.associateId) return 'Puesto';
    const embedded = d.associate;
    if (embedded) {
      const name = [
        embedded.firstName,
        embedded.secondName,
        embedded.firstLastName,
        embedded.secondLastName,
      ]
        .filter(Boolean)
        .join(' ');
      return name || embedded.documentNumber || '—';
    }
    const a = this.deliverable().find((x) => x.id === d.associateId);
    if (!a) return d.associateId.slice(0, 8);
    const name = [a.firstName, a.secondName, a.firstLastName, a.secondLastName]
      .filter(Boolean)
      .join(' ');
    return name || a.documentNumber || '—';
  }

  openNewDelivery(): void {
    const eligible = this.deliverable();
    if (eligible.length === 1) {
      const a = eligible[0];
      this.dialogAssociateId.set(a.id);
      this.dialogSubject.set(this.formatName(a));
      this.dialogOpen.set(true);
      return;
    }
    void this.router.navigate(['/dotacion/entregas/nueva']);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  onDeliveryCompleted(): void {
    this.closeDialog();
    this.reload();
  }

  private formatName(a: DeliverableAssociate): string {
    const name = [a.firstName, a.secondName, a.firstLastName, a.secondLastName]
      .filter(Boolean)
      .join(' ');
    return name || a.documentNumber || '—';
  }

  private reload(): void {
    this.api.listDeliveries().subscribe({
      next: (deliveries) => this.deliveries.set(deliveries),
    });
  }
}
