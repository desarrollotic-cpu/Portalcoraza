import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';

interface Associate {
  id: string;
  documentNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string;
  email: string | null;
}

@Component({
  selector: 'app-associates-list',
  template: `
    <section>
      <header>
        <h2>Asociados</h2>
        <p>Gestión centralizada (RRHH). Solo lectura en esta vista inicial.</p>
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
            </tr>
          </thead>
          <tbody>
            @for (a of associates(); track a.id) {
              <tr>
                <td>{{ a.documentNumber ?? '—' }}</td>
                <td>{{ fullName(a) }}</td>
                <td><span class="badge">{{ a.status }}</span></td>
                <td>{{ a.email ?? '—' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4">No hay asociados registrados.</td>
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
  `,
})
export class AssociatesList implements OnInit {
  private readonly http = inject(HttpClient);

  readonly associates = signal<Associate[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get<Associate[]>(`${environment.apiUrl}/associates`).subscribe({
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
}
