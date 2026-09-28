import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AssociateLoadRow,
  AssociateLoadStatus,
  AssociatesStatusResponse,
  MonthlySchedulingApiService,
  SchedulingRules,
} from '../monthly-scheduling-api.service';
import { AuthService } from '../../../core/services/auth.service';

type Filtro = AssociateLoadStatus | 'todos' | 'sin_uso';

const PAGE_SIZE = 50;

const ESTADO_LABEL: Record<AssociateLoadStatus, string> = {
  sin_programar: 'Sin programar',
  bajo_minimo: 'Bajo el mínimo',
  sobre_maximo: 'Sobre el máximo',
  con_novedad: 'Con novedad',
  en_rango: 'En rango',
};

@Component({
  selector: 'app-estado-vigilantes',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="ev">
      <header class="ev__head">
        <div>
          <h2>¿Qué está pasando con los vigilantes?</h2>
          <p>
            Horas del mes de cada asociado activo, sumando <strong>todos sus puestos</strong>,
            contra el mínimo y el máximo. Quién está bien, a quién le faltan horas y a quién no se está usando.
          </p>
        </div>
        <label class="ev__month">
          Mes
          <input type="month" [ngModel]="monthInput()" (ngModelChange)="onMonth($event)" />
        </label>
      </header>

      @if (error()) {
        <p class="ev__error" role="alert">{{ error() }}</p>
      }

      @if (loading()) {
        <div class="skel" aria-busy="true"><div class="skel__card"></div><div class="skel__card"></div></div>
      } @else {
        @if (data(); as d) {
        <div class="kpis" role="group" aria-label="Filtrar por estado">
          @for (k of kpiCards(); track k.key) {
            <button
              type="button"
              class="kpi kpi--{{ k.tone }}"
              [class.kpi--on]="filtro() === k.key"
              [attr.aria-pressed]="filtro() === k.key"
              (click)="setFiltro(k.key)"
            >
              <span class="kpi__label">{{ k.label }}</span>
              <strong class="kpi__value">{{ k.value }}</strong>
              <span class="kpi__hint">{{ k.hint }}</span>
            </button>
          }
        </div>

        @if (d.kpis.huecosAbiertos) {
          <p class="plan">
            Hay <strong>{{ d.kpis.huecosAbiertos }}</strong> turnos sin cubrir de aquí a fin de mes.
            @if (d.kpis.huecosCubribles) {
              <strong>{{ d.kpis.huecosCubribles }}</strong> se pueden cubrir con vigilantes a los que les faltan horas,
              sin cruces ni pasar el máximo: mira la columna <em>Puede cubrir</em>.
            } @else {
              No hay vigilantes bajo el mínimo que puedan tomarlos sin cruces o sin descanso.
            }
          </p>
        }

        <div class="insights">
          <section class="insight">
            <h3>Capacidad contra necesidad</h3>
            <p>
              Hay <strong>{{ d.capacidad.puestosActivos }}</strong> puestos activos
              (<strong>{{ d.capacidad.puestosConCuadro }}</strong> con cuadro este mes) que piden
              <strong>{{ d.capacidad.rolesRequeridos }}</strong> roles.
              Tienes <strong>{{ d.capacidad.vigilantesActivos }}</strong> asociados activos:
              @if (d.capacidad.diferencia > 0) {
                <strong class="t-warn">sobran {{ d.capacidad.diferencia }}</strong> frente a los roles de los cuadros.
              } @else if (d.capacidad.diferencia < 0) {
                <strong class="t-bad">faltan {{ d.capacidad.diferencia * -1 }}</strong> para llenar todos los roles.
              } @else {
                justo los que piden los cuadros.
              }
            </p>
            <p class="muted">
              {{ d.kpis.programados }} tienen al menos un turno este mes;
              {{ d.kpis.sinProgramar }} no tienen ninguno.
              @if (d.capacidad.puestosActivos > d.capacidad.puestosConCuadro) {
                Ojo: {{ d.capacidad.puestosActivos - d.capacidad.puestosConCuadro }} puestos activos aún no tienen cuadro, así que los roles requeridos pueden subir.
              }
            </p>
          </section>

          <section class="insight">
            <h3>Relevantes</h3>
            @if (d.relevantes.total) {
              <p>
                <strong>{{ d.relevantes.total }}</strong> asociados trabajan solo como relevante, con
                <strong>{{ d.relevantes.horasPromedio }} h</strong> en promedio (mínimo {{ d.rules.minHorasMes }} h).
                <strong>{{ d.relevantes.unSoloPuesto }}</strong> cubren un solo puesto y
                <strong>{{ d.relevantes.bajoMinimo }}</strong> quedan bajo el mínimo.
              </p>
              @if (d.relevantes.liberablesEstimado > 0) {
                <p class="muted">
                  El relevante de un puesto con ciclo 12x3 solo cubre ~12 turnos al mes. Si cada uno cubriera
                  2 puestos compatibles, se liberarían unos <strong>{{ d.relevantes.liberablesEstimado }}</strong>
                  asociados y el resto llegaría al mínimo (estimado).
                </p>
              }
            } @else {
              <p class="muted">No hay asociados que trabajen solo como relevante este mes.</p>
            }
          </section>
        </div>

        <div class="tools">
          <label class="field field--grow">
            Buscar
            <input
              type="search"
              placeholder="Nombre o cédula"
              [ngModel]="query()"
              (ngModelChange)="query.set($event); page.set(1)"
            />
          </label>
          <label class="field">
            Cargo
            <select [ngModel]="cargo()" (ngModelChange)="cargo.set($event); page.set(1)">
              <option value="">Todos</option>
              @for (c of cargos(); track c) {
                <option [value]="c">{{ c }}</option>
              }
            </select>
          </label>
          <label class="field">
            Rol
            <select [ngModel]="rol()" (ngModelChange)="rol.set($event); page.set(1)">
              <option value="">Todos</option>
              <option value="titular">Titular</option>
              <option value="relevante">Relevante</option>
              <option value="mixto">Mixto</option>
            </select>
          </label>
          <button type="button" class="btn" (click)="exportCsv()" [disabled]="!filtered().length">
            Exportar a Excel
          </button>
        </div>

        <p class="count">{{ filtered().length }} asociados · {{ filtroLabel() }}</p>

        @if (!filtered().length) {
          <p class="empty">No hay asociados con este filtro.</p>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Vigilante</th>
                  <th scope="col">Estado</th>
                  <th scope="col" class="num">Horas</th>
                  <th scope="col" class="num">Mínimo</th>
                  <th scope="col" class="num">Diferencia</th>
                  <th scope="col">Cumplimiento</th>
                  <th scope="col">Puestos</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Último turno</th>
                  <th scope="col">Puede cubrir</th>
                </tr>
              </thead>
              <tbody>
                @for (r of pageRows(); track r.associateId) {
                  <tr>
                    <td>
                      <span class="name">{{ r.name }}</span>
                      <span class="sub">{{ r.documentNumber ? 'CC ' + r.documentNumber : '' }}{{ r.cargo ? ' · ' + r.cargo : '' }}</span>
                    </td>
                    <td><span class="badge badge--{{ r.estado }}">{{ estadoLabel(r.estado) }}</span></td>
                    <td class="num">{{ r.horas }}</td>
                    <td class="num">
                      {{ r.minimo }}
                      @if (r.diasNovedad) {
                        <span class="sub">{{ r.diasNovedad }} d. novedad</span>
                      }
                    </td>
                    <td class="num" [class.t-bad]="r.diferencia < 0 && r.estado !== 'con_novedad'">
                      {{ r.diferencia > 0 ? '+' : '' }}{{ r.diferencia }}
                    </td>
                    <td>
                      <span class="bar" [attr.aria-label]="r.cumplimiento + '% del mínimo'">
                        <span class="bar__fill bar__fill--{{ r.estado }}" [style.width.%]="barWidth(r)"></span>
                      </span>
                      <span class="sub">{{ r.cumplimiento }}%</span>
                    </td>
                    <td>{{ r.puestos.length ? r.puestos.join(', ') : '—' }}</td>
                    <td>{{ rolLabel(r) }}</td>
                    <td>
                      @if (r.ultimoTurno) {
                        {{ r.ultimoTurno }}
                        <span class="sub" [class.t-bad]="(r.diasSinTurno ?? 0) > d.rules.diasSinTurnoAlerta">
                          hace {{ r.diasSinTurno }} d.
                        </span>
                      } @else {
                        <span class="t-bad">Nunca</span>
                      }
                    </td>
                    <td>
                      @if (r.sugerencias.length) {
                        <ul class="sugs">
                          @for (s of r.sugerencias.slice(0, 4); track s.postId + s.day + s.shift) {
                            <li>
                              <a
                                [routerLink]="['/programacion/cuadro']"
                                [queryParams]="{ postId: s.postId, month: monthInput(), day: s.day }"
                                [title]="'Abrir el cuadro de ' + s.postName + ' en el día ' + s.day"
                              >
                                Día {{ s.day }} {{ s.shift === 'D' ? 'diurno' : 'nocturno' }} · {{ s.postName }}
                              </a>
                            </li>
                          }
                        </ul>
                        @if (r.sugerencias.length > 4) {
                          <span class="sub">y {{ r.sugerencias.length - 4 }} más (ver Excel)</span>
                        }
                      } @else {
                        <span class="sub">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (totalPages() > 1) {
            <div class="pager">
              <button type="button" [disabled]="page() <= 1" (click)="page.set(page() - 1)">Anterior</button>
              <span>Página {{ page() }} de {{ totalPages() }}</span>
              <button type="button" [disabled]="page() >= totalPages()" (click)="page.set(page() + 1)">Siguiente</button>
            </div>
          }
        }

        <p class="rules">
          Reglas: mínimo {{ d.rules.minHorasMes }} h/mes
          @if (d.rules.novedadesReducenMinimo) { (baja en proporción a los días de vacaciones, incapacidad o licencia) }
          · máximo {{ d.rules.maxHorasMes }} h/mes · "sin uso" = más de {{ d.rules.diasSinTurnoAlerta }} días sin turno.
          Horas reales por código: D/N 12 h, D8/N8 8 h, N10 10 h.
          @if (canEditRules && !editingRules()) {
            <button type="button" class="link-btn" (click)="openRules(d.rules)">Cambiar reglas</button>
          }
        </p>

        @if (editingRules(); as r) {
          <form class="rules-form" (ngSubmit)="saveRules()">
            <h3>Reglas de horas (aplican a todo el módulo: alertas, guardado, publicación y esta sección)</h3>
            <div class="rules-grid">
              <label class="field">
                Mínimo de horas al mes
                <input type="number" name="min" min="0" max="400" [(ngModel)]="r.minHorasMes" required />
              </label>
              <label class="field">
                Máximo de horas al mes
                <input type="number" name="max" min="1" max="744" [(ngModel)]="r.maxHorasMes" required />
              </label>
              <label class="field">
                Descanso mínimo entre turnos (h)
                <input type="number" name="descanso" min="0" max="48" [(ngModel)]="r.descansoMinHoras" required />
              </label>
              <label class="field">
                "Sin uso" después de (días sin turno)
                <input type="number" name="sinTurno" min="1" max="90" [(ngModel)]="r.diasSinTurnoAlerta" required />
              </label>
            </div>
            <label class="check">
              <input type="checkbox" name="nov" [(ngModel)]="r.novedadesReducenMinimo" />
              Las novedades (vacaciones, incapacidad, licencia…) bajan el mínimo en proporción a los días
            </label>
            @if (rulesError()) {
              <p class="ev__error" role="alert">{{ rulesError() }}</p>
            }
            <div class="rules-actions">
              <button type="button" class="btn-ghost" (click)="editingRules.set(null)">Cancelar</button>
              <button type="submit" class="btn" [disabled]="savingRules()">
                {{ savingRules() ? 'Guardando…' : 'Guardar reglas' }}
              </button>
            </div>
          </form>
        }
        }
      }
    </div>
  `,
  styles: `
    .ev { display: flex; flex-direction: column; gap: 1rem; max-width: 80rem; }
    .ev__head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; align-items: end; }
    .ev__head h2 { margin: 0 0 0.35rem; font-size: 1.35rem; letter-spacing: -0.02em; text-wrap: balance; }
    .ev__head p { margin: 0; max-width: 46rem; color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; }
    .ev__month, .field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; font-weight: 600; }
    .ev__month input, .field input, .field select {
      min-height: 44px; padding: 0.45rem 0.7rem; border: 1px solid var(--coraza-border);
      border-radius: 10px; background: var(--coraza-surface); color: inherit; font: inherit;
    }
    .ev__error { margin: 0; color: var(--coraza-error, #b91c1c); font-weight: 600; }
    .skel { display: grid; gap: 0.75rem; }
    .skel__card { height: 8rem; border-radius: 14px; background: var(--coraza-surface); border: 1px solid var(--coraza-border); }

    .kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
    @media (min-width: 700px) { .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (min-width: 1100px) { .kpis { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
    .kpi {
      display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem; text-align: left;
      min-height: 44px; padding: 0.85rem 1rem; border-radius: 14px; cursor: pointer;
      border: 1px solid var(--coraza-border); border-top: 4px solid var(--coraza-border);
      background: var(--coraza-surface); color: inherit; font: inherit;
      transition: border-color 180ms ease, box-shadow 180ms ease;
    }
    .kpi:hover { border-color: var(--coraza-primary, #1d4ed8); }
    .kpi:focus-visible { outline: 3px solid var(--coraza-primary, #1d4ed8); outline-offset: 2px; }
    .kpi--on { border-color: var(--coraza-primary, #1d4ed8); box-shadow: 0 0 0 3px color-mix(in srgb, var(--coraza-primary, #1d4ed8) 22%, transparent); }
    .kpi--ok { border-top-color: #15803d; }
    .kpi--warn { border-top-color: #b45309; }
    .kpi--bad { border-top-color: #b91c1c; }
    .kpi--muted { border-top-color: #64748b; }
    .kpi__label { font-size: 0.8rem; font-weight: 700; }
    .kpi__value { font-size: 1.6rem; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .kpi__hint { font-size: 0.75rem; color: var(--text-muted, var(--text-secondary)); line-height: 1.35; }

    .insights { display: grid; gap: 0.75rem; }
    @media (min-width: 900px) { .insights { grid-template-columns: 1fr 1fr; } }
    .insight { padding: 1rem 1.1rem; border-radius: 14px; border: 1px solid var(--coraza-border); background: var(--coraza-surface); }
    .insight h3 { margin: 0 0 0.5rem; font-size: 1rem; }
    .insight p { margin: 0 0 0.5rem; line-height: 1.5; font-size: 0.93rem; }
    .insight p:last-child { margin-bottom: 0; }
    .muted { color: var(--text-secondary); }
    .t-bad { color: #b91c1c; }
    .t-warn { color: #b45309; }

    .tools { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end; }
    .field--grow { flex: 1 1 16rem; max-width: 24rem; }
    .btn {
      min-height: 44px; padding: 0.5rem 1rem; border-radius: 10px; cursor: pointer; font: inherit; font-weight: 700;
      border: 1px solid #15803d; background: #15803d; color: #fff;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn:focus-visible { outline: 3px solid var(--coraza-primary, #1d4ed8); outline-offset: 2px; }
    .count { margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
    .empty { padding: 1.5rem; border: 1px dashed var(--coraza-border); border-radius: 14px; background: var(--coraza-surface); margin: 0; }

    .table-wrap { overflow-x: auto; border: 1px solid var(--coraza-border); border-radius: 14px; background: var(--coraza-surface); }
    table { width: 100%; border-collapse: collapse; font-size: 0.87rem; }
    th, td { padding: 0.6rem 0.75rem; text-align: left; border-bottom: 1px solid var(--coraza-border); vertical-align: top; }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-secondary); white-space: nowrap; }
    tbody tr:last-child td { border-bottom: 0; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .name { display: block; font-weight: 600; }
    .sub { display: block; font-size: 0.75rem; color: var(--text-muted, var(--text-secondary)); }
    .badge { display: inline-block; white-space: nowrap; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px; }
    .badge--en_rango { background: #dcfce7; color: #166534; }
    .badge--bajo_minimo { background: #fef3c7; color: #92400e; }
    .badge--sobre_maximo, .badge--sin_programar { background: #fee2e2; color: #991b1b; }
    .badge--con_novedad { background: #e2e8f0; color: #334155; }
    .bar { display: block; width: 6rem; height: 0.5rem; border-radius: 999px; background: var(--bg-page, #f1f5f9); overflow: hidden; }
    .bar__fill { display: block; height: 100%; background: #15803d; }
    .bar__fill--bajo_minimo { background: #d97706; }
    .bar__fill--sobre_maximo, .bar__fill--sin_programar { background: #b91c1c; }
    .bar__fill--con_novedad { background: #64748b; }

    .pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; font-size: 0.85rem; }
    .pager button {
      min-height: 44px; min-width: 44px; padding: 0.4rem 0.9rem; cursor: pointer; font: inherit;
      border: 1px solid var(--coraza-border); background: var(--coraza-surface); color: inherit; border-radius: 10px;
    }
    .pager button:disabled { opacity: 0.45; cursor: not-allowed; }
    .plan {
      margin: 0; padding: 0.85rem 1rem; border-radius: 14px; line-height: 1.5; font-size: 0.93rem;
      border: 1px solid #93c5fd; border-left-width: 4px;
      background: color-mix(in srgb, #3b82f6 8%, var(--coraza-surface));
    }
    .sugs { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.2rem; min-width: 13rem; }
    .sugs a { color: var(--coraza-primary, #1d4ed8); font-weight: 600; font-size: 0.8rem; text-decoration: none; }
    .sugs a:hover { text-decoration: underline; }
    .sugs a:focus-visible { outline: 2px solid var(--coraza-primary, #1d4ed8); outline-offset: 2px; }
    .link-btn {
      min-height: 32px; padding: 0 0.25rem; cursor: pointer; font: inherit; font-weight: 700;
      border: 0; background: none; color: var(--coraza-primary, #1d4ed8); text-decoration: underline;
    }
    .rules-form {
      display: grid; gap: 0.75rem; padding: 1rem 1.1rem; border-radius: 14px;
      border: 1px solid var(--coraza-border); background: var(--coraza-surface);
    }
    .rules-form h3 { margin: 0; font-size: 0.95rem; }
    .rules-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); }
    .check { display: flex; gap: 0.5rem; align-items: center; font-size: 0.88rem; min-height: 44px; }
    .check input { width: 1.1rem; height: 1.1rem; }
    .rules-actions { display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap; }
    .btn-ghost {
      min-height: 44px; padding: 0.5rem 1rem; border-radius: 10px; cursor: pointer; font: inherit;
      border: 1px solid var(--coraza-border); background: var(--coraza-surface); color: inherit;
    }
    .rules { margin: 0; font-size: 0.8rem; color: var(--text-muted, var(--text-secondary)); line-height: 1.5; }
    @media (prefers-reduced-motion: reduce) { .kpi { transition: none; } }
  `,
})
export class EstadoVigilantes implements OnInit {
  private readonly api = inject(MonthlySchedulingApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<AssociatesStatusResponse | null>(null);
  readonly monthInput = signal('');
  readonly filtro = signal<Filtro>('todos');
  readonly query = signal('');
  readonly cargo = signal('');
  readonly rol = signal('');
  readonly page = signal(1);

  private year = new Date().getFullYear();
  private month = new Date().getMonth() + 1;

  readonly canEditRules = ['GERENCIA', 'ADMIN', 'SUPERADMIN'].includes(
    inject(AuthService).currentUser()?.role?.code ?? '',
  );
  readonly editingRules = signal<SchedulingRules | null>(null);
  readonly savingRules = signal(false);
  readonly rulesError = signal<string | null>(null);

  openRules(rules: SchedulingRules): void {
    this.rulesError.set(null);
    this.editingRules.set({ ...rules });
  }

  saveRules(): void {
    const r = this.editingRules();
    if (!r) return;
    if (r.minHorasMes > r.maxHorasMes) {
      this.rulesError.set('El mínimo no puede ser mayor que el máximo.');
      return;
    }
    this.savingRules.set(true);
    this.rulesError.set(null);
    this.api.updateRules(r).subscribe({
      next: () => {
        this.savingRules.set(false);
        this.editingRules.set(null);
        this.reload();
      },
      error: (err: { error?: { message?: string | string[] } }) => {
        this.savingRules.set(false);
        const m = err.error?.message;
        this.rulesError.set(Array.isArray(m) ? m.join(' · ') : m ?? 'No se pudieron guardar las reglas.');
      },
    });
  }

  readonly kpiCards = computed(() => {
    const d = this.data();
    if (!d) return [];
    const k = d.kpis;
    const r = d.rules;
    return [
      { key: 'todos' as Filtro, label: 'Activos', value: k.vigilantesActivos, hint: `${k.programados} con turnos`, tone: 'muted' },
      { key: 'en_rango' as Filtro, label: 'En rango', value: k.enRango, hint: `${r.minHorasMes}–${r.maxHorasMes} h`, tone: 'ok' },
      { key: 'bajo_minimo' as Filtro, label: 'Bajo el mínimo', value: k.bajoMinimo, hint: `Faltan ${k.horasFaltantes} h en total`, tone: 'warn' },
      { key: 'sobre_maximo' as Filtro, label: 'Sobre el máximo', value: k.sobreMaximo, hint: `Más de ${r.maxHorasMes} h`, tone: 'bad' },
      { key: 'sin_programar' as Filtro, label: 'Sin programar', value: k.sinProgramar, hint: 'Activos sin turnos', tone: 'bad' },
      { key: 'sin_uso' as Filtro, label: 'Sin uso', value: k.sinUso, hint: `Más de ${r.diasSinTurnoAlerta} días sin turno`, tone: 'bad' },
    ];
  });

  readonly cargos = computed(() =>
    [...new Set((this.data()?.rows ?? []).map((r) => r.cargo).filter((c): c is string => !!c))].sort(),
  );

  readonly filtered = computed(() => {
    const d = this.data();
    if (!d) return [];
    const f = this.filtro();
    const q = this.query().trim().toLowerCase();
    const cargo = this.cargo();
    const rol = this.rol();
    return d.rows.filter((r) => {
      if (f === 'sin_uso') {
        if (r.estado === 'con_novedad') return false;
        if (r.diasSinTurno !== null && r.diasSinTurno <= d.rules.diasSinTurnoAlerta) return false;
      } else if (f !== 'todos' && r.estado !== f) return false;
      if (cargo && r.cargo !== cargo) return false;
      if (rol && r.rol !== rol) return false;
      if (q && !r.name.toLowerCase().includes(q) && !(r.documentNumber ?? '').includes(q)) return false;
      return true;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  readonly pageRows = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  readonly filtroLabel = computed(() => {
    const f = this.filtro();
    if (f === 'todos') return 'todos los estados';
    if (f === 'sin_uso') return 'sin uso';
    return ESTADO_LABEL[f].toLowerCase();
  });

  ngOnInit(): void {
    this.api.getActivePeriod().subscribe({
      next: (p) => {
        this.year = p.year;
        this.month = p.month;
        this.reload();
      },
      error: () => this.reload(),
    });
  }

  onMonth(value: string): void {
    if (!value || !/^\d{4}-\d{2}$/.test(value)) return;
    const [y, m] = value.split('-').map(Number);
    this.year = y;
    this.month = m;
    this.reload();
  }

  setFiltro(key: Filtro): void {
    this.filtro.set(this.filtro() === key ? 'todos' : key);
    this.page.set(1);
  }

  estadoLabel(e: AssociateLoadStatus): string {
    return ESTADO_LABEL[e];
  }

  rolLabel(r: AssociateLoadRow): string {
    if (r.rol === 'titular') return 'Titular';
    if (r.rol === 'relevante') return 'Relevante';
    if (r.rol === 'mixto') return 'Titular y relevante';
    return '—';
  }

  barWidth(r: AssociateLoadRow): number {
    return Math.min(100, Math.max(0, r.cumplimiento));
  }

  exportCsv(): void {
    const head = ['Nombre', 'Cédula', 'Cargo', 'Estado', 'Horas', 'Mínimo', 'Máximo', 'Diferencia', 'Cumplimiento %', 'Días novedad', 'Turnos', 'Puestos', 'Rol', 'Último turno', 'Días sin turno', 'Puede cubrir'];
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = this.filtered().map((r) =>
      [r.name, r.documentNumber, r.cargo, this.estadoLabel(r.estado), r.horas, r.minimo, r.maximo, r.diferencia, r.cumplimiento, r.diasNovedad, r.turnos, r.puestos.join(' | '), this.rolLabel(r), r.ultimoTurno, r.diasSinTurno,
        r.sugerencias.map((s) => `día ${s.day} ${s.shift} ${s.postName}`).join(' | ')]
        .map(cell)
        .join(';'),
    );
    const csv = '﻿' + [head.map(cell).join(';'), ...lines].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `estado-vigilantes-${this.year}-${String(this.month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private reload(): void {
    this.monthInput.set(`${this.year}-${String(this.month).padStart(2, '0')}`);
    this.loading.set(true);
    this.error.set(null);
    this.page.set(1);
    this.api.getAssociatesStatus(this.year, this.month).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el estado de los vigilantes.');
        this.loading.set(false);
      },
    });
  }
}
