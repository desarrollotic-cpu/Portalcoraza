import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RondasApiService, RondasPunto } from '../rondas/rondas-api.service';
import {
  MarcaLocal,
  detectarMarcacion,
  distanciaMetros,
  esHoyBogota,
  horaBogota,
} from '../rondas/rondas-geo';

type Vista = 'inicio' | 'sistemas' | 'ronda';

const MARCAS_KEY = 'rondas_campo_marcas';
const VIG_KEY = 'rondas_campo_vig';

@Component({
  selector: 'app-rondas-campo',
  imports: [FormsModule],
  template: `
    <div class="campo">
      <header>
        <p class="brand">{{ modoPuntos ? 'Coraza · Puntos GPS' : 'Coraza · Rondas' }}</p>
        @if (modoPuntos) {
          <strong>Crear puntos del recorrido</strong>
        } @else if (post(); as p) {
          <strong>{{ p.name }}</strong>
        } @else {
          <strong>Teléfono sin puesto</strong>
        }
        <span [class.on]="online()">{{ online() ? 'EN LÍNEA' : 'SIN RED' }}</span>
      </header>

      @if (aviso()) {
        <p class="aviso">{{ aviso() }}</p>
      }

      @if (vista() === 'inicio' && !modoPuntos) {
        @if (!post()) {
          <section class="card">
            <h1>¿En qué puesto estás?</h1>
            <input
              type="search"
              [(ngModel)]="filtroPuesto"
              placeholder="Buscar puesto"
              (ngModelChange)="filtrarPuestos()"
            />
            <ul>
              @for (p of puestosVisibles(); track p.id) {
                <li>
                  <button type="button" (click)="elegirPuestoVigilante(p)">{{ p.name }}</button>
                </li>
              }
            </ul>
            @if (!puestos().length) {
              <p class="nota">Cargando puestos…</p>
            }
          </section>
        } @else {
          <section class="card">
            <button type="button" class="back" (click)="cambiarPuesto()">← Cambiar puesto</button>
            <h1>¿Quién da la ronda?</h1>
            <p class="puesto-ok">Puesto: {{ post()?.name }}</p>

            @if (!elegido()) {
              <label>
                Tu nombre
                <input
                  type="text"
                  autocomplete="off"
                  autocapitalize="words"
                  [(ngModel)]="filtro"
                  placeholder="Escribe apellido o nombre"
                  (ngModelChange)="filtrar()"
                />
              </label>
              <ul class="sugerencias">
                @for (a of visibles(); track a.id) {
                  <li>
                    <button type="button" (click)="elegir(a)">{{ a.nombre }}</button>
                  </li>
                }
              </ul>
              @if (filtro.trim() && !visibles().length) {
                <p class="nota">No hay coincidencias. Prueba con el apellido.</p>
              }
            } @else {
              <label>
                Nombre
                <input type="text" [value]="elegido()!.nombre" readonly />
              </label>
              <button type="button" class="ghost" (click)="cambiarNombre()">Elegir otro nombre</button>
              <label>
                Número de documento
                <input
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  [(ngModel)]="cedula"
                  placeholder="Cédula"
                />
              </label>
              <button type="button" class="cta" [disabled]="entrando()" (click)="entrar()">
                {{ entrando() ? 'Entrando…' : 'Iniciar ronda' }}
              </button>
            }
          </section>
        }
      }

      @if (vista() === 'sistemas') {
        <section class="card">
          <h1>Puntos del recorrido</h1>
          @if (!auth.isAuthenticated() || !auth.hasPermission('rondas.setup')) {
            <label>Correo<input type="email" [(ngModel)]="email" /></label>
            <label>Clave<input type="password" [(ngModel)]="clave" /></label>
            <button type="button" class="cta" [disabled]="entrando()" (click)="loginSistemas()">
              Entrar
            </button>
          } @else {
            <label>
              Buscar puesto
              <input
                type="search"
                [(ngModel)]="filtroPuesto"
                placeholder="Nombre del puesto"
                (ngModelChange)="filtrarPuestos()"
              />
            </label>
            <ul>
              @for (p of puestosVisibles(); track p.id) {
                <li>
                  <button
                    type="button"
                    [class.cta]="p.id === setupPostId"
                    (click)="elegirPuesto(p)"
                  >
                    {{ p.name }}
                  </button>
                </li>
              }
            </ul>
            @if (!puestos().length && !entrando()) {
              <p class="nota">No hay puestos. Revisa que la cuenta tenga acceso a Operaciones.</p>
            }
            @if (setupPostId) {
              <label>
                Nombre del punto
                <input type="text" [(ngModel)]="puntoNombre" placeholder="Portería, bodega…" />
              </label>
              <label>
                Radio (m)
                <input type="number" [(ngModel)]="radio" min="10" max="80" />
              </label>
              <button type="button" class="cta" [disabled]="guardando()" (click)="guardarPuntoAqui()">
                {{ guardando() ? 'Guardando…' : 'Guardar punto aquí' }}
              </button>
              <ul class="puntos">
                @for (pt of puntosSetup(); track pt.id) {
                  <li>{{ pt.orden }}. {{ pt.nombre }} · {{ pt.radioMetros }} m</li>
                }
              </ul>
            }
          }
        </section>
      }

      @if (vista() === 'ronda') {
        <section class="card">
          <p class="hola">{{ vigNombre() }}</p>
          <div class="barra">
            <span>Ronda {{ hechos() }} / {{ puntos().length }}</span>
            <span>{{ pct() }}%</span>
          </div>
          <div class="track"><i [style.width.%]="pct()"></i></div>
          @if (gpsNota()) {
            <p class="nota">{{ gpsNota() }}</p>
          }
          <ul class="puntos">
            @for (pt of puntos(); track pt.id) {
              <li [class.ok]="marcadoHoy(pt.id)">
                <b>{{ marcadoHoy(pt.id) ? '✓' : pt.orden }}</b>
                <div>
                  <strong>{{ pt.nombre }}</strong>
                  <small>
                    @if (marcaDe(pt.id); as m) {
                      {{ horaBogota(m.fechaHora) }}
                    } @else if (pos(); as pos) {
                      a {{ dist(pt, pos) }} m
                    } @else {
                      radio {{ pt.radioMetros }} m
                    }
                  </small>
                </div>
              </li>
            }
          </ul>
        </section>
        <footer>
          <p>Pendientes de envío: <strong>{{ pendientes() }}</strong></p>
          <button type="button" (click)="sincronizar()" [disabled]="sincronizando()">
            {{ sincronizando() ? 'Enviando…' : 'Sincronizar' }}
          </button>
          <button type="button" class="link" (click)="salirRonda()">Salir</button>
        </footer>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100dvh; background: #0f3d2e; color: #122; }
    .campo { max-width: 480px; margin: 0 auto; min-height: 100dvh; background: #f4f1ea; }
    header {
      display: flex; flex-wrap: wrap; gap: 0.35rem 0.75rem; align-items: baseline;
      background: #14532d; color: #fff; padding: 0.9rem 1rem;
    }
    header .brand { margin: 0; width: 100%; font-size: 0.72rem; opacity: 0.75; }
    header strong { flex: 1; font-size: 1.05rem; }
    header span { font-size: 0.72rem; font-weight: 700; color: #fbbf24; }
    header span.on { color: #86efac; }
    .card { margin: 1rem; padding: 1rem; background: #fff; border-radius: 16px; box-shadow: 0 1px 4px #0001; }
    h1 { margin: 0 0 0.75rem; font-size: 1.2rem; }
    .back {
      display: inline-block; width: auto; margin: 0 0 0.6rem; padding: 0.35rem 0;
      background: none; border: 0; color: #166534; font: inherit; font-weight: 700; cursor: pointer;
    }
    .puesto-ok { margin: -0.4rem 0 0.8rem; font-size: 0.85rem; color: #166534; font-weight: 600; }
    label { display: block; font-size: 0.85rem; font-weight: 600; margin: 0.6rem 0; }
    input, select {
      width: 100%; margin-top: 0.25rem; padding: 0.7rem; border: 1px solid #ddd;
      border-radius: 10px; font: inherit; box-sizing: border-box; background: #fff;
    }
    input[readonly] { background: #ecfdf3; font-weight: 600; }
    ul.sugerencias, ul { list-style: none; margin: 0.5rem 0 0; padding: 0; max-height: 40vh; overflow: auto; }
    ul li { margin: 0 0 0.35rem; }
    ul button, .cta, .ghost, footer button {
      width: 100%; text-align: left; padding: 0.75rem; border: 0; border-radius: 12px;
      background: #f3f4f6; font: inherit; cursor: pointer;
    }
    .cta { background: #166534; color: #fff; font-weight: 700; text-align: center; margin-top: 0.5rem; }
    .ghost { background: #ecfccb; font-weight: 600; text-align: center; margin: 0.4rem 0; }
    .link { background: none; border: 0; color: #166534; width: 100%; padding: 0.8rem; font: inherit; }
    .hint, .nota, .aviso { margin: 0.75rem 1rem; padding: 0.7rem; border-radius: 12px; font-size: 0.9rem; }
    .aviso { background: #dcfce7; }
    .nota { background: #fff7ed; }
    .puntos li { display: flex; gap: 0.75rem; align-items: center; padding: 0.55rem 0; border-top: 1px solid #eee; }
    .puntos b {
      width: 1.7rem; height: 1.7rem; border-radius: 99px; display: grid; place-items: center;
      background: #eee; font-size: 0.8rem;
    }
    .puntos li.ok b { background: #166534; color: #fff; }
    .puntos small { display: block; color: #6b7280; }
    .hola { margin: 0 0 0.5rem; font-weight: 700; }
    .barra { display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 600; }
    .track { height: 8px; background: #e5e7eb; border-radius: 99px; overflow: hidden; margin: 0.4rem 0 0.8rem; }
    .track i { display: block; height: 100%; background: #166534; }
    footer {
      position: sticky; bottom: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;
      padding: 0.75rem 1rem; background: #fff; border-top: 1px solid #eee;
    }
    footer p { margin: 0; flex: 1; font-size: 0.9rem; }
    footer button { width: auto; text-align: center; background: #14532d; color: #fff; font-weight: 700; }
    footer .link { width: auto; color: #14532d; background: none; }
    button:disabled { opacity: 0.6; }
  `,
})
export class RondasCampo implements OnDestroy {
  readonly api = inject(RondasApiService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly horaBogota = horaBogota;
  readonly modoPuntos = this.route.snapshot.data['modo'] === 'puntos';

  vista = signal<Vista>('inicio');
  online = signal(navigator.onLine);
  aviso = signal('');
  gpsNota = signal('');
  post = signal<{ id: string; name: string } | null>(this.api.postVinculado());
  asociados = signal<Array<{ id: string; nombre: string }>>([]);
  visibles = signal<Array<{ id: string; nombre: string }>>([]);
  elegido = signal<{ id: string; nombre: string } | null>(null);
  puestos = signal<Array<{ id: string; name: string }>>([]);
  puestosVisibles = signal<Array<{ id: string; name: string }>>([]);
  puntosSetup = signal<RondasPunto[]>([]);
  puntos = signal<RondasPunto[]>([]);
  marcas = signal<MarcaLocal[]>([]);
  pos = signal<{ lat: number; lng: number } | null>(null);
  vigNombre = signal('');
  entrando = signal(false);
  guardando = signal(false);
  sincronizando = signal(false);

  filtro = '';
  filtroPuesto = '';
  cedula = '';
  email = '';
  clave = '';
  setupPostId = '';
  puntoNombre = '';
  radio = 25;

  private watchId: number | null = null;
  private wake: { release(): Promise<void> } | null = null;
  private lock = false;
  private onOnline = () => {
    this.online.set(true);
    void this.sincronizar();
  };
  private onOffline = () => this.online.set(false);

  constructor() {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    const p = this.post();
    if (this.modoPuntos) {
      this.vista.set('sistemas');
      this.cargarPuestosPublicos();
      this.cargarPuestos();
    } else if (p) {
      this.cargarAsociados(p.id);
    } else {
      this.cargarPuestosPublicos();
    }
  }

  ngOnDestroy(): void {
    this.pararGps();
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }

  filtrar() {
    const q = this.filtro.trim().toLowerCase();
    this.visibles.set(
      q
        ? this.asociados().filter((a) => a.nombre.toLowerCase().includes(q))
        : this.asociados().slice(0, 40),
    );
  }

  elegir(a: { id: string; nombre: string }) {
    this.elegido.set(a);
    this.filtro = a.nombre;
    this.visibles.set([]);
  }

  cargarAsociados(postId: string) {
    this.api.asociados(postId).subscribe({
      next: (r) => {
        this.asociados.set(r.asociados);
        this.filtrar();
      },
      error: (e: HttpErrorResponse) => this.aviso.set(msg(e, 'No se pudo cargar el personal')),
    });
  }

  cargarPuestosPublicos() {
    this.api.puestosCampo().subscribe({
      next: (ps) => {
        this.puestos.set(ps);
        this.filtrarPuestos();
        if (!ps.length) this.aviso.set('No hay puestos activos.');
      },
      error: (e: HttpErrorResponse) =>
        this.aviso.set(msg(e, 'No se pudieron cargar los puestos')),
    });
  }

  elegirPuestoVigilante(p: { id: string; name: string }) {
    this.api.vincularPost(p);
    this.post.set(p);
    this.filtroPuesto = '';
    this.cargarAsociados(p.id);
  }

  cambiarPuesto() {
    this.api.quitarPost();
    this.post.set(null);
    this.elegido.set(null);
    this.cedula = '';
    this.filtro = '';
    this.cargarPuestosPublicos();
  }

  cambiarNombre() {
    this.elegido.set(null);
    this.filtro = '';
    this.cedula = '';
    this.filtrar();
  }

  abrirSistemas() {
    this.vista.set('sistemas');
    this.cargarPuestosPublicos();
    this.cargarPuestos();
  }

  cargarPuestos() {
    if (!this.auth.isAuthenticated() || !this.auth.hasPermission('rondas.setup')) {
      return;
    }
    this.entrando.set(true);
    this.api.puestosSetup().subscribe({
      next: (ps) => {
        this.entrando.set(false);
        this.puestos.set(ps);
        this.filtrarPuestos();
        if (!ps.length) this.aviso.set('No se encontraron puestos activos.');
      },
      error: (e: HttpErrorResponse) => {
        this.entrando.set(false);
        this.aviso.set(msg(e, 'No se pudieron cargar los puestos'));
      },
    });
  }

  filtrarPuestos() {
    const q = this.filtroPuesto.trim().toLowerCase();
    const all = this.puestos();
    this.puestosVisibles.set(
      q ? all.filter((p) => p.name.toLowerCase().includes(q)) : all.slice(0, 60),
    );
  }

  elegirPuesto(p: { id: string; name: string }) {
    this.setupPostId = p.id;
    this.cargarPuntosSetup();
  }

  loginSistemas() {
    this.entrando.set(true);
    this.auth.login(this.email, this.clave).subscribe({
      next: () => {
        this.entrando.set(false);
        if (!this.auth.hasPermission('rondas.setup')) {
          this.aviso.set('Esa cuenta no puede crear puntos.');
          return;
        }
        this.cargarPuestos();
      },
      error: (e: HttpErrorResponse) => {
        this.entrando.set(false);
        this.aviso.set(msg(e, 'Correo o clave incorrectos'));
      },
    });
  }

  cargarPuntosSetup() {
    if (!this.setupPostId) return;
    this.api.puntosAdmin(this.setupPostId).subscribe({
      next: (p) => this.puntosSetup.set(p),
      error: (e: HttpErrorResponse) => this.aviso.set(msg(e)),
    });
  }

  vincularDesdeSetup() {
    const p = this.puestos().find((x) => x.id === this.setupPostId);
    if (!p) return;
    this.api.vincularPost({ id: p.id, name: p.name });
    this.post.set({ id: p.id, name: p.name });
    this.aviso.set(`Teléfono vinculado a ${p.name}`);
    this.cargarAsociados(p.id);
  }

  guardarPuntoAqui() {
    if (!this.setupPostId || this.puntoNombre.trim().length < 2) {
      this.aviso.set('Escribe el nombre del punto.');
      return;
    }
    this.guardando.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.api
          .crearPunto({
            postId: this.setupPostId,
            nombre: this.puntoNombre.trim(),
            latitud: pos.coords.latitude,
            longitud: pos.coords.longitude,
            radioMetros: Number(this.radio) || 25,
            orden: this.puntosSetup().length + 1,
          })
          .subscribe({
            next: () => {
              this.guardando.set(false);
              this.puntoNombre = '';
              this.aviso.set('Punto guardado.');
              this.cargarPuntosSetup();
            },
            error: (e: HttpErrorResponse) => {
              this.guardando.set(false);
              this.aviso.set(msg(e, 'No se pudo guardar el punto'));
            },
          });
      },
      () => {
        this.guardando.set(false);
        this.aviso.set('Activa el GPS para guardar el punto.');
      },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  }

