import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import {
  CreateUnitPayload,
  ResidentialApiService,
  ResidentialPost,
  ResidentialUnit,
} from '../residential-api.service';

@Component({
  selector: 'app-units-list',
  imports: [FormsModule],
  template: `
    <section>
      <header class="toolbar">
        <label>
          Puesto
          <select [ngModel]="selectedPostId()" (ngModelChange)="onPostChange($event)">
            <option value="">Todos los puestos</option>
            @for (p of posts(); track p.id) {
              <option [value]="p.id">{{ p.code }} — {{ p.name }}</option>
            }
          </select>
        </label>
        <p class="hint">
          Los puestos vienen de los centros de trabajo (RRHH), igual que en Programación.
        </p>
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <div class="posts-panel">
          <h3>Puestos disponibles</h3>
          @if (posts().length === 0) {
            <p class="empty">No hay puestos activos. Crea centros de trabajo en RRHH.</p>
          } @else {
            <div class="posts-grid">
              @for (p of posts(); track p.id) {
                <button
                  type="button"
                  class="post-card"
                  [class.active]="selectedPostId() === p.id"
                  (click)="selectPost(p.id)"
                >
                  <span class="code">{{ p.code }}</span>
                  <strong>{{ p.name }}</strong>
                  <span class="meta">{{ unitsCount(p.id) }} unidad(es)</span>
                </button>
              }
            </div>
          }
        </div>

        @if (auth.hasPermission('residential.manage') && selectedPostId()) {
          <div class="panel">
            <h3>Nueva unidad en este puesto</h3>
            <form class="create-form" (ngSubmit)="submitCreate()">
              <label>
                Bloque
                <input [(ngModel)]="create.block" name="block" placeholder="Ej. Torre A" />
              </label>
              <label>
                Número *
                <input [(ngModel)]="create.number" name="number" required placeholder="Ej. 101" />
              </label>
              <label>
                Área m²
                <input [(ngModel)]="create.areaM2" name="areaM2" placeholder="Opcional" />
              </label>
              <label>
                Aprobación reservas
                <select [(ngModel)]="create.reservationApprovalMode" name="approval">
                  <option value="manual_approval">Manual</option>
                  <option value="auto_approval">Automática</option>
                </select>
              </label>
              <button type="submit" class="btn" [disabled]="saving()">Crear unidad</button>
            </form>
            @if (formError()) {
              <p class="error">{{ formError() }}</p>
            }
          </div>
        }

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
            @for (u of visibleUnits(); track u.id) {
              <tr>
                <td>{{ u.post?.name ?? u.postId.slice(0, 8) }}</td>
                <td>{{ u.block ?? '—' }}</td>
                <td>{{ u.number }}</td>
                <td>{{ u.areaM2 ?? '—' }}</td>
                <td>{{ approvalLabel(u.reservationApprovalMode) }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">
                  {{
                    selectedPostId()
                      ? 'No hay unidades en este puesto todavía.'
                      : 'No hay unidades. Selecciona un puesto para crear la primera.'
                  }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: end;
      margin-bottom: 1rem;
    }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; color: var(--coraza-text-muted, #64748b); }
    select, input {
      min-width: 240px;
      padding: 0.5rem 0.7rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      font: inherit;
      background: #fff;
    }
    .hint { margin: 0; font-size: 0.82rem; color: var(--coraza-text-muted, #64748b); max-width: 28rem; }
    .posts-panel { margin-bottom: 1.25rem; }
    .posts-panel h3, .panel h3 { margin: 0 0 0.75rem; font-size: 1rem; color: var(--primary-dark); }
    .posts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
    }
    .post-card {
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.85rem 1rem;
      border-radius: 10px;
      border: 1px solid var(--coraza-border);
      background: var(--coraza-surface, #fff);
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease;
    }
    .post-card:hover {
      border-color: color-mix(in srgb, var(--primary) 45%, var(--coraza-border));
      transform: translateY(-1px);
    }
    .post-card.active {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
      background: color-mix(in srgb, var(--primary) 6%, #fff);
    }
    .post-card .code {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--primary);
    }
    .post-card strong { color: var(--primary-dark); font-size: 0.95rem; }
    .post-card .meta { font-size: 0.78rem; color: var(--coraza-text-muted, #64748b); }
    .panel {
      margin-bottom: 1.25rem;
      padding: 1rem 1.1rem;
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
      background: var(--coraza-surface, #fff);
    }
    .create-form {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.75rem;
      align-items: end;
    }
    .btn {
      padding: 0.5rem 0.95rem;
      border-radius: 8px;
      border: 1px solid var(--primary);
      background: var(--primary);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
      overflow: hidden;
    }
    th, td { padding: 0.65rem 0.8rem; border-bottom: 1px solid var(--coraza-border); text-align: left; }
    th { background: var(--primary-50); font-size: 0.72rem; text-transform: uppercase; color: var(--primary-dark); }
    .error { color: var(--coraza-error); }
    .empty { color: var(--coraza-text-muted, #64748b); }
  `,
})
export class UnitsList implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ResidentialApiService);

  readonly posts = signal<ResidentialPost[]>([]);
  readonly units = signal<ResidentialUnit[]>([]);
  readonly selectedPostId = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);

  create: {
    block: string;
    number: string;
    areaM2: string;
    reservationApprovalMode: 'manual_approval' | 'auto_approval';
  } = {
    block: '',
    number: '',
    areaM2: '',
    reservationApprovalMode: 'manual_approval',
  };

  readonly visibleUnits = computed(() => {
    const all = this.units();
    const postId = this.selectedPostId();
    if (!postId) return all;
    return all.filter((u) => u.postId === postId);
  });

  ngOnInit(): void {
    forkJoin({
      posts: this.api.listPosts(),
      units: this.api.listUnits(),
    }).subscribe({
      next: ({ posts, units }) => {
        this.posts.set(posts);
        this.units.set(units);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar puestos y unidades residenciales');
      },
    });
  }

  unitsCount(postId: string): number {
    return this.units().filter((u) => u.postId === postId).length;
  }

  selectPost(postId: string): void {
    this.selectedPostId.set(postId);
  }

  onPostChange(value: string): void {
    this.selectedPostId.set(value);
  }

  submitCreate(): void {
    const postId = this.selectedPostId();
    if (!postId || !this.create.number.trim()) return;
    this.saving.set(true);
    this.formError.set(null);

    const payload: CreateUnitPayload = {
      postId,
      number: this.create.number.trim(),
      reservationApprovalMode: this.create.reservationApprovalMode,
    };
    if (this.create.block.trim()) payload.block = this.create.block.trim();
    if (this.create.areaM2.trim()) payload.areaM2 = this.create.areaM2.trim();

    this.api.createUnit(payload).subscribe({
      next: (unit) => {
        this.units.update((list) => [unit, ...list]);
        this.create = {
          block: '',
          number: '',
          areaM2: '',
          reservationApprovalMode: 'manual_approval',
        };
        this.saving.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'No se pudo crear la unidad');
      },
    });
  }

  approvalLabel(mode: string): string {
    return mode === 'auto_approval' ? 'Automática' : 'Manual';
  }
}
