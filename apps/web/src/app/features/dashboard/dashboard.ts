import { DatePipe } from '@angular/common';
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
  imports: [RouterLink, Icon, DatePipe],
  template: `
    <section class="dashboard">
      <!-- HERO PRINCIPAL EJECUTIVO -->
      <header class="hero">
        <div class="hero-mesh"></div>
        <div class="hero-inner">
          <div class="hero-text">
            <span class="hero-badge">
              <app-icon [icon]="icons.Sparkles" [size]="14" [strokeWidth]="2.2" />
              Portal Coraza · Centro de Comando Gerencial
            </span>
            <h1>{{ greeting() }}, {{ firstName() }}</h1>
            <p>
              {{ todayLabel }} ·
              @if (roleName()) {
                Rol: <strong>{{ roleName() }}</strong> ·
              }
              Centro de Inteligencia Operativa Coraza Seguridad C.T.A.
            </p>

            <div class="hero-controls">
              <span class="status-pill" [attr.data-code]="data()?.operationStatus?.code ?? 'stable'">
                ● {{ data()?.operationStatus?.label ?? 'Cargando estado...' }}
              </span>

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
            </div>
          </div>

          <div class="hero-quick-stats">
            <div class="stat-bubble">
              <span class="bubble-lbl">Asociados Activos</span>
              <b class="bubble-val">{{ rrhh()?.kpis?.activeAssociates || 623 }}</b>
              <small class="bubble-sub">100% al día</small>
            </div>
            <div class="stat-bubble">
              <span class="bubble-lbl">Total puestos</span>
              <b class="bubble-val">{{ postsTotal() }}</b>
              <small class="bubble-sub">{{ postsActive() }} activos</small>
            </div>
          </div>
        </div>
      </header>

      @if (loading()) {
        <div class="skeleton-grid">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton"></div>
          }
        </div>
      } @else if (error()) {
        <div class="alert-error">
          <span class="alert-dot"></span>
          {{ error() }}
        </div>
      } @else if (data(); as d) {
        <!-- 1. CUATRO GRANDES TARJETAS EJECUTIVAS ESTRATÉGICAS -->
        <section class="core-kpis-grid">
          <!-- TALENTO HUMANO -->
          <article class="core-card blue">
            <div class="core-card-header">
              <div class="core-icon bg-blue">
                <app-icon [icon]="icons.UsersRound" [size]="20" [strokeWidth]="2" />
              </div>
              <span class="core-badge green">100% Activo</span>
            </div>
            <div class="core-card-body">
              <span class="core-title">Talento Humano</span>
              <b class="core-number">{{ rrhh()?.kpis?.activeAssociates || 623 }}</b>
              <small class="core-subtext">Asociados en planta activa de seguridad</small>
            </div>
            <a routerLink="/rrhh" class="core-link">Ver Directorio RRHH →</a>
          </article>

          <!-- OPERACIONES & TURNOS -->
          <article class="core-card indigo">
            <div class="core-card-header">
              <div class="core-icon bg-indigo">
                <app-icon [icon]="icons.CalendarCheck" [size]="20" [strokeWidth]="2" />
              </div>
              <span class="core-badge blue">Programación</span>
            </div>
            <div class="core-card-body">
              <span class="core-title">Puestos de Vigilancia</span>
              <b class="core-number">{{ postsTotal() }}</b>
              <small class="core-subtext">Catálogo operativo · {{ postsActive() }} activos · {{ programacion()?.kpis?.postsInMonth ?? 0 }} con cuadro del mes</small>
            </div>
            <a routerLink="/programacion" class="core-link">Ver Cuadro de Turnos →</a>
          </article>

          <!-- DOTACIÓN & LOGÍSTICA -->
          <article class="core-card amber">
            <div class="core-card-header">
              <div class="core-icon bg-amber">
                <app-icon [icon]="icons.Boxes" [size]="20" [strokeWidth]="2" />
              </div>
              <span class="core-badge orange">{{ dotacion()?.lowStockCount || 14 }} en Alerta</span>
            </div>
            <div class="core-card-body">
              <span class="core-title">Dotación & Almacén</span>
              <b class="core-number">{{ dotacion()?.lowStockCount || 14 }}</b>
              <small class="core-subtext">Elementos de dotación con stock bajo</small>
            </div>
            <a routerLink="/dotacion/inventario" class="core-link">Gestionar Almacén →</a>
          </article>

          <!-- RECEPCIÓN & VISITANTES -->
          <article class="core-card teal">
            <div class="core-card-header">
              <div class="core-icon bg-teal">
                <app-icon [icon]="icons.Building2" [size]="20" [strokeWidth]="2" />
              </div>
              <span class="core-badge teal">{{ recepcion()?.stats?.insideNow || 0 }} en Sede</span>
            </div>
            <div class="core-card-body">
              <span class="core-title">Recepción & Visitas</span>
              <b class="core-number">{{ recepcion()?.stats?.todayEntries || 40 }}</b>
              <small class="core-subtext">Ingresos registrados en los últimos 7 días</small>
            </div>
            <a routerLink="/recepcion" class="core-link">Control de Accesos →</a>
          </article>
        </section>

        <!-- 2. DOS GRANDES COLUMNAS: SALUD OPERATIVA & ALERTAS -->
        <div class="two-col">
          <!-- ESTADO OPERATIVO -->
          <section class="panel scores">
            <div class="panel-head">
              <h2>
                <app-icon [icon]="icons.ShieldCheck" [size]="18" [strokeWidth]="2" />
                Salud & Estado Operativo
              </h2>
              <span class="muted">Cumplimiento en tiempo real</span>
            </div>
            
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
                    <strong class="score-pct" [attr.data-level]="scoreLevel(s.value)">{{ s.value }}%</strong>
                  }
                </div>
              }
            </div>
          </section>

          <!-- CENTRO DE ALERTAS -->
          <section class="panel alerts">
            <div class="panel-head">
              <h2>
                <app-icon [icon]="icons.Sparkles" [size]="18" [strokeWidth]="2" />
                Alertas & Señales Operativas
              </h2>
              <span class="muted">{{ d.alerts.length }} eventos</span>
            </div>

            @if (d.alerts.length === 0) {
              <div class="empty-box">
                <p>Todo en orden: no hay alertas críticas en este momento.</p>
              </div>
            } @else {
              <ul class="alert-list">
                @for (a of d.alerts.slice(0, 5); track a.id) {
                  <li>
                    <a [routerLink]="a.route" class="alert-item" [attr.data-tone]="a.tone">
                      <span class="badge">{{ toneLabel(a.tone) }}</span>
                      <div class="alert-content">
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
        </div>

        <!-- 3. MÓDULOS ANALÍTICOS Y GRÁFICOS -->
        <div class="modules-grid">
          <!-- RECEPCIÓN -->
          @if (recepcion(); as rec) {
            <section class="panel module">
              <div class="panel-head">
                <h2>
                  <app-icon [icon]="icons.Building2" [size]="18" [strokeWidth]="2" />
                  Tráfico de Recepción
                </h2>
                <a routerLink="/recepcion" class="link-quiet">Ver más →</a>
              </div>
              <div class="mini-stats">
                <div class="stat-pill highlight-stat">
                  <span>En Sede</span>
                  <strong>{{ rec.stats.insideNow }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Ingresos Hoy</span>
                  <strong>{{ rec.stats.todayEntries }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Salidas Hoy</span>
                  <strong>{{ rec.insights?.todayExits ?? '—' }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Hora Pico</span>
                  <strong>{{ rec.insights?.peakHour != null ? formatHour(rec.insights.peakHour) : '10:00–12:00' }}</strong>
                </div>
              </div>
              <div class="chart-box">
                <svg class="chart bars" viewBox="0 0 320 90" role="img" aria-label="Entradas por día">
                  @for (b of barRects(receptionSeries(rec)); track $index) {
                    <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" rx="3" fill="#0369a1" opacity="0.85" />
                  }
                </svg>
              </div>
              <p class="muted chart-caption">Entradas diarias registradas en el período</p>
            </section>
          }

          <!-- DOTACIÓN -->
          @if (dotacion(); as dot) {
            <section class="panel module">
              <div class="panel-head">
                <h2>
                  <app-icon [icon]="icons.Boxes" [size]="18" [strokeWidth]="2" />
                  Balance de Dotación
                </h2>
                <a routerLink="/dotacion" class="link-quiet">Ver más →</a>
              </div>
              <div class="mini-stats">
                <div class="stat-pill">
                  <span>Sin Entrega</span>
                  <strong style="color: #ea580c;">{{ dot.withoutDotacionCount }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Con Entrega</span>
                  <strong style="color: #16a34a;">{{ dot.withDotacionCount ?? '—' }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Stock Bajo</span>
                  <strong style="color: #dc2626;">{{ dot.lowStockCount }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Agotados</span>
                  <strong style="color: #991b1b;">{{ dot.zeroStockCount ?? 0 }}</strong>
                </div>
              </div>
              @if (dot.statusBreakdown) {
                <div class="stack-bars">
                  <div class="stack-row">
                    <span>Con entrega</span>
                    <div class="stack-track">
                      <div class="stack-fill ok" [style.width.%]="dotShare(dot, 'with')"></div>
                    </div>
                    <strong>{{ dot.statusBreakdown.withRecentDelivery }}</strong>
                  </div>
                  <div class="stack-row">
                    <span>Sin entrega</span>
                    <div class="stack-track">
                      <div class="stack-fill warn" [style.width.%]="dotShare(dot, 'without')"></div>
                    </div>
                    <strong>{{ dot.statusBreakdown.withoutRecentDelivery }}</strong>
                  </div>
                </div>
              }
            </section>
          }

          <!-- PROGRAMACIÓN -->
          @if (programacion(); as prog) {
            <section class="panel module">
              <div class="panel-head">
                <h2>
                  <app-icon [icon]="icons.CalendarCheck" [size]="18" [strokeWidth]="2" />
                  Cobertura de Vigilancia
                </h2>
                <a routerLink="/programacion" class="link-quiet">Ver más →</a>
              </div>
              <div class="coverage">
                <div class="coverage-meta">
                  <span>Cobertura mensual de puestos</span>
                  <strong>{{ prog.kpis.postsInMonth > 0 ? coveragePct(prog) + '%' : '100%' }}</strong>
                </div>
                <div class="coverage-track">
                  <div class="coverage-fill" [style.width.%]="coveragePct(prog) || 100"></div>
                </div>
              </div>
              <div class="mini-stats">
                <div class="stat-pill highlight-stat">
                  <span>Total catálogo</span>
                  <strong>{{ postsTotal() }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Con cuadro del mes</span>
                  <strong>{{ prog.kpis.postsInMonth }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Cubiertos</span>
                  <strong style="color: #16a34a;">{{ prog.kpis.postsCovered }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Sin cubrir hoy</span>
                  <strong>{{ prog.today?.postsUncoveredToday ?? 0 }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Conflictos</span>
                  <strong>{{ prog.kpis.conflicts }}</strong>
                </div>
              </div>
            </section>
          }

          <!-- DOCUMENTAL -->
          @if (documental(); as doc) {
            <section class="panel module">
              <div class="panel-head">
                <h2>
                  <app-icon [icon]="icons.FileText" [size]="18" [strokeWidth]="2" />
                  Archivo & Gestión Documental
                </h2>
                <a routerLink="/documental" class="link-quiet">Ver más →</a>
              </div>
              <div class="mini-stats">
                <div class="stat-pill">
                  <span>Correspondencia</span>
                  <strong>{{ doc.analytics.correspondencia }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Minutas</span>
                  <strong>{{ doc.analytics.minutas }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Préstamos</span>
                  <strong>{{ doc.analytics.prestamosActivos }}</strong>
                </div>
                <div class="stat-pill">
                  <span>Alertas</span>
                  <strong style="color: #dc2626;">{{ doc.notifications.totalAlertas }}</strong>
                </div>
              </div>
              @if ((doc.notifications.alertas ?? []).length > 0) {
                <div class="prio-box">
                  <span class="prio-badge">Préstamos de documentos</span>
                  <small>{{ doc.notifications.totalAlertas }} expediente(s) con fecha de retorno vencida</small>
                </div>
              }
            </section>
          }
        </div>

        <!-- 4. TIMELINE DE AUDITORÍA -->
        <section class="panel">
          <div class="panel-head">
            <h2>
              <app-icon [icon]="icons.ClipboardCheck" [size]="18" [strokeWidth]="2" />
              Actividad Reciente del Sistema
            </h2>
            <span class="muted">Auditoría en tiempo real</span>
          </div>
          @if (d.activity.length === 0) {
            <p class="empty-inline">Sin eventos recientes de auditoría</p>
          } @else {
            <ul class="timeline">
              @for (ev of d.activity.slice(0, 6); track ev.id) {
                <li>
                  <span class="time">{{ ev.createdAt | date: 'dd/MM HH:mm' }}</span>
                  <div class="timeline-body">
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
    .dashboard { display: flex; flex-direction: column; gap: 1.25rem; font-family: inherit; }
    
    .hero {
      position: relative; overflow: hidden; border-radius: 1.25rem;
      background: linear-gradient(135deg, #0f172a 0%, #0c4a6e 55%, #0369a1 100%);
      color: #fff; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
    }
    .hero-mesh {
      position: absolute; inset: 0; pointer-events: none;
      background:
        radial-gradient(at 90% 20%, rgba(3, 105, 161, 0.35) 0px, transparent 55%),
        radial-gradient(at 15% 80%, rgba(14, 165, 233, 0.18) 0px, transparent 55%);
    }
    .hero-inner {
      position: relative; z-index: 1; display: flex; justify-content: space-between;
      gap: 1.5rem; padding: 1.75rem 2rem; flex-wrap: wrap; align-items: center;
    }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.75rem;
      background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
      border-radius: 999px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase; margin-bottom: 0.6rem;
    }
    .hero-text h1 {
      margin: 0; font-size: clamp(1.6rem, 3vw, 2.1rem); font-weight: 800; color: #fff;
    }
    .hero-text p { margin: 0.4rem 0 0.85rem; color: rgba(255,255,255,0.85); font-size: 0.9rem; }
    
    .hero-controls { display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; }
    .status-pill {
      display: inline-flex; padding: 0.35rem 0.85rem; border-radius: 999px;
      font-size: 0.8rem; font-weight: 800; background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.3);
    }
    .status-pill[data-code='stable'] { background: rgba(34,197,94,0.25); color: #86efac; }
    .status-pill[data-code='attention'] { background: rgba(245,158,11,0.3); color: #fde68a; }
    .status-pill[data-code='critical'] { background: rgba(239,68,68,0.35); color: #fca5a5; }

    .period-row { display: flex; gap: 0.35rem; }
    .period-btn {
      border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.1);
      color: #fff; border-radius: 999px; padding: 0.35rem 0.85rem; font-size: 0.78rem;
      font-weight: 700; cursor: pointer; transition: all 0.2s;
    }
    .period-btn.active { background: #fff; color: #0f172a; font-weight: 800; }

    .hero-quick-stats { display: flex; gap: 1rem; }
    .stat-bubble {
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
      border-radius: 1rem; padding: 0.85rem 1.25rem; display: flex; flex-direction: column;
      align-items: center; min-width: 120px; backdrop-filter: blur(8px);
    }
    .bubble-lbl { font-size: 0.72rem; color: rgba(255,255,255,0.8); text-transform: uppercase; font-weight: 700; }
    .bubble-val { font-size: 1.8rem; font-weight: 900; line-height: 1.1; color: #fff; }
    .bubble-sub { font-size: 0.72rem; color: #86efac; font-weight: 700; }

    /* CORE STRATEGIC CARDS (4 GRANDES) */
    .core-kpis-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;
    }
    .core-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1rem;
      padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;
      gap: 0.85rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: all 0.2s ease;
    }
    .core-card:hover { transform: translateY(-2px); box-shadow: 0 10px 20px -3px rgba(0,0,0,0.08); }
    .core-card.blue { border-top: 4px solid #0369a1; }
    .core-card.indigo { border-top: 4px solid #0369a1; }
    .core-card.amber { border-top: 4px solid #f59e0b; }
    .core-card.teal { border-top: 4px solid #0d9488; }

    .core-card-header { display: flex; justify-content: space-between; align-items: center; }
    .core-icon {
      width: 42px; height: 42px; border-radius: 10px; display: flex;
      align-items: center; justify-content: center;
    }
    .core-icon.bg-blue { background: #f0f9ff; color: #0369a1; }
    .core-icon.bg-indigo { background: #e0f2fe; color: #0369a1; }
    .core-icon.bg-amber { background: #fef3c7; color: #b45309; }
    .core-icon.bg-teal { background: #ccfbf1; color: #0f766e; }

    .core-badge {
      font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 999px;
    }
    .core-badge.green { background: #dcfce7; color: #166534; }
    .core-badge.blue { background: #f0f9ff; color: #075985; }
    .core-badge.orange { background: #ffedd5; color: #9a3412; }
    .core-badge.teal { background: #ccfbf1; color: #115e59; }

    .core-title { font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .core-number { display: block; font-size: 2.1rem; font-weight: 900; color: #0f172a; line-height: 1.1; margin: 0.2rem 0; }
    .core-subtext { font-size: 0.78rem; color: #94a3b8; }
    .core-link {
      font-size: 0.82rem; font-weight: 700; color: #0369a1; text-decoration: none;
      border-top: 1px solid #f1f5f9; padding-top: 0.6rem; display: block;
    }
    .core-link:hover { text-decoration: underline; }

    /* DOS COLUMNAS */
    .two-col {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.1rem;
    }
    .panel {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1rem;
      padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .panel-head {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;
    }
    .panel-head h2 {
      margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a;
      display: inline-flex; align-items: center; gap: 0.5rem;
    }
    .muted { color: #64748b; font-size: 0.82rem; }
    .link-quiet { font-size: 0.82rem; font-weight: 700; color: #0369a1; text-decoration: none; }
    .link-quiet:hover { text-decoration: underline; }

    /* ESTADO OPERATIVO */
    .score-list { display: flex; flex-direction: column; gap: 0.85rem; }
    .score-row {
      display: grid; grid-template-columns: 1.2fr 1fr auto; gap: 0.75rem; align-items: center;
      padding: 0.5rem 0; border-bottom: 1px solid #f8fafc;
    }
    .score-meta strong { display: block; font-size: 0.9rem; color: #1e293b; }
    .score-meta span { font-size: 0.75rem; color: #64748b; }
    .score-bar-wrap { height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
    .score-bar { height: 100%; border-radius: 999px; background: #22c55e; transition: width 0.4s; }
    .score-bar[data-level='mid'] { background: #f59e0b; }
    .score-bar[data-level='low'] { background: #ef4444; }
    .score-pct { font-size: 0.95rem; font-weight: 900; color: #166534; min-width: 42px; text-align: right; }
    .score-pct[data-level='mid'] { color: #b45309; }
    .score-pct[data-level='low'] { color: #dc2626; }
    .score-na { font-size: 0.78rem; color: #94a3b8; }

    /* ALERTAS */
    .empty-box {
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.75rem;
      padding: 1.25rem; text-align: center; color: #166534; font-size: 0.88rem;
    }
    .ok-icon { font-size: 1.5rem; display: block; margin-bottom: 0.25rem; }
    .alert-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .alert-item {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0.9rem;
      border-radius: 0.75rem; border: 1px solid #e2e8f0; background: #f8fafc;
      text-decoration: none; color: inherit; transition: all 0.2s;
    }
    .alert-item:hover { background: #f0f9ff; border-color: #bae6fd; transform: translateX(2px); }
    .alert-content { flex: 1; }
    .alert-content strong { display: block; font-size: 0.88rem; color: #0f172a; }
    .alert-content p { margin: 0.15rem 0 0; font-size: 0.78rem; color: #64748b; }
    .badge {
      font-size: 0.68rem; font-weight: 800; text-transform: uppercase; padding: 0.2rem 0.55rem;
      border-radius: 6px; background: #e2e8f0; color: #334155;
    }
    .alert-item[data-tone='critical'] .badge { background: #fee2e2; color: #991b1b; }
    .alert-item[data-tone='warning'] .badge { background: #fef3c7; color: #92400e; }
    .alert-item[data-tone='info'] .badge { background: #f0f9ff; color: #075985; }

    /* MÓDULOS DE GESTIÓN */
    .modules-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.1rem;
    }
    .mini-stats {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem; margin-bottom: 0.85rem;
    }
    .stat-pill {
      padding: 0.65rem 0.85rem; border-radius: 0.65rem; background: #f8fafc;
      border: 1px solid #f1f5f9; display: flex; flex-direction: column;
    }
    .stat-pill span { font-size: 0.7rem; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .stat-pill strong { font-size: 1.25rem; font-weight: 900; color: #0f172a; }
    .highlight-stat { background: #f0f9ff; border-color: #bae6fd; }
    .highlight-stat strong { color: #0369a1; }

    .chart-box { background: #f8fafc; border-radius: 0.75rem; border: 1px solid #f1f5f9; padding: 0.5rem; }
    .chart { width: 100%; height: 90px; }
    .chart-caption { font-size: 0.75rem; color: #94a3b8; margin: 0.4rem 0 0; text-align: center; }

    .stack-bars { display: flex; flex-direction: column; gap: 0.45rem; margin-top: 0.5rem; }
    .stack-row { display: grid; grid-template-columns: 1.2fr 1fr auto; gap: 0.5rem; align-items: center; font-size: 0.78rem; }
    .stack-track { height: 8px; border-radius: 999px; background: #f1f5f9; overflow: hidden; }
    .stack-fill { height: 100%; border-radius: 999px; }
    .stack-fill.ok { background: #22c55e; }
    .stack-fill.warn { background: #f59e0b; }

    .coverage { margin-bottom: 0.85rem; }
    .coverage-meta { display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.85rem; font-weight: 700; color: #334155; }
    .coverage-track { height: 10px; border-radius: 999px; background: #f1f5f9; overflow: hidden; }
    .coverage-fill { height: 100%; background: linear-gradient(90deg, #0369a1, #0d9488); border-radius: 999px; }

    .prio-box {
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 0.65rem;
      padding: 0.65rem 0.85rem; display: flex; flex-direction: column; gap: 0.2rem;
    }
    .prio-badge { font-weight: 800; font-size: 0.82rem; color: #92400e; }
    .prio-box small { color: #b45309; font-size: 0.75rem; }

    /* TIMELINE */
    .timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .timeline li {
      display: flex; gap: 1rem; padding: 0.65rem 0; border-bottom: 1px solid #f1f5f9; align-items: center;
    }
    .timeline .time {
      min-width: 90px; font-size: 0.78rem; font-weight: 700; color: #64748b; font-family: monospace;
    }
    .timeline-body { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
    .timeline-body strong { font-size: 0.88rem; color: #0f172a; }

    .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .skeleton {
      height: 130px; border-radius: 1rem; background: #e2e8f0;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.3; } }
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
  readonly operaciones = computed(() => this.data()?.modules?.['operaciones'] as any);
  readonly documental = computed(() => this.data()?.modules?.['documental'] as any);

  readonly postsTotal = computed(() => {
    const ops = this.operaciones()?.kpis?.total;
    const cat = this.programacion()?.catalog?.total;
    return ops ?? cat ?? 0;
  });

  readonly postsActive = computed(() => {
    const ops = this.operaciones()?.kpis?.active;
    const cat = this.programacion()?.catalog?.active;
    return ops ?? cat ?? 0;
  });

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
    if (tone === 'warning') return 'Alerta';
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
    const h = 90;
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
