import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RondasApiService, RondasPunto } from '../rondas/rondas-api.service';
import {
  MarcaLocal,
  candidatoMarcacion,
  detectarMarcacion,
  distanciaMetros,
  dentroDelRadio,
  esHoyBogota,
  horaBogota,
  DWELL_MS,
} from '../rondas/rondas-geo';

type Vista = 'inicio' | 'sistemas' | 'ronda';

const MARCAS_KEY = 'rondas_campo_marcas';
const PUNTOS_KEY = 'rondas_campo_puntos';
const VIG_KEY = 'rondas_campo_vig';

@Component({
  selector: 'app-rondas-campo',
  imports: [FormsModule],
  template: `
    <div class="campo">
      <header>
        <p class="brand">{{ modoPuntos ? 'Coraza · Puntos GPS' : 'Coraza · Rondas' }}</p>
        @if (modoPuntos) {
          <strong>Tomar puntos GPS</strong>
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
          <h1>Guardar coordenadas del puesto</h1>
          @if (!auth.isAuthenticated() || !auth.hasPermission('rondas.setup')) {
            <label>Correo<input type="email" [(ngModel)]="email" /></label>
            <label>Clave<input type="password" [(ngModel)]="clave" /></label>
            <button type="button" class="cta" [disabled]="entrando()" (click)="loginSistemas()">
              Entrar
            </button>
          } @else if (!setupPostId) {
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
                  <button type="button" (click)="elegirPuesto(p)">{{ p.name }}</button>
                </li>
              }
            </ul>
            @if (!puestos().length && !entrando()) {
              <p class="nota">No hay puestos. Revisa que la cuenta tenga acceso a Operaciones.</p>
            }
          } @else {
            <button type="button" class="back" (click)="cambiarPuestoSetup()">← Cambiar puesto</button>
            <p class="puesto-ok">Puesto: {{ setupPostNombre }}</p>

            <div class="brujula-wrap">
              <span class="notch" aria-hidden="true"></span>
              <div class="brujula" [style.transform]="'rotate(' + (-(heading() ?? 0)) + 'deg)'">
                <span class="cardinal n">N</span>
                <span class="cardinal e">E</span>
                <span class="cardinal s">S</span>
                <span class="cardinal o">O</span>
                <i class="aguja"></i>
              </div>
            </div>
            <p class="rumbo">{{ rumboLabel() }}</p>
            @if (pos(); as c) {
              <div class="coords">
                <strong>{{ aGrados(c.lat, 'N', 'S') }}</strong>
                <strong>{{ aGrados(c.lng, 'E', 'O') }}</strong>
                <small>
                  {{ c.lat.toFixed(6) }}, {{ c.lng.toFixed(6) }}
                  · ±{{ accuracy() ?? '—' }} m
                  @if (altitud() != null) {
                    · {{ altitud() }} m s.n.m.
                  }
                </small>
              </div>
            } @else {
              <p class="nota">Buscando GPS… deja el teléfono al aire libre.</p>
            }
            @if (gpsNota()) {
              <p class="nota">{{ gpsNota() }}</p>
            }
            @if (pos() && !gpsPreciso()) {
              <p class="nota">
                GPS ±{{ accuracy() }} m y radio {{ radioEntero() }} m. No se puede guardar:
                el error sería mayor que el punto. Activa ubicación precisa, quédate quieto
                al aire libre, o sube el radio hasta el ± del GPS.
              </p>
            }

            <label>
              Nombre del punto
              <input
                type="text"
                [(ngModel)]="puntoNombre"
                placeholder="Portería, Portal, Terraza…"
                maxlength="80"
              />
            </label>
            <label>
              Radio (m)
              <input type="number" [(ngModel)]="radio" min="8" max="25" step="1" />
            </label>
            <p class="hint">Mínimo 8 m (límite real del GPS del teléfono). El ± del GPS tiene que ser igual o menor a ese radio, si no no guarda.</p>

            <button
              type="button"
              class="cta"
              [disabled]="guardando() || tomandoGps() || !gpsPreciso()"
              (click)="tomarPunto()"
            >
              @if (tomandoGps()) {
                Fijando GPS preciso…
              } @else if (guardando()) {
                Guardando coordenadas…
              } @else if (!gpsPreciso()) {
                GPS impreciso — no guardar
              } @else {
                Tomar punto
              }
            </button>
            <p class="hint">Párate en el sitio exacto. Solo guarda cuando el botón esté activo.</p>

            <ul class="puntos">
              @for (pt of puntosSetup(); track pt.id) {
                <li class="ok">
                  <b>{{ pt.orden }}</b>
                  @if (editandoId === pt.id) {
                    <div class="edit">
                      <input type="text" [(ngModel)]="editNombre" maxlength="80" />
                      <button type="button" class="mini cta" [disabled]="guardando()" (click)="guardarNombre(pt)">
                        Guardar
                      </button>
                      <button type="button" class="mini" (click)="cancelarNombre()">Cancelar</button>
                    </div>
                  } @else {
                    <div>
                      <strong>{{ pt.nombre }}</strong>
                      <small>{{ pt.latitud.toFixed(5) }}, {{ pt.longitud.toFixed(5) }} · {{ pt.radioMetros }} m
                        @if (pt.altitud != null) {
                          · {{ pt.altitud }} m s.n.m.
                        }
                      </small>
                    </div>
                    <div class="acciones">
                      <button type="button" class="mini" (click)="editarNombre(pt)">Renombrar</button>
                      <button type="button" class="mini malo" [disabled]="guardando()" (click)="eliminarPunto(pt)">
                        Eliminar
                      </button>
                    </div>
                  }
                </li>
              }
            </ul>
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
          @if (!puntos().length) {
            <p class="nota">Aún no hay puntos de este puesto. Cuando Sistemas los tome y haya señal, aparecen aquí solos.</p>
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
                      · {{ m.estado === 'enviado' ? 'enviado a Portal' : 'en el teléfono, se envía al tener datos' }}
                    } @else if (pos(); as pos) {
                      @if (dentroDelRadio(dist(pt, pos), pt.radioMetros)) {
                        encima del punto · espera GPS preciso
                      } @else {
                        a {{ dist(pt, pos) }} m
                      }
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
          <p>
            @if (sincronizando()) {
              Enviando marcas a Portal…
            } @else if (pendientes()) {
              {{ pendientes() }} en el teléfono. Se envían solas al tener datos.
            } @else {
              Marcas enviadas a Portal.
            }
          </p>
          <button type="button" class="link" (click)="salirRonda()">Salir</button>
        </footer>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      color: var(--text-primary);
      background: var(--gradient-page);
      font-family: var(--font-sans);
    }
    .campo {
      max-width: 480px;
      margin: 0 auto;
      min-height: 100dvh;
      background: var(--bg-page);
    }
    header {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.75rem;
      align-items: baseline;
      background: var(--gradient-hero);
      color: var(--text-on-dark);
      padding: 0.9rem 1rem;
    }
    header .brand { margin: 0; width: 100%; font-size: 0.72rem; opacity: 0.75; font-family: var(--font-display); }
    header strong { flex: 1; font-size: 1.05rem; color: var(--text-on-dark); }
    header span { font-size: 0.72rem; font-weight: 700; color: var(--warning-500); }
    header span.on { color: #7dd3fc; }
    .card {
      margin: 1rem;
      padding: 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    h1 { margin: 0 0 0.75rem; font-size: 1.2rem; color: var(--text-primary); font-family: var(--font-display); }
    .back {
      display: inline-block; width: auto; min-height: 44px; margin: 0 0 0.4rem; padding: 0.35rem 0;
      background: none; border: 0; color: var(--primary-600); font: inherit; font-weight: 700; cursor: pointer;
    }
    .puesto-ok { margin: -0.4rem 0 0.8rem; font-size: 0.85rem; color: var(--primary-700); font-weight: 600; }
    label { display: block; font-size: 0.85rem; font-weight: 600; margin: 0.6rem 0; color: var(--text-primary); }
    input, select {
      width: 100%; margin-top: 0.25rem; padding: 0.75rem; border: 1px solid var(--border);
      border-radius: var(--radius-sm); font: inherit; box-sizing: border-box; background: var(--surface);
      color: var(--text-primary);
    }
    input[readonly] { background: var(--primary-50); font-weight: 600; color: var(--primary-800); }
    ul.sugerencias, ul { list-style: none; margin: 0.5rem 0 0; padding: 0; max-height: 40vh; overflow: auto; }
    ul li { margin: 0 0 0.35rem; }
    ul button, .cta, .ghost, footer button {
      width: 100%; min-height: 48px; text-align: left; padding: 0.75rem; border: 0;
      border-radius: var(--radius-sm); background: var(--surface-2); color: var(--text-primary);
      font: inherit; cursor: pointer;
    }
    .cta {
      background: var(--gradient-primary); color: var(--text-on-primary); font-weight: 700;
      text-align: center; margin-top: 0.5rem;
    }
    .ghost {
      background: var(--accent-bg); color: var(--primary-800); font-weight: 600; text-align: center; margin: 0.4rem 0;
    }
    .link {
      background: none; border: 0; color: var(--primary-600); width: 100%; padding: 0.8rem; font: inherit; font-weight: 600;
    }
    .hint, .nota, .aviso { margin: 0.75rem 1rem; padding: 0.7rem; border-radius: var(--radius-sm); font-size: 0.9rem; }
    .hint { margin: 0.5rem 0; background: var(--primary-50); color: var(--primary-800); }
    .aviso { background: var(--success-bg); color: var(--success-600); }
    .nota { background: var(--warning-bg); color: var(--warning-600); }
    .brujula-wrap {
      position: relative; width: 220px; height: 220px; margin: 0.5rem auto 0.25rem;
    }
    .notch {
      position: absolute; top: -6px; left: 50%; z-index: 2;
      width: 0; height: 0; margin-left: -8px;
      border-left: 8px solid transparent; border-right: 8px solid transparent;
      border-top: 12px solid var(--primary-600);
    }
    .brujula {
      width: 220px; height: 220px; border-radius: 50%;
      background: var(--gradient-hero);
      border: 6px solid var(--primary-600);
      box-shadow: var(--shadow-sm);
      position: relative;
      transition: transform 0.18s linear;
    }
    .cardinal {
      position: absolute; color: var(--text-on-dark); font-weight: 800; font-size: 0.85rem;
      font-family: var(--font-display);
    }
    .cardinal.n { top: 10px; left: 50%; transform: translateX(-50%); color: #7dd3fc; }
    .cardinal.s { bottom: 10px; left: 50%; transform: translateX(-50%); }
    .cardinal.e { right: 14px; top: 50%; transform: translateY(-50%); }
    .cardinal.o { left: 12px; top: 50%; transform: translateY(-50%); }
    .aguja {
      position: absolute; left: 50%; top: 28px; width: 4px; height: 72px;
      margin-left: -2px; background: #7dd3fc; border-radius: 99px;
    }
    .aguja::after {
      content: ''; position: absolute; left: 50%; bottom: -52px; width: 4px; height: 48px;
      margin-left: -2px; background: color-mix(in srgb, var(--text-on-dark) 45%, transparent);
      border-radius: 99px;
    }
    .rumbo {
      text-align: center; margin: 0.35rem 0 0.5rem; font-size: 1.35rem; font-weight: 800;
      color: var(--primary-800); font-family: var(--font-display);
    }
    .coords {
      text-align: center; margin: 0 0 0.75rem;
    }
    .coords strong {
      display: block; font-size: 1.15rem; letter-spacing: 0.02em; color: var(--text-primary);
    }
    .coords small { display: block; margin-top: 0.35rem; color: var(--text-muted); font-size: 0.78rem; }
    .puntos li { display: flex; gap: 0.75rem; align-items: center; padding: 0.55rem 0; border-top: 1px solid var(--border); }
    .puntos li .edit { flex: 1; display: grid; gap: 0.35rem; }
    .puntos li .edit input { margin: 0; }
    .puntos li .mini {
      width: auto; min-height: 36px; padding: 0.35rem 0.6rem; font-size: 0.8rem; font-weight: 700;
      background: none; color: var(--primary-600); flex-shrink: 0;
    }
    .puntos li .mini.cta { background: var(--gradient-primary); color: var(--text-on-primary); text-align: center; margin: 0; }
    .puntos li .acciones { display: grid; gap: 0.2rem; flex-shrink: 0; }
    .puntos li .mini.malo { color: var(--error-600); }
    .puntos b {
      width: 1.7rem; height: 1.7rem; border-radius: 99px; display: grid; place-items: center;
      background: var(--surface-2); font-size: 0.8rem;
    }
    .puntos li.ok b { background: var(--primary-600); color: var(--text-on-primary); }
    .puntos small { display: block; color: var(--text-muted); }
    .hola { margin: 0 0 0.5rem; font-weight: 700; color: var(--text-primary); }
    .barra { display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 600; }
    .track { height: 8px; background: var(--neutral-200); border-radius: 99px; overflow: hidden; margin: 0.4rem 0 0.8rem; }
    .track i { display: block; height: 100%; background: var(--gradient-primary); }
    footer {
      position: sticky; bottom: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;
      padding: 0.75rem 1rem; background: var(--surface); border-top: 1px solid var(--border);
    }
    footer p { margin: 0; flex: 1; font-size: 0.9rem; color: var(--text-secondary); }
    footer .link { width: auto; color: var(--primary-600); background: none; }
    button:disabled { opacity: 0.6; }
  `,
})
export class RondasCampo implements OnDestroy {
  readonly api = inject(RondasApiService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly horaBogota = horaBogota;
  readonly dentroDelRadio = dentroDelRadio;
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
  heading = signal<number | null>(null);
  accuracy = signal<number | null>(null);
  altitud = signal<number | null>(null);
  tomandoGps = signal(false);
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
  setupPostNombre = '';
  puntoNombre = '';
  editandoId = '';
  editNombre = '';
  radio = 8;

  readonly aGrados = aGrados;

  private watchId: number | null = null;
  private dwell: { puntoId: string; desde: number } | null = null;
  private rumboOn = false;
  private wake: { release(): Promise<void> } | null = null;
  private lock = false;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private onOnline = () => {
    this.online.set(true);
    this.refrescarPuntos();
    void this.sincronizar();
  };
  private onOffline = () => this.online.set(false);
  private onVisible = () => {
    if (document.visibilityState === 'visible') {
      this.refrescarPuntos();
      void this.sincronizar();
    }
  };

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
    this.soltarRumbo();
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
    this.setupPostNombre = p.name;
    this.filtroPuesto = '';
    this.cargarPuntosSetup();
    this.iniciarBrujula();
    void this.pedirRumbo();
  }

