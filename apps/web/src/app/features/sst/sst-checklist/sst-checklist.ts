import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { SstApiService, SstChecklistItem } from '../sst-api.service';

@Component({
  selector: 'app-sst-checklist',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Formulario IPT — Catálogo Oficial (34 preguntas)</h2>
          <p>
            Cuestionario estandarizado para la <strong>Inspección Preventiva de Puesto de Trabajo (IPT)</strong>.
            Cubre 7 categorías normativas de seguridad y salud en el trabajo.
          </p>
        </div>
        <div class="actions">
          @if (auth.hasPermission('sst.inspect')) {
            <a class="btn" routerLink="/sst/inspecciones/nueva">
              Nueva inspección IPT
            </a>
          }
        </div>
      </header>

      <div class="summary-cards">
        <div class="summary-card">
          <span class="num">34</span>
          <span class="lbl">Ítems oficiales</span>
        </div>
        <div class="summary-card">
          <span class="num">7</span>
          <span class="lbl">Categorías de riesgo</span>
        </div>
        <div class="summary-card">
          <span class="num">100%</span>
          <span class="lbl">Cumplimiento objetivo</span>
        </div>
      </div>

      <div class="card">
        <div class="search-bar">
          <input
            type="search"
            placeholder="Buscar por pregunta, categoría o código (#1 a #34)…"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            class="search-input"
          />
          <span class="count-badge">
            {{ filteredItems().length }} ítems encontrados
          </span>
        </div>

        @if (loading()) {
          <p class="empty">Cargando catálogo oficial de preguntas…</p>
        } @else {
          <div class="categories-list">
            @for (cat of categories(); track cat) {
              @if (getItemsByCat(cat).length > 0) {
                <div class="cat-section">
                  <div class="cat-header">
                    <h3>{{ cat }}</h3>
                    <span class="cat-badge">{{ getItemsByCat(cat).length }} preguntas</span>
                  </div>

                  <div class="items-grid">
                    @for (item of getItemsByCat(cat); track item.id) {
                      <div class="item-card">
                        <div class="item-number">#{{ item.codigo }}</div>
                        <div class="item-body">
                          <p class="item-question">{{ item.pregunta }}</p>
                          <div class="item-meta">
                            <span class="rule-tag">SEGURO / RIESGOSO / N/A</span>
                            <span class="trigger-note">
                              ⚠️ Si se marca <em>RIESGOSO</em> genera Plan de Acción obligatorio.
                            </span>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            } @empty {
              <p class="empty">No se encontraron preguntas con el criterio de búsqueda.</p>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1.25rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    .head p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.9rem; max-width: 52rem; }
    .btn {
      display: inline-flex; align-items: center; padding: 0.55rem 1rem; border-radius: 0.5rem;
      background: var(--brand, #0f766e); color: #fff; text-decoration: none; font-weight: 600; font-size: 0.9rem;
      border: 0; cursor: pointer;
    }
    .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
    .summary-card {
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem;
    }
    .summary-card .num { font-size: 1.6rem; font-weight: 800; color: var(--brand, #0f766e); line-height: 1; }
    .summary-card .lbl { font-size: 0.85rem; color: var(--text-muted, #64748b); font-weight: 600; }
    .card {
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.75rem; padding: 1.1rem; display: flex; flex-direction: column; gap: 1.25rem;
    }
    .search-bar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .search-input {
      font: inherit; padding: 0.5rem 0.85rem; border-radius: 0.5rem; border: 1px solid var(--border, #cbd5e1);
      width: 100%; max-width: 420px; font-size: 0.9rem; background: var(--bg, #fff);
    }
    .count-badge { font-size: 0.82rem; color: var(--text-muted, #64748b); font-weight: 600; }
    .categories-list { display: flex; flex-direction: column; gap: 1.5rem; }
    .cat-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .cat-header {
      display: flex; align-items: center; gap: 0.6rem; border-bottom: 2px solid #0f766e;
      padding-bottom: 0.4rem;
    }
    .cat-header h3 { margin: 0; font-size: 1.05rem; color: #0f172a; }
    .cat-badge {
      background: #0f766e; color: #fff; font-size: 0.72rem; font-weight: 700;
      padding: 0.15rem 0.5rem; border-radius: 999px;
    }
    .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 0.75rem; }
    .item-card {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.65rem; padding: 0.85rem 1rem;
      display: flex; gap: 0.85rem; align-items: flex-start; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .item-card:hover { border-color: #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.04); }
    .item-number {
      background: #0f766e; color: #fff; font-weight: 800; font-size: 0.85rem;
      padding: 0.25rem 0.55rem; border-radius: 0.4rem; min-width: 2.2rem; text-align: center;
    }
    .item-body { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; }
    .item-question { margin: 0; font-weight: 600; font-size: 0.9rem; color: #1e293b; line-height: 1.35; }
    .item-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: 0.75rem; }
    .rule-tag {
      background: #e2e8f0; color: #334155; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 0.25rem;
    }
    .trigger-note { color: #64748b; font-size: 0.75rem; }
    .empty { text-align: center; color: var(--text-muted, #64748b); padding: 1.5rem; }
  `,
})
export class SstChecklistView implements OnInit {
  private readonly api = inject(SstApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly items = signal<SstChecklistItem[]>([]);
  readonly loading = signal(true);
  readonly searchQuery = signal('');

  readonly categories = computed(() => {
    const list = this.items();
    const set = new Set<string>();
    for (const item of list) {
      if (item.categoria) set.add(item.categoria);
    }
    return Array.from(set);
  });

  readonly filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.items();
    if (!q) return list;
    return list.filter((i) => {
      const p = i.pregunta?.toLowerCase() || '';
      const c = i.categoria?.toLowerCase() || '';
      const num = `#${i.codigo}`.toLowerCase();
      const codeStr = String(i.codigo);
      return p.includes(q) || c.includes(q) || num.includes(q) || codeStr === q;
    });
  });

  ngOnInit(): void {
    this.load();
  }

  getItemsByCat(cat: string): SstChecklistItem[] {
    return this.filteredItems().filter((i) => i.categoria === cat);
  }

  private load(): void {
    this.loading.set(true);
    this.api.checklist().subscribe({
      next: (data: SstChecklistItem[]) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: (e: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.toast.error(e?.error?.message || 'Error cargando catálogo de preguntas');
      },
    });
  }
}
