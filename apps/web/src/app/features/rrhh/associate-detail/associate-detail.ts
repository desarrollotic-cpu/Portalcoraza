import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DeliveryDialog } from '../../dotacion/delivery-dialog/delivery-dialog';
import { DeliveryHistory } from '../../dotacion/delivery-history/delivery-history';
import {
  Associate,
  AssociateHistoryItem,
  AssociatesApiService,
} from '../associates-api.service';

@Component({
  selector: 'app-associate-detail',
  imports: [CommonModule, RouterLink, DeliveryDialog, DeliveryHistory],
  template: `
    <section>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (!associate()) {
        <p>Cargando...</p>
      } @else {
        <header class="head">
          <h2>{{ fullName() }}</h2>
          <div class="actions">
            <a [routerLink]="['/rrhh/asociados', associate()!.id, 'editar']">Editar</a>
            @if (auth.hasPermission('deliveries.create') && associate()!.status !== 'RETIRADO') {
              <button type="button" (click)="openDelivery()">Entregar dotación</button>
            }
            <button (click)="retire()" [disabled]="associate()!.status === 'RETIRADO'">Retirar</button>
          </div>
        </header>

        <p><strong>Documento:</strong> {{ associate()!.documentNumber ?? '—' }}</p>
        <p><strong>Estado:</strong> {{ associate()!.status }}</p>

        @if (auth.hasPermission('deliveries.view')) {
          <app-delivery-history
            [associateId]="associate()!.id"
            title="Entregas de dotación"
          />
        }

        <h3>Historial RRHH</h3>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Campo</th>
              <th>Anterior</th>
              <th>Nuevo</th>
            </tr>
          </thead>
          <tbody>
            @for (h of history(); track h.id) {
              <tr>
                <td>{{ h.createdAt | date: 'short' }}</td>
                <td>{{ h.fieldName }}</td>
                <td>{{ h.oldValue ?? '—' }}</td>
                <td>{{ h.newValue ?? '—' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="4">Sin historial registrado.</td></tr>
            }
          </tbody>
        </table>
      }
    </section>

    <app-delivery-dialog
      [open]="deliveryOpen()"
      [associateId]="associate()?.id ?? null"
      [subjectLabel]="fullName()"
      (completed)="onDeliveryCompleted()"
      (dismissed)="closeDelivery()"
    />
  `,
  styles: `
    .head { display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap: wrap; }
    .actions { display:flex; gap:0.5rem; flex-wrap: wrap; }
    table { width:100%; border-collapse: collapse; margin-top:0.5rem; }
    th, td { border-bottom:1px solid var(--coraza-border); padding:0.5rem; text-align:left; }
    h3 { margin: 1.5rem 0 0.5rem; color: var(--primary-dark); }
    .error { color: var(--coraza-error); }
  `,
})
export class AssociateDetail implements OnInit {
  private readonly api = inject(AssociatesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly associate = signal<Associate | null>(null);
  readonly history = signal<AssociateHistoryItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly deliveryOpen = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Asociado no encontrado');
      return;
    }

    this.api.getById(id).subscribe({
      next: (a) => this.associate.set(a),
      error: () => this.error.set('No se pudo cargar el asociado'),
    });

    this.api.getHistory(id).subscribe({
      next: (items) => this.history.set(items),
      error: () => this.history.set([]),
    });
  }

  fullName(): string {
    const a = this.associate();
    if (!a) {
      return '';
    }
    return [a.firstName, a.lastName].filter(Boolean).join(' ') || 'Asociado';
  }

  openDelivery(): void {
    this.deliveryOpen.set(true);
  }

  closeDelivery(): void {
    this.deliveryOpen.set(false);
  }

  onDeliveryCompleted(): void {
    this.closeDelivery();
  }

  retire(): void {
    const a = this.associate();
    if (!a || a.status === 'RETIRADO') {
      return;
    }

    const ok = window.confirm('¿Confirmas retirar este asociado?');
    if (!ok) {
      return;
    }

    this.api.retire(a.id).subscribe({
      next: (updated) => this.associate.set(updated),
      error: () => this.error.set('No se pudo retirar el asociado'),
    });
  }
}
