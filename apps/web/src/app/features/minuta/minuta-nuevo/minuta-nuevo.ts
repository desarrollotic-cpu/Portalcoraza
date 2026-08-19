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
        <h2>Nueva novedad</h2>
        <p class="hint">
          La cuenta es del puesto: escribe el nombre del vigilante que registra. La hora la pone el
          sistema y el reporte no se puede editar después.
        </p>
      </div>
      @if (msg()) {
        <p [class]="msgOk() ? 'toast' : 'error'">{{ msg() }}</p>
      }
      <div class="grid">
        @for (m of modulos; track m.k) {
          <button type="button" class="tile" (click)="openForm(m.k)">{{ m.label }}</button>
        }
      </div>

      @if (form()) {
        <div class="modal">
          <div class="modal-card">
            <h3>{{ form() }}</h3>
            <label>
              Vigilante que registra *
              <input [(ngModel)]="f.registradoPor" name="reg" required maxlength="120" />
            </label>
            @switch (form()) {
              @case ('VISITANTE') {
                <label>Nombre<input [(ngModel)]="f.nombre" name="n" /></label>
                <label>Cédula<input [(ngModel)]="f.cedula" name="c" /></label>
                <label>Apto<input [(ngModel)]="f.apto" name="a" /></label>
                <label
                  >Acompaña
                  <select [(ngModel)]="f.acompana" name="ac">
                    <option>No</option>
                    <option>Si</option>
                  </select>
                </label>
                <label>Placa<input [(ngModel)]="f.vehiculo" name="v" /></label>
              }
              @case ('CORRESPONDENCIA') {
                <label
                  >Clase
                  <select [(ngModel)]="f.clase" name="cl">
                    <option>Paquete</option>
                    <option>Carta</option>
                    <option>Sobre</option>
                    <option>Caja</option>
                    <option>Documento</option>
                    <option>Encomienda</option>
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
                <label
                  >Empresa
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
                  >Tipo pedido
                  <select [(ngModel)]="f.tipoPedido" name="tp">
                    <option>Comida</option>
                    <option>Mercado</option>
                    <option>Farmacia</option>
                    <option>Paquetería</option>
                    <option>Documento</option>
                    <option>Otro</option>
                  </select>
                </label>
                <label>Apto<input [(ngModel)]="f.apto" name="a3" /></label>
                <label>Nombre<input [(ngModel)]="f.nombreDomiciliario" name="nd" /></label>
                <label>Placa<input [(ngModel)]="f.placaMoto" name="pm" /></label>
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
                  >Gravedad
                  <select [(ngModel)]="f.gravedad" name="g">
                    <option>BAJA</option>
                    <option>MEDIA</option>
                    <option>ALTA</option>
                    <option>CRITICA</option>
                  </select>
                </label>
                <label>Ubicación<input [(ngModel)]="f.ubicacion" name="u" /></label>
                <label
                  >Descripción<textarea [(ngModel)]="f.descripcion" name="de" rows="3"></textarea>
                </label>
              }
              @case ('SERVICIO') {
                <label
                  >Anotaciones<textarea [(ngModel)]="f.anotaciones" name="an" rows="4"></textarea>
                </label>
                <label
                  >Novedades<textarea [(ngModel)]="f.novedades" name="no" rows="2"></textarea>
                </label>
              }
              @case ('ENTREGA') {
                <label
                  >Turno saliente
                  <select [(ngModel)]="f.turnoSaliente" name="ts">
                    <option>DIURNO</option>
                    <option>NOCTURNO</option>
                    <option>MIXTO</option>
                  </select>
                </label>
                <label
                  >Turno entrante
                  <select [(ngModel)]="f.turnoEntrante" name="te">
                    <option>DIURNO</option>
                    <option>NOCTURNO</option>
                    <option>MIXTO</option>
                  </select>
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
      this.msg.set('Indique el vigilante que registra');
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
        void this.router.navigateByUrl('/minutas/historial');
      },
      error: (e) => {
        this.busy.set(false);
        this.msgOk.set(false);
        this.msg.set(e?.error?.message || 'No se pudo guardar');
      },
    });
  }
}