  cambiarPuestoSetup() {
    this.setupPostId = '';
    this.setupPostNombre = '';
    this.puntosSetup.set([]);
    this.pos.set(null);
    this.heading.set(null);
    this.accuracy.set(null);
    this.gpsNota.set('');
    this.pararGps();
    this.soltarRumbo();
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

  rumboLabel() {
    const h = this.heading();
    if (h == null) return 'Buscando rumbo…';
    return `${Math.round(h)}° ${cardinal(h)}`;
  }

  gpsPreciso() {
    const acc = this.accuracy();
    if (acc == null || !this.pos()) return false;
    return acc <= this.radioEntero();
  }

  async tomarPunto() {
    if (this.guardando() || this.tomandoGps()) return;
    const radio = this.radioEntero();
    if (radio < 8 || radio > 25) {
      this.aviso.set('El radio debe ser entre 8 y 25 metros.');
      return;
    }
    if (!this.gpsPreciso()) {
      this.aviso.set(
        `No se guarda: GPS ±${this.accuracy() ?? '—'} m. Tiene que ser ±${radio} m o menos.`,
      );
      return;
    }
    this.tomandoGps.set(true);
    this.gpsNota.set('Fijando GPS preciso… no muevas el teléfono.');
    this.aviso.set('');
    try {
      const c = await this.leerGpsMejor(20000);
      this.aplicarCoords(c);
      this.tomandoGps.set(false);
      if (Math.round(c.accuracy) > radio) {
        this.aviso.set(
          `No se guardó: el GPS quedó en ±${Math.round(c.accuracy)} m y el radio es ${radio} m.`,
        );
        return;
      }
      this.crearPuntoGps(c.latitude, c.longitude, this.nombreSiguiente(), c.altitude, c.accuracy);
    } catch {
      this.tomandoGps.set(false);
      this.aviso.set(
        'GPS todavía impreciso. Activa ubicación precisa, sal al aire libre y espera. No se guarda un punto falso.',
      );
    }
  }

  editarNombre(pt: RondasPunto) {
    this.editandoId = pt.id;
    this.editNombre = pt.nombre;
  }

  cancelarNombre() {
    this.editandoId = '';
    this.editNombre = '';
  }

  eliminarPunto(pt: RondasPunto) {
    if (!confirm(`¿Eliminar solo el punto “${pt.nombre}”? Los demás se quedan.`)) return;
    this.guardando.set(true);
    this.api.eliminarPunto(pt.id).subscribe({
      next: () => {
        this.puntosSetup.set(this.puntosSetup().filter((p) => p.id !== pt.id));
        this.guardando.set(false);
        if (this.editandoId === pt.id) this.cancelarNombre();
        this.aviso.set(`Punto ${pt.nombre} eliminado.`);
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aviso.set(msg(e, 'No se pudo eliminar el punto'));
      },
    });
  }

  guardarNombre(pt: RondasPunto) {
    const nombre = this.editNombre.trim();
    if (nombre.length < 2) {
      this.aviso.set('Escribe un nombre de al menos 2 letras.');
      return;
    }
    this.guardando.set(true);
    this.api.actualizarPunto(pt.id, { nombre }).subscribe({
      next: (row) => {
        this.puntosSetup.set(this.puntosSetup().map((p) => (p.id === row.id ? row : p)));
        this.guardando.set(false);
        this.cancelarNombre();
        this.aviso.set(`Punto renombrado a ${row.nombre}.`);
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aviso.set(msg(e, 'No se pudo renombrar'));
      },
    });
  }

  private nombreSiguiente() {
    const n = this.puntoNombre.trim();
    return n.length >= 2 ? n : `Punto ${this.puntosSetup().length + 1}`;
  }

  iniciarBrujula() {
    if (!navigator.geolocation) {
      this.gpsNota.set('Este teléfono no da GPS.');
      return;
    }
    this.pararGps();
    this.watchId = navigator.geolocation.watchPosition(
      (p) => this.aplicarCoords(p.coords),
      () => this.gpsNota.set('Sin permiso de GPS. Activa ubicación precisa para tomar el punto.'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 },
    );
  }

  private aplicarCoords(c: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
  }) {
    this.pos.set({ lat: c.latitude, lng: c.longitude });
    this.accuracy.set(Math.round(c.accuracy));
    this.altitud.set(c.altitude != null ? Math.round(c.altitude) : null);
    if (c.accuracy > this.radioEntero()) {
      this.gpsNota.set(
        `GPS ±${Math.round(c.accuracy)} m. Radio ${this.radioEntero()} m. No se guarda hasta que el ± sea menor o igual al radio.`,
      );
    } else {
      this.gpsNota.set(`GPS listo ±${Math.round(c.accuracy)} m. Ya puedes tomar el punto.`);
    }
  }

