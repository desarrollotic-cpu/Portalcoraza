import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { MinutaApiService } from '../minuta-api.service';

type Tab = 'inicio' | 'nuevo' | 'historial' | 'perfil';
type FormKind =
  | 'VISITANTE'
  | 'CORRESPONDENCIA'
  | 'CONTRATISTA'
  | 'DOMICILIARIO'
  | 'INCIDENTE'
  | 'SERVICIO'
  | 'ENTREGA'
  | null;

interface MinutaForm {
  nombre: string;
  cedula: string;
  apto: string;
  acompana: string;
  vehiculo: string;
  clase: string;
  destinatario: string;
  remitente: string;
  empresa: string;
  areaTrabajo: string;
  autorizadoPor: string;
  tipoPedido: string;
  nombreDomiciliario: string;
  placaMoto: string;
  tipo: string;
  gravedad: string;
  ubicacion: string;
  descripcion: string;
  anotaciones: string;
  novedades: string;
  turnoSaliente: string;
  turnoEntrante: string;
  vigilanteSaliente: string;
  vigilanteEntrante: string;
  nombreDelPuesto: string;
}

@Component({
  selector: 'app-minuta-home',
  imports: [FormsModule],
  template: `
    <div class="app">
      <header class="top">
        <div>
          <strong>Minuta Virtual</strong>
          <span>{{ userLabel() }}</span>
        </div>
        <span class="badge">Portal Coraza</span>
      </header>

      <main class="body">
        @if (msg()) {
          <p class="toast">{{ msg() }}</p>
        }

        @if (tab() === 'inicio') {
          <section class="stats">
            <article><small>Registros hoy</small><b>{{ stats().registrosHoy }}</b></article>
            <article><small>Visitantes</small><b>{{ stats().visitantesHoy }}</b></article>
            <article><small>Incidentes</small><b>{{ stats().incidentesHoy }}</b></article>
            <article><small>Eficiencia</small><b>{{ stats().eficiencia }}%</b></article>
          </section>
          <section class="quick">
            <button type="button" (click)="openForm('VISITANTE')">Visitante</button>
            <button type="button" (click)="openForm('INCIDENTE')">Incidente</button>
            <button type="button" (click)="openForm('DOMICILIARIO')">Domiciliario</button>
            <button type="button" (click)="openForm('ENTREGA')">Entrega</button>
          </section>
          <h3>Recientes</h3>
          @for (h of historial().slice(0, 5); track h['id']) {
            <div class="card">
              <strong>{{ h['tipo'] }}</strong>
              <span>{{ h['id'] }} · {{ h['estado'] || '—' }}</span>
            </div>
          } @empty {
            <p class="muted">Sin registros aún.</p>
          }
        }

        @if (tab() === 'nuevo') {
          <div class="grid">
            @for (m of modulos; track m.k) {
              <button type="button" class="tile" (click)="openForm(m.k)">
                <span>{{ m.icon }}</span>{{ m.label }}
              </button>
            }
          </div>
        }

        @if (tab() === 'historial') {
          <label class="filt">
            Tipo
            <select [(ngModel)]="filtroTipo" name="ft" (change)="loadHistorial()">
              <option value="TODOS">Todos</option>
              <option value="VISITANTE">Visitantes</option>
              <option value="CORRESPONDENCIA">Correspondencia</option>
              <option value="CONTRATISTA">Contratistas</option>
              <option value="DOMICILIARIO">Domiciliarios</option>
              <option value="INCIDENTE">Incidentes</option>
              <option value="SERVICIO">Servicio</option>
              <option value="ENTREGA">Entrega</option>
            </select>
          </label>
          @for (h of historial(); track h['id']) {
            <div class="card row">
              <div>
                <strong>{{ h['tipo'] }}</strong>
                <div class="muted">{{ h['id'] }} · {{ h['estado'] || '—' }}</div>
              </div>
              <div class="actions">
                @if (
                  (h['tipo'] === 'VISITANTE' || h['tipo'] === 'CONTRATISTA' || h['tipo'] === 'DOMICILIARIO') &&
                  (h['estado'] === 'ACTIVO' || h['estado'] === 'ENTREGANDO')
                ) {
                  <button type="button" class="mini" (click)="doSalida(h)">Salida</button>
                }
                @if (h['tipo'] === 'CORRESPONDENCIA' && h['estado'] === 'PENDIENTE') {
                  <button type="button" class="mini" (click)="doEntregar(h)">Entregar</button>
                }
              </div>
            </div>
          } @empty {
            <p class="muted">Sin historial.</p>
          }
        }

        @if (tab() === 'perfil') {
          <div class="card">
            <p><strong>{{ user()?.fullName || user()?.email }}</strong></p>
            <p class="muted">{{ user()?.email }}</p>
            <p class="muted">Rol {{ user()?.role?.name || user()?.role?.code || '—' }}</p>
            <p class="muted">Minuta Virtual 8.0 Pro · módulo Portal</p>
          </div>
        }
      </main>

      <nav class="bottom">
        <button type="button" [class.on]="tab()==='inicio'" (click)="go('inicio')">Inicio</button>
        <button type="button" [class.on]="tab()==='nuevo'" (click)="go('nuevo')">Nuevo</button>
        <button type="button" [class.on]="tab()==='historial'" (click)="go('historial')">Historial</button>
        <button type="button" [class.on]="tab()==='perfil'" (click)="go('perfil')">Perfil</button>
      </nav>

      @if (form()) {
        <div class="modal">
          <div class="modal-card">
            <h3>{{ form() }}</h3>
            @switch (form()) {
              @case ('VISITANTE') {
                <label>Nombre<input [(ngModel)]="f.nombre" name="n" /></label>
                <label>Cédula<input [(ngModel)]="f.cedula" name="c" /></label>
                <label>Apto<input [(ngModel)]="f.apto" name="a" /></label>
                <label>Acompaña
                  <select [(ngModel)]="f.acompana" name="ac"><option>No</option><option>Si</option></select>
                </label>
                <label>Placa<input [(ngModel)]="f.vehiculo" name="v" /></label>
              }
              @case ('CORRESPONDENCIA') {
                <label>Clase
                  <select [(ngModel)]="f.clase" name="cl">
                    <option>Paquete</option><option>Carta</option><option>Sobre</option>
                    <option>Caja</option><option>Documento</option><option>Encomienda</option>
                  </select>
                </label>
                <label>Apto<input [(ngModel)]="f.apto" name="a2" /></label>
                <label>Destinatario<input [(ngModel)]="f.destinatario" name="d" /></label>
                <label>Remitente<input [(ngModel)]="f.remitente" name="r" /></label>
              }
              @case ('CONTRATISTA') {
                <label>Nombre<input [(ngModel)]="f.nombre" name="n2" /></label>
                <label>Cédula<input [(ngModel)]="f.cedula" name="c2" /></label>
                <label>Empresa<input [(ngModel)]="f.empresa" name="e" /></label>
                <label>Área<input [(ngModel)]="f.areaTrabajo" name="ar" /></label>
                <label>Autorizado por<input [(ngModel)]="f.autorizadoPor" name="au" /></label>
              }
              @case ('DOMICILIARIO') {
                <label>Empresa
                  <select [(ngModel)]="f.empresa" name="em">
                    <option>Rappi</option><option>Uber Eats</option><option>Didi Food</option>
                    <option>iFood</option><option>PedidosYa</option><option>Otro</option>
                  </select>
                </label>
                <label>Tipo pedido
                  <select [(ngModel)]="f.tipoPedido" name="tp">
                    <option>Comida</option><option>Mercado</option><option>Farmacia</option>
                    <option>Paquetería</option><option>Documento</option><option>Otro</option>
                  </select>
                </label>
                <label>Apto<input [(ngModel)]="f.apto" name="a3" /></label>
                <label>Nombre<input [(ngModel)]="f.nombreDomiciliario" name="nd" /></label>
                <label>Placa<input [(ngModel)]="f.placaMoto" name="pm" /></label>
              }
              @case ('INCIDENTE') {
                <label>Tipo
                  <select [(ngModel)]="f.tipo" name="ti">
                    <option>Seguridad</option><option>Accidente</option><option>Ruido</option>
                    <option>Daño</option><option>Salud</option><option>Otro</option>
                  </select>
                </label>
                <label>Gravedad
                  <select [(ngModel)]="f.gravedad" name="g">
                    <option>BAJA</option><option>MEDIA</option><option>ALTA</option><option>CRITICA</option>
                  </select>
                </label>
                <label>Ubicación<input [(ngModel)]="f.ubicacion" name="u" /></label>
                <label>Descripción<textarea [(ngModel)]="f.descripcion" name="de" rows="3"></textarea></label>
              }
              @case ('SERVICIO') {
                <label>Anotaciones<textarea [(ngModel)]="f.anotaciones" name="an" rows="4"></textarea></label>
                <label>Novedades<textarea [(ngModel)]="f.novedades" name="no" rows="2"></textarea></label>
              }
              @case ('ENTREGA') {
                <label>Turno saliente
                  <select [(ngModel)]="f.turnoSaliente" name="ts"><option>DIURNO</option><option>NOCTURNO</option><option>MIXTO</option></select>
                </label>
                <label>Turno entrante
                  <select [(ngModel)]="f.turnoEntrante" name="te"><option>DIURNO</option><option>NOCTURNO</option><option>MIXTO</option></select>
                </label>
                <label>Vigilante saliente<input [(ngModel)]="f.vigilanteSaliente" name="vs" /></label>
                <label>Vigilante entrante<input [(ngModel)]="f.vigilanteEntrante" name="ve" /></label>
                <label>Puesto<input [(ngModel)]="f.nombreDelPuesto" name="np" /></label>
              }
            }
            <button type="button" class="btn" [disabled]="busy()" (click)="save()">Guardar</button>
            <button type="button" class="mini" (click)="form.set(null)">Cancelar</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display:block; color:#0f172a; }
    .app { max-width:720px; margin:0 auto; display:flex; flex-direction:column; background:#fff; border:1px solid #e2e8f0; border-radius:1rem; overflow:hidden; }
    .top { display:flex; justify-content:space-between; gap:.5rem; padding:.9rem 1rem; background:linear-gradient(135deg,#1E3A8A,#3B82F6); color:#fff; }
    .top span { display:block; font-size:.75rem; opacity:.9; }
    .badge { align-self:flex-start; background:rgba(255,255,255,.2); border-radius:999px; padding:.2rem .55rem; font-size:.72rem; }
    .body { flex:1; padding:1rem; display:flex; flex-direction:column; gap:.75rem; padding-bottom:5rem; }
    .stats { display:grid; grid-template-columns:1fr 1fr; gap:.55rem; }
    .stats article { background:#F8FAFC; border:1px solid #e2e8f0; border-radius:1rem; padding:.75rem; }
    .stats small { color:#64748b; }
    .stats b { display:block; font-size:1.25rem; color:#1E3A8A; }
    .quick, .grid { display:grid; grid-template-columns:1fr 1fr; gap:.55rem; }
    .quick button, .tile { border:0; border-radius:1rem; padding:.9rem; background:#EFF6FF; color:#1E3A8A; font-weight:700; text-align:left; cursor:pointer; }
    .tile span { display:block; font-size:1.2rem; margin-bottom:.25rem; }
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:1rem; padding:.75rem; display:flex; flex-direction:column; gap:.2rem; }
    .card.row { flex-direction:row; justify-content:space-between; align-items:center; }
    .muted { color:#64748b; font-size:.82rem; }
    .bottom { position:sticky; bottom:0; display:grid; grid-template-columns:repeat(4,1fr); background:#fff; border-top:1px solid #e2e8f0; }
    .bottom button { border:0; background:transparent; padding:.85rem .3rem; color:#64748b; font-weight:700; cursor:pointer; }
    .bottom button.on { color:#1E3A8A; }
    .btn { border:0; border-radius:.65rem; padding:.75rem; background:#1E3A8A; color:#fff; font-weight:800; cursor:pointer; }
    .btn.danger { background:#EF4444; margin-top:.5rem; }
    .mini { border:1px solid #cbd5e1; background:#fff; border-radius:.45rem; padding:.35rem .55rem; cursor:pointer; color:#1E3A8A; font-weight:700; }
    .modal { position:fixed; inset:0; background:rgba(15,23,42,.55); display:grid; place-items:center; padding:1rem; z-index:20; }
    .modal-card { width:min(100%,400px); max-height:90dvh; overflow:auto; background:#fff; border-radius:1rem; padding:1rem; display:flex; flex-direction:column; gap:.55rem; }
    label { display:flex; flex-direction:column; gap:.25rem; font-size:.82rem; color:#64748b; font-weight:600; }
    input, textarea, select { font:inherit; border:1px solid #cbd5e1; border-radius:.5rem; padding:.55rem; color:#0f172a; }
    .toast { background:#D1FAE5; color:#065F46; border-radius:.65rem; padding:.55rem .75rem; margin:0; }
    .link { color:#1E3A8A; font-weight:700; }
    .filt { display:flex; flex-direction:column; gap:.25rem; }
    .actions { display:flex; gap:.35rem; }
    h3 { margin:.25rem 0; color:#1E3A8A; }
  `,
})
export class MinutaHome implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(MinutaApiService);

  readonly user = this.auth.currentUser;
  readonly tab = signal<Tab>('inicio');
  readonly form = signal<FormKind>(null);
  readonly busy = signal(false);
  readonly msg = signal('');
  readonly stats = signal({
    registrosHoy: 0,
    visitantesHoy: 0,
    incidentesHoy: 0,
    eficiencia: 100,
    correspondenciaPendiente: 0,
    activosEnSitio: 0,
  });
  readonly historial = signal<Record<string, unknown>[]>([]);
  filtroTipo = 'TODOS';

  readonly modulos: Array<{ k: Exclude<FormKind, null>; label: string; icon: string }> = [
    { k: 'VISITANTE', label: 'Visitantes', icon: '🧍' },
    { k: 'CORRESPONDENCIA', label: 'Correspondencia', icon: '📦' },
    { k: 'CONTRATISTA', label: 'Contratistas', icon: '🔧' },
    { k: 'DOMICILIARIO', label: 'Domiciliarios', icon: '🛵' },
    { k: 'INCIDENTE', label: 'Incidentes', icon: '🚨' },
    { k: 'SERVICIO', label: 'Servicio', icon: '📝' },
    { k: 'ENTREGA', label: 'Entrega', icon: '🔄' },
  ];

  f: MinutaForm = this.emptyForm();

  userLabel(): string {
    const u = this.user();
    return u?.fullName || u?.email || 'Usuario Portal';
  }

  ngOnInit(): void {
    this.refresh();
  }

  go(t: Tab): void {
    this.tab.set(t);
    if (t === 'inicio' || t === 'historial') this.refresh();
  }

  openForm(k: Exclude<FormKind, null>): void {
    this.f = this.emptyForm();
    this.f.vigilanteSaliente = this.userLabel();
    this.f.nombreDelPuesto = 'Portería';
    this.form.set(k);
    this.tab.set('nuevo');
  }

  save(): void {
    const kind = this.form();
    if (!kind) return;
    const pathMap: Record<string, string> = {
      VISITANTE: 'visitantes',
      CORRESPONDENCIA: 'correspondencia',
      CONTRATISTA: 'contratistas',
      DOMICILIARIO: 'domiciliarios',
      INCIDENTE: 'incidentes',
      SERVICIO: 'servicio',
      ENTREGA: 'entrega-puesto',
    };
    const body = this.bodyFor(kind);
    this.busy.set(true);
    this.api.post(pathMap[kind], body).subscribe({
      next: () => {
        this.busy.set(false);
        this.form.set(null);
        this.msg.set('Registro guardado');
        this.refresh();
        this.tab.set('historial');
      },
      error: (e) => {
        this.busy.set(false);
        this.msg.set(e?.error?.message || 'No se pudo guardar');
      },
    });
  }

  doSalida(h: Record<string, unknown>): void {
    const id = String(h['id']);
    const tipo = String(h['tipo']);
    this.api.salida(id, tipo).subscribe({
      next: () => {
        this.msg.set('Salida registrada');
        this.loadHistorial();
      },
      error: (e) => this.msg.set(e?.error?.message || 'Error en salida'),
    });
  }

  doEntregar(h: Record<string, unknown>): void {
    const recibidoPor = prompt('¿Quién recibe el paquete?', 'Residente');
    if (!recibidoPor || recibidoPor.trim().length < 2) return;
    this.api.entregarCorr(String(h['id']), recibidoPor.trim()).subscribe({
      next: () => {
        this.msg.set('Correspondencia entregada');
        this.loadHistorial();
      },
      error: (e) => this.msg.set(e?.error?.message || 'Error al entregar'),
    });
  }

  private refresh(): void {
    this.api.dashboard().subscribe({
      next: (d) => this.stats.set(d.stats),
      error: () => undefined,
    });
    this.loadHistorial();
  }

  loadHistorial(): void {
    this.api.historial(30, this.filtroTipo).subscribe({
      next: (r) => this.historial.set((r.historial || []) as Record<string, unknown>[]),
      error: () => this.historial.set([]),
    });
  }

  private emptyForm(): MinutaForm {
    return {
      nombre: '',
      cedula: '',
      apto: '',
      acompana: 'No',
      vehiculo: '',
      clase: 'Paquete',
      destinatario: 'Residente',
      remitente: '',
      empresa: 'Rappi',
      areaTrabajo: '',
      autorizadoPor: '',
      tipoPedido: 'Comida',
      nombreDomiciliario: '',
      placaMoto: '',
      tipo: 'Seguridad',
      gravedad: 'BAJA',
      ubicacion: '',
      descripcion: '',
      anotaciones: '',
      novedades: '',
      turnoSaliente: 'DIURNO',
      turnoEntrante: 'NOCTURNO',
      vigilanteSaliente: '',
      vigilanteEntrante: '',
      nombreDelPuesto: '',
    };
  }

  private bodyFor(kind: Exclude<FormKind, null>): Record<string, unknown> {
    const f = this.f;
    switch (kind) {
      case 'VISITANTE':
        return {
          nombre: f.nombre,
          cedula: f.cedula,
          apto: f.apto,
          acompana: f.acompana,
          vehiculo: f.vehiculo,
        };
      case 'CORRESPONDENCIA':
        return {
          clase: f.clase,
          apto: f.apto,
          destinatario: f.destinatario || 'Residente',
          remitente: f.remitente,
        };
      case 'CONTRATISTA':
        return {
          nombre: f.nombre,
          cedula: f.cedula,
          empresa: f.empresa,
          areaTrabajo: f.areaTrabajo,
          autorizadoPor: f.autorizadoPor,
        };
      case 'DOMICILIARIO':
        return {
          empresa: f.empresa,
          tipoPedido: f.tipoPedido,
          apto: f.apto,
          nombreDomiciliario: f.nombreDomiciliario,
          placaMoto: f.placaMoto,
        };
      case 'INCIDENTE':
        return {
          tipo: f.tipo,
          gravedad: f.gravedad,
          ubicacion: f.ubicacion,
          descripcion: f.descripcion,
        };
      case 'SERVICIO':
        return { anotaciones: f.anotaciones, novedades: f.novedades };
      case 'ENTREGA':
        return {
          turnoSaliente: f.turnoSaliente,
          turnoEntrante: f.turnoEntrante,
          vigilanteSaliente: f.vigilanteSaliente,
          vigilanteEntrante: f.vigilanteEntrante,
          nombreDelPuesto: f.nombreDelPuesto,
        };
    }
  }
}
