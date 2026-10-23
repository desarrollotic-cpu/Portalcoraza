import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RondasApiService, RondasPost, RondasPunto } from '../rondas-api.service';
import { GpsError, leerGpsMejor } from '../rondas-gps';

/**
 * Puestos y puntos de ronda, desde el portal.
 *
 * Antes los puntos solo se podían tomar desde una dirección aparte
 * (`/rondas/puntos`), que además pedía iniciar sesión otra vez. Aquí el
 * administrador entra como a cualquier otra pantalla: elige el puesto, se para
 * donde va el punto y lo toma.
 *
 * Hay que abrirlo desde el celular: el computador no tiene GPS y tomaría una
 * ubicación aproximada por red, que deja los puntos mal puestos.
 */
@Component({
  selector: 'app-rondas-puntos',
  imports: [FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <h2>Puestos y puntos de ronda</h2>
        <p>
          Elige el puesto, párate donde va el punto y tómalo. El vigilante tendrá que pasar
          por cada uno de estos puntos durante su ronda.
        </p>
      </header>

      @if (!esMovil()) {
        <p class="aviso">
          Estás en un computador. Para tomar puntos abre esta misma pantalla en el celular:
          sin GPS la ubicación sale aproximada y el punto queda mal puesto.
        </p>
      }

      <section class="card">
        <label class="campo">
          Puesto
          <select [ngModel]="postId()" (ngModelChange)="cambiarPuesto($event)">
            <option value="">— Elige el puesto —</option>
            @for (p of puestos(); track p.id) {
              <option [value]="p.id">{{ p.name }} ({{ conteo(p.id) }})</option>
            }
          </select>
        </label>
        <p class="nota">Entre paréntesis, cuántos puntos tiene cada puesto.</p>
      </section>

      @if (postId()) {
        <section class="card">
          <h3>Tomar un punto nuevo</h3>
          <div class="campos">
            <label class="campo">
              Nombre del punto
              <input
                type="text"
                [(ngModel)]="nombre"
                maxlength="120"
                placeholder="Portería, Parqueadero, Terraza…"
              />
            </label>
            <label class="campo corto">
              Radio (m)
              <input type="number" [(ngModel)]="radio" min="5" max="100" />
            </label>
          </div>

          <button
            type="button"
            class="cta"
            [disabled]="!nombre.trim() || tomando()"
            (click)="tomarPunto()"
          >
            {{ tomando() ? 'Leyendo GPS…' : 'Tomar punto aquí' }}
          </button>

          @if (tomando() && precision() !== null) {
            <p class="nota">
              Precisión actual ±{{ precision() }} m · se necesita ±{{ radioEntero() }} m o mejor.
              Quédate quieto unos segundos.
            </p>
          }
          @if (aviso()) {
            <p class="nota" [class.error]="esError()">{{ aviso() }}</p>
          }
        </section>

        <section class="card">
          <h3>Puntos de este puesto</h3>
          @if (cargandoPuntos()) {
            <p class="nota">Cargando…</p>
          }
          <ul class="puntos">
            @for (p of puntos(); track p.id) {
              <li>
                <b>{{ p.orden }}</b>
                <div>
                  <strong>{{ p.nombre }}</strong>
                  <small>radio {{ p.radioMetros }} m</small>
                </div>
                @if (porBorrar() === p.id) {
                  <button type="button" class="mini malo" (click)="borrar(p)">Confirmar</button>
                  <button type="button" class="mini" (click)="porBorrar.set('')">No</button>
                } @else {
                  <button type="button" class="mini malo" (click)="porBorrar.set(p.id)">
                    Eliminar
                  </button>
                }
              </li>
            } @empty {
              @if (!cargandoPuntos()) {
                <li class="vacio">
                  Este puesto todavía no tiene puntos. Párate en el primero y tómalo arriba.
                </li>
              }
            }
          </ul>
        </section>
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1rem; max-width: 640px; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    .head p, .nota { margin: 0; color: var(--text-muted, #6b7280); font-size: 0.9rem; }
    .aviso {
      margin: 0; padding: 0.75rem 1rem; border-radius: var(--radius-sm, 0.5rem);
      background: color-mix(in srgb, var(--warning-500, #f59e0b) 16%, var(--surface));
      font-size: 0.9rem;
    }
    .card {
      display: flex; flex-direction: column; gap: 0.7rem; padding: 1rem;
      border: 1px solid var(--border, #e5e7eb); border-radius: var(--radius-sm, 0.5rem);
      background: var(--surface);
    }
    .card h3 { margin: 0; font-size: 1rem; }
    .campos { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .campo { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; flex: 1; }
    .campo.corto { flex: 0 0 7rem; }
    .campo select, .campo input {
      padding: 0.6rem 0.7rem; border: 1px solid var(--border, #d1d5db);
      border-radius: 0.4rem; font: inherit; font-weight: 400; min-height: 44px;
    }
    .cta {
      min-height: 48px; border: 0; border-radius: var(--radius-sm, 0.5rem);
      background: var(--gradient-primary, #1d4ed8); color: var(--text-on-primary, #fff);
      font: inherit; font-weight: 700; cursor: pointer;
    }
    .cta:disabled { opacity: 0.55; cursor: not-allowed; }
    .error { color: var(--error-text, #b91c1c); font-weight: 600; }
    ul.puntos { list-style: none; margin: 0; padding: 0; }
    .puntos li {
      display: flex; gap: 0.75rem; align-items: center;
      padding: 0.6rem 0; border-top: 1px solid var(--border, #e5e7eb);
    }
    .puntos li:first-child { border-top: 0; }
    .puntos li.vacio { color: var(--text-muted, #6b7280); font-size: 0.9rem; }
    .puntos li > div { flex: 1; }
    .puntos b {
      width: 1.8rem; height: 1.8rem; border-radius: 99px; display: grid; place-items: center;
      background: var(--surface-2, #f3f4f6); font-size: 0.8rem; flex-shrink: 0;
    }
    .puntos small { display: block; color: var(--text-muted, #6b7280); }
    .mini {
      min-height: 40px; padding: 0.35rem 0.7rem; border: 0; border-radius: 0.4rem;
      background: none; color: var(--primary-600, #1d4ed8); font: inherit;
      font-weight: 700; cursor: pointer; flex-shrink: 0;
    }
    .mini.malo { color: var(--error-text, #b91c1c); }
  `,
})
export class RondasPuntos implements OnInit {
  private readonly api = inject(RondasApiService);

  readonly puestos = signal<RondasPost[]>([]);
  readonly puntos = signal<RondasPunto[]>([]);
  readonly todos = signal<RondasPunto[]>([]);
  readonly postId = signal('');
  readonly tomando = signal(false);
  readonly cargandoPuntos = signal(false);
  readonly precision = signal<number | null>(null);
  readonly aviso = signal('');
  readonly esError = signal(false);
  readonly porBorrar = signal('');

  nombre = '';
  radio = 10;

  /** Sin GPS real el punto queda mal puesto, así que se avisa en escritorio. */
  readonly esMovil = computed(() =>
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
  );

  ngOnInit(): void {
    this.api.puestosSetup().subscribe({
      next: (p) => this.puestos.set(p),
      error: () => this.fallo('No se pudieron cargar los puestos.'),
    });
    this.api.puntosAdmin().subscribe({
      next: (p) => this.todos.set(p),
      error: () => undefined,
    });
  }

  conteo(postId: string): string {
    const n = this.todos().filter((p) => p.postId === postId).length;
    return n === 1 ? '1 punto' : `${n} puntos`;
  }

  radioEntero(): number {
    const v = Number(this.radio);
    return Number.isFinite(v) ? Math.round(v) : 10;
  }

  cambiarPuesto(id: string) {
    this.postId.set(id);
    this.puntos.set([]);
    this.aviso.set('');
    this.porBorrar.set('');
    if (id) this.cargarPuntos();
  }

  async tomarPunto() {
    const postId = this.postId();
    const nombre = this.nombre.trim();
    if (!postId || !nombre || this.tomando()) return;

    this.tomando.set(true);
    this.precision.set(null);
    this.aviso.set('');
    this.esError.set(false);

    try {
      const l = await leerGpsMejor(this.radioEntero(), 12000, (lec) =>
        this.precision.set(Math.round(lec.accuracy)),
      );
      this.api
        .crearPunto({
          postId,
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
            this.nombre = '';
            this.aviso.set(`«${nombre}» guardado con ±${Math.round(l.accuracy)} m de precisión.`);
            this.cargarPuntos();
            this.refrescarTodos();
          },
          error: () => {
            this.tomando.set(false);
            this.fallo('Se leyó el GPS pero no se pudo guardar el punto. Revisa la señal.');
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

  borrar(p: RondasPunto) {
    this.porBorrar.set('');
    this.api.eliminarPunto(p.id).subscribe({
      next: () => {
        this.aviso.set(`«${p.nombre}» eliminado.`);
        this.esError.set(false);
        this.cargarPuntos();
        this.refrescarTodos();
      },
      error: () => this.fallo('No se pudo eliminar el punto.'),
    });
  }

  private cargarPuntos() {
    const id = this.postId();
    if (!id) return;
    this.cargandoPuntos.set(true);
    this.api.puntosAdmin(id).subscribe({
      next: (p) => {
        this.cargandoPuntos.set(false);
        this.puntos.set([...p].sort((a, b) => a.orden - b.orden));
      },
      error: () => {
        this.cargandoPuntos.set(false);
        this.fallo('No se pudieron cargar los puntos del puesto.');
      },
    });
  }

  private refrescarTodos() {
    this.api.puntosAdmin().subscribe({
      next: (p) => this.todos.set(p),
      error: () => undefined,
    });
  }

  private fallo(msg: string) {
    this.aviso.set(msg);
    this.esError.set(true);
  }
}
