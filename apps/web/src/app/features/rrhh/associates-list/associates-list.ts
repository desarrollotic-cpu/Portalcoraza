import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Associate, AssociatesApiService } from '../associates-api.service';

@Component({
  selector: 'app-associates-list',
  imports: [RouterLink],
  template: `
    <section>
      <header>
        <h2>Asociados</h2>
        <p>Gestión centralizada (RRHH).</p>
        <a routerLink="/rrhh/asociados/nuevo">Crear asociado</a>
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Documento</th>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Correo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (a of associates(); track a.id) {
              <tr>
                <td>{{ a.documentNumber ?? '—' }}</td>
                <td>{{ fullName(a) }}</td>
                <td><span class="badge">{{ a.status }}</span></td>
                <td>{{ a.email ?? '—' }}</td>
                <td class="actions-cell">
                  <a [routerLink]="['/rrhh/asociados', a.id]">Ver historia</a>
                  <a [routerLink]="['/rrhh/asociados', a.id, 'editar']">Editar</a>
                  <button
                    type="button"
                    (click)="retire(a)"
                    [disabled]="a.status === 'RETIRADO'"
                  >
                    Retirar
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">No hay asociados registrados.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    header h2 {
      margin: 0;
      color: var(--primary-dark);
      font-weight: 600;
    }
    header p {
      color: var(--coraza-text-muted);
      margin: 0.25rem 0 1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface);
      border-radius: var(--coraza-radius);
      overflow: hidden;
      border: 1px solid var(--coraza-border);
      box-shadow: var(--coraza-shadow);
    }
    th,
    td {
      text-align: left;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--coraza-border);
    }
    th {
      background: var(--primary-50);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--primary-dark);
      font-weight: 600;
    }
    .badge {
      font-size: 0.75rem;
      background: var(--accent-bg);
      color: var(--primary-dark);
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
    }
    .error {
      color: var(--coraza-error);
    }
    .actions-cell {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
  `,
})
export class AssociatesList implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly associatesApi = inject(AssociatesApiService);

  readonly associates = signal<Associate[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.associatesApi.list().subscribe({
      next: (data) => {
        this.associates.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.status === 403
            ? 'Sin permiso para ver asociados'
            : 'No se pudo cargar la lista',
        );
      },
    });
  }

  fullName(a: Associate): string {
    const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
    return name || '—';
  }

  retire(a: Associate): void {
    if (a.status === 'RETIRADO') {
      return;
    }

    const ok = window.confirm('¿Confirmas retirar este asociado?');
    if (!ok) {
      return;
    }

    this.associatesApi.retire(a.id).subscribe({
      next: (updated) => {
        this.associates.update((items) =>
          items.map((item) => (item.id === updated.id ? updated : item)),
        );
      },
      error: () => this.error.set('No se pudo retirar el asociado'),
    });
  }
}
