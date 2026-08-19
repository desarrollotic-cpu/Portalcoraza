import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VigiaApiService } from '../vigia-api.service';
import { VigiaAuthService } from '../vigia-auth.service';

type Screen = 'home' | 'turnero' | 'consignas' | 'sos' | 'dotacion' | 'nomina';
type TurneroDay = { dia: number; fecha: string; estado: string; horario: string | null };

@Component({
  selector: 'app-vigia-home',
  imports: [FormsModule],
  template: `
    <div class="app">
      <header class="bar">
        <div class="avatar">{{ inicial() }}</div>
        <div class="who">
          <strong>{{ session()?.empleado?.nombre_completo }}</strong>
          <span>{{ session()?.puesto_nombre }}</span>
        </div>
        <div class="clock-badge">
          <span class="clock">{{ clock() }}</span>
        </div>
        <button type="button" class="logout" (click)="askLogout()">Salir</button>
      </header>

      @if (screen() === 'home') {
        <main class="grid">
          <button type="button" class="tile" (click)="go('turnero')">
            <span class="icon">🗓️</span>
            <span class="label">Mi Turnero</span>
          </button>
          <button type="button" class="tile" (click)="go('consignas')">
            <span class="icon">📋</span>
            <span class="label">Consignas</span>
          </button>
          <button type="button" class="tile danger" (click)="go('sos')">
            <span class="icon">🚨</span>
            <span class="label">Seguridad / SOS</span>
          </button>
          <button type="button" class="tile" (click)="go('dotacion')">
            <span class="icon">👔</span>
            <span class="label">Mi Dotación</span>
          </button>
          <button type="button" class="tile span-full" (click)="go('nomina')">
            <span class="icon">💰</span>
            <span class="label">Mis Colillas de Pago</span>
          </button>
        </main>
      } @else {
        <main class="panel">
          <button type="button" class="back" (click)="go('home')">← Volver al Inicio</button>

          @if (screen() === 'turnero') {
            <h2>Mi Turnero</h2>
            <div class="cal">
              @for (d of turneroDays(); track d.fecha) {
                <button type="button" class="day" [attr.data-st]="d.estado" (click)="selectDay(d)">
                  <strong>{{ d.dia }}</strong>
                  <small>{{ d.estado }}</small>
                </button>
              }
            </div>
            @if (dayDetail(); as det) {
              <div class="card">
                <p><strong>{{ det.estado }}</strong> · {{ det.fecha }}</p>
                <p>{{ det.horario || 'Sin jornada' }}</p>
                <p>{{ session()?.puesto_nombre }}</p>
                <a class="link" [href]="mapsUrl()" target="_blank" rel="noopener">Cómo llegar</a>
              </div>
            }
            <button type="button" class="btn danger" (click)="openCierre()">Cerrar y entregar turno</button>
          }

          @if (screen() === 'consignas') {
            <h2>Consignas del Puesto</h2>
            <div class="tabs">
              <button type="button" [class.on]="consignaTab()==='CONTACTS'" (click)="consignaTab.set('CONTACTS')">Directorio</button>
              <button type="button" [class.on]="consignaTab()==='RULES'" (click)="consignaTab.set('RULES')">Reglas</button>
            </div>
            @for (c of consignasFiltered(); track $index) {
              <div class="card">
                <strong>{{ c['titulo'] }}</strong>
                <p>{{ c['detalle'] }}</p>
                @if (c['telefono']) {
                  <a class="link" [href]="'tel:' + c['telefono']">{{ c['telefono'] }}</a>
                }
              </div>
            } @empty {
              <p class="muted">Sin consignas para este puesto.</p>
            }
          }

          @if (screen() === 'sos') {
            <h2>Seguridad / Botón SOS</h2>
            <button type="button" class="sos" (click)="sendSos()">SOS</button>
            <p class="muted center">Alerta silenciosa al centro de control</p>
            <label class="check">
              <input type="checkbox" [checked]="alertaVida()" (change)="toggleAlerta($event)" />
              Alerta de vida (confirmar cada 2 min)
            </label>
            @if (msg()) {
              <p class="ok">{{ msg() }}</p>
            }
          }

          @if (screen() === 'dotacion') {
            <h2>Mi Dotación y Equipos</h2>
            @for (it of dotacion(); track it.nombre) {
              <div class="card row">
                <div>
                  <strong>{{ it.nombre }}</strong>
                  <div class="muted">{{ it.estado }}</div>
                </div>
                <button type="button" class="mini" (click)="openSolicitud(it.nombre)">Solicitar cambio</button>
              </div>
            }
            <button type="button" class="btn" (click)="firmarOpen.set(true)">Firmar recibido de equipo</button>
          }

          @if (screen() === 'nomina') {
            <h2>Mis Colillas de Pago</h2>
            @for (n of nomina(); track $index) {
              <div class="card">
                <strong>{{ n['periodo'] }}</strong>
                <p class="muted">
                  Ord {{ n['horasOrdinarias'] }} · Extra {{ n['horasExtra'] }} · Noc
                  {{ n['recargoNocturno'] }} · Fest {{ n['recargoFestivo'] }}
                </p>
                <p><strong>Neto: $ {{ n['neto'] }}</strong></p>
                @if (n['pdfUrl']) {
                  <a class="link" [href]="'' + n['pdfUrl']" target="_blank" rel="noopener">Ver / descargar PDF</a>
                }
                <button type="button" class="mini" (click)="openReclamo('' + n['periodo'])">Reclamar</button>
              </div>
            } @empty {
              <p class="muted">Sin colillas registradas.</p>
            }
          }
        </main>
      }

      @if (cierreOpen()) {
        <div class="modal">
          <div class="modal-card">
            <h3>Cerrar turno</h3>
            <label>Nombre del relevo<input [(ngModel)]="relevoNombre" name="relevo" /></label>
            <label>Foto del puesto (opcional)<input type="file" accept="image/*" (change)="onRelevoFoto($event)" /></label>
            <button type="button" class="btn" (click)="cerrarTurno()">Confirmar entrega</button>
            <button type="button" class="mini" (click)="cierreOpen.set(false)">Cancelar</button>
          </div>
        </div>
      }

      @if (alertaOpen()) {
        <div class="modal">
          <div class="modal-card">
            <h3>¿Estás bien?</h3>
            <p class="big">{{ alertaSecs() }}s</p>
            <button type="button" class="btn" (click)="estoyBien()">Estoy bien</button>
          </div>
        </div>
      }

      @if (solicitudOpen()) {
        <div class="modal">
          <div class="modal-card">
            <h3>Solicitar cambio</h3>
            <p class="muted">{{ solicitudItem }}</p>
            <label>Motivo<textarea [(ngModel)]="solicitudMotivo" name="mot" rows="3"></textarea></label>
            <label>Foto del daño<input type="file" accept="image/*" (change)="onFoto($event)" /></label>
            <button type="button" class="btn" [disabled]="!solicitudFoto" (click)="enviarSolicitud()">Enviar</button>
            <button type="button" class="mini" (click)="solicitudOpen.set(false)">Cancelar</button>
          </div>
        </div>
      }

      @if (firmarOpen()) {
        <div class="modal">
          <div class="modal-card">
            <h3>Firmar recibido</h3>
            <label>Ítems recibidos<textarea [(ngModel)]="firmaItems" name="fi" rows="3"></textarea></label>
            <canvas #cv width="280" height="120" class="sign" (mousedown)="startSign($event)" (mousemove)="moveSign($event)" (mouseup)="endSign()" (touchstart)="startSign($event)" (touchmove)="moveSign($event)" (touchend)="endSign()"></canvas>
            <button type="button" class="btn" (click)="firmar(cv)">Confirmar firma</button>
            <button type="button" class="mini" (click)="firmarOpen.set(false)">Cancelar</button>
          </div>
        </div>
      }

      @if (reclamoOpen()) {
        <div class="modal">
          <div class="modal-card">
            <h3>Reclamar nómina</h3>
            <p>{{ reclamoPeriodo }}</p>
            <label>
              Motivo
              <select [(ngModel)]="reclamoMotivo" name="rm">
                <option value="HORAS_EXTRA">Horas extra</option>
                <option value="RECARGO">Recargo nocturno / festivo</option>
                <option value="DESCUENTO">Descuento no autorizado</option>
                <option value="OTRO">Otro</option>
              </select>
            </label>
            <label>Detalle<textarea [(ngModel)]="reclamoDetalle" name="rd" rows="3"></textarea></label>
            <button type="button" class="btn" (click)="enviarReclamo()">Enviar</button>
            <button type="button" class="mini" (click)="reclamoOpen.set(false)">Cancelar</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 45%, #2563eb 100%);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
    }
    .app {
      max-width: 580px;
      margin: 0 auto;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      padding: 0.75rem 1rem 2rem;
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(16px);
      border-radius: 1.25rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.5);
      position: sticky;
      top: 0.75rem;
      z-index: 10;
    }
    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
      color: #ffffff;
      display: grid;
      place-items: center;
      font-weight: 800;
      font-size: 1.15rem;
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
    }
    .who {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .who strong {
      font-size: 0.95rem;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .who span {
      font-size: 0.8rem;
      color: #64748b;
      font-weight: 500;
    }
    .clock-badge {
      background: #f1f5f9;
      padding: 0.4rem 0.65rem;
      border-radius: 0.6rem;
      border: 1px solid #e2e8f0;
    }
    .clock {
      font-variant-numeric: tabular-nums;
      font-weight: 800;
      color: #1d4ed8;
      font-size: 0.88rem;
    }
    .logout {
      border: 0;
      background: #fef2f2;
      color: #dc2626;
      font-weight: 700;
      font-size: 0.82rem;
      padding: 0.5rem 0.8rem;
      border-radius: 0.65rem;
      cursor: pointer;
      border: 1px solid #fecaca;
      transition: all 0.15s ease;
    }
    .logout:hover {
      background: #fee2e2;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      padding: 1.25rem 0;
    }
    .tile {
      border: 0;
      border-radius: 1.25rem;
      padding: 1.75rem 1.25rem;
      background: #ffffff;
      color: #0f172a;
      font-weight: 800;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      text-align: center;
      box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.25), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      border: 1px solid rgba(255, 255, 255, 0.6);
    }
    .tile:hover {
      transform: translateY(-3px);
      box-shadow: 0 16px 32px -8px rgba(37, 99, 235, 0.35);
    }
    .tile:active {
      transform: translateY(0);
    }
    .tile .icon {
      font-size: 2.5rem;
      line-height: 1;
    }
    .tile .label {
      font-size: 1.05rem;
      letter-spacing: -0.01em;
    }
    .tile.danger {
      background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
      border: 2px solid #ef4444;
      color: #991b1b;
    }
    .tile.span-full {
      grid-column: span 2;
      flex-direction: row;
      gap: 1rem;
      padding: 1.5rem;
    }
    .tile.span-full .icon {
      font-size: 2.2rem;
      margin: 0;
    }
    .panel {
      padding: 1.25rem 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .back {
      align-self: flex-start;
      border: 0;
      background: rgba(255, 255, 255, 0.95);
      color: #1d4ed8;
      font-weight: 700;
      font-size: 0.9rem;
      padding: 0.55rem 1rem;
      border-radius: 0.75rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    h2 {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 800;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .cal {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.4rem;
    }
    .day {
      border: 0;
      border-radius: 0.6rem;
      padding: 0.5rem 0.2rem;
      background: #ffffff;
      color: #0f172a;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }
    .day small {
      display: block;
      font-size: 0.6rem;
      color: #64748b;
    }
    .day[data-st='NOCHE'] {
      outline: 2px solid #2563eb;
    }
    .day[data-st='FESTIVO'] {
      color: #ef4444;
    }
    .card {
      background: #ffffff;
      border-radius: 1rem;
      padding: 1.25rem;
      box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.15);
    }
    .card p {
      margin: 0.35rem 0;
      font-size: 0.95rem;
    }
    .card.row {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      align-items: center;
    }
    .muted {
      color: #ffffff;
      opacity: 0.9;
      font-size: 0.9rem;
    }
    .card .muted {
      color: #64748b;
      opacity: 1;
    }
    .center {
      text-align: center;
    }
    .link {
      color: #2563eb;
      font-weight: 700;
      text-decoration: none;
    }
    .link:hover {
      text-decoration: underline;
    }
    .btn {
      border: 0;
      border-radius: 0.75rem;
      padding: 0.95rem 1.25rem;
      background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
      color: #ffffff;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      transition: transform 0.1s ease;
    }
    .btn:active {
      transform: translateY(1px);
    }
    .btn.danger {
      background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
      box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35);
    }
    .mini {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #1d4ed8;
      font-size: 0.85rem;
      font-weight: 700;
      border-radius: 0.55rem;
      padding: 0.45rem 0.75rem;
      cursor: pointer;
    }
    .sos {
      width: 170px;
      height: 170px;
      border-radius: 50%;
      border: 0;
      margin: 1.5rem auto;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
      color: #ffffff;
      font-size: 2.2rem;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 0 0 14px rgba(239, 68, 68, 0.3), 0 10px 25px rgba(220, 38, 38, 0.5);
    }
    .tabs {
      display: flex;
      gap: 0.5rem;
    }
    .tabs button {
      flex: 1;
      border: 1px solid rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      border-radius: 999px;
      padding: 0.6rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(8px);
    }
    .tabs button.on {
      background: #ffffff;
      color: #1d4ed8;
      border-color: transparent;
      font-weight: 800;
    }
    .check {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 600;
    }
    .ok {
      color: #34d399;
      font-weight: 700;
    }
    .modal {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      display: grid;
      place-items: center;
      padding: 1rem;
      z-index: 20;
    }
    .modal-card {
      width: min(100%, 400px);
      background: #ffffff;
      border-radius: 1.25rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .modal-card h3 {
      margin: 0;
      color: #0f172a;
      font-size: 1.2rem;
      font-weight: 800;
    }
    .modal-card label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }
    input, textarea, select {
      font: inherit;
      color: #0f172a;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.6rem;
      padding: 0.65rem 0.85rem;
    }
    .big {
      font-size: 2.2rem;
      text-align: center;
      color: #1d4ed8;
      font-weight: 900;
      margin: 0;
    }
    .sign {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.6rem;
      touch-action: none;
      width: 100%;
    }
  `,
})
export class VigiaHome implements OnInit, OnDestroy {
  private readonly auth = inject(VigiaAuthService);
  private readonly api = inject(VigiaApiService);

