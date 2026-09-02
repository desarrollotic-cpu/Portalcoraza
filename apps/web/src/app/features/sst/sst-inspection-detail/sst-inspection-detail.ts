import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { liveCompliance } from '../sst-compliance';
import {
  SstApiService,
  SstInspection,
  SstValoracion,
} from '../sst-api.service';

interface DraftRow {
  itemId: string;
  codigo: number;
  categoria: string;
  pregunta: string;
  valoracion: SstValoracion | '';
  valoracionAnterior: SstValoracion | null;
  hallazgo: string;
  planAccionPropuesto: string;
  responsablePlanAccion: string;
  fechaCompromiso: string;
  reincidenciaCount: number;
}

@Component({
  selector: 'app-sst-inspection-detail',
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <section class="page">
      @if (loading()) {
        <p>Cargando inspección…</p>
      } @else if (insp(); as i) {
        <header class="head">
          <div>
            <a class="back" routerLink="/sst/panel">← Panel</a>
            <h2>
              {{ i.tipo === 'SEGUIMIENTO' ? 'Seguimiento' : 'IPT inicial' }} —
              {{ i.workplace?.nombre }}
            </h2>
            <p>
              {{ i.workplace?.client?.nombre }} · {{ i.fecha | date: 'dd/MM/yyyy' }} ·
              {{ i.responsableNombre }} · <strong>{{ i.estado }}</strong>
            </p>
            @if (live(); as live) {
              <p class="live">
                Progreso {{ live.rated }}/{{ live.total }} ·
                @if (live.percent != null) {
                  Cumpl. {{ live.percent }}%
                  <span class="risk" [attr.data-nivel]="live.nivel">{{ live.nivel }}</span>
                  · SEGURO {{ live.seguro }} · RIESGOSO {{ live.riesgoso }} · N/A {{ live.na }}
                } @else {
                  Sin ítems evaluables aún (N/A no cuenta en %)
                }
              </p>
            }
          </div>
          <div class="actions">
            @if (canEdit()) {
              <button type="button" class="btn ghost" (click)="markAllSafe()" title="Llenar ítems pendientes como Seguro">
                ⚡ Marcar todo Seguro
              </button>
              <button type="button" class="btn ghost" [disabled]="busy()" (click)="save(false)">
                💾 Guardar borrador
              </button>
              <button type="button" class="btn" [disabled]="busy()" (click)="save(true)">
                ✓ Completar inspección
              </button>
            }
            @if (canClose()) {
              <button type="button" class="btn danger" [disabled]="busy()" (click)="close()" title="Archivar definitivamente la inspección">
                🔒 Cerrar inspección
              </button>
            }
            @if (canReport()) {
              <button type="button" class="btn ghost" [disabled]="busy()" (click)="downloadReport('md')">
                📥 Informe MD
              </button>
              <button type="button" class="btn ghost" [disabled]="busy()" (click)="downloadReport('txt')">
                📥 Informe TXT
              </button>
            }
          </div>
        </header>

        <label class="obs">
          Observaciones generales
          <textarea
            [(ngModel)]="observaciones"
            name="obs"
            rows="2"
            [disabled]="!canEdit()"
          ></textarea>
        </label>

        @for (cat of categories(); track cat) {
          <div class="card">
            <h3>{{ cat }}</h3>
            @for (row of rowsByCategory().get(cat)!; track row.itemId) {
              <article class="item" [class.risky]="row.valoracion === 'RIESGOSO'">
                <div class="item-head">
                  <strong>#{{ row.codigo }}</strong>
                  <span>{{ row.pregunta }}</span>
                </div>
                @if (row.valoracionAnterior) {
                  <div class="meta">Anterior: {{ row.valoracionAnterior }}</div>
                }
                <div class="vals">
                  @for (v of valoraciones; track v) {
                    <label class="radio">
                      <input
                        type="radio"
                        [name]="'v-' + row.itemId"
                        [value]="v"
                        [(ngModel)]="row.valoracion"
                        (ngModelChange)="bump()"
                        [disabled]="!canEdit()"
                      />
                      {{ v === 'N_A' ? 'N/A' : v }}
                    </label>
                  }
                </div>
                @if (row.valoracion === 'RIESGOSO') {
                  <div class="risk-fields">
                    <label>
                      Hallazgo *
                      <textarea [(ngModel)]="row.hallazgo" rows="2" [disabled]="!canEdit()"></textarea>
                    </label>
                    <label>
                      Plan de acción *
                      <textarea
                        [(ngModel)]="row.planAccionPropuesto"
                        rows="2"
                        [disabled]="!canEdit()"
                      ></textarea>
                    </label>
                    <div class="row2">
                      <label>
                        Responsable plan
                        <input [(ngModel)]="row.responsablePlanAccion" [disabled]="!canEdit()" />
                      </label>
                      <label>
                        Fecha compromiso
                        <input
                          type="date"
                          [(ngModel)]="row.fechaCompromiso"
                          [disabled]="!canEdit()"
                        />
                      </label>
                    </div>
                    @if (row.reincidenciaCount >= 3) {
                      <p class="critical">Alerta crítica: {{ row.reincidenciaCount }} reincidencias</p>
                    }
                  </div>
                }
              </article>
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .back { color: var(--brand, #0f766e); text-decoration: none; font-size: 0.85rem; }
    .head h2 { margin: 0.2rem 0; font-size: 1.2rem; }
    .head p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.88rem; }
    .live { margin: 0.35rem 0 0 !important; font-weight: 600; }
    .risk[data-nivel='BAJO'] { color: #15803d; font-weight: 700; }
    .risk[data-nivel='MEDIO'] { color: #ca8a04; font-weight: 700; }
    .risk[data-nivel='ALTO'] { color: #b91c1c; font-weight: 700; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: flex-start; }
    .btn {
      border: 0; border-radius: 0.5rem; padding: 0.45rem 0.8rem; font-weight: 600; cursor: pointer;
      background: var(--brand, #0f766e); color: #fff; font-size: 0.85rem;
    }
    .btn.ghost { background: transparent; color: var(--brand, #0f766e); border: 1px solid var(--border, #cbd5e1); }
    .btn.danger { background: #b91c1c; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .obs { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; }
    textarea, input {
      font: inherit; font-weight: 400; padding: 0.45rem 0.6rem; border-radius: 0.45rem;
      border: 1px solid var(--border, #cbd5e1); width: 100%; box-sizing: border-box;
    }
    .card {
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.75rem; padding: 0.85rem 1rem;
    }
    .card h3 { margin: 0 0 0.75rem; font-size: 0.95rem; }
    .item { padding: 0.75rem 0; border-top: 1px solid var(--border, #e2e8f0); }
    .item:first-of-type { border-top: 0; }
    .item.risky { background: color-mix(in srgb, #fecaca 22%, transparent); margin: 0 -0.5rem; padding: 0.75rem 0.5rem; border-radius: 0.5rem; }
    .item-head { display: flex; gap: 0.5rem; font-size: 0.9rem; }
    .meta { color: var(--text-muted, #64748b); font-size: 0.78rem; margin: 0.25rem 0; }
    .vals { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 0.4rem 0; }
    .radio { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; }
    .risk-fields { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.4rem; }
    .risk-fields label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; font-weight: 600; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .critical { color: #b91c1c; font-weight: 700; margin: 0; font-size: 0.85rem; }
    @media (max-width: 640px) { .row2 { grid-template-columns: 1fr; } }
  `,
})
export class SstInspectionDetail implements OnInit {
  private readonly api = inject(SstApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly valoraciones: SstValoracion[] = ['SEGURO', 'RIESGOSO', 'N_A'];
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly insp = signal<SstInspection | null>(null);
  readonly drafts = signal<DraftRow[]>([]);
  readonly tick = signal(0);
  observaciones = '';

  readonly canEdit = computed(() => {
    const i = this.insp();
    return !!i && i.estado === 'BORRADOR' && this.auth.hasPermission('sst.inspect');
  });

  readonly canClose = computed(() => {
    const i = this.insp();
    return (
      !!i &&
      i.estado === 'COMPLETADA' &&
      this.auth.hasPermission('sst.inspect')
    );
  });

  readonly canReport = computed(() => {
    const i = this.insp();
    return !!i && (i.estado === 'COMPLETADA' || i.estado === 'CERRADA');
  });

  markAllSafe(): void {
    const current = this.drafts();
    for (const d of current) {
      if (!d.valoracion) {
        d.valoracion = 'SEGURO';
      }
    }
    this.drafts.set([...current]);
    this.bump();
    this.toast.success('Todos los ítems marcados como SEGURO. Ajusta los que requieran RIESGOSO.');
  }

  readonly live = computed(() => {
    this.tick();
    return liveCompliance(this.drafts().map((d) => d.valoracion));
  });

  bump(): void {
    this.tick.update((n) => n + 1);
  }

  readonly categories = computed(() => {
    const set = new Set(this.drafts().map((d) => d.categoria));
    return [...set];
  });

  readonly rowsByCategory = computed(() => {
    const map = new Map<string, DraftRow[]>();
    for (const row of this.drafts()) {
      const list = map.get(row.categoria) ?? [];
      list.push(row);
      map.set(row.categoria, list);
    }
    return map;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.load(id);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.api.getInspection(id).subscribe({
      next: (insp) => this.apply(insp),
      error: (e) => {
        this.loading.set(false);
        this.toast.error(e?.error?.message || 'Inspección no encontrada');
      },
    });
  }

  private apply(insp: SstInspection): void {
    this.insp.set(insp);
    this.observaciones = insp.observacionesGenerales || '';
    this.drafts.set(
      (insp.respuestas ?? []).map((r) => ({
        itemId: r.itemId,
        codigo: r.item?.codigo ?? 0,
        categoria: r.item?.categoria ?? 'Otros',
        pregunta: r.item?.pregunta ?? '',
        valoracion: (r.valoracion as SstValoracion) || '',
        valoracionAnterior: r.valoracionAnterior,
        hallazgo: r.hallazgo || '',
        planAccionPropuesto: r.planAccionPropuesto || '',
        responsablePlanAccion: r.responsablePlanAccion || '',
        fechaCompromiso: r.fechaCompromiso || '',
        reincidenciaCount: r.reincidenciaCount || 0,
      })),
    );
    this.loading.set(false);
  }

  save(completar: boolean): void {
    const i = this.insp();
    if (!i) return;
    const respuestas = this.drafts()
      .filter((d) => d.valoracion)
      .map((d) => ({
        itemId: d.itemId,
        valoracion: d.valoracion as SstValoracion,
        hallazgo: d.hallazgo || undefined,
        planAccionPropuesto: d.planAccionPropuesto || undefined,
        responsablePlanAccion: d.responsablePlanAccion || undefined,
        fechaCompromiso: d.fechaCompromiso || undefined,
      }));

    if (completar && respuestas.length < this.drafts().length) {
      this.toast.error('Califica todos los ítems antes de completar');
      return;
    }

    this.busy.set(true);
    this.api
      .saveInspection(i.id, {
        observacionesGenerales: this.observaciones,
        completar,
        respuestas,
      })
      .subscribe({
        next: (insp) => {
          this.busy.set(false);
          this.apply(insp);
          this.toast.success(completar ? 'Inspección completada' : 'Guardado');
        },
        error: (e) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo guardar');
        },
      });
  }

  close(): void {
    const i = this.insp();
    if (!i) return;
    this.busy.set(true);
    this.api.closeInspection(i.id).subscribe({
      next: (insp) => {
        this.busy.set(false);
        this.apply(insp);
        this.toast.success('Inspección cerrada');
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(e?.error?.message || 'No se pudo cerrar');
      },
    });
  }

  downloadReport(kind: 'md' | 'txt'): void {
    const i = this.insp();
    if (!i) return;
    this.busy.set(true);
    this.api.report(i.id).subscribe({
      next: (rep) => {
        this.busy.set(false);
        const content = kind === 'md' ? rep.markdown : rep.ascii;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sst-${i.id.slice(0, 8)}.${kind === 'md' ? 'md' : 'txt'}`;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(e?.error?.message || 'No se pudo generar el informe');
      },
    });
  }
}
