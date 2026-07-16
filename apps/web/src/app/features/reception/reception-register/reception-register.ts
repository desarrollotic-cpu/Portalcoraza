import { Component, OnInit, inject, signal } from '@angular/core';
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
        <form class="form" (ngSubmit)="submit()">
          <fieldset>
            <legend>Datos personales</legend>
            <label>
              Cédula
              <input [(ngModel)]="form.documentNumber" name="documentNumber" />
            </label>
            <label>
              Primer apellido
              <input [(ngModel)]="form.firstSurname" name="firstSurname" />
            </label>
            <label>
              Segundo apellido
              <input [(ngModel)]="form.secondSurname" name="secondSurname" />
            </label>
            <label>
              Primer nombre
              <input [(ngModel)]="form.firstName" name="firstName" />
            </label>
            <label>
              Segundo nombre
              <input [(ngModel)]="form.secondName" name="secondName" />
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
              <input type="date" [(ngModel)]="form.birthDate" name="birthDate" />
            </label>
            <label>
              ARL
              <input [(ngModel)]="form.arl" name="arl" />
            </label>
            <label>
              EPS
              <input [(ngModel)]="form.eps" name="eps" />
            </label>
            <label class="wide">
              Lugar de donde viene
              <input [(ngModel)]="form.originPlace" name="originPlace" />
            </label>
          </fieldset>

          <fieldset>
            <legend>Datos de ingreso</legend>
            <label class="wide">
              Motivo de visita
              <input [(ngModel)]="form.visitReason" name="visitReason" />
            </label>
            <label>
              Hora de entrada
              <input [ngModel]="nowLabel()" name="entryAt" [ngModelOptions]="{ standalone: true }" readonly />
            </label>
            <label>
              Autorizado por
              <input [(ngModel)]="form.authorizedBy" name="authorizedBy" />
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
              <input [(ngModel)]="form.notes" name="notes" />
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
            <button type="submit" class="primary" [disabled]="saving()">
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

  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly clock = signal(new Date());

  form = this.emptyForm();

  ngOnInit(): void {
    setInterval(() => this.clock.set(new Date()), 1000);
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
    if (f.birthDate) payload.birthDate = f.birthDate;
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
