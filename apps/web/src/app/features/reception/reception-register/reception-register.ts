import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  ReceptionApiService,
  ReceptionSex,
  ReceptionTransport,
  RegisterReceptionVisitorPayload,
} from '../reception-api.service';

@Component({
  selector: 'app-reception-register',
  imports: [FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Registrar visitante</h2>
          <p>Todos los campos son opcionales. La hora de entrada la toma el sistema y no se edita.</p>
        </div>
      </header>

      @if (!auth.hasPermission('reception.register')) {
        <p class="error">No tienes permiso para registrar visitantes.</p>
      } @else {
        <form class="form" (keydown.enter)="onFormEnter($event)">
          <fieldset>
            <legend>Datos personales</legend>
            <p class="scan-hint">
              La lectora puede llenar hasta fecha de nacimiento. El resto se completa a mano y el
              registro solo se guarda con el botón.
            </p>
            <label>
              Cédula
              <input [(ngModel)]="form.documentNumber" name="documentNumber" autocomplete="off" />
            </label>
            <label>
              Primer apellido
              <input [(ngModel)]="form.firstSurname" name="firstSurname" autocomplete="off" />
            </label>
            <label>
              Segundo apellido
              <input [(ngModel)]="form.secondSurname" name="secondSurname" autocomplete="off" />
            </label>
            <label>
              Primer nombre
              <input [(ngModel)]="form.firstName" name="firstName" autocomplete="off" />
            </label>
            <label>
              Segundo nombre
              <input [(ngModel)]="form.secondName" name="secondName" autocomplete="off" />
            </label>
            <label>
              Sexo
              <select [(ngModel)]="form.sex" name="sex">
                <option value="">—</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="OTRO">Otro</option>
                <option value="NO_DECLARA">No declara</option>
              </select>
            </label>
            <label>
              Fecha de nacimiento
              <input
                [(ngModel)]="form.birthDate"
                name="birthDate"
                placeholder="Ej. 15/03/1990"
                autocomplete="off"
              />
            </label>
            <label>
              ARL
              <input [(ngModel)]="form.arl" name="arl" autocomplete="off" />
            </label>
            <label>
              EPS
              <input [(ngModel)]="form.eps" name="eps" autocomplete="off" />
            </label>
            <label class="wide">
              Lugar de donde viene
              <input [(ngModel)]="form.originPlace" name="originPlace" autocomplete="off" />
            </label>
          </fieldset>

          <fieldset>
            <legend>Datos de ingreso</legend>
            <label class="wide">
              Motivo de visita
              <input #visitReasonInput [(ngModel)]="form.visitReason" name="visitReason" autocomplete="off" />
            </label>
            <label>
              Hora de entrada
              <input [ngModel]="nowLabel()" name="entryAt" [ngModelOptions]="{ standalone: true }" readonly />
            </label>
            <label>
              Autorizado por
              <select [(ngModel)]="form.authorizedBy" name="authorizedBy">
                <option value="">—</option>
                @for (area of authorizedByOptions; track area) {
                  <option [value]="area">{{ area }}</option>
                }
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>Datos de desplazamiento</legend>
            <label>
              Medio de desplazamiento
              <select [(ngModel)]="form.transportMeans" name="transportMeans">
                <option value="">—</option>
                <option value="MOTO">Moto</option>
                <option value="CARRO">Carro</option>
                <option value="TRANSPORTE_PUBLICO">Transporte público</option>
                <option value="OTRO">Otro</option>
                <option value="NINGUNO">Ninguno / a pie</option>
              </select>
            </label>
            <label>
              Tiempo de desplazamiento (minutos)
              <input
                type="number"
                min="0"
                [(ngModel)]="form.travelTimeMinutes"
                name="travelTimeMinutes"
              />
            </label>
            <label class="wide">
              Notas
              <input [(ngModel)]="form.notes" name="notes" autocomplete="off" />
            </label>
          </fieldset>

          @if (formError()) {
            <p class="error">{{ formError() }}</p>
          }
          @if (success()) {
            <p class="ok">{{ success() }}</p>
          }

          <div class="actions">
            <button type="button" class="ghost" (click)="reset()" [disabled]="saving()">Limpiar</button>
            <button type="button" class="primary" (click)="submit()" [disabled]="saving()">
              {{ saving() ? 'Guardando...' : 'Registrar ingreso' }}
            </button>
          </div>
        </form>
      }
    </section>
  `,
  styles: `
    .page { max-width: 920px; }
    .head { margin-bottom: 1.1rem; }
    .head h2 { margin: 0 0 0.3rem; color: var(--primary-dark); font-size: 1.25rem; }
    .head p { margin: 0; color: #64748b; font-size: 0.9rem; }
    fieldset {
      border: 1px solid var(--coraza-border);
      border-radius: 12px;
      padding: 1rem 1.1rem 1.1rem;
      margin: 0 0 1rem;
      background: var(--coraza-surface, #fff);
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.75rem;
    }
    legend {
      padding: 0 0.35rem;
      font-weight: 700;
      font-size: 0.85rem;
      color: var(--primary-dark);
    }
    .scan-hint {
      grid-column: 1 / -1;
      margin: 0 0 0.25rem;
      font-size: 0.8rem;
      color: #64748b;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.82rem;
      color: #64748b;
    }
    label.wide { grid-column: 1 / -1; }
    input, select {
      padding: 0.5rem 0.65rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      font: inherit;
      color: #0f172a;
      background: #fff;
    }
    input[readonly] {
      background: #f8fafc;
      color: #475569;
      cursor: not-allowed;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .primary, .ghost {
      padding: 0.55rem 1.1rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .primary {
      border: 1px solid var(--primary);
      background: var(--primary);
      color: #fff;
    }
    .primary:disabled { opacity: 0.55; cursor: not-allowed; }
    .ghost {
      border: 1px solid var(--coraza-border);
      background: #fff;
      color: #475569;
    }
    .error { color: var(--coraza-error); }
    .ok { color: #15803d; font-weight: 600; }
  `,
})
export class ReceptionRegister implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ReceptionApiService);
  private readonly router = inject(Router);

  private readonly visitReasonInput = viewChild<ElementRef<HTMLInputElement>>('visitReasonInput');

  readonly authorizedByOptions = [
    'Recursos humanos',
    'Gerencia',
    'Operaciones',
    'SST',
    'Contabilidad',
    'Seguridad electrónica',
    'Comercial',
  ] as const;

  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly clock = signal(new Date());

  form = this.emptyForm();

  ngOnInit(): void {
    setInterval(() => this.clock.set(new Date()), 1000);
  }

  /** Los lectores envían Enter al final; no debe guardar el formulario. */
  onFormEnter(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Al terminar la lectura (suele caer en fecha de nacimiento), pasa al motivo.
    if (target.getAttribute('name') === 'birthDate') {
      queueMicrotask(() => this.visitReasonInput()?.nativeElement.focus());
    }
  }

  nowLabel(): string {
    return this.clock().toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  }

  reset(): void {
    this.form = this.emptyForm();
    this.formError.set(null);
    this.success.set(null);
  }

  submit(): void {
    this.saving.set(true);
    this.formError.set(null);
    this.success.set(null);

    const payload: RegisterReceptionVisitorPayload = {};
    const f = this.form;
    if (f.documentNumber.trim()) payload.documentNumber = f.documentNumber.trim();
    if (f.firstSurname.trim()) payload.firstSurname = f.firstSurname.trim();
    if (f.secondSurname.trim()) payload.secondSurname = f.secondSurname.trim();
    if (f.firstName.trim()) payload.firstName = f.firstName.trim();
    if (f.secondName.trim()) payload.secondName = f.secondName.trim();
    if (f.sex) payload.sex = f.sex as ReceptionSex;
    if (f.birthDate.trim()) payload.birthDate = f.birthDate.trim();
    if (f.arl.trim()) payload.arl = f.arl.trim();
    if (f.eps.trim()) payload.eps = f.eps.trim();
    if (f.originPlace.trim()) payload.originPlace = f.originPlace.trim();
    if (f.visitReason.trim()) payload.visitReason = f.visitReason.trim();
    if (f.authorizedBy.trim()) payload.authorizedBy = f.authorizedBy.trim();
    if (f.transportMeans) payload.transportMeans = f.transportMeans as ReceptionTransport;
    const mins = Number(f.travelTimeMinutes);
    if (f.travelTimeMinutes !== '' && !Number.isNaN(mins) && mins >= 0) {
      payload.travelTimeMinutes = mins;
    }
    if (f.notes.trim()) payload.notes = f.notes.trim();

    this.api.register(payload).subscribe({
      next: (v) => {
        this.saving.set(false);
        this.success.set(`Ingreso registrado: ${v.displayName}`);
        this.form = this.emptyForm();
        setTimeout(() => this.router.navigateByUrl('/recepcion/panel'), 900);
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'No se pudo registrar el visitante');
      },
    });
  }

  private emptyForm() {
    return {
      documentNumber: '',
      firstSurname: '',
      secondSurname: '',
      firstName: '',
      secondName: '',
      sex: '' as '' | ReceptionSex,
      birthDate: '',
      arl: '',
      eps: '',
      originPlace: '',
      visitReason: '',
      authorizedBy: '',
      transportMeans: '' as '' | ReceptionTransport,
      travelTimeMinutes: '' as string | number,
      notes: '',
    };
  }
}
