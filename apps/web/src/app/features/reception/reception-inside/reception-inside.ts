import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ReceptionApiService, ReceptionVisitor } from '../reception-api.service';

@Component({
  selector: 'app-reception-inside',
  imports: [DatePipe, FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Visitantes dentro</h2>
          <p>Personas que tienen entrada registrada y aún no tienen salida.</p>
        </div>
        <button type="button" class="ghost" (click)="reload()">Actualizar</button>
      </header>

      <div class="filter">
        <label>
          Buscar
          <input
            type="search"
            placeholder="Nombre, cédula, autorizado por..."
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
          />
        </label>
        <strong>{{ filtered().length }} dentro</strong>
      </div>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Visitante</th>
              <th>Motivo / autorizado</th>
              <th>Entrada</th>
              <th>Desplazamiento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (v of filtered(); track v.id) {
              <tr>
                <td>
                  <strong>{{ v.displayName }}</strong>
                  @if (v.documentNumber) {
                    <div class="meta">C.C. {{ v.documentNumber }}</div>
                  }
                  @if (v.originPlace) {
                    <div class="meta">Viene de: {{ v.originPlace }}</div>
                  }
                </td>
                <td>
                  {{ v.visitReason || '—' }}
                  @if (v.authorizedBy) {
                    <div class="meta">Autorizó: {{ v.authorizedBy }}</div>
                  }
                </td>
                <td>{{ v.entryAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td>
                  {{ transportLabel(v.transportMeans) }}
                  @if (v.travelTimeMinutes !== null) {
                    <div class="meta">{{ v.travelTimeMinutes }} min</div>
                  }
                </td>
                <td class="actions">
                  @if (auth.hasPermission('reception.exit')) {
                    <button type="button" class="btn-sm" (click)="exit(v)">Dar salida</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="empty">No hay visitantes dentro en este momento.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1rem; }
    .head, .filter {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: end;
    }
    .head h2 { margin: 0 0 0.3rem; color: var(--primary-dark); font-size: 1.25rem; }
    .head p { margin: 0; color: #64748b; font-size: 0.9rem; }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: min(340px, 100%);
      font-size: 0.82rem;
      color: #64748b;
    }
    input {
      padding: 0.5rem 0.65rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      font: inherit;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface, #fff);
      border: 1px solid var(--coraza-border);
      border-radius: 12px;
      overflow: hidden;
      font-size: 0.88rem;
    }
    th, td {
      text-align: left;
      padding: 0.65rem 0.75rem;
      border-bottom: 1px solid var(--coraza-border);
      vertical-align: top;
    }
    th {
      background: var(--primary-50);
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--primary-dark);
    }
    .meta { margin-top: 0.15rem; font-size: 0.78rem; color: #64748b; }
    .actions { text-align: right; }
    .ghost {
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--coraza-border));
      background: color-mix(in srgb, var(--primary) 8%, #fff);
      color: var(--primary-dark);
      font-weight: 600;
      cursor: pointer;
      padding: 0.45rem 0.8rem;
      font-size: 0.82rem;
    }
    .btn-sm {
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, #dc2626 35%, #fecaca);
      background: color-mix(in srgb, #dc2626 8%, #fff);
      color: #b91c1c;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }
    .empty { color: #64748b; }
    .error { color: var(--coraza-error); }
  `,
})
export class ReceptionInside implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ReceptionApiService);
  private readonly router = inject(Router);

  readonly visitors = signal<ReceptionVisitor[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const rows = this.visitors();
    if (!q) return rows;
    return rows.filter((v) =>
      [
        v.displayName,
        v.documentNumber,
        v.originPlace,
        v.visitReason,
        v.authorizedBy,
        v.transportMeans,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.listVisitors(true).subscribe({
      next: (visitors) => {
        this.visitors.set(visitors);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los visitantes dentro');
      },
    });
  }

  exit(v: ReceptionVisitor): void {
    if (!window.confirm(`¿Dar salida a ${v.displayName}?`)) return;
    this.api.registerExit(v.id).subscribe({
      next: (saved) => {
        const hora = saved.exitAt
          ? new Date(saved.exitAt).toLocaleString('es-CO', {
              dateStyle: 'short',
              timeStyle: 'medium',
            })
          : '';
        window.alert(`Salida registrada${hora ? ` a las ${hora}` : ''}. Quedó en el historial.`);
        this.router.navigateByUrl('/recepcion/historial');
      },
      error: (err) => window.alert(err?.error?.message ?? 'No se pudo registrar la salida'),
    });
  }

  transportLabel(value: ReceptionVisitor['transportMeans']): string {
    switch (value) {
      case 'MOTO':
        return 'Moto';
      case 'CARRO':
        return 'Carro';
      case 'TRANSPORTE_PUBLICO':
        return 'Transporte público';
      case 'OTRO':
        return 'Otro';
      case 'NINGUNO':
        return 'Ninguno / a pie';
      default:
        return '—';
    }
  }
}
