import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MinutaApiService } from '../minuta-api.service';
import {
  MINUTA_MODULOS,
  MINUTA_PAGE_STYLES,
  MinutaFormKind,
  MinutaFormModel,
  bodyForMinuta,
  emptyMinutaForm,
} from '../minuta.shared';

@Component({
  selector: 'app-minuta-nuevo',
  imports: [FormsModule],
  template: `
    <section class="page">
      <div>
        <h2>¿Qué vas a registrar?</h2>
        <p class="hint">
          Elige el tipo. Escribe tu nombre al guardar. La hora la pone el sistema y después no se puede
          editar.
        </p>
      </div>
      @if (msg()) {
        <p [class]="msgOk() ? 'toast' : 'error'">{{ msg() }}</p>
      }
      <div class="grid">
        @for (m of modulos; track m.k) {
          <button type="button" class="tile" (click)="openForm(m.k)">
            <span>{{ m.label }}</span>
            <span class="tile-hint">{{ m.hint }}</span>
          </button>
        }
      </div>

      @if (form()) {
        <div class="modal">
          <div class="modal-card">
            <div class="modal-head">
              <h3>{{ formTitle() }}</h3>
              <button type="button" class="mini" (click)="form.set(null)">Cerrar</button>
            </div>
            <label>
              Tu nombre (vigilante) *
              <input
                [(ngModel)]="f.registradoPor"
                name="reg"
                required
                maxlength="120"
                placeholder="Ej. Juan Pérez"
                autocomplete="name"
              />
            </label>
            @switch (form()) {
              @case ('VISITANTE') {
                <label>Nombre del visitante<input [(ngModel)]="f.nombre" name="n" /></label>
                <label>Cédula<input [(ngModel)]="f.cedula" name="c" inputmode="numeric" /></label>
                <label>Apartamento / torre<input [(ngModel)]="f.apto" name="a" /></label>
                <label
                  >¿Va acompañado?
                  <select [(ngModel)]="f.acompana" name="ac">
                    <option>No</option>
                    <option>Si</option>
                  </select>
                </label>
                <label>Placa del vehículo (si aplica)<input [(ngModel)]="f.vehiculo" name="v" /></label>
              }
              @case ('CORRESPONDENCIA') {
                <label
                  >Tipo de envío
                  <select [(ngModel)]="f.clase" name="cl">
                    <option>Paquete</option>
                    <option>Carta</option>
                    <option>Sobre</option>
                    <option>Caja</option>
                    <option>Documento</option>
                    <option>Encomienda</option>
                  </select>
                </label>
                <label>Apartamento<input [(ngModel)]="f.apto" name="a2" /></label>
                <label>Para quién<input [(ngModel)]="f.destinatario" name="d" /></label>
                <label>De quién / empresa<input [(ngModel)]="f.remitente" name="r" /></label>
              }
              @case ('CONTRATISTA') {
                <label>Nombre<input [(ngModel)]="f.nombre" name="n2" /></label>
                <label>Cédula<input [(ngModel)]="f.cedula" name="c2" inputmode="numeric" /></label>
                <label>Empresa<input [(ngModel)]="f.empresa" name="e" /></label>
                <label>Área de trabajo<input [(ngModel)]="f.areaTrabajo" name="ar" /></label>
                <label>Autorizado por<input [(ngModel)]="f.autorizadoPor" name="au" /></label>
              }
              @case ('DOMICILIARIO') {
                <label
                  >App / empresa
                  <select [(ngModel)]="f.empresa" name="em">
                    <option>Rappi</option>
                    <option>Uber Eats</option>
                    <option>Didi Food</option>
                    <option>iFood</option>
                    <option>PedidosYa</option>
                    <option>Otro</option>
                  </select>
                </label>
                <label
                  >Tipo de pedido
                  <select [(ngModel)]="f.tipoPedido" name="tp">
                    <option>Comida</option>
                    <option>Mercado</option>
                    <option>Farmacia</option>
                    <option>Paquetería</option>
                    <option>Documento</option>
                    <option>Otro</option>
                  </select>
                </label>
                <label>Apartamento<input [(ngModel)]="f.apto" name="a3" /></label>
                <label>Nombre del domiciliario<input [(ngModel)]="f.nombreDomiciliario" name="nd" /></label>
                <label>Placa moto / bicicleta<input [(ngModel)]="f.placaMoto" name="pm" /></label>
              }
              @case ('INCIDENTE') {
                <label
                  >Tipo
                  <select [(ngModel)]="f.tipo" name="ti">
                    <option>Seguridad</option>
                    <option>Accidente</option>
                    <option>Ruido</option>
                    <option>Daño</option>
                    <option>Salud</option>
                    <option>Otro</option>
                  </select>
                </label>
                <label
                  >Qué tan grave
                  <select [(ngModel)]="f.gravedad" name="g">
                    <option value="BAJA">Baja</option>
                    <option value="MEDIA">Media</option>
                    <option value="ALTA">Alta</option>
                    <option value="CRITICA">Crítica</option>
                  </select>
                </label>
                <label>Dónde ocurrió<input [(ngModel)]="f.ubicacion" name="u" /></label>
                <label
                  >Qué pasó<textarea [(ngModel)]="f.descripcion" name="de" rows="3"></textarea>
                </label>
              }
              @case ('SERVICIO') {
                <label
                  >Anotaciones del turno<textarea [(ngModel)]="f.anotaciones" name="an" rows="4"></textarea>
                </label>
                <label
                  >Otras novedades<textarea [(ngModel)]="f.novedades" name="no" rows="2"></textarea>
                </label>
              }
              @case ('ENTREGA') {
                <label
                  >Turno que sale
                  <select [(ngModel)]="f.turnoSaliente" name="ts">
                    <option value="DIURNO">Diurno</option>
                    <option value="NOCTURNO">Nocturno</option>
                    <option value="MIXTO">Mixto</option>
                  </select>
                </label>
                <label
                  >Turno que entra
                  <select [(ngModel)]="f.turnoEntrante" name="te">
                    <option value="DIURNO">Diurno</option>
                    <option value="NOCTURNO">Nocturno</option>
                    <option value="MIXTO">Mixto</option>
                  </select>
                </label>
                <label>Vigilante que sale<input [(ngModel)]="f.vigilanteSaliente" name="vs" /></label>
                <label>Vigilante que entra<input [(ngModel)]="f.vigilanteEntrante" name="ve" /></label>
                <label>Nombre del puesto<input [(ngModel)]="f.nombreDelPuesto" name="np" /></label>
              }
            }
            <button type="button" class="btn" [disabled]="busy()" (click)="save()">
              {{ busy() ? 'Guardando…' : 'Guardar registro' }}
            </button>
            <button type="button" class="mini" (click)="form.set(null)">Cancelar</button>
          </div>
        </div>
      }
    </section>
  `,
  styles: [MINUTA_PAGE_STYLES],
})
export class MinutaNuevo {
  private readonly api = inject(MinutaApiService);
  private readonly router = inject(Router);