  readonly session = this.auth.session;
  readonly screen = signal<Screen>('home');
  readonly clock = signal('00:00:00');
  readonly msg = signal('');
  readonly turneroDays = signal<TurneroDay[]>([]);
  readonly dayDetail = signal<{ fecha: string; estado: string; horario: string | null } | null>(null);
  readonly consignas = signal<Record<string, unknown>[]>([]);
  readonly consignaTab = signal<'CONTACTS' | 'RULES'>('CONTACTS');
  readonly dotacion = signal<Array<{ nombre: string; estado: string }>>([]);
  readonly nomina = signal<Record<string, unknown>[]>([]);
  readonly alertaVida = signal(false);
  readonly alertaOpen = signal(false);
  readonly alertaSecs = signal(120);
  readonly cierreOpen = signal(false);
  readonly solicitudOpen = signal(false);
  readonly firmarOpen = signal(false);
  readonly reclamoOpen = signal(false);

  relevoNombre = '';
  relevoFoto = '';
  solicitudItem = '';
  solicitudMotivo = '';
  solicitudFoto = '';
  firmaItems = '';
  reclamoPeriodo = '';
  reclamoMotivo = 'HORAS_EXTRA';
  reclamoDetalle = '';

  private tick?: ReturnType<typeof setInterval>;
  private vidaTick?: ReturnType<typeof setInterval>;
  private drawing = false;

