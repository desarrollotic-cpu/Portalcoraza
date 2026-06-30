import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ResidentialApiService, ResidentialUnit } from '../residential-api.service';

@Component({
  selector: 'app-units-list',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <section>
      <header>
        <h2>Residencial — Unidades</h2>
        <p>Unidades residenciales del puesto asignado a su usuario.</p>
        <nav class="subnav">
          <a routerLink="/residential" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            Unidades
          </a>
          <a routerLink="/residential/visitantes" routerLinkActive="active">Visitantes</a>
          <a routerLink="/residential/paquetes" routerLinkActive="active">Paquetes</a>
          <a routerLink="/residential/reservas" routerLinkActive="active">Reservas</a>
        </nav>
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Puesto</th>
              <th>Bloque</th>
              <th>Número</th>
              <th>Área m²</th>
              <th>Aprobación reservas</th>
            </tr>
          </thead>
          <tbody>
            @for (u of units(); track u.id) {
              <tr>
                <td>{{ u.post?.name ?? u.postId.slice(0, 8) }}</td>
                <td>{{ u.block ?? '—' }}</td>
                <td>{{ u.number }}</td>
                <td>{{ u.areaM2 ?? '—' }}</td>
                <td>{{ approvalLabel(u.reservationApprovalMode) }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">No hay unidades en su alcance.</td>
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
    .error { color: var(--coraza-error); }
  `,
})
export class UnitsList implements OnInit {
  private readonly api = inject(ResidentialApiService);

  readonly units = signal<ResidentialUnit[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.listUnits().subscribe({
      next: (units) => {
        this.units.set(units);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las unidades');
      },
    });
  }

  approvalLabel(mode: string): string {
    return mode === 'auto_approval' ? 'Automática' : 'Manual';
  }
}
