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
        <div class="clock">{{ clock() }}</div>
        <button type="button" class="logout" (click)="askLogout()">Salir</button>
      </header>

      @if (screen() === 'home') {
        <main class="grid">
          <button type="button" class="tile" (click)="go('turnero')"><span>🗓️</span> Mi Turnero</button>
          <button type="button" class="tile" (click)="go('consignas')"><span>📋</span> Consignas</button>
          <button type="button" class="tile danger" (click)="go('sos')"><span>🚨</span> Seguridad / SOS</button>
          <button type="button" class="tile" (click)="go('dotacion')"><span>👔</span> Mi Dotación</button>
          <button type="button" class="tile" (click)="go('nomina')"><span>💰</span> Mis Colillas</button>
        </main>
      } @else {
        <main class="panel">
          <button type="button" class="back" (click)="go('home')">← Inicio</button>

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
            <h2>Consignas</h2>
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
            <h2>Seguridad / SOS</h2>
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
            <h2>Mi Dotación</h2>
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
            <h2>Mis Colillas</h2>
            @for (n of nomina(); track $index) {
              <div class="card">
                <strong>{{ n['periodo'] }}</strong>
                <p class="muted">
                  Ord {{ n['horasOrdinarias'] }} · Extra {{ n['horasExtra'] }} · Noc
                  {{ n['recargoNocturno'] }} · Fest {{ n['recargoFestivo'] }}
                </p>
                <p>Neto: $ {{ n['neto'] }}</p>
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
                <option value="RECARGO_NOCTURNO">Recargo nocturno</option>
                <option value="RECARGO_FESTIVO">Recargo festivo</option>
                <option value="TOTAL_NETO">Total neto</option>
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
    :host { display:block; min-height:100dvh; background:#0A0E17; color:#F1F5F9; font-family:system-ui,sans-serif; }
    .app { max-width:480px; margin:0 auto; min-height:100dvh; display:flex; flex-direction:column; }
    .bar { display:flex; align-items:center; gap:0.55rem; padding:0.75rem; background:#121824; border-bottom:1px solid #1e293b; position:sticky; top:0; z-index:5; }
    .avatar { width:36px; height:36px; border-radius:50%; background:#FFB700; color:#0A0E17; display:grid; place-items:center; font-weight:800; }
    .who { flex:1; min-width:0; display:flex; flex-direction:column; }
    .who strong { font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .who span { font-size:0.72rem; color:#94A3B8; }
    .clock { font-variant-numeric:tabular-nums; font-weight:700; color:#FFB700; font-size:0.85rem; }
    .logout { border:0; background:transparent; color:#EF4444; font-weight:700; cursor:pointer; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; padding:1rem; }
    .tile { border:0; border-radius:1rem; padding:1.1rem 0.75rem; background:#121824; color:#F1F5F9; font-weight:700; display:flex; flex-direction:column; gap:0.45rem; align-items:flex-start; cursor:pointer; text-align:left; }
    .tile span { font-size:1.4rem; }
    .tile.danger { outline:1px solid #EF4444; }
    a.tile.link-tile { text-decoration:none; }
    .panel { padding:1rem; display:flex; flex-direction:column; gap:0.75rem; }
    .back { align-self:flex-start; border:0; background:transparent; color:#FFB700; font-weight:700; cursor:pointer; }
    h2 { margin:0; font-size:1.15rem; color:#FFB700; }
    .cal { display:grid; grid-template-columns:repeat(7,1fr); gap:0.3rem; }
    .day { border:0; border-radius:0.4rem; padding:0.35rem 0.2rem; background:#121824; color:#F1F5F9; cursor:pointer; }
    .day small { display:block; font-size:0.55rem; color:#94A3B8; }
    .day[data-st='NOCHE'] { outline:1px solid #FFB700; }
    .day[data-st='FESTIVO'] { color:#EF4444; }
    .card { background:#121824; border-radius:0.75rem; padding:0.85rem; }
    .card p { margin:0.25rem 0; }
    .card.row { display:flex; justify-content:space-between; gap:0.5rem; align-items:center; }
    .muted { color:#94A3B8; font-size:0.85rem; }
    .center { text-align:center; }
    .link { color:#FFB700; }
    .btn { border:0; border-radius:0.65rem; padding:0.75rem; background:#FFB700; color:#0A0E17; font-weight:800; cursor:pointer; }
    .btn.danger { background:#EF4444; color:#fff; }
    .mini { border:1px solid #334155; background:transparent; color:#FFB700; border-radius:0.45rem; padding:0.35rem 0.55rem; cursor:pointer; }
    .sos { width:160px; height:160px; border-radius:50%; border:0; margin:1rem auto; display:grid; place-items:center; background:#EF4444; color:#fff; font-size:2rem; font-weight:900; cursor:pointer; box-shadow:0 0 0 10px rgba(239,68,68,.25); }
    .tabs { display:flex; gap:0.4rem; }
    .tabs button { flex:1; border:1px solid #334155; background:#121824; color:#94A3B8; border-radius:999px; padding:0.45rem; cursor:pointer; }
    .tabs button.on { background:#FFB700; color:#0A0E17; border-color:transparent; font-weight:700; }
    .check { display:flex; gap:0.5rem; align-items:center; color:#94A3B8; }
    .ok { color:#10B981; }
    .modal { position:fixed; inset:0; background:rgba(0,0,0,.65); display:grid; place-items:center; padding:1rem; z-index:20; }
    .modal-card { width:min(100%,360px); background:#121824; border-radius:1rem; padding:1rem; display:flex; flex-direction:column; gap:0.65rem; }
    .modal-card label { display:flex; flex-direction:column; gap:0.3rem; font-size:0.85rem; color:#94A3B8; }
    input, textarea, select { font:inherit; color:#F1F5F9; background:#0A0E17; border:1px solid #334155; border-radius:0.45rem; padding:0.55rem; }
    .big { font-size:2rem; text-align:center; color:#FFB700; margin:0; }
    .sign { background:#fff; border-radius:0.4rem; touch-action:none; width:100%; }
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
      this.relevoFoto = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  cerrarTurno(): void {
    if (this.relevoNombre.trim().length < 2) return;
    if (this.auth.session()?.accessToken === 'local') {
      this.cierreOpen.set(false);
      this.auth.logout();
      return;
    }
    this.api.cerrarTurno(this.relevoNombre.trim(), this.relevoFoto || undefined).subscribe({
      next: () => {
        this.cierreOpen.set(false);
        this.auth.logout();
      },
      error: () => this.msg.set('No se pudo cerrar el turno'),
    });
  }

  sendSos(): void {
    const s = this.session();
    const send = (lat?: number, lng?: number) => {
      const body: Record<string, unknown> = {
        turnoId: this.auth.turnoId() || undefined,
        postId: s?.puesto_id && s.puesto_id !== 'PUE-01' ? s.puesto_id : undefined,
        motivo: 'Pánico manual',
      };
      if (lat != null && lng != null) {
        body['lat'] = lat;
        body['lng'] = lng;
      }
      if (s?.accessToken === 'local') {
        this.msg.set('SOS registrado en modo local');
        return;
      }
      this.api.sos(body).subscribe({
        next: () => this.msg.set('Alerta SOS enviada al centro de control'),
        error: () => this.msg.set('No se pudo enviar SOS'),
      });
    };
    if (!navigator.geolocation) {
      send();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => send(pos.coords.latitude, pos.coords.longitude),
      () => send(),
      { timeout: 4000, maximumAge: 60000 },
    );
  }

  toggleAlerta(ev: Event): void {
    const on = (ev.target as HTMLInputElement).checked;
    this.alertaVida.set(on);
    if (this.vidaTick) clearInterval(this.vidaTick);
    if (on) this.startAlertaCycle();
    else this.alertaOpen.set(false);
  }

  estoyBien(): void {
    this.alertaOpen.set(false);
    this.startAlertaCycle();
  }

  openSolicitud(nombre: string): void {
    this.solicitudItem = nombre;
    this.solicitudMotivo = '';
    this.solicitudFoto = '';
    this.solicitudOpen.set(true);
  }

  onFoto(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.solicitudFoto = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  enviarSolicitud(): void {
    if (!this.solicitudFoto) return;
    this.api.solicitarDotacion(this.solicitudMotivo || this.solicitudItem, this.solicitudFoto).subscribe({
      next: () => {
        this.solicitudOpen.set(false);
        this.msg.set('Solicitud de dotación enviada');
      },
      error: () => this.msg.set('No se pudo enviar la solicitud'),
    });
  }

  startSign(ev: Event): void {
    this.drawing = true;
    this.draw(ev);
  }
  moveSign(ev: Event): void {
    if (!this.drawing) return;
    this.draw(ev);
  }
  endSign(): void {
    this.drawing = false;
  }

  firmar(cv: HTMLCanvasElement): void {
    const data = cv.toDataURL('image/png');
    this.api.firmarDotacion(this.firmaItems || 'Equipo recibido', data).subscribe({
      next: () => {
        this.firmarOpen.set(false);
        this.msg.set('Firma registrada');
      },
      error: () => this.msg.set('No se pudo firmar'),
    });
  }

  openReclamo(periodo: string): void {
    this.reclamoPeriodo = periodo;
    this.reclamoDetalle = '';
    this.reclamoOpen.set(true);
  }

  enviarReclamo(): void {
    if (this.reclamoDetalle.trim().length < 3) return;
    this.api.reclamar(this.reclamoPeriodo, this.reclamoMotivo, this.reclamoDetalle).subscribe({
      next: () => {
        this.reclamoOpen.set(false);
        this.msg.set('Reclamo enviado');
      },
      error: () => this.msg.set('No se pudo enviar el reclamo'),
    });
  }

  askLogout(): void {
    if (confirm('¿Cerrar sesión Vigía?')) this.auth.logout();
  }

  private refreshClock(): void {
    const start = this.session()?.inicio_timestamp || Date.now();
    const sec = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    this.clock.set(`${h}:${m}:${s}`);
  }

  private loadTurnero(): void {
    const now = new Date();
    this.api.turnero(now.getFullYear(), now.getMonth() + 1).subscribe({
      next: (res) => {
        const days = (res as { days?: TurneroDay[] }).days || [];
        this.turneroDays.set(days);
      },
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
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ev.preventDefault();
  }
}
