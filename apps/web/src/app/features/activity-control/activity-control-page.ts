import { DatePipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  LucideActivity,
  LucideAlertTriangle,
  LucideCheckCircle2,
  LucideClock3,
  LucideRefreshCw,
  LucideUsers,
} from '@lucide/angular';
import { environment } from '../../../environments/environment';
import { Icon } from '../../shared/components/icon/icon';

export type ActivityDays = 1 | 7 | 30;

export interface ActivityArea {
  key: string;
  label: string;
  accent: string;
  usedToday: boolean;
  status: 'active' | 'idle';
  statusLabel: string;
  eventCountToday: number;
  eventCountPeriod: number;
  uniqueUsersToday: number;
  lastAt: string | null;
  actors: { name: string; count: number; lastAt: string }[];
  recent: {
    id: string;
    at: string;
    action: string;
    label: string;
    userName: string | null;
    detail: string | null;
  }[];
}

export interface ActivityControlPayload {
  generatedAt: string;
  days: number;
  since: string;
  summary: {
    areasTotal: number;
    areasActiveToday: number;
    areasIdleToday: number;
    eventsToday: number;
  };
  areas: ActivityArea[];
}

@Component({
  selector: 'app-activity-control',
  imports: [DatePipe, Icon],
  template: `
    <div class="ac-page">
      <header class="ac-hero">
        <div class="ac-hero__glow" aria-hidden="true"></div>
        <div class="ac-hero__row">
          <div>
            <p class="ac-eyebrow">Monitoreo operativo</p>
            <h1>Control de Actividades</h1>
            <p class="ac-lead">
              Valida que cada área esté usando el portal. Vista por zona, sin submódulos.
            </p>
          </div>
          <div class="ac-hero__actions">
            <div class="ac-seg" role="group" aria-label="Periodo">
              @for (p of periods; track p.days) {
                <button
                  type="button"
                  class="ac-seg__btn"
                  [class.is-on]="days() === p.days"
                  (click)="setDays(p.days)"
                >
                  {{ p.label }}
                </button>
              }
            </div>
            <button type="button" class="ac-refresh" (click)="reload()" [disabled]="loading()">
              <app-icon [icon]="icons.RefreshCw" [size]="18" />
              Actualizar
            </button>
          </div>
        </div>

        @if (data(); as d) {
          <div class="ac-summary">
            <article class="ac-sum-card ac-sum-card--ok">
              <span>Áreas activas hoy</span>
              <strong>{{ d.summary.areasActiveToday }}/{{ d.summary.areasTotal }}</strong>
            </article>
            <article class="ac-sum-card ac-sum-card--warn">
              <span>Sin actividad hoy</span>
              <strong>{{ d.summary.areasIdleToday }}</strong>
            </article>
            <article class="ac-sum-card">
              <span>Eventos hoy</span>
              <strong>{{ d.summary.eventsToday }}</strong>
            </article>
            <article class="ac-sum-card ac-sum-card--muted">
              <span>Actualizado</span>
              <strong class="ac-sum-card__time">{{ d.generatedAt | date: 'HH:mm:ss' }}</strong>
            </article>
          </div>
        }
      </header>

      @if (loading()) {
        <div class="ac-grid">
          @for (i of skeleton; track i) {
            <div class="ac-skel"></div>
          }
        </div>
      } @else if (error()) {
        <div class="ac-error" role="alert">{{ error() }}</div>
      } @else if (data(); as d) {
        <div class="ac-filter">
          <button type="button" class="ac-chip" [class.is-on]="filter() === 'all'" (click)="filter.set('all')">
            Todas ({{ d.areas.length }})
          </button>
          <button type="button" class="ac-chip ac-chip--ok" [class.is-on]="filter() === 'active'" (click)="filter.set('active')">
            Activas ({{ d.summary.areasActiveToday }})
          </button>
          <button type="button" class="ac-chip ac-chip--idle" [class.is-on]="filter() === 'idle'" (click)="filter.set('idle')">
            Inactivas ({{ d.summary.areasIdleToday }})
          </button>
        </div>

        <div class="ac-grid">
          @for (area of visibleAreas(); track area.key; let i = $index) {
            <article
              class="ac-card"
              [class.is-active]="area.usedToday"
              [class.is-idle]="!area.usedToday"
              [style.--ac-accent]="area.accent"
              [style.animation-delay.ms]="i * 45"
            >
              <header class="ac-card__head">
                <div class="ac-card__title">
                  <span class="ac-dot" aria-hidden="true"></span>
                  <h2>{{ area.label }}</h2>
                </div>
                <span class="ac-badge" [class.ac-badge--ok]="area.usedToday" [class.ac-badge--idle]="!area.usedToday">
                  @if (area.usedToday) {
                    <app-icon [icon]="icons.Check" [size]="14" />
                  } @else {
                    <app-icon [icon]="icons.Alert" [size]="14" />
                  }
                  {{ area.statusLabel }}
                </span>
              </header>

              <div class="ac-kpis">
                <div>
                  <span>Hoy</span>
                  <b>{{ area.eventCountToday }}</b>
                </div>
                <div>
                  <span>Personas</span>
                  <b>{{ area.uniqueUsersToday }}</b>
                </div>
                <div>
                  <span>Periodo</span>
                  <b>{{ area.eventCountPeriod }}</b>
                </div>
              </div>

              @if (area.actors.length) {
                <div class="ac-actors">
                  <div class="ac-section-label">
                    <app-icon [icon]="icons.Users" [size]="14" />
                    Quién usó el área
                  </div>
                  <ul>
                    @for (a of area.actors; track a.name + a.lastAt) {
                      <li>
                        <span class="ac-actor-name">{{ a.name }}</span>
                        <span class="ac-actor-meta">{{ a.count }} · {{ a.lastAt | date: 'HH:mm' }}</span>
                      </li>
                    }
                  </ul>
                </div>
              } @else {
                <p class="ac-empty-actors">Nadie ha registrado movimientos en este periodo.</p>
              }

              <div class="ac-feed">
                <div class="ac-section-label">
                  <app-icon [icon]="icons.Clock" [size]="14" />
                  Historial reciente
                </div>
                @if (area.recent.length === 0) {
                  <p class="ac-empty-actors">Sin eventos.</p>
                } @else {
                  <ul class="ac-timeline">
                    @for (ev of area.recent; track ev.id) {
                      <li>
                        <time>{{ ev.at | date: 'dd/MM HH:mm' }}</time>
                        <div>
                          <strong>{{ ev.label }}</strong>
                          @if (ev.detail) {
                            <span class="ac-detail">{{ ev.detail }}</span>
                          }
                          @if (ev.userName) {
                            <span class="ac-who">Por {{ ev.userName }}</span>
                          }
                        </div>
                      </li>
                    }
                  </ul>
                }
              </div>

              @if (area.lastAt) {
                <footer class="ac-card__foot">
                  Último movimiento: {{ area.lastAt | date: 'dd/MM/yyyy HH:mm' }}
                </footer>
              }
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .ac-page {
      --ac-ink: #0f172a;
      --ac-muted: #64748b;
      --ac-line: rgba(148, 163, 184, 0.35);
      --ac-ok: #16a34a;
      --ac-idle: #d97706;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding-bottom: 2rem;
    }

    .ac-hero {
      position: relative;
      overflow: hidden;
      border-radius: 1.25rem;
      padding: 1.35rem 1.4rem 1.2rem;
      color: #f8fafc;
      background:
        radial-gradient(900px 280px at 12% -20%, rgba(34, 197, 94, 0.22), transparent 55%),
        radial-gradient(700px 240px at 90% 0%, rgba(59, 130, 246, 0.28), transparent 50%),
        linear-gradient(145deg, #0f172a 0%, #1e293b 55%, #0c4a6e 100%);
      box-shadow: 0 18px 40px -24px rgba(15, 23, 42, 0.65);
    }
    .ac-hero__glow {
      position: absolute;
      inset: auto -10% -40% auto;
      width: 280px;
      height: 280px;
      border-radius: 50%;
      background: rgba(34, 197, 94, 0.15);
      filter: blur(40px);
      pointer-events: none;
    }
    .ac-hero__row {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: space-between;
      align-items: flex-start;
    }
    .ac-eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .ac-hero h1 {
      margin: 0;
      font-family: var(--font-display, inherit);
      font-size: clamp(1.45rem, 2.4vw, 1.9rem);
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .ac-lead {
      margin: 0.45rem 0 0;
      max-width: 38rem;
      color: #cbd5e1;
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .ac-hero__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      align-items: center;
    }
    .ac-seg {
      display: inline-flex;
      padding: 0.2rem;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .ac-seg__btn {
      border: 0;
      background: transparent;
      color: #cbd5e1;
      padding: 0.45rem 0.85rem;
      border-radius: 999px;
      font: inherit;
      font-size: 0.82rem;
      cursor: pointer;
      min-height: 40px;
      transition: background 0.2s ease, color 0.2s ease;
    }
    .ac-seg__btn.is-on {
      background: rgba(248, 250, 252, 0.95);
      color: #0f172a;
      font-weight: 600;
    }
    .ac-refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.08);
      color: #f8fafc;
      border-radius: 999px;
      padding: 0.45rem 0.95rem;
      font: inherit;
      font-size: 0.82rem;
      cursor: pointer;
      min-height: 40px;
      backdrop-filter: blur(10px);
      transition: background 0.2s ease;
    }
    .ac-refresh:hover:not(:disabled) { background: rgba(255, 255, 255, 0.16); }
    .ac-refresh:disabled { opacity: 0.55; cursor: not-allowed; }

    .ac-summary {
      position: relative;
      margin-top: 1.15rem;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.65rem;
    }
    .ac-sum-card {
      border-radius: 0.9rem;
      padding: 0.75rem 0.9rem;
      background: rgba(15, 23, 42, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .ac-sum-card span { font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
    .ac-sum-card strong { font-size: 1.35rem; font-weight: 700; }
    .ac-sum-card__time { font-size: 1.05rem !important; font-variant-numeric: tabular-nums; }
    .ac-sum-card--ok strong { color: #4ade80; }
    .ac-sum-card--warn strong { color: #fbbf24; }
    .ac-sum-card--muted strong { color: #e2e8f0; }

    .ac-filter { display: flex; flex-wrap: wrap; gap: 0.45rem; }
    .ac-chip {
      border: 1px solid var(--ac-line);
      background: #fff;
      color: var(--ac-ink);
      border-radius: 999px;
      padding: 0.4rem 0.85rem;
      font: inherit;
      font-size: 0.82rem;
      cursor: pointer;
      min-height: 40px;
      transition: border-color 0.2s ease, background 0.2s ease;
    }
    .ac-chip.is-on { border-color: #0f172a; background: #0f172a; color: #fff; }
    .ac-chip--ok.is-on { background: #14532d; border-color: #14532d; }
    .ac-chip--idle.is-on { background: #92400e; border-color: #92400e; }

    .ac-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .ac-card {
      --ac-accent: #3b82f6;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      border-radius: 1.1rem;
      padding: 1rem 1.05rem 0.85rem;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.92), #fff),
        #fff;
      border: 1px solid var(--ac-line);
      box-shadow: 0 10px 28px -22px rgba(15, 23, 42, 0.45);
      position: relative;
      overflow: hidden;
      animation: ac-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .ac-card::before {
      content: '';
      position: absolute;
      inset: 0 0 auto 0;
      height: 3px;
      background: var(--ac-accent);
    }
    .ac-card.is-idle { opacity: 0.92; }
    .ac-card.is-active {
      box-shadow:
        0 12px 30px -20px rgba(15, 23, 42, 0.5),
        0 0 0 1px color-mix(in srgb, var(--ac-accent) 22%, transparent);
    }

    .ac-card__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.6rem;
    }
    .ac-card__title {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-width: 0;
    }
    .ac-card__title h2 {
      margin: 0;
      font-size: 1.02rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--ac-ink);
    }
    .ac-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--ac-accent);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--ac-accent) 22%, transparent);
      flex-shrink: 0;
    }
    .ac-card.is-active .ac-dot {
      animation: ac-pulse 1.8s ease-out infinite;
    }

    .ac-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      border-radius: 999px;
      padding: 0.28rem 0.55rem;
      font-size: 0.72rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .ac-badge--ok { background: #dcfce7; color: #166534; }
    .ac-badge--idle { background: #ffedd5; color: #9a3412; }

    .ac-kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.45rem;
    }
    .ac-kpis > div {
      border-radius: 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.5rem 0.55rem;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .ac-kpis span { font-size: 0.68rem; color: var(--ac-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .ac-kpis b { font-size: 1.15rem; color: var(--ac-ink); font-variant-numeric: tabular-nums; }

    .ac-section-label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--ac-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.4rem;
    }

    .ac-actors ul, .ac-timeline {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .ac-actors li {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.4rem 0.5rem;
      border-radius: 0.55rem;
      background: color-mix(in srgb, var(--ac-accent) 8%, #fff);
    }
    .ac-actor-name { font-size: 0.84rem; font-weight: 600; color: var(--ac-ink); }
    .ac-actor-meta { font-size: 0.75rem; color: var(--ac-muted); font-variant-numeric: tabular-nums; }

    .ac-timeline li {
      display: grid;
      grid-template-columns: 72px 1fr;
      gap: 0.45rem;
      padding: 0.35rem 0;
      border-bottom: 1px dashed #e2e8f0;
    }
    .ac-timeline li:last-child { border-bottom: 0; }
    .ac-timeline time {
      font-size: 0.72rem;
      color: var(--ac-muted);
      font-variant-numeric: tabular-nums;
      padding-top: 0.15rem;
    }
    .ac-timeline strong { display: block; font-size: 0.84rem; color: var(--ac-ink); }
    .ac-detail, .ac-who {
      display: block;
      font-size: 0.75rem;
      color: var(--ac-muted);
      line-height: 1.35;
    }
    .ac-who { color: #334155; font-weight: 500; }

    .ac-empty-actors {
      margin: 0;
      font-size: 0.82rem;
      color: var(--ac-muted);
    }
    .ac-card__foot {
      margin-top: auto;
      padding-top: 0.35rem;
      border-top: 1px solid #f1f5f9;
      font-size: 0.72rem;
      color: var(--ac-muted);
    }

    .ac-skel {
      min-height: 280px;
      border-radius: 1.1rem;
      background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9);
      background-size: 200% 100%;
      animation: ac-shimmer 1.2s linear infinite;
    }
    .ac-error {
      padding: 1rem;
      border-radius: 0.85rem;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    @keyframes ac-in {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: none; }
    }
    @keyframes ac-pulse {
      0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ac-accent) 45%, transparent); }
      70% { box-shadow: 0 0 0 10px transparent; }
      100% { box-shadow: 0 0 0 0 transparent; }
    }
    @keyframes ac-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (max-width: 900px) {
      .ac-summary { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 560px) {
      .ac-summary { grid-template-columns: 1fr; }
      .ac-timeline li { grid-template-columns: 1fr; gap: 0.15rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ac-card, .ac-skel, .ac-card.is-active .ac-dot { animation: none; }
    }
  `,
})
export class ActivityControlPage implements OnInit {
  private readonly http = inject(HttpClient);