  readonly modulos = MINUTA_MODULOS;
  readonly form = signal<MinutaFormKind | null>(null);
  readonly busy = signal(false);
  readonly msg = signal('');
  readonly msgOk = signal(true);
  f: MinutaFormModel = emptyMinutaForm();

  formTitle(): string {
    const k = this.form();
    return k ? MINUTA_MODULOS.find((m) => m.k === k)?.label || k : '';
  }

  openForm(k: MinutaFormKind): void {
    this.f = emptyMinutaForm();
    this.form.set(k);
    this.msg.set('');
  }

  save(): void {
    const kind = this.form();
    if (!kind) return;
    if (this.f.registradoPor.trim().length < 2) {
      this.msgOk.set(false);
      this.msg.set('Escribe tu nombre para guardar');
      return;
    }
    const pathMap: Record<MinutaFormKind, string> = {
      VISITANTE: 'visitantes',
      CORRESPONDENCIA: 'correspondencia',
      CONTRATISTA: 'contratistas',
      DOMICILIARIO: 'domiciliarios',
      INCIDENTE: 'incidentes',
      SERVICIO: 'servicio',
      ENTREGA: 'entrega-puesto',
    };
    this.busy.set(true);
    this.api.post(pathMap[kind], bodyForMinuta(kind, this.f)).subscribe({
      next: () => {
        this.busy.set(false);
        this.form.set(null);
        void this.router.navigateByUrl('/historial');
      },
      error: (e) => {
        this.busy.set(false);
        this.msgOk.set(false);
        this.msg.set(e?.error?.message || 'No se pudo guardar. Intenta de nuevo.');
      },
    });
  }
}
