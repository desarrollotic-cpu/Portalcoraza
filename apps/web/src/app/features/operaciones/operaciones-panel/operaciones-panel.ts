import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperacionesApiService, OperacionesPost } from '../operaciones-api.service';

@Component({
  selector: 'app-operaciones-panel',
  imports: [RouterLink],
  template: `
    <section class="panel">
      <header>
        <h2>Panel de operaciones</h2>
        <p>Puestos de trabajo que se reflejan en Programación, Dotación y el resto del portal.</p>
      </header>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="kpis">
        <article>
          <span class="label">Total puestos</span>
          <strong>{{ total() }}</strong>
        </article>
        <article>
          <span class="label">Activos</span>
          <strong>{{ activos() }}</strong>
        </article>
        <article>
          <span class="label">Inactivos</span>
          <strong>{{ inactivos() }}</strong>
        </article>
      </div>

      <p class="hint">
        Crea o edita puestos en
        <a routerLink="/operaciones/puestos">Puestos de trabajo</a>.
        Luego ábrelos en
        <a routerLink="/programacion/matriz">Programación → Matriz</a>.
      </p>
    </section>
  `,
  styles: `
    .panel { display: flex; flex-direction: column; gap: 1.25rem; }
    header h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    header p { margin: 0; color: var(--text-muted, var(--text-secondary)); font-size: 0.9rem; }
    .error { margin: 0; color: var(--coraza-error, #b91c1c); }
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.85rem;
      max-width: 640px;
    }
    .kpis article {
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 10px;
      padding: 0.9rem 1rem;
      background: var(--surface, #fff);
    }
    .label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted, #6b7280);
      margin-bottom: 0.35rem;
    }
    strong { font-size: 1.4rem; }
    .hint { margin: 0; font-size: 0.9rem; color: var(--text-muted, #6b7280); }
    a { color: var(--coraza-primary, #1d4ed8); }
  `,
})
export class OperacionesPanel implements OnInit {
  private readonly api = inject(OperacionesApiService);

  readonly posts = signal<OperacionesPost[]>([]);
  readonly error = signal<string | null>(null);

  readonly total = computed(() => this.posts().length);
  readonly activos = computed(
    () => this.posts().filter((p) => p.status === 'ACTIVO').length,
  );
  readonly inactivos = computed(
    () => this.posts().filter((p) => p.status !== 'ACTIVO').length,
  );

  ngOnInit(): void {
    this.api.listPosts().subscribe({
      next: (rows) => this.posts.set(rows),
      error: () => this.error.set('No se pudieron cargar los puestos.'),
    });
  }
}
