import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  PostEquipmentApiService,
  PostEquipmentPostSummary,
} from '../post-equipment-api.service';
import { PostEquipmentTabs } from '../post-equipment-tabs/post-equipment-tabs';

@Component({
  selector: 'app-post-equipment-list',
  imports: [RouterLink, PostEquipmentTabs],
  template: `
    <section>
      <app-post-equipment-tabs />

      <header class="page-head">
        <div>
          <h2>Entregar a puestos</h2>
          <p>
            Aquí solo se <strong>entregan y devuelven</strong> elementos. Los puestos los crea,
            edita o desactiva únicamente <strong>RRHH</strong> (centros de trabajo), igual que los
            asociados. Entra a un puesto para asignar unidades disponibles.
          </p>
        </div>
      </header>

      @if (loading()) {
        <p>Cargando puestos...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <div class="grid">
          @for (p of posts(); track p.id) {
            <a class="card" [routerLink]="['/dotacion/elementos/puestos', p.id]">
              <span class="code">{{ p.code }}</span>
              <strong>{{ p.name }}</strong>
              @if (p.clientName) {
                <span class="meta">{{ p.clientName }}</span>
              }
              <span class="badge" [class.warn]="p.assignedItems > 0">
                {{ p.assignedItems }} elemento(s) asignado(s)
              </span>
              <span class="cta">Entregar elementos →</span>
            </a>
          } @empty {
            <p class="empty">
              No hay puestos activos. Solo RRHH puede crearlos en
              <strong> RRHH → Centros de trabajo</strong>; aquí aparecerán automáticamente para
              entregar elementos.
            </p>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .page-head { margin-bottom: 1.25rem; }
    .page-head h2 { margin: 0 0 0.35rem; color: var(--primary-dark); font-size: 1.25rem; }
    .page-head p { margin: 0; color: var(--coraza-text-muted, #64748b); max-width: 42rem; font-size: 0.9rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 0.85rem;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      padding: 1rem 1.1rem;
      border-radius: 10px;
      border: 1px solid var(--coraza-border);
      background: var(--coraza-surface, #fff);
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease;
    }
    .card:hover {
      border-color: color-mix(in srgb, var(--primary) 45%, var(--coraza-border));
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
    }
    .code {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--primary);
    }
    .card strong { color: var(--primary-dark); }
    .meta { font-size: 0.8rem; color: var(--coraza-text-muted, #64748b); }
    .badge {
      margin-top: 0.45rem;
      align-self: flex-start;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
    }
    .badge.warn {
      background: color-mix(in srgb, #f59e0b 16%, #fff);
      color: #b45309;
    }
    .cta {
      margin-top: 0.35rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--primary);
    }
    .error { color: var(--coraza-error); }
    .empty { color: var(--coraza-text-muted, #64748b); }
  `,
})
export class PostEquipmentList implements OnInit {
  private readonly api = inject(PostEquipmentApiService);

  readonly posts = signal<PostEquipmentPostSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.listPosts().subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los puestos');
      },
    });
  }
}