  entrar() {
    const post = this.post();
    const e = this.elegido();
    if (!post || !e) return;
    this.entrando.set(true);
    this.api.entrar(post.id, e.id, this.cedula).subscribe({
      next: (res) => {
        this.entrando.set(false);
        this.api.setCampoSesion(res.accessToken);
        this.vigNombre.set(res.vigilante.nombre);
        localStorage.setItem(VIG_KEY, JSON.stringify(res.vigilante));
        this.marcas.set(leerMarcas(res.vigilante.id));
        this.vista.set('ronda');
        this.cargarPuntosYGps();
      },
      error: (err: HttpErrorResponse) => {
        this.entrando.set(false);
        this.aviso.set(msg(err, 'Documento no coincide'));
      },
    });
  }

  cargarPuntosYGps() {
    this.api.puntosCampo().subscribe({
      next: (pts) => {
        this.puntos.set(pts);
        this.iniciarGps();
      },
      error: () => this.gpsNota.set('Sin red: no hay puntos en el servidor. Abre la app con datos al menos una vez.'),
    });
  }

  iniciarGps() {
    this.pararGps();
    void this.pedirWakeLock();
    if (!navigator.geolocation) {
      this.gpsNota.set('Este teléfono no da GPS.');
      return;
    }
    this.watchId = navigator.geolocation.watchPosition(
      (p) => this.alGps(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
      () => this.gpsNota.set('Sin permiso de GPS. Actívalo para marcar la ronda.'),
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 },
    );
  }