  readonly icons = {
    Activity: LucideActivity,
    Alert: LucideAlertTriangle,
    Check: LucideCheckCircle2,
    Clock: LucideClock3,
    RefreshCw: LucideRefreshCw,
    Users: LucideUsers,
  };

  readonly periods: { days: ActivityDays; label: string }[] = [
    { days: 1, label: 'Hoy' },
    { days: 7, label: '7 días' },
    { days: 30, label: '30 días' },
  ];

  readonly skeleton = [1, 2, 3, 4, 5, 6];
  readonly days = signal<ActivityDays>(1);
  readonly filter = signal<'all' | 'active' | 'idle'>('all');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<ActivityControlPayload | null>(null);

  readonly visibleAreas = computed(() => {
    const areas = this.data()?.areas ?? [];
    const f = this.filter();
    if (f === 'active') return areas.filter((a) => a.usedToday);
    if (f === 'idle') return areas.filter((a) => !a.usedToday);
    return areas;
  });

  ngOnInit(): void {
    this.reload();
  }

  setDays(days: ActivityDays): void {
    if (this.days() === days) return;
    this.days.set(days);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const params = new HttpParams().set('days', String(this.days()));
    this.http
      .get<ActivityControlPayload>(`${environment.apiUrl}/dashboard/activity-control`, { params })
      .subscribe({
        next: (payload) => {
          this.data.set(payload);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'No se pudo cargar el control de actividades.');
        },
      });
  }
}
