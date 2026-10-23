import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RondasApiService, RondasPost, RondasPunto, RondasRuta } from '../rondas-api.service';
import { GpsError, leerGpsMejor } from '../rondas-gps';

/**
 * Rondas y sus puntos, desde el portal.
 *
 * El flujo es el del administrador en campo: crea la ronda, la amarra a un
 * puesto de los que ya existen, le pone clave, y ahí mismo va tomando los
 * puntos parado en cada sitio.
 *
 * Los puntos se guardan al tomarlos, uno por uno. Si el celular se apaga a
 * mitad del recorrido no se pierde lo que ya se hizo.
 */
@Component({
  selector: 'app-rondas-puntos',
  imports: [FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <h2>Rondas y puntos</h2>
        <p>
          Una ronda es un recorrido con nombre propio, amarrado a un puesto. El vigilante entra
          desde el celular con ese nombre y la clave, y pasa por los puntos que le configures aquí.
        </p>
      </header>

      @if (!esMovil()) {
        <p class="aviso">
          Estás en un computador. Para tomar puntos abre esta pantalla en el celular: sin GPS la
          ubicación sale aproximada y el punto queda corrido.
        </p>
      }
      @if (aviso()) {
        <p class="nota" [class.error]="esError()">{{ aviso() }}</p>
      }

      <!-- ===== Lista de rondas ===== -->
      @if (!rutaAbierta()) {
        <section class="card">
          <div class="fila-titulo">
            <h3>Rondas configuradas</h3>
            <button type="button" class="cta chico" (click)="abrirNueva()">+ Crear ronda</button>
          </div>

          <ul class="lista">
            @for (r of rutas(); track r.id) {
              <li>
                <div class="crece">
                  <strong>{{ r.nombre }}</strong>
                  <small>
                    {{ r.puestoNombre }} · {{ r.puntos }} punto(s)
                    @if (r.sinClave) { · <b class="ojo">sin clave</b> }
                  </small>
                </div>
                @if (rutaPorBorrar() === r.id) {
                  <button type="button" class="mini malo" (click)="borrarRuta(r)">Confirmar</button>
                  <button type="button" class="mini" (click)="rutaPorBorrar.set('')">No</button>
                } @else {
                  <button type="button" class="mini" (click)="abrir(r)">Abrir</button>
                  <button type="button" class="mini malo" (click)="rutaPorBorrar.set(r.id)">
                    Eliminar
                  </button>
                }
              </li>
            } @empty {
              <li class="vacio">Todavía no hay rondas. Crea la primera con el botón de arriba.</li>
            }
          </ul>
        </section>
      }

      <!-- ===== Crear ronda ===== -->
      @if (creando()) {
        <section class="card">
          <h3>Nueva ronda</h3>

          <label class="campo">
            Nombre de la ronda
            <input type="text" [(ngModel)]="nombreRuta" maxlength="120" placeholder="Ronda Coraza" />
          </label>

          <label class="campo">
            Puesto al que pertenece
            <input
              type="search"
              [(ngModel)]="buscaPuesto"
              placeholder="Escribe para buscar: Oficina Coraza…"
            />
          </label>
          @if (buscaPuesto.trim() && !puestoElegido()) {
            <ul class="lista sugerencias">
              @for (p of puestosFiltrados(); track p.id) {
                <li>
                  <button type="button" class="mini crece izq" (click)="elegirPuesto(p)">
                    {{ p.name }}
                  </button>
                </li>
              } @empty {
                <li class="vacio">Ningún puesto coincide.</li>
              }
            </ul>
          }
          @if (puestoElegido(); as p) {
            <p class="nota">
              Puesto: <strong>{{ p.name }}</strong>
              <button type="button" class="mini" (click)="limpiarPuesto()">Cambiar</button>
            </p>
          }

          <label class="campo">
            Clave para entrar desde el celular
            <input type="text" [(ngModel)]="clave" maxlength="64" placeholder="Mínimo 4 caracteres" />
          </label>
          <p class="nota">
            El vigilante entra con el nombre de la ronda y esta clave. Anótala: por seguridad no se
            puede volver a ver, solo cambiar.
          </p>

          <button
            type="button"
            class="cta"
            [disabled]="!puedeCrear() || guardando()"
            (click)="crearRuta()"
          >
            {{ guardando() ? 'Creando…' : 'Crear y tomar puntos' }}
          </button>
          <button type="button" class="ghost" (click)="cancelarNueva()">Cancelar</button>
        </section>
      }

      <!-- ===== Ronda abierta: sus puntos ===== -->
      @if (rutaAbierta(); as r) {
        <section class="card">
          <div class="fila-titulo">
            <div>
              <h3>{{ r.nombre }}</h3>
              <small class="nota">{{ r.puestoNombre }}</small>
            </div>
            <button type="button" class="mini" (click)="cerrar()">Listo</button>
          </div>

          @if (r.sinClave) {
            <p class="nota error">
              Esta ronda quedó sin clave y nadie puede entrar. Ponle una abajo.
            </p>
          }

          <label class="campo">
            Nombre del punto
            <input
              type="text"
              [(ngModel)]="nombrePunto"
              maxlength="120"
              placeholder="Portería, Parqueadero, Terraza…"
            />
          </label>
          <label class="campo corto">
            Radio (m)
            <input type="number" [(ngModel)]="radio" min="8" max="25" />
          </label>

          <button
            type="button"
            class="cta"
            [disabled]="!nombrePunto.trim() || tomando()"
            (click)="tomarPunto()"
          >
            {{ tomando() ? 'Leyendo GPS…' : 'Crear punto aquí' }}
          </button>
          @if (tomando() && precision() !== null) {
            <p class="nota">
              Precisión ±{{ precision() }} m · se necesita ±{{ radioEntero() }} m o mejor.
              Quédate quieto unos segundos.
            </p>
          }

          <ul class="lista">
            @for (p of puntos(); track p.id) {
              <li>
                <b>{{ p.orden }}</b>
                <div class="crece">
                  <strong>{{ p.nombre }}</strong>
                  <small>radio {{ p.radioMetros }} m</small>
                </div>
                @if (porBorrar() === p.id) {
                  <button type="button" class="mini malo" (click)="borrarPunto(p)">Confirmar</button>
                  <button type="button" class="mini" (click)="porBorrar.set('')">No</button>
                } @else {
                  <button type="button" class="mini malo" (click)="porBorrar.set(p.id)">
                    Eliminar
                  </button>
                }
              </li>
            } @empty {
              <li class="vacio">Sin puntos todavía. Párate en el primero y tómalo arriba.</li>
            }
          </ul>
        </section>

        <section class="card">
          <h3>Cambiar la clave</h3>
          <label class="campo">
            Clave nueva
            <input type="text" [(ngModel)]="claveNueva" maxlength="64" placeholder="Mínimo 4 caracteres" />
          </label>
          <button
            type="button"
            class="ghost"
            [disabled]="claveNueva.trim().length < 4 || guardando()"
            (click)="cambiarClave()"
          >
            Guardar clave nueva
          </button>
        </section>
      }
    </section>
  `,
  styles: `
    /* Se usa desde el celular, parado en el punto: nada debe salirse a los
       lados ni obligar a desplazar horizontalmente. */
    :host { display: block; overflow-x: hidden; }
    .page { display: flex; flex-direction: column; gap: 1rem; max-width: 640px; }
    .page * { box-sizing: border-box; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    .head p, .nota { margin: 0; color: var(--text-muted, #6b7280); font-size: 0.9rem; }
    .aviso {
      margin: 0; padding: 0.75rem 1rem; border-radius: 0.5rem;
      background: color-mix(in srgb, var(--warning-500, #f59e0b) 16%, var(--surface));
      font-size: 0.9rem;
    }
    .card {
      display: flex; flex-direction: column; gap: 0.7rem; padding: 1rem;
      border: 1px solid var(--border, #e5e7eb); border-radius: 0.5rem; background: var(--surface);
    }
    .card h3 { margin: 0; font-size: 1rem; }
    .fila-titulo { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: space-between; }
    .campo { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; min-width: 0; }
    .campo.corto { max-width: 8rem; }
    .campo input {
      width: 100%; max-width: 100%;
      padding: 0.6rem 0.7rem; border: 1px solid var(--border, #d1d5db);
      border-radius: 0.4rem; font: inherit; font-weight: 400; min-height: 44px;
    }
    .cta {
      min-height: 48px; border: 0; border-radius: 0.5rem;
      background: var(--gradient-primary, #1d4ed8); color: var(--text-on-primary, #fff);
      font: inherit; font-weight: 700; cursor: pointer;
    }
    .cta.chico { min-height: 40px; padding: 0 0.9rem; }
    .cta:disabled { opacity: 0.55; cursor: not-allowed; }
    .ghost {
      min-height: 44px; border: 1px solid var(--border, #d1d5db); border-radius: 0.5rem;
      background: none; color: var(--primary-600, #1d4ed8); font: inherit; font-weight: 600; cursor: pointer;
    }
    .ghost:disabled { opacity: 0.55; cursor: not-allowed; }
    .error { color: var(--error-text, #b91c1c); font-weight: 600; }
    .ojo { color: var(--error-text, #b91c1c); }
    ul.lista { list-style: none; margin: 0; padding: 0; }
    .lista li {
      display: flex; flex-wrap: wrap; gap: 0.5rem 0.75rem; align-items: center;
      padding: 0.6rem 0; border-top: 1px solid var(--border, #e5e7eb);
    }
    .lista li:first-child { border-top: 0; }
    .lista li.vacio { color: var(--text-muted, #6b7280); font-size: 0.9rem; }
    .lista.sugerencias { max-height: 40vh; overflow: auto; }
    /* min-width:0 deja que el nombre largo se parta en vez de empujar la fila. */
    .crece { flex: 1; min-width: 0; }
    .crece strong, .crece small { overflow-wrap: anywhere; }
    .lista b {
      width: 1.8rem; height: 1.8rem; border-radius: 99px; display: grid; place-items: center;
      background: var(--surface-2, #f3f4f6); font-size: 0.8rem; flex-shrink: 0;
    }
    .lista small { display: block; color: var(--text-muted, #6b7280); font-weight: 400; }
    .mini {
      min-height: 40px; padding: 0.35rem 0.7rem; border: 0; border-radius: 0.4rem;
      background: none; color: var(--primary-600, #1d4ed8); font: inherit;
      font-weight: 700; cursor: pointer; flex-shrink: 0;
    }
    .mini.izq { text-align: left; }
    .mini.malo { color: var(--error-text, #b91c1c); }
  `,
})
export class RondasPuntos implements OnInit {
  private readonly api = inject(RondasApiService);

  readonly rutas = signal<RondasRuta[]>([]);
  readonly puestos = signal<RondasPost[]>([]);
  readonly puntos = signal<RondasPunto[]>([]);
  readonly rutaAbierta = signal<RondasRuta | null>(null);
  readonly creando = signal(false);
  readonly guardando = signal(false);
  readonly tomando = signal(false);
  readonly precision = signal<number | null>(null);
  readonly aviso = signal('');
  readonly esError = signal(false);
  readonly porBorrar = signal('');
  readonly rutaPorBorrar = signal('');
  readonly puestoElegido = signal<RondasPost | null>(null);

  nombreRuta = '';
  buscaPuesto = '';
  clave = '';
  claveNueva = '';
  nombrePunto = '';
  radio = 10;

  /** Sin GPS real el punto queda corrido, así que se avisa en escritorio. */
  readonly esMovil = computed(() => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

  readonly puestosFiltrados = computed(() => {
    const q = this.buscaPuesto.trim().toLowerCase();
    if (!q) return [];
    return this.puestos()
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 20);
  });

  ngOnInit(): void {
    this.cargarRutas();
    this.api.puestosSetup().subscribe({
      next: (p) => this.puestos.set(p),
      error: () => this.fallo('No se pudieron cargar los puestos.'),
    });
  }

  radioEntero(): number {
    const v = Number(this.radio);
    return Number.isFinite(v) ? Math.round(v) : 10;
  }

  puedeCrear(): boolean {
    return (
      this.nombreRuta.trim().length >= 3 &&
      !!this.puestoElegido() &&
      this.clave.trim().length >= 4
    );
  }

  abrirNueva() {
    this.creando.set(true);
    this.rutaAbierta.set(null);
    this.limpiarAviso();
    this.nombreRuta = '';
    this.buscaPuesto = '';
    this.clave = '';
    this.puestoElegido.set(null);
  }

  cancelarNueva() {
    this.creando.set(false);
    this.limpiarAviso();
  }

  elegirPuesto(p: RondasPost) {
    this.puestoElegido.set(p);
    this.buscaPuesto = p.name;
  }

  limpiarPuesto() {
    this.puestoElegido.set(null);
    this.buscaPuesto = '';
  }

  crearRuta() {
    const post = this.puestoElegido();
    if (!post || !this.puedeCrear() || this.guardando()) return;
    this.guardando.set(true);
    this.limpiarAviso();
    this.api
      .crearRuta({ postId: post.id, nombre: this.nombreRuta.trim(), clave: this.clave.trim() })
      .subscribe({
        next: (r) => {
          this.guardando.set(false);
          this.creando.set(false);
          this.clave = '';
          this.cargarRutas();
          this.abrir(r);
          this.ok(`Ronda «${r.nombre}» creada. Ahora toma sus puntos.`);
        },
        error: (e) => {
          this.guardando.set(false);
          this.fallo(this.mensaje(e, 'No se pudo crear la ronda.'));
        },
      });
  }

  abrir(r: RondasRuta) {
    this.rutaAbierta.set(r);
    this.creando.set(false);
    this.porBorrar.set('');
    this.nombrePunto = '';
    this.claveNueva = '';
    this.cargarPuntos(r.id);
  }

  cerrar() {
    this.rutaAbierta.set(null);
    this.puntos.set([]);
    this.limpiarAviso();
    this.cargarRutas();
  }

  async tomarPunto() {
    const r = this.rutaAbierta();
    const nombre = this.nombrePunto.trim();
    if (!r || !nombre || this.tomando()) return;

    this.tomando.set(true);
    this.precision.set(null);
    this.limpiarAviso();

    try {
      const l = await leerGpsMejor(this.radioEntero(), 12000, (lec) =>
        this.precision.set(Math.round(lec.accuracy)),
      );
      this.api
        .crearPunto({
          rutaId: r.id,
          nombre,
          latitud: l.latitude,
          longitud: l.longitude,
          altitud: l.altitude,
          radioMetros: this.radioEntero(),
          precisionMetros: Math.round(l.accuracy),
        })
        .subscribe({
          next: () => {
            this.tomando.set(false);
            this.nombrePunto = '';
            this.ok(`«${nombre}» guardado con ±${Math.round(l.accuracy)} m.`);
            this.cargarPuntos(r.id);
          },
          error: (e) => {
            this.tomando.set(false);
            this.fallo(this.mensaje(e, 'Se leyó el GPS pero no se pudo guardar el punto.'));
          },
        });
    } catch (e) {
      this.tomando.set(false);
      const g = e as GpsError;
      this.fallo(
        g.motivo === 'sin-permiso'
          ? 'El navegador no tiene permiso de ubicación. Actívalo y vuelve a intentar.'
          : g.motivo === 'sin-gps'
            ? 'Este dispositivo no tiene GPS. Abre esta pantalla en el celular.'
            : `${g.message} Sal a cielo abierto o sube el radio del punto.`,
      );
    }
  }

  /** Borra la ronda y sus puntos. Las marcaciones ya hechas no se tocan. */
  borrarRuta(r: RondasRuta) {
    this.rutaPorBorrar.set('');
    this.api.eliminarRuta(r.id).subscribe({
      next: () => {
        this.ok(`Ronda «${r.nombre}» eliminada con sus puntos.`);
        if (this.rutaAbierta()?.id === r.id) {
          this.rutaAbierta.set(null);
          this.puntos.set([]);
        }
        this.cargarRutas();
      },
      error: (e) => this.fallo(this.mensaje(e, 'No se pudo eliminar la ronda.')),
    });
  }

  borrarPunto(p: RondasPunto) {
    const r = this.rutaAbierta();
    this.porBorrar.set('');
    this.api.eliminarPunto(p.id).subscribe({
      next: () => {
        this.ok(`«${p.nombre}» eliminado.`);
        if (r) this.cargarPuntos(r.id);
      },
      error: () => this.fallo('No se pudo eliminar el punto.'),
    });
  }

  cambiarClave() {
    const r = this.rutaAbierta();
    const clave = this.claveNueva.trim();
    if (!r || clave.length < 4 || this.guardando()) return;
    this.guardando.set(true);
    this.api.actualizarRuta(r.id, { clave }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.claveNueva = '';
        this.rutaAbierta.set({ ...r, sinClave: false });
        this.ok('Clave actualizada. Anótala: no se puede volver a ver.');
      },
      error: (e) => {
        this.guardando.set(false);
        this.fallo(this.mensaje(e, 'No se pudo cambiar la clave.'));
      },
    });
  }

  private cargarRutas() {
    this.api.rutas().subscribe({
      next: (r) => this.rutas.set(r),
      error: () => this.fallo('No se pudieron cargar las rondas.'),
    });
  }

  private cargarPuntos(rutaId: string) {
    this.api.puntosDeRuta(rutaId).subscribe({
      next: (p) => this.puntos.set([...p].sort((a, b) => a.orden - b.orden)),
      error: () => this.fallo('No se pudieron cargar los puntos.'),
    });
  }

  private mensaje(e: unknown, porDefecto: string): string {
    const m = (e as { error?: { message?: string | string[] } })?.error?.message;
    if (Array.isArray(m)) return m.join(' ');
    return m || porDefecto;
  }

  private ok(msg: string) {
    this.aviso.set(msg);
    this.esError.set(false);
  }

  private fallo(msg: string) {
    this.aviso.set(msg);
    this.esError.set(true);
  }

  private limpiarAviso() {
    this.aviso.set('');
    this.esError.set(false);
  }
}