  readonly inicial = computed(() => (this.session()?.empleado?.primer_nombre || '?').slice(0, 1).toUpperCase());
  readonly consignasFiltered = computed(() =>
    this.consignas().filter((c) => c['tipo'] === this.consignaTab()),
  );

  ngOnInit(): void {
    this.tick = setInterval(() => this.refreshClock(), 1000);
    this.refreshClock();
  }

  ngOnDestroy(): void {
    if (this.tick) clearInterval(this.tick);
    if (this.vidaTick) clearInterval(this.vidaTick);
  }

  go(s: Screen): void {
    this.screen.set(s);
    this.msg.set('');
    if (s === 'turnero') this.loadTurnero();
    if (s === 'consignas') this.loadConsignas();
    if (s === 'dotacion') this.loadDotacion();
    if (s === 'nomina') this.loadNomina();
  }

  mapsUrl(): string {
    const q = encodeURIComponent(this.session()?.puesto_nombre || 'Coraza');
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  selectDay(d: { fecha: string; estado: string; horario: string | null }): void {
    this.dayDetail.set(d);
  }

  openCierre(): void {
    this.relevoNombre = '';
    this.relevoFoto = '';
    this.cierreOpen.set(true);
  }

  onRelevoFoto(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.relevoFoto = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.readAsDataURL(file);
  }

  cerrarTurno(): void {
    const tId = this.auth.turnoId();
    if (!tId || tId === 'local-turno') {
      this.auth.logout();
      return;
    }
    this.api
      .cerrarTurno(this.relevoNombre, this.relevoFoto || undefined)
      .subscribe(() => this.auth.logout());
  }

  askLogout(): void {
    if (confirm('¿Cerrar sesión en este dispositivo?')) {
      this.auth.logout();
    }
  }

  sendSos(): void {
    const tId = this.auth.turnoId();
    const pId = this.session()?.puesto_id || 'PUE-01';
    if (!tId || tId === 'local-turno') {
      this.msg.set('Alerta SOS simulada (modo offline)');
      return;
    }
    this.api.sos({ turno_id: tId, puesto_id: pId }).subscribe(() => {
      this.msg.set('Alerta SOS enviada al centro de control');
    });
  }

  toggleAlerta(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this.alertaVida.set(checked);
    if (checked) {
      this.startAlertaCycle();
    } else {
      if (this.vidaTick) clearInterval(this.vidaTick);
      this.alertaOpen.set(false);
    }
  }

  estoyBien(): void {
    if (this.vidaTick) clearInterval(this.vidaTick);
    this.alertaOpen.set(false);
    if (this.alertaVida()) this.startAlertaCycle();
  }

  openSolicitud(item: string): void {
    this.solicitudItem = item;
    this.solicitudMotivo = '';
    this.solicitudFoto = '';
    this.solicitudOpen.set(true);
  }

  onFoto(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.solicitudFoto = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.readAsDataURL(file);
  }

  enviarSolicitud(): void {
    this.solicitudOpen.set(false);
    this.msg.set('Solicitud enviada');
  }

  openReclamo(periodo: string): void {
    this.reclamoPeriodo = periodo;
    this.reclamoMotivo = 'HORAS_EXTRA';
    this.reclamoDetalle = '';
    this.reclamoOpen.set(true);
  }

  enviarReclamo(): void {
    if (this.session()?.accessToken === 'local') {
      this.reclamoOpen.set(false);
      this.msg.set('Reclamo registrado (simulado)');
      return;
    }
    this.api
      .reclamar(this.reclamoPeriodo, this.reclamoMotivo, this.reclamoDetalle)
      .subscribe(() => {
        this.reclamoOpen.set(false);
        this.msg.set('Reclamo registrado');
      });
  }

  startSign(e: MouseEvent | TouchEvent): void {
    this.drawing = true;
    this.draw(e);
  }

  moveSign(e: MouseEvent | TouchEvent): void {
    if (!this.drawing) return;
    this.draw(e);
  }

  endSign(): void {
    this.drawing = false;
  }

  firmar(cv: HTMLCanvasElement): void {
    const data = cv.toDataURL();
    if (this.session()?.accessToken === 'local') {
      this.firmarOpen.set(false);
      this.msg.set('Firma guardada');
      return;
    }
    this.api.firmarDotacion(this.firmaItems, data).subscribe(() => {
      this.firmarOpen.set(false);
      this.msg.set('Firma enviada');
    });
  }

  private refreshClock(): void {
    const now = new Date();
    this.clock.set(now.toTimeString().slice(0, 8));
  }

  private loadTurnero(): void {
    const emp = this.session()?.empleado;
    if (!emp?.id || this.session()?.accessToken === 'local') {
      const days: TurneroDay[] = Array.from({ length: 30 }, (_, i) => ({
        dia: i + 1,
        fecha: `2026-06-${String(i + 1).padStart(2, '0')}`,
        estado: i % 4 === 0 ? 'DESCANSO' : i % 2 === 0 ? 'NOCHE' : 'DIA',
        horario: i % 4 === 0 ? null : '06:00 - 18:00',
      }));
      this.turneroDays.set(days);
      return;
    }
    const now = new Date();
    this.api.turnero(now.getFullYear(), now.getMonth() + 1).subscribe({
      next: (rows) => this.turneroDays.set(rows as TurneroDay[]),
      error: () => this.turneroDays.set([]),
    });
  }

  private loadConsignas(): void {
    const id = this.session()?.puesto_id;
    if (!id || id === 'PUE-01') {
      this.consignas.set([
        { tipo: 'CONTACTS', titulo: 'Centro de control', detalle: 'Línea principal', telefono: '6040000000' },
        { tipo: 'RULES', titulo: 'Ronda', detalle: 'Ronda cada hora' },
      ]);
      return;
    }
    this.api.consignas(id).subscribe({
      next: (rows) => this.consignas.set(rows as Record<string, unknown>[]),
      error: () => this.consignas.set([]),
    });
  }

  private loadDotacion(): void {
    if (this.session()?.accessToken === 'local') {
      this.dotacion.set([
        { nombre: 'Uniforme', estado: 'BUENO' },
        { nombre: 'Botas', estado: 'BUENO' },
      ]);
      return;
    }
    this.api.dotacion().subscribe({
      next: (rows) => this.dotacion.set(rows),
      error: () => this.dotacion.set([]),
    });
  }

  private loadNomina(): void {
    if (this.session()?.accessToken === 'local') {
      this.nomina.set([{ periodo: 'JUNIO 2026', horasOrdinarias: 192, horasExtra: 0, recargoNocturno: 0, recargoFestivo: 0, neto: 1800000 }]);
      return;
    }
    this.api.nomina().subscribe({
      next: (rows) => this.nomina.set(rows as Record<string, unknown>[]),
      error: () => this.nomina.set([]),
    });
  }

  private startAlertaCycle(): void {
    if (this.vidaTick) clearInterval(this.vidaTick);
    this.alertaSecs.set(120);
    this.alertaOpen.set(true);
    try {
      navigator.vibrate?.(200);
    } catch {
      /* ignore */
    }
    this.vidaTick = setInterval(() => {
      const n = this.alertaSecs() - 1;
      this.alertaSecs.set(n);
      if (n <= 0) {
        clearInterval(this.vidaTick);
        this.alertaOpen.set(false);
        this.sendSos();
        this.msg.set('Alerta de vida: se envió SOS automático');
        if (this.alertaVida()) this.startAlertaCycle();
      }
    }, 1000);
  }

  private draw(ev: Event): void {
    const e = ev as MouseEvent & TouchEvent;
    const canvas = e.target as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e && e.touches[0] ? e.touches[0] : (e as MouseEvent);
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;
    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, 3, 3);
  }
}