  alGps(lat: number, lng: number, accuracy: number) {
    this.pos.set({ lat, lng });
    if (this.lock) return;
    const res = detectarMarcacion({
      lat,
      lng,
      accuracy,
      puntos: this.puntos(),
      marcas: this.marcas(),
      antiDupMin: 5,
      precisionMax: 40,
      dispositivoId: this.api.deviceId(),
    });
    if ('motivo' in res) {
      if (res.motivo === 'precision') {
        this.gpsNota.set(
          `Señal débil (${Math.round(res.accuracy || 0)} m). Acércate o espera GPS mejor.`,
        );
      }
      return;
    }
    this.gpsNota.set('');
    this.lock = true;
    const vig = JSON.parse(localStorage.getItem(VIG_KEY) || '{}') as { id?: string };
    const next = [res, ...this.marcas()];
    this.marcas.set(next);
    if (vig.id) guardarMarcas(vig.id, next);
    this.aviso.set(`Punto ${res.puntoNombre} marcado`);
    navigator.vibrate?.([80, 40, 80]);
    void this.sincronizar().finally(() => {
      this.lock = false;
    });
  }

  marcadoHoy(puntoId: string) {
    return this.marcas().some((m) => m.puntoId === puntoId && esHoyBogota(m.fechaHora));
  }