  private leerGpsMejor(ms = 10000): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
  }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('sin gps'));
        return;
      }
      const snap = (c: GeolocationCoordinates) => ({
        latitude: c.latitude,
        longitude: c.longitude,
        accuracy: c.accuracy,
        altitude: c.altitude,
      });
      let best: ReturnType<typeof snap> | null = null;
      let id = 0;
      let t = 0;
      const finish = () => {
        if (id) navigator.geolocation.clearWatch(id);
        if (t) clearTimeout(t);
        if (best && best.accuracy <= this.radioEntero()) {
          resolve(best);
          return;
        }
        reject(new Error('gps impreciso'));
      };
      id = navigator.geolocation.watchPosition(
        (p) => {
          const s = snap(p.coords);
          this.aplicarCoords(s);
          if (!best || s.accuracy < best.accuracy) best = s;
          if (s.accuracy <= this.radioEntero()) finish();
        },
        () => finish(),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 },
      );
      t = window.setTimeout(finish, ms);
    });
  }

  radioEntero() {
    const v = Number(this.radio);
    if (!Number.isFinite(v)) return 8;
    return Math.round(v);
  }

  private crearPuntoGps(
    lat: number,
    lng: number,
    nombre: string,
    altitud?: number | null,
    precisionMetros?: number,
  ) {
    if (!this.setupPostId || this.guardando()) return;
    const radio = this.radioEntero();
    const acc = precisionMetros ?? this.accuracy() ?? 99;
    if (acc > radio) {
      this.aviso.set(`No se guarda: GPS ±${Math.round(acc)} m supera el radio de ${radio} m.`);
      return;
    }
    this.guardando.set(true);
    this.api
      .crearPunto({
        postId: this.setupPostId,
        nombre,
        latitud: lat,
        longitud: lng,
        altitud: altitud ?? this.altitud(),
        radioMetros: radio,
        precisionMetros: acc,
        orden: this.puntosSetup().length + 1,
      })
      .subscribe({
        next: (pt) => {
          this.puntosSetup.set([...this.puntosSetup(), pt]);
          this.guardando.set(false);
          this.puntoNombre = '';
          this.aviso.set(
            `${nombre} guardado (${this.radioEntero()} m): ${Number(pt.latitud).toFixed(6)}, ${Number(pt.longitud).toFixed(6)}`,
          );
          navigator.vibrate?.([60, 30, 60]);
        },
        error: (e: HttpErrorResponse) => {
          this.guardando.set(false);
          this.aviso.set(msg(e, 'No se pudo guardar el punto'));
        },
      });
  }

  private async pedirRumbo() {
    try {
      const DOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      if (typeof DOE.requestPermission === 'function') {
        const ok = await DOE.requestPermission();
        if (ok !== 'granted') return;
      }
    } catch {
      /* iOS puede negar el sensor */
    }
    this.soltarRumbo();
    this.rumboOn = true;
    window.addEventListener('deviceorientationabsolute', this.onOrient, true);
    window.addEventListener('deviceorientation', this.onOrient, true);
  }

  private soltarRumbo() {
    if (!this.rumboOn) return;
    window.removeEventListener('deviceorientationabsolute', this.onOrient, true);
    window.removeEventListener('deviceorientation', this.onOrient, true);
    this.rumboOn = false;
  }

  private onOrient = (e: DeviceOrientationEvent) => {
    const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
      .webkitCompassHeading;
    if (typeof webkit === 'number' && !Number.isNaN(webkit)) {
      this.heading.set(webkit);
      return;
    }
    if (e.alpha == null) return;
    this.heading.set((360 - e.alpha + 360) % 360);
  };

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
        const cached = leerPuntos(post.id);
        if (cached.length) this.puntos.set(cached);
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
    this.iniciarGps();
    this.refrescarPuntos();
  }

  refrescarPuntos() {
    if (this.modoPuntos || this.vista() !== 'ronda' || !this.api.campoToken()) return;
    this.api.puntosCampo().subscribe({
      next: (pts) => {
        this.puntos.set(pts);
        const post = this.post();
        if (post) guardarPuntos(post.id, pts);
        if (!pts.length) {
          this.gpsNota.set(
            'Aún no hay puntos. Cuando Sistemas los tome y haya señal, salen aquí.',
          );
        }
      },
      error: () => {
        const post = this.post();
        const cached = post ? leerPuntos(post.id) : [];
        if (cached.length) {
          this.puntos.set(cached);
          return;
        }
        if (!this.puntos().length) {
          this.gpsNota.set(
            'Sin red: no hay puntos en este teléfono. Entra con datos al menos una vez.',
          );
        }
      },
    });
  }

  iniciarGps() {
    this.pararGps();
    void this.pedirWakeLock();
    this.iniciarSyncAuto();
    if (!navigator.geolocation) {
      this.gpsNota.set('Este teléfono no da GPS.');
      return;
    }
    this.watchId = navigator.geolocation.watchPosition(
      (p) =>
        this.alGps(
          p.coords.latitude,
          p.coords.longitude,
          p.coords.accuracy,
          p.coords.altitude,
        ),
      () => this.gpsNota.set('Sin permiso de GPS. Actívalo para marcar la ronda.'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }

  alGps(lat: number, lng: number, accuracy: number, altitude: number | null) {
    this.pos.set({ lat, lng });
    this.altitud.set(altitude != null ? Math.round(altitude) : null);
    if (this.lock) return;
    const geo = {
      lat,
      lng,
      accuracy,
      altitud: altitude,
      puntos: this.puntos(),
    };
    const hit = candidatoMarcacion(geo);
    if (!hit.ok) {
      this.dwell = null;
      if (hit.motivo === 'precision') {
        this.gpsNota.set(
          `GPS poco preciso (±${Math.round(hit.accuracy || accuracy)} m). Debes estar EN el punto, no a 10 m.`,
        );
      } else if (hit.motivo === 'altura') {
        this.gpsNota.set(
          `Estás cerca de ${hit.puntoNombre}, pero no a la misma altura. Sube a la terraza o al piso del punto.`,
        );
      } else if (hit.puntoNombre && hit.distancia != null) {
        this.gpsNota.set(
          `Faltan ${hit.distancia} m para ${hit.puntoNombre}. Tienes que llegar al punto, no basta pasar cerca.`,
        );
      }
      return;
    }
    if (!this.dwell || this.dwell.puntoId !== hit.punto.id) {
      this.dwell = { puntoId: hit.punto.id, desde: Date.now() };
    }
    const falta = DWELL_MS - (Date.now() - this.dwell.desde);
    if (falta > 0) {
      this.gpsNota.set(
        `En ${hit.punto.nombre}: quédate ${Math.ceil(falta / 1000)} s. Si te vas, no marca.`,
      );
      return;
    }
    const res = detectarMarcacion({
      ...geo,
      marcas: this.marcas(),
      antiDupMin: 5,
      dispositivoId: this.api.deviceId(),
    });
    if ('motivo' in res) return;
    this.gpsNota.set('');
    this.dwell = null;
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
    return Math.round(distanciaMetros(pos.lat, pos.lng, Number(pt.latitud), Number(pt.longitud)));
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
    if (!pend.length || this.sincronizando() || !this.api.campoToken()) {
      return Promise.resolve();
    }
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
            altitud: m.altitud ?? null,
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
    this.pararSyncAuto();
    if (this.watchId != null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    void this.wake?.release();
    this.wake = null;
  }

  private iniciarSyncAuto() {
    this.pararSyncAuto();
    void this.sincronizar();
    this.syncTimer = setInterval(() => {
      this.refrescarPuntos();
      void this.sincronizar();
    }, 15000);
    document.addEventListener('visibilitychange', this.onVisible);
    window.addEventListener('pageshow', this.onOnline);
    window.addEventListener('focus', this.onOnline);
  }

  private pararSyncAuto() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    document.removeEventListener('visibilitychange', this.onVisible);
    window.removeEventListener('pageshow', this.onOnline);
    window.removeEventListener('focus', this.onOnline);
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

function leerPuntos(postId: string): RondasPunto[] {
  try {
    const data = JSON.parse(localStorage.getItem(PUNTOS_KEY) || 'null');
    if (!data || data.postId !== postId) return [];
    return data.items || [];
  } catch {
    return [];
  }
}

function guardarPuntos(postId: string, items: RondasPunto[]) {
  localStorage.setItem(PUNTOS_KEY, JSON.stringify({ postId, items }));
}

function msg(e: HttpErrorResponse, fallback = 'Error') {
  const m = e.error?.message || e.error?.error;
  return typeof m === 'string' ? m : fallback;
}

function aGrados(value: number, pos: string, neg: string) {
  const hemi = value >= 0 ? pos : neg;
  const abs = Math.abs(value);
  let degrees = Math.floor(abs);
  const mFloat = (abs - degrees) * 60;
  let minutes = Math.floor(mFloat);
  let seconds = Math.round((mFloat - minutes) * 60);
  if (seconds === 60) {
    seconds = 0;
    minutes += 1;
  }
  if (minutes === 60) {
    minutes = 0;
    degrees += 1;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${degrees}°${pad(minutes)}'${pad(seconds)}" ${hemi}`;
}

function cardinal(deg: number) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}
