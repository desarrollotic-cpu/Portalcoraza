import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GpsError, leerGpsMejor } from '../rondas/rondas-gps';
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
const ALERTAS_KEY = 'rondas_campo_alertas';
const PUNTOS_KEY = 'rondas_campo_puntos';
const VIG_KEY = 'rondas_campo_vig';
/** Marca si hay una ronda abierta en este telefono. */
const RONDA_ABIERTA_KEY = 'rondas.abierta';

type AlertaLocal = {
  uuid: string;
  tipo: string;
  mensaje: string;
  latitud: number | null;
  longitud: number | null;
  fechaHora: string;
  estado: 'pendiente' | 'enviado';
};

const TIPOS_ALERTA = [
  { id: 'EMERGENCIA', label: 'Emergencia' },
  { id: 'INCIDENTE', label: 'Incidente' },
  { id: 'APOYO', label: 'Pido apoyo' },
  { id: 'NOVEDAD', label: 'Novedad' },
] as const;

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
        <section class="card">
          <h1>Entrar a la ronda</h1>
          <p class="nota">
            Escribe el nombre de la ronda y la clave que te dio Sistemas.
          </p>
          <label>
            Nombre de la ronda
            <input
              type="text"
              [(ngModel)]="rondaNombre"
              autocomplete="off"
              placeholder="Ronda Coraza"
            />
          </label>
          <label>
            Clave
            <input
              type="password"
              [(ngModel)]="rondaClave"
              autocomplete="off"
              placeholder="Clave de la ronda"
            />
          </label>
          <button
            type="button"
            class="cta"
            [disabled]="entrando() || !rondaNombre.trim() || !rondaClave.trim()"
            (click)="entrar()"
          >
            {{ entrando() ? 'Entrando…' : 'Entrar' }}
          </button>
        </section>
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
              <p class="nota">Buscando GPS…</p>
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
              <select [(ngModel)]="radio">
                <option [ngValue]="8">8 m — mínimo (portería, terraza)</option>
                <option [ngValue]="10">10 m</option>
                <option [ngValue]="12">12 m</option>
                <option [ngValue]="15">15 m</option>
                <option [ngValue]="20">20 m</option>
                <option [ngValue]="25">25 m — máximo</option>
              </select>
            </label>

            <button
              type="button"
              class="cta"
              [disabled]="guardando() || tomandoGps()"
              (click)="tomarPunto()"
            >
              @if (tomandoGps()) {
                Fijando GPS…
              } @else if (guardando()) {
                Guardando…
              } @else {
                Tomar punto
              }
            </button>

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

          @if (!enRonda()) {
            <button type="button" class="btn-grande iniciar" (click)="iniciarRonda()">
              Iniciar ronda
            </button>
            <p class="nota">Pulsa para empezar. Hasta entonces no se marca ningún punto.</p>
          } @else {
            <button type="button" class="btn-grande terminar" (click)="pedirTerminar()">
              Terminar ronda
            </button>
          }

          <ul class="puntos">
            @for (pt of puntos(); track pt.id) {
              <li [class.ok]="marcadoHoy(pt.id)">
                <b [attr.aria-label]="marcadoHoy(pt.id) ? 'Marcado' : 'Pendiente'">
                  {{ marcadoHoy(pt.id) ? '✓' : '✗' }}
                </b>
                <div>
                  <strong>{{ pt.orden }}. {{ pt.nombre }}</strong>
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
                @if (enRonda() && !marcadoHoy(pt.id)) {
                  <button
                    type="button"
                    class="marcar"
                    [disabled]="marcando() === pt.id"
                    (click)="marcarPunto(pt)"
                  >
                    {{ marcando() === pt.id ? '…' : 'Marcar' }}
                  </button>
                }
              </li>
            }
          </ul>
        </section>
        @if (alertaAbierta()) {
          <section class="card">
            <h1>Enviar alerta</h1>
            @for (t of tiposAlerta; track t.id) {
              <button
                type="button"
                [class.cta]="alertaTipo === t.id"
                (click)="alertaTipo = t.id"
              >
                {{ t.label }}
              </button>
            }
            <label>
              Qué pasó
              <input type="text" [(ngModel)]="alertaTexto" maxlength="400" placeholder="Opcional" />
            </label>
            <button type="button" class="cta alerta-btn" (click)="enviarAlerta()">Enviar alerta</button>
            <button type="button" class="ghost" (click)="alertaAbierta.set(false)">Cancelar</button>
          </section>
        }
        <footer>
          <p>
            @if (sincronizando()) {
              Enviando a Portal…
            } @else if (pendientes() || alertasPendientes()) {
              {{ pendientes() + alertasPendientes() }} en el teléfono. Se envían solas al tener datos.
            } @else {
              Enviado a Portal.
            }
          </p>
          <button type="button" class="alerta-btn" (click)="alertaAbierta.set(true)">Alerta</button>
        </footer>
      }

      @if (confirmarTerminar()) {
        <section class="card">
          <h1>¿Terminar la ronda?</h1>
          <p class="nota">
            Vas {{ hechos() }} de {{ puntos().length }}.
            @if (pendientes() || alertasPendientes()) {
              Quedan {{ pendientes() + alertasPendientes() }} sin enviar: se mandan solas cuando haya datos.
            }
            Al terminar se apaga el GPS y deja de gastar batería.
          </p>
          <button type="button" class="cta" (click)="salirRonda()">Sí, terminar</button>
          <button type="button" class="ghost" (click)="confirmarTerminar.set(false)">Seguir en la ronda</button>
        </section>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      /* Pantalla de campo: se usa con una mano y a veces de noche. Nada debe
         salirse a los lados ni obligar a desplazar horizontalmente. */
      overflow-x: hidden;
      /* Sin pellizco para acercar: el vigilante se desorienta si la pantalla
         queda ampliada, y el zoom saca scroll lateral. Se deja el
         desplazamiento vertical normal. Va aqui y no en el index para no
         quitarle el zoom al resto del portal, donde si hace falta. */
      touch-action: pan-x pan-y;
      color: var(--text-primary);
      background: var(--gradient-page);
      font-family: var(--font-sans);
    }
    .campo {
      width: 100%;
      box-sizing: border-box;
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
    ul { list-style: none; margin: 0.5rem 0 0; padding: 0; }
    /* Solo el buscador de sugerencias se desplaza. Antes esta regla aplicaba a
       TODAS las listas, incluida la de puntos: le metia alto maximo y scroll
       propio, que en pantalla angosta salia tambien en horizontal. */
    ul.sugerencias { max-height: 40vh; overflow-y: auto; overflow-x: hidden; }
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
    .aviso { background: var(--success-bg); color: var(--success-text); }
    .nota { background: var(--warning-bg); color: var(--warning-text); }
    .brujula-wrap {
      overflow: hidden;
      position: relative; width: min(220px, 70vw); height: min(220px, 70vw); margin: 0.5rem auto 0.25rem;
    }
    .notch {
      position: absolute; top: -6px; left: 50%; z-index: 2;
      width: 0; height: 0; margin-left: -8px;
      border-left: 8px solid transparent; border-right: 8px solid transparent;
      border-top: 12px solid var(--primary-600);
    }
    .brujula {
      width: 100%; height: 100%; border-radius: 50%;
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
    .puntos li .mini.malo { color: var(--error-text); }
    /* Pendiente: X roja. Marcado: chulito verde. Se lee de un vistazo con el
       telefono en la mano, sin tener que leer la hora ni la distancia. */
    .puntos b {
      width: 1.7rem; height: 1.7rem; border-radius: 99px; display: grid; place-items: center;
      background: var(--error-600, #b91c1c); color: #fff; font-size: 0.95rem; font-weight: 800;
      flex-shrink: 0;
    }
    .puntos li.ok b { background: var(--success-600, #15803d); color: #fff; }
    .puntos small { display: block; color: var(--text-muted); }
    /* min-width:0 deja que el texto largo se parta en vez de empujar la fila
       y sacar scroll horizontal en pantallas angostas. */
    .puntos li > div { flex: 1; min-width: 0; }
    .puntos li strong, .puntos li small { overflow-wrap: anywhere; }
    .btn-grande {
      width: 100%; min-height: 52px; border: 0; border-radius: var(--radius-sm);
      font: inherit; font-size: 1.05rem; font-weight: 800; cursor: pointer;
      color: #fff; margin: 0.3rem 0;
    }
    .btn-grande.iniciar { background: var(--success-600, #15803d); }
    .btn-grande.terminar { background: var(--error-600, #b91c1c); }
    .puntos li > div { flex: 1; }
    .marcar {
      width: auto; min-height: 44px; padding: 0.5rem 1rem; border: 0;
      border-radius: var(--radius-sm); background: var(--gradient-primary);
      color: var(--text-on-primary); font: inherit; font-weight: 700;
      cursor: pointer; flex-shrink: 0;
    }
    .marcar:disabled { opacity: 0.6; }
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
    .alerta-btn {
      width: auto; min-height: 48px; padding: 0.55rem 0.9rem; border: 0; border-radius: var(--radius-sm);
      background: var(--error-600, #b91c1c); color: #fff; font: inherit; font-weight: 800; cursor: pointer;
      text-align: center;
    }
    button.cta.alerta-btn { width: 100%; margin-top: 0.5rem; }
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
  alertas = signal<AlertaLocal[]>([]);
  alertaAbierta = signal(false);
  tiposAlerta = TIPOS_ALERTA;
  alertaTipo: string = 'INCIDENTE';
  alertaTexto = '';
  pos = signal<{ lat: number; lng: number } | null>(null);
  heading = signal<number | null>(null);
  accuracy = signal<number | null>(null);
  altitud = signal<number | null>(null);
  tomandoGps = signal(false);
  vigNombre = signal('');
  /** Credenciales de la ronda: el celular entra como la ronda, no como persona. */
  rondaNombre = '';
  rondaClave = '';
  readonly marcando = signal('');
  /**
   * Ronda en curso. Se guarda en el telefono: si la pantalla se recarga o se
   * cierra sin querer a mitad del recorrido, la ronda sigue abierta.
   */
  readonly enRonda = signal(localStorage.getItem(RONDA_ABIERTA_KEY) === '1');
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
      () => this.aviso.set('Sin permiso de GPS. Actívalo para tomar el punto.'),
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

  /**
   * Los puntos ya no se crean desde el celular del vigilante: se crean en el
   * portal, en Rondas -> Rondas y puntos, donde además se les pone nombre,
   * clave y puesto. Esta pantalla quedó solo para hacer la ronda.
   *
   * La vista `sistemas` y su ruta `/rondas/puntos` quedaron sin uso; se
   * retiran en un cambio aparte para no tocar el flujo de ronda sin probarlo.
   */
  private crearPuntoGps(
    _lat: number,
    _lng: number,
    _nombre: string,
    _altitud?: number | null,
    _precisionMetros?: number,
  ) {
    this.aviso.set(
      'Los puntos se crean en el portal: Rondas → Rondas y puntos. Esta pantalla es solo para hacer la ronda.',
    );
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
    const nombre = this.rondaNombre.trim();
    const clave = this.rondaClave.trim();
    if (!nombre || !clave || this.entrando()) return;
    this.entrando.set(true);
    this.aviso.set('');
    this.api.entrar(nombre, clave).subscribe({
      next: (res) => {
        this.entrando.set(false);
        this.api.setCampoSesion(res.accessToken);
        this.rondaClave = '';
        // El titulo de la ronda hace las veces de saludo: no hay persona.
        this.vigNombre.set(res.ronda.nombre);
        this.post.set(res.post);
        this.api.vincularPost(res.post);
        localStorage.setItem(VIG_KEY, JSON.stringify(res.ronda));
        this.marcas.set(leerMarcas(res.ronda.id));
        this.alertas.set(leerAlertas(res.ronda.id));
        const cached = leerPuntos(res.post.id);
        if (cached.length) this.puntos.set(cached);
        this.vista.set('ronda');
        this.cargarPuntosYGps();
      },
      error: (err: HttpErrorResponse) => {
        this.entrando.set(false);
        this.aviso.set(msg(err, 'Nombre de ronda o clave incorrectos'));
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
      error: (err: HttpErrorResponse) => {
        const post = this.post();
        const cached = post ? leerPuntos(post.id) : [];
        if (cached.length) {
          this.puntos.set(cached);
          return;
        }
        if (this.puntos().length) return;
        // No todo fallo es falta de red: decirlo cuando el servidor rechazó
        // manda a buscar señal donde no está el problema.
        if (!navigator.onLine || err.status === 0) {
          this.gpsNota.set(
            'Sin red: no hay puntos en este teléfono. Entra con datos al menos una vez.',
          );
        } else if (err.status === 401 || err.status === 403) {
          this.gpsNota.set('La sesión de la ronda no es válida. Vuelve a entrar.');
        } else {
          this.gpsNota.set(
            `No se pudieron traer los puntos (error ${err.status}). Avisa a Sistemas.`,
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

  /**
   * Marca un punto porque el vigilante lo pidió, no porque pasó cerca.
   *
   * Es más confiable que la marcación automática por dos razones: el vigilante
   * dice QUÉ punto está marcando —  así no hay que adivinar entre dos que estén
   * juntos o uno encima del otro, que es donde la altitud del GPS falla —  y
   * queda constancia de que alguien estuvo ahí y actuó, no solo de que un
   * teléfono pasó cerca.
   *
   * El GPS sigue mandando: si no está dentro del radio, no marca.
   */
  async marcarPunto(pt: RondasPunto) {
    if (this.marcando()) return;
    this.marcando.set(pt.id);
    this.aviso.set('');
    this.gpsNota.set('');

    const radio = Math.round(Number(pt.radioMetros) || 10);
    try {
      const l = await leerGpsMejor(radio, 12000, (lec) => {
        this.accuracy.set(Math.round(lec.accuracy));
        this.gpsNota.set(`Leyendo GPS: ±${Math.round(lec.accuracy)} m…`);
      });

      const dist = Math.round(
        distanciaMetros(l.latitude, l.longitude, Number(pt.latitud), Number(pt.longitud)),
      );
      if (!dentroDelRadio(dist, radio)) {
        this.gpsNota.set(
          `Estás a ${dist} m de ${pt.nombre} y el punto llega hasta ${radio} m. Acércate y vuelve a marcar.`,
        );
        return;
      }

      const yaMarcado = this.marcas().some(
        (m) => m.puntoId === pt.id && esHoyBogota(m.fechaHora),
      );
      if (yaMarcado) {
        this.gpsNota.set(`${pt.nombre} ya está marcado hoy.`);
        return;
      }

      const marca: MarcaLocal = {
        uuid: crypto.randomUUID(),
        puntoId: pt.id,
        puntoNombre: pt.nombre,
        latitud: l.latitude,
        longitud: l.longitude,
        precisionMetros: Math.round(l.accuracy * 10) / 10,
        fechaHora: new Date().toISOString(),
        dispositivoId: this.api.deviceId(),
        estado: 'pendiente',
        altitud: l.altitude ?? null,
      };

      const vig = JSON.parse(localStorage.getItem(VIG_KEY) || '{}') as { id?: string };
      const next = [marca, ...this.marcas()];
      this.marcas.set(next);
      if (vig.id) guardarMarcas(vig.id, next);

      this.gpsNota.set('');
      this.aviso.set(`Punto ${pt.orden} · ${pt.nombre} marcado.`);
      navigator.vibrate?.([80, 40, 80]);
      void this.sincronizar();
    } catch (e) {
      const g = e as GpsError;
      this.gpsNota.set(
        g.motivo === 'sin-permiso'
          ? 'Sin permiso de ubicación. Actívalo para poder marcar.'
          : g.motivo === 'sin-gps'
            ? 'Este teléfono no tiene GPS.'
            : `${g.message} Sal a cielo abierto y vuelve a intentar.`,
      );
    } finally {
      this.marcando.set('');
    }
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

  alertasPendientes() {
    return this.alertas().filter((a) => a.estado === 'pendiente').length;
  }

  enviarAlerta() {
    const vig = JSON.parse(localStorage.getItem(VIG_KEY) || '{}') as { id?: string };
    const pos = this.pos();
    const item: AlertaLocal = {
      uuid: crypto.randomUUID(),
      tipo: this.alertaTipo || 'INCIDENTE',
      mensaje: this.alertaTexto.trim(),
      latitud: pos?.lat ?? null,
      longitud: pos?.lng ?? null,
      fechaHora: new Date().toISOString(),
      estado: 'pendiente',
    };
    const next = [item, ...this.alertas()];
    this.alertas.set(next);
    if (vig.id) guardarAlertas(vig.id, next);
    this.alertaTexto = '';
    this.alertaAbierta.set(false);
    this.aviso.set('Alerta guardada. Se envía al tener datos.');
    navigator.vibrate?.([120, 60, 120]);
    void this.sincronizar();
  }

  sincronizar(): Promise<void> {
    if (this.sincronizando() || !this.api.campoToken()) return Promise.resolve();
    this.sincronizando.set(true);
    return this.flushMarcas()
      .then(() => this.flushAlertas())
      .finally(() => this.sincronizando.set(false));
  }

  private flushMarcas(): Promise<void> {
    const pend = this.marcas().filter((m) => m.estado === 'pendiente');
    if (!pend.length) return Promise.resolve();
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
            resolve();
          },
          error: () => resolve(),
        });
    });
  }

  private flushAlertas(): Promise<void> {
    const pend = this.alertas().filter((a) => a.estado === 'pendiente');
    if (!pend.length) return Promise.resolve();
    return new Promise((resolve) => {
      this.api
        .enviarAlertas(
          pend.map((a) => ({
            uuidCliente: a.uuid,
            tipo: a.tipo,
            mensaje: a.mensaje,
            latitud: a.latitud,
            longitud: a.longitud,
            fechaHora: a.fechaHora,
            dispositivoId: this.api.deviceId(),
          })),
        )
        .subscribe({
          next: (data) => {
            const ok = new Set([...(data.aceptadas || []), ...(data.duplicadas || [])]);
            const next = this.alertas().map((a) =>
              ok.has(a.uuid) ? { ...a, estado: 'enviado' as const } : a,
            );
            this.alertas.set(next);
            const vig = JSON.parse(localStorage.getItem(VIG_KEY) || '{}') as { id?: string };
            if (vig.id) guardarAlertas(vig.id, next);
            const n = data.aceptadas?.length || 0;
            if (n) this.aviso.set(n === 1 ? 'Alerta enviada a Portal.' : `${n} alertas enviadas.`);
            resolve();
          },
          error: () => resolve(),
        });
    });
  }

  /** Confirma antes de cortar el GPS: terminar por error deja la ronda a medias. */
  readonly confirmarTerminar = signal(false);

  iniciarRonda() {
    this.enRonda.set(true);
    localStorage.setItem(RONDA_ABIERTA_KEY, '1');
    this.aviso.set('Ronda iniciada. Ve a cada punto y pulsa Marcar.');
    this.iniciarGps();
  }

  pedirTerminar() {
    this.confirmarTerminar.set(true);
  }

  salirRonda() {
    this.confirmarTerminar.set(false);
    this.enRonda.set(false);
    localStorage.removeItem(RONDA_ABIERTA_KEY);
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

function leerAlertas(vigId: string): AlertaLocal[] {
  try {
    const data = JSON.parse(localStorage.getItem(ALERTAS_KEY) || 'null');
    if (!data || data.id !== vigId) return [];
    return data.items || [];
  } catch {
    return [];
  }
}

function guardarAlertas(vigId: string, items: AlertaLocal[]) {
  localStorage.setItem(ALERTAS_KEY, JSON.stringify({ id: vigId, items }));
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