  marcaDe(puntoId: string) {
    return this.marcas().find((m) => m.puntoId === puntoId && esHoyBogota(m.fechaHora));
  }

  dist(pt: RondasPunto, pos: { lat: number; lng: number }) {
    return Math.round(distanciaMetros(pos.lat, pos.lng, pt.latitud, pt.longitud));
  }

  hechos() {
    const ids = new Set(
      this.marcas().filter((m) => esHoyBogota(m.fechaHora)).map((m) => m.puntoId),
    );
    return this.puntos().filter((p) => ids.has(p.id)).length;
  }

  pct() {
    const t = this.puntos().length;
    return t ? Math.round((this.hechos() / t) * 100) : 0;
  }

  pendientes() {
    return this.marcas().filter((m) => m.estado === 'pendiente').length;
  }

  sincronizar(): Promise<void> {
    const pend = this.marcas().filter((m) => m.estado === 'pendiente');
    if (!pend.length || !navigator.onLine) return Promise.resolve();
    this.sincronizando.set(true);
    return new Promise((resolve) => {
      this.api
        .enviarMarcaciones(
          pend.map((m) => ({
            uuidCliente: m.uuid,
            puntoId: m.puntoId,
            latitud: m.latitud,
            longitud: m.longitud,
            precisionMetros: m.precisionMetros,
            fechaHora: m.fechaHora,
            dispositivoId: m.dispositivoId,
          })),
        )
        .subscribe({
          next: (data) => {
            const ok = new Set([...(data.aceptadas || []), ...(data.duplicadas || [])]);
            const next = this.marcas().map((m) =>
              ok.has(m.uuid) ? { ...m, estado: 'enviado' as const } : m,
            );
            this.marcas.set(next);
            const vig = JSON.parse(localStorage.getItem(VIG_KEY) || '{}') as { id?: string };
            if (vig.id) guardarMarcas(vig.id, next);
            const n = data.aceptadas?.length || 0;
            if (n) this.aviso.set(n === 1 ? '1 marcación enviada.' : `${n} marcaciones enviadas.`);
            this.sincronizando.set(false);
            resolve();
          },
          error: () => {
            this.aviso.set('Sin red: las marcas quedan en el teléfono.');
            this.sincronizando.set(false);
            resolve();
          },
        });
    });
  }

  salirRonda() {
    this.pararGps();
    this.api.clearCampoSesion();
    this.vista.set('inicio');
  }

  private pararGps() {
    if (this.watchId != null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    void this.wake?.release();
    this.wake = null;
  }

  private async pedirWakeLock() {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<{ release(): Promise<void> }> };
      };
      this.wake = (await nav.wakeLock?.request('screen')) ?? null;
    } catch {
      /* el sistema puede negar el bloqueo de pantalla */
    }
  }
}

function leerMarcas(vigId: string): MarcaLocal[] {
  try {
    const data = JSON.parse(localStorage.getItem(MARCAS_KEY) || 'null');
    if (!data || data.id !== vigId) return [];
    return data.items || [];
  } catch {
    return [];
  }
}

function guardarMarcas(vigId: string, items: MarcaLocal[]) {
  localStorage.setItem(MARCAS_KEY, JSON.stringify({ id: vigId, items }));
}

function msg(e: HttpErrorResponse, fallback = 'Error') {
  const m = e.error?.message || e.error?.error;
  return typeof m === 'string' ? m : fallback;
}
