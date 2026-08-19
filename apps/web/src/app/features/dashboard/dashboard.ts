import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowDownRight,
  LucideArrowRight,
  LucideArrowUpRight,
  LucideBoxes,
  LucideBuilding2,
  LucideCalendarCheck,
  LucideClipboardCheck,
  LucideFileText,
  LucideShieldCheck,
  LucideSparkles,
  LucideUsersRound,
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { Icon } from '../../shared/components/icon/icon';
import {
  CommandAlert,
  CommandCenterPayload,
  CommandPeriod,
  DashboardApiService,
} from './dashboard-api.service';

type PeriodKey = CommandPeriod;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Icon, DatePipe, DecimalPipe],
  template: `
    <section class="dashboard">
      <header class="hero">
        <div class="hero-mesh"></div>
        <div class="hero-inner">
          <div class="hero-text">
            <span class="hero-badge">
              <app-icon [icon]="icons.Sparkles" [size]="14" [strokeWidth]="2.2" />
              Dashboard
            </span>
            <h1>{{ greeting() }}, {{ firstName() }}</h1>
            <p>
              {{ todayLabel }} ·
              @if (roleName()) {
                Rol: <strong>{{ roleName() }}</strong> ·
              }
              Centro de inteligencia operativa
            </p>

            <div class="status-row">
              <span class="status-pill" [attr.data-code]="data()?.operationStatus?.code ?? 'stable'">
                {{ data()?.operationStatus?.label ?? 'Cargando…' }}
              </span>
            </div>

            <div class="period-row" role="group" aria-label="Período">
              @for (p of periods; track p.key) {
                <button
                  type="button"
                  class="period-btn"
                  [class.active]="period() === p.key"
                  (click)="setPeriod(p.key)"
                >
                  {{ p.label }}
                </button>
              }
            </div>
            <p class="period-hint">
              El período recarga series y comparaciones reales (recepción, entregas). KPIs puntuales de “hoy” se mantienen.
            </p>
          </div>

          <div class="hero-info">
            <div class="info-card">
              <div class="info-icon" style="--g: var(--gradient-accent);">
                <app-icon [icon]="icons.ShieldCheck" [size]="18" [strokeWidth]="2" />
              </div>
              <div>
                <span class="info-title">Sesión segura</span>
                <span class="info-sub">JWT activo</span>
              </div>
            </div>
            <div class="info-card">
              <div class="info-icon" style="--g: var(--gradient-success);">
                <app-icon [icon]="icons.ClipboardCheck" [size]="18" [strokeWidth]="2" />
              </div>
              <div>
                <span class="info-title">Módulos</span>
                <span class="info-sub">{{ modulesCount() }} con acceso</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      @if (loading()) {
        <div class="skeleton-grid">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="skeleton"></div>
          }
        </div>
      } @else if (error()) {
        <div class="alert-error">
          <span class="alert-dot"></span>
          {{ error() }}
        </div>
      } @else if (data(); as d) {
        <section class="panel highlights">
          <div class="panel-head">
            <h2>Lo más importante hoy</h2>
            <span class="muted">Prioridades calculadas con datos reales</span>
          </div>
          <div class="highlight-list">
            @for (h of d.highlights; track h.id) {
              <a [routerLink]="h.route" class="highlight" [attr.data-tone]="h.tone">
                <span class="tone-dot"></span>
                <span>{{ h.text }}</span>
                <app-icon [icon]="icons.ArrowUpRight" [size]="14" [strokeWidth]="2" />
              </a>
            }
          </div>
        </section>

        <div class="two-col">
          <section class="panel alerts">
            <div class="panel-head">
              <h2>Centro de alertas</h2>
              <span class="muted">{{ d.alerts.length }} señal(es)</span>
            </div>
            @if (d.alerts.length === 0) {
              <p class="empty-inline">Sin alertas operativas</p>
            } @else {
              <ul class="alert-list">
                @for (a of d.alerts.slice(0, 12); track a.id) {
                  <li>
                    <a [routerLink]="a.route" class="alert-item" [attr.data-tone]="a.tone">
                      <span class="badge">{{ toneLabel(a.tone) }}</span>
                      <div>
                        <strong>{{ a.title }}</strong>
                        <p>{{ a.message }}</p>
                      </div>
                      <app-icon [icon]="icons.ArrowUpRight" [size]="14" [strokeWidth]="2" />
                    </a>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="panel scores">
            <div class="panel-head">
              <h2>Estado operativo</h2>
              <span class="muted">Scores derivados de métricas reales</span>
            </div>
            @if (d.scores.length === 0) {
              <p class="empty-inline">Sin scores para tus permisos</p>
            } @else {
              <div class="score-list">
                @for (s of d.scores; track s.key) {
                  <div class="score-row">
                    <div class="score-meta">
                      <strong>{{ s.label }}</strong>
                      <span>{{ s.hint || '—' }}</span>
                    </div>
                    @if (s.value === null) {
                      <span class="score-na">Sin datos</span>
                    } @else {
                      <div class="score-bar-wrap">
                        <div class="score-bar" [style.width.%]="s.value" [attr.data-level]="scoreLevel(s.value)"></div>
                      </div>
                      <strong class="score-pct">{{ s.value }}%</strong>
                    }
                  </div>
                }
              </div>
            }
          </section>
        </div>

        <section class="panel">
          <div class="panel-head">
            <h2>KPIs principales</h2>
          </div>
          @if (d.kpis.length === 0) {
            <p class="empty-inline">No hay KPIs disponibles para tu rol</p>
          } @else {
            <div class="kpi-grid">
              @for (k of d.kpis; track k.id) {
                <a [routerLink]="k.route" class="kpi-card" [class.warn]="k.warn">
                  <span class="kpi-label">{{ k.label }}</span>
                  <strong class="kpi-value">{{ k.value | number }}</strong>
                  @if (k.sparkline?.length) {
                    <svg class="spark" viewBox="0 0 64 20" aria-hidden="true">
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        [attr.points]="linePoints(k.sparkline!, 64, 20)"
                      />
                    </svg>
                  }
                  @if (k.deltaPct != null) {
                    <span class="kpi-delta" [attr.data-dir]="k.deltaPct >= 0 ? 'up' : 'down'">
                      @if (k.deltaPct >= 0) {
                        <app-icon [icon]="icons.ArrowUpRight" [size]="12" [strokeWidth]="2.4" />
                      } @else {
                        <app-icon [icon]="icons.ArrowDownRight" [size]="12" [strokeWidth]="2.4" />
                      }
                      {{ k.deltaPct | number: '1.0-1' }}%
                      @if (k.deltaLabel) {
                        <span class="delta-label">{{ k.deltaLabel }}</span>
                      }
                    </span>
                  } @else if (k.hint) {
                    <span class="kpi-hint">{{ k.hint }}</span>
                  }
                </a>
              }
            </div>
          }
        </section>

        <div class="modules-grid">
          @if (rrhh(); as hr) {
            <section class="panel module">
              <div class="panel-head">
                <h2>
                  <app-icon [icon]="icons.UsersRound" [size]="16" [strokeWidth]="2" />
                  Evolución de asociados
                </h2>
                <a routerLink="/rrhh" class="link-quiet">Ir a RRHH</a>
              </div>
              @if (hr.rotation?.length) {
                <svg class="chart" viewBox="0 0 320 120" role="img" aria-label="Rotación mensual">
                  <polyline
                    fill="none"
                    stroke="var(--primary-600)"
                    stroke-width="2.5"
                    [attr.points]="linePoints(rotationActiveSeries(hr))"
                  />
                </svg>
                <div class="chart-legend">
                  @for (r of hr.rotation.slice(-6); track r.key) {
                    <span>{{ r.key }} · {{ r.activeAtEnd }} · retiros {{ r.retirements }}</span>
                  }
                </div>
              } @else {
                <p class="empty-inline">Sin serie de rotación</p>
              }
            </section>
          }

          @if (recepcion(); as rec) {
            <section class="panel module">
              <div class="panel-head">
                <h2>
                  <app-icon [icon]="icons.Building2" [size]="16" [strokeWidth]="2" />
                  Recepción
                </h2>
                <a routerLink="/recepcion" class="link-quiet">Ir a Recepción</a>
              </div>
              <div class="mini-stats">
                <div><span>Dentro</span><strong>{{ rec.stats.insideNow }}</strong></div>
                <div><span>Hoy</span><strong>{{ rec.stats.todayEntries }}</strong></div>
                <div><span>Salidas hoy</span><strong>{{ rec.insights?.todayExits ?? '—' }}</strong></div>
                <div>
                  <span>Pico 7d</span>
                  <strong>
                    @if (rec.insights?.peakHour != null) {
                      {{ formatHour(rec.insights.peakHour) }}
                    } @else {
                      Sin datos
                    }
                  </strong>
                </div>
              </div>
              <svg class="chart bars" viewBox="0 0 320 120" role="img" aria-label="Entradas por día">
                @for (b of barRects(receptionSeries(rec)); track $index) {
                  <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" rx="2" fill="var(--primary-500)" opacity="0.85" />
                }
              </svg>
              <p class="muted chart-caption">
                Serie {{ d.seriesDays }} día(s) · período {{ d.period }}
              </p>
            </section>
          }

          @if (dotacion(); as dot) {
            <section class="panel module">
              <div class="panel-head">
                <h2>
                  <app-icon [icon]="icons.Boxes" [size]="16" [strokeWidth]="2" />
                  Dotación
                </h2>
                <a routerLink="/dotacion" class="link-quiet">Ir a Dotación</a>
              </div>
              <div class="mini-stats">
                <div><span>Sin dotación</span><strong>{{ dot.withoutDotacionCount }}</strong></div>
                <div><span>Con entrega</span><strong>{{ dot.withDotacionCount ?? '—' }}</strong></div>
                <div><span>Stock bajo</span><strong>{{ dot.lowStockCount }}</strong></div>
                <div><span>Agotados</span><strong>{{ dot.zeroStockCount ?? 0 }}</strong></div>
              </div>
              @if (dot.statusBreakdown) {
                <div class="stack-bars" aria-label="Estado de dotación">
                  <div class="stack-row">
                    <span>Con entrega reciente</span>
                    <div class="stack-track">
                      <div class="stack-fill ok" [style.width.%]="dotShare(dot, 'with')"></div>
                    </div>
                    <strong>{{ dot.statusBreakdown.withRecentDelivery }}</strong>
                  </div>
                  <div class="stack-row">
                    <span>Sin entrega reciente</span>
                    <div class="stack-track">
                      <div class="stack-fill warn" [style.width.%]="dotShare(dot, 'without')"></div>
                    </div>
                    <strong>{{ dot.statusBreakdown.withoutRecentDelivery }}</strong>
                  </div>
                  <div class="stack-row">
                    <span>Entregas pendientes</span>
                    <div class="stack-track">
                      <div class="stack-fill info" [style.width.%]="dotShare(dot, 'pending')"></div>
                    </div>
                    <strong>{{ dot.statusBreakdown.pendingDeliveries }}</strong>
                  </div>
                </div>
              }
              @if (dot.topDeliveredItems?.length) {
                <h3 class="subh">Mayor consumo</h3>
                <ul class="rank-list">
                  @for (item of dot.topDeliveredItems.slice(0, 5); track item.sku) {
                    <li>
                      <span>{{ item.itemName }}</span>
                      <strong>{{ item.totalQuantity }}</strong>
                    </li>
                  }
                </ul>
              } @else {
                <p class="empty-inline">Sin consumo registrado</p>
              }
              @if (dot.lowStockItems?.length) {
                <a routerLink="/dotacion/inventario" class="cta-warn">
                  {{ dot.lowStockCount }} elemento(s) con stock bajo
                  <app-icon [icon]="icons.ArrowRight" [size]="14" [strokeWidth]="2" />
                </a>
              }
            </section>
          }

          @if (programacion(); as prog) {
            <section class="panel module">
              <div class="panel-head">
                <h2>
                  <app-icon [icon]="icons.CalendarCheck" [size]="16" [strokeWidth]="2" />
                  Programación
                </h2>
                <a routerLink="/programacion" class="link-quiet">Ir a Programación</a>
              </div>
              <div class="coverage">
                <div class="coverage-meta">
                  <span>Cobertura de puestos (mes)</span>
                  <strong>
                    @if (prog.kpis.postsInMonth > 0) {
                      {{ coveragePct(prog) }}%
                    } @else {
                      Sin datos
                    }
                  </strong>
                </div>
                <div class="coverage-track">
                  <div class="coverage-fill" [style.width.%]="coveragePct(prog)"></div>
                </div>
              </div>
              @if (prog.today) {
                <div class="coverage">
                  <div class="coverage-meta">
                    <span>Cobertura hoy (día {{ prog.today.day }})</span>
                    <strong>
                      @if (prog.today.coveragePct != null) {
                        {{ prog.today.coveragePct }}%
                      } @else {
                        Sin datos
                      }
                    </strong>
                  </div>
                  <div class="coverage-track">
                    <div class="coverage-fill" [style.width.%]="prog.today.coveragePct ?? 0"></div>
                  </div>
                  @if (prog.today.nextShift) {
                    <p class="next-shift">
                      Próximo turno: {{ prog.today.nextShift.postLabel }} a las {{ prog.today.nextShift.inicio }}
                      (en {{ prog.today.nextShift.minutesUntil }} min)
                    </p>
                  }
                </div>
              }
              <div class="mini-stats">
                <div><span>Programados</span><strong>{{ prog.kpis.postsInMonth }}</strong></div>
                <div><span>Cubiertos</span><strong>{{ prog.kpis.postsCovered }}</strong></div>
                <div><span>Sin cubrir hoy</span><strong>{{ prog.today?.postsUncoveredToday ?? '—' }}</strong></div>
                <div><span>Conflictos</span><strong>{{ prog.kpis.conflicts }}</strong></div>
              </div>
            </section>
          }

          @if (documental(); as doc) {
            <section class="panel module">
              <div class="panel-head">
                <h2>
                  <app-icon [icon]="icons.FileText" [size]="16" [strokeWidth]="2" />
                  Documental
                </h2>
                <a routerLink="/documental" class="link-quiet">Ir a Documental</a>
              </div>
              <div class="mini-stats">
                <div><span>Correspondencia</span><strong>{{ doc.analytics.correspondencia }}</strong></div>
                <div><span>Minutas</span><strong>{{ doc.analytics.minutas }}</strong></div>
                <div><span>Préstamos</span><strong>{{ doc.analytics.prestamosActivos }}</strong></div>
                <div><span>Alertas</span><strong>{{ doc.notifications.totalAlertas }}</strong></div>
              </div>
              <h3 class="subh">Atención prioritaria</h3>
              @if ((doc.notifications.alertas ?? []).length === 0) {
                <p class="empty-inline">Sin alertas documentales</p>
              } @else {
                <ul class="prio-list">
                  @for (a of doc.notifications.alertas.slice(0, 5); track a.idRegistro + a.tipo) {
                    <li [attr.data-nivel]="a.nivel">
                      <span class="prio-dot"></span>
                      <div>
                        <strong>{{ a.titulo }}</strong>
                        <p>{{ a.mensaje }}</p>
                      </div>
                    </li>
                  }
                </ul>
              }
            </section>
          }
        </div>

        <section class="panel">
          <div class="panel-head">
            <h2>Actividad reciente</h2>
            <span class="muted">Últimos eventos del sistema</span>
          </div>
          @if (d.activity.length === 0) {
            <p class="empty-inline">Aún no hay eventos de auditoría para mostrar</p>
          } @else {
            <ul class="timeline">
              @for (ev of d.activity; track ev.id) {
                <li>
                  <span class="time">{{ ev.createdAt | date: 'dd/MM HH:mm' }}</span>
                  <div>
                    <strong>{{ ev.label }}</strong>
                    <span class="muted">{{ moduleName(ev.module) }}</span>
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      }
    </section>
  `,
  styles: `
    .dashboard { display: flex; flex-direction: column; gap: 1.25rem; }
    .hero {
      position: relative; overflow: hidden; border-radius: var(--radius-xl);
      background: var(--gradient-hero-mesh, linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%));
      color: #fff; box-shadow: var(--shadow-lg);
      min-height: 180px;
    }
    .hero-mesh {
      position: absolute; inset: 0; pointer-events: none;
      background:
        radial-gradient(at 90% 20%, rgba(34, 211, 238, 0.35) 0px, transparent 55%),
        radial-gradient(at 15% 80%, rgba(236, 72, 153, 0.28) 0px, transparent 55%);
    }
    .hero-inner {
      position: relative; z-index: 1; display: flex; justify-content: space-between;
      gap: 2rem; padding: 1.75rem 2rem; flex-wrap: wrap; align-items: flex-end;
    }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.75rem;
      background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.2);
      border-radius: 999px; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.05em;
      text-transform: uppercase; margin-bottom: 0.75rem;
    }
    .hero-text h1 {
      margin: 0; font-family: var(--font-display); font-size: clamp(1.7rem, 3vw, 2.2rem);
      font-weight: 700; color: #fff;
    }
    .hero-text p { margin: 0.5rem 0 0.85rem; color: rgba(255,255,255,0.82); }
    .hero-text strong { color: #fff; }
    .status-row { margin-bottom: 0.85rem; }
    .status-pill {
      display: inline-flex; padding: 0.35rem 0.8rem; border-radius: 999px;
      font-size: 0.8rem; font-weight: 700; background: rgba(255,255,255,0.16);
      border: 1px solid rgba(255,255,255,0.28);
    }
    .status-pill[data-code='stable'] { background: rgba(34,197,94,0.22); }
    .status-pill[data-code='attention'] { background: rgba(245,158,11,0.28); }
    .status-pill[data-code='critical'] { background: rgba(239,68,68,0.3); }
    .period-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .period-btn {
      border: 1px solid rgba(255,255,255,0.28); background: rgba(255,255,255,0.1);
      color: #fff; border-radius: 999px; padding: 0.35rem 0.75rem; font-size: 0.78rem;
      font-weight: 600; cursor: pointer;
    }
    .period-btn.active { background: #fff; color: var(--primary-700); }
    .period-hint { margin: 0.55rem 0 0; font-size: 0.72rem; color: rgba(255,255,255,0.7); max-width: 520px; }
    .hero-info { display: flex; flex-direction: column; gap: 0.55rem; min-width: 230px; }
    .info-card {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 0.9rem;
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18); border-radius: var(--radius);
    }
    .info-icon {
      width: 34px; height: 34px; border-radius: 10px; background: var(--g);
      display: inline-flex; align-items: center; justify-content: center; color: #fff;
    }
    .info-title { display: block; font-size: 0.85rem; font-weight: 600; color: #fff; }
    .info-sub { display: block; font-size: 0.72rem; color: rgba(255,255,255,0.75); }

    .panel {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
      padding: 1.1rem 1.2rem; box-shadow: var(--shadow);
    }
    .panel-head {
      display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem;
      margin-bottom: 0.85rem; flex-wrap: wrap;
    }
    .panel-head h2 {
      margin: 0; font-family: var(--font-display); font-size: 1.05rem; color: var(--text-primary);
      display: inline-flex; align-items: center; gap: 0.45rem;
    }
    .muted { color: var(--text-muted); font-size: 0.82rem; }
    .link-quiet { font-size: 0.82rem; font-weight: 600; color: var(--primary-700); text-decoration: none; }
    .empty-inline { margin: 0; color: var(--text-secondary); font-size: 0.9rem; }

    .highlight-list { display: flex; flex-direction: column; gap: 0.45rem; }
    .highlight {
      display: flex; align-items: center; gap: 0.65rem; padding: 0.7rem 0.85rem;
      border-radius: 10px; border: 1px solid var(--border); background: var(--surface-2);
      text-decoration: none; color: var(--text-primary); font-size: 0.9rem;
    }
    .highlight:hover { border-color: var(--primary-200); }
    .tone-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--primary-500); flex-shrink: 0; }
    .highlight[data-tone='critical'] .tone-dot { background: #ef4444; }
    .highlight[data-tone='warning'] .tone-dot { background: #f59e0b; }
    .highlight[data-tone='info'] .tone-dot { background: #3b82f6; }

    .two-col {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;
    }
    .alert-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.45rem; }
    .alert-item {
      display: grid; grid-template-columns: auto 1fr auto; gap: 0.65rem; align-items: start;
      padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid var(--border);
      text-decoration: none; color: inherit; background: var(--surface);
    }
    .alert-item:hover { border-color: var(--primary-200); }
    .alert-item strong { display: block; font-size: 0.88rem; }
    .alert-item p { margin: 0.15rem 0 0; font-size: 0.8rem; color: var(--text-secondary); }
    .badge {
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      padding: 0.2rem 0.4rem; border-radius: 6px; background: #e2e8f0; color: #334155;
    }
    .alert-item[data-tone='critical'] .badge { background: rgba(239,68,68,0.15); color: #b91c1c; }
    .alert-item[data-tone='warning'] .badge { background: rgba(245,158,11,0.18); color: #b45309; }
    .alert-item[data-tone='info'] .badge { background: rgba(59,130,246,0.15); color: #1d4ed8; }

    .score-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .score-row { display: grid; grid-template-columns: 1fr minmax(90px, 1.2fr) auto; gap: 0.6rem; align-items: center; }
    .score-meta strong { display: block; font-size: 0.88rem; }
    .score-meta span { font-size: 0.72rem; color: var(--text-muted); }
    .score-bar-wrap { height: 8px; background: var(--surface-2); border-radius: 999px; overflow: hidden; border: 1px solid var(--border); }
    .score-bar { height: 100%; border-radius: 999px; background: #22c55e; }
    .score-bar[data-level='mid'] { background: #f59e0b; }
    .score-bar[data-level='low'] { background: #ef4444; }
    .score-pct { font-family: var(--font-display); font-size: 0.95rem; }
    .score-na { font-size: 0.78rem; color: var(--text-muted); }

    .kpi-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem;
    }
    .kpi-card {
      display: flex; flex-direction: column; gap: 0.25rem; padding: 0.9rem 1rem;
      border-radius: 12px; border: 1px solid var(--border); background: var(--surface-2);
      text-decoration: none; color: inherit; transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .kpi-card:hover { transform: translateY(-1px); border-color: var(--primary-200); }
    .kpi-card.warn { border-color: rgba(245,158,11,0.45); }
    .spark { width: 100%; height: 22px; color: var(--primary-600); margin-top: 0.15rem; }
    .kpi-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600; }
    .kpi-value { font-family: var(--font-display); font-size: 1.7rem; line-height: 1.1; color: var(--text-primary); }
    .kpi-hint { font-size: 0.75rem; color: var(--text-muted); }
    .kpi-delta { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.78rem; font-weight: 600; }
    .kpi-delta[data-dir='up'] { color: #15803d; }
    .kpi-delta[data-dir='down'] { color: #b91c1c; }
    .delta-label { font-weight: 500; color: var(--text-muted); margin-left: 0.15rem; }

    .modules-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;
    }
    .mini-stats {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem;
    }
    .mini-stats div {
      padding: 0.55rem 0.65rem; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border);
    }
    .mini-stats span { display: block; font-size: 0.68rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .mini-stats strong { font-family: var(--font-display); font-size: 1.15rem; }
    .chart { width: 100%; height: 120px; background: var(--surface-2); border-radius: 10px; border: 1px solid var(--border); }
    .chart-legend, .chart-caption { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.5rem; font-size: 0.72rem; color: var(--text-muted); }
    .subh { margin: 0.35rem 0 0.45rem; font-size: 0.85rem; color: var(--text-secondary); }
    .rank-list, .prio-list, .timeline { list-style: none; margin: 0; padding: 0; }
    .rank-list li, .timeline li {
      display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.4rem 0;
      border-bottom: 1px solid var(--border); font-size: 0.85rem;
    }
    .prio-list li {
      display: flex; gap: 0.55rem; padding: 0.45rem 0; border-bottom: 1px solid var(--border);
    }
    .prio-list strong { display: block; font-size: 0.82rem; }
    .prio-list p { margin: 0.1rem 0 0; font-size: 0.75rem; color: var(--text-secondary); }
    .prio-dot { width: 8px; height: 8px; border-radius: 999px; margin-top: 0.35rem; background: #22c55e; flex-shrink: 0; }
    .prio-list li[data-nivel='critico'] .prio-dot { background: #ef4444; }
    .prio-list li[data-nivel='advertencia'] .prio-dot { background: #f59e0b; }
    .cta-warn {
      display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 0.65rem;
      font-size: 0.85rem; font-weight: 600; color: #b45309; text-decoration: none;
    }
    .coverage { margin-bottom: 0.75rem; }
    .coverage-meta { display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.85rem; }
    .coverage-track { height: 10px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); overflow: hidden; }
    .coverage-fill { height: 100%; background: linear-gradient(90deg, var(--primary-500), #22c55e); }
    .next-shift { margin: 0.45rem 0 0; font-size: 0.8rem; color: var(--text-secondary); }
    .stack-bars { display: flex; flex-direction: column; gap: 0.45rem; margin-bottom: 0.75rem; }
    .stack-row {
      display: grid; grid-template-columns: 1.2fr 1fr auto; gap: 0.5rem; align-items: center;
      font-size: 0.78rem;
    }
    .stack-track { height: 8px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); overflow: hidden; }
    .stack-fill { height: 100%; border-radius: 999px; }
    .stack-fill.ok { background: #22c55e; }
    .stack-fill.warn { background: #f59e0b; }
    .stack-fill.info { background: #3b82f6; }
    .timeline .time {
      min-width: 78px; font-size: 0.75rem; color: var(--text-muted); font-variant-numeric: tabular-nums;
    }
    .timeline div { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; }

    .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .skeleton {
      height: 120px; border-radius: var(--radius-lg);
      background: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%);
      background-size: 200% 100%; animation: shimmer 1.2s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .alert-error {
      display: flex; align-items: center; gap: 0.65rem; padding: 0.9rem 1.1rem;
      background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
      border-radius: var(--radius); color: var(--error-dark); font-size: 0.9rem;
    }
    .alert-dot {
      width: 8px; height: 8px; border-radius: 999px; background: var(--error);
      box-shadow: 0 0 0 4px rgba(239,68,68,0.18);
    }

    @media (max-width: 720px) {
      .score-row { grid-template-columns: 1fr; }
      .hero-inner { padding: 1.35rem 1.2rem; }
    }
  `,
})
export class Dashboard implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(DashboardApiService);

  readonly icons = {
    ArrowDownRight: LucideArrowDownRight,
    ArrowRight: LucideArrowRight,
    ArrowUpRight: LucideArrowUpRight,
    Boxes: LucideBoxes,
    Building2: LucideBuilding2,
    CalendarCheck: LucideCalendarCheck,
    ClipboardCheck: LucideClipboardCheck,
    FileText: LucideFileText,
    ShieldCheck: LucideShieldCheck,
    Sparkles: LucideSparkles,
    UsersRound: LucideUsersRound,
  };

  readonly periods: { key: PeriodKey; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: '7d', label: '7 días' },
    { key: '30d', label: '30 días' },
    { key: 'month', label: 'Este mes' },
  ];

  readonly period = signal<PeriodKey>('7d');
  readonly data = signal<CommandCenterPayload | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly todayLabel = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota',
  }).format(new Date());

  readonly firstName = computed(() => {
    const user = this.auth.currentUser();
    const name = user?.fullName ?? user?.email ?? '';
    return name.split(/[\s@]/)[0] || 'usuario';
  });

  readonly roleName = computed(() => this.auth.currentUser()?.role?.name ?? null);

  readonly modulesCount = computed(() => {
    const perms = this.auth.currentUser()?.permissions ?? [];
    return new Set(perms.map((p) => p.split('.')[0]).filter(Boolean)).size;
  });

  readonly greeting = computed(() => {
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Bogota',
        hour: 'numeric',
        hour12: false,
      }).format(new Date()),
    );
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  readonly rrhh = computed(() => this.data()?.modules?.['rrhh'] as any);
  readonly recepcion = computed(() => this.data()?.modules?.['recepcion'] as any);
  readonly dotacion = computed(() => this.data()?.modules?.['dotacion'] as any);
  readonly programacion = computed(() => this.data()?.modules?.['programacion'] as any);
  readonly documental = computed(() => this.data()?.modules?.['documental'] as any);

  ngOnInit(): void {
    this.reload();
  }

  setPeriod(key: PeriodKey): void {
    if (this.period() === key) return;
    this.period.set(key);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.loadCommandCenter(this.period()).subscribe({
      next: (payload) => {
        this.data.set(payload);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el centro de control');
      },
    });
  }

  toneLabel(tone: CommandAlert['tone']): string {
    if (tone === 'critical') return 'Crítica';
    if (tone === 'warning') return 'Advertencia';
    return 'Info';
  }

  moduleName(module: string): string {
    const map: Record<string, string> = {
      scheduling: 'Programación',
      auth: 'Acceso',
      hr: 'Gestión Humana',
      associates: 'Asociados',
      inventory: 'Inventario',
      deliveries: 'Dotación',
      reception: 'Recepción',
      documental: 'Documental',
      users: 'Administración',
    };
    return map[module] ?? module;
  }

  scoreLevel(value: number): 'ok' | 'mid' | 'low' {
    if (value >= 85) return 'ok';
    if (value >= 65) return 'mid';
    return 'low';
  }

  formatHour(hour: number): string {
    const h = Math.max(0, Math.min(23, hour));
    const end = (h + 2) % 24;
    return `${String(h).padStart(2, '0')}:00–${String(end).padStart(2, '0')}:00`;
  }

  coveragePct(prog: { kpis: { postsInMonth: number; postsCovered: number } }): number {
    if (!prog.kpis.postsInMonth) return 0;
    return Math.round((prog.kpis.postsCovered / prog.kpis.postsInMonth) * 100);
  }

  receptionSeries(rec: {
    last14Days?: { day: string; entries: number }[];
    insights?: { dailySeries?: { day: string; entries: number }[] };
  }): number[] {
    const series = rec.insights?.dailySeries;
    if (series?.length) return series.map((d) => d.entries);
    return (rec.last14Days ?? []).map((d) => d.entries);
  }

  rotationActiveSeries(hr: { rotation?: { activeAtEnd: number }[] }): number[] {
    return (hr.rotation ?? []).map((r) => Number(r.activeAtEnd) || 0);
  }

  dotShare(
    dot: {
      statusBreakdown?: {
        withRecentDelivery: number;
        withoutRecentDelivery: number;
        pendingDeliveries: number;
      };
    },
    kind: 'with' | 'without' | 'pending',
  ): number {
    const b = dot.statusBreakdown;
    if (!b) return 0;
    const total = Math.max(
      1,
      b.withRecentDelivery + b.withoutRecentDelivery + b.pendingDeliveries,
    );
    if (kind === 'with') return Math.round((b.withRecentDelivery / total) * 100);
    if (kind === 'without') return Math.round((b.withoutRecentDelivery / total) * 100);
    return Math.round((b.pendingDeliveries / total) * 100);
  }

  linePoints(values: number[], width = 320, height = 120): string {
    if (!values.length) return '';
    const max = Math.max(...values, 1);
    const pad = width < 100 ? 2 : 8;
    return values
      .map((v, i) => {
        const x = pad + (i * (width - pad * 2)) / Math.max(values.length - 1, 1);
        const y = height - pad - (v / max) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(' ');
  }

  barRects(values: number[]): { x: number; y: number; w: number; h: number }[] {
    if (!values.length) return [];
    const max = Math.max(...values, 1);
    const w = 320;
    const h = 120;
    const pad = 6;
    const gap = 2;
    const barW = (w - pad * 2 - gap * (values.length - 1)) / values.length;
    return values.map((v, i) => {
      const bh = (v / max) * (h - pad * 2);
      return {
        x: pad + i * (barW + gap),
        y: h - pad - bh,
        w: Math.max(barW, 1),
        h: Math.max(bh, v > 0 ? 2 : 0),
      };
    });
  }
}
