import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ToastService } from '../../../../shared/services/toast.service';
import { HrApiService } from '../../services/hr-api.service';
import type { Associate, CatalogValue, Retirement } from '../../services/hr.types';

const SURVEY_QUESTIONS: { key: keyof Retirement; label: string }[] = [
  { key: 'surveyPhysicalEnv', label: 'Ambiente físico de trabajo' },
  { key: 'surveyInduction', label: 'Inducción al ingreso' },
  { key: 'surveyReinduction', label: 'Reinducciones periódicas' },
  { key: 'surveyTraining', label: 'Capacitación recibida' },
  { key: 'surveyGroupMotivation', label: 'Motivación de grupo' },
  { key: 'surveyRecognition', label: 'Reconocimiento del trabajo' },
  { key: 'surveyCompensation', label: 'Compensación / beneficios' },
];

/**
 * Registro de retiro de un asociado con encuesta de salida.
 */
@Component({
  selector: 'app-retirement-form',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="hr-page">
      @if (loading()) {
        <p class="hr-loading">Cargando...</p>
      } @else if (associate(); as a) {
        <header class="hr-profile-hero hr-profile-hero--danger">
          <div>
            <h1>Registrar retiro</h1>
            <div class="hr-profile-hero__meta">
              <span>{{ a.fullName }} · {{ a.documentNumber }} · {{ a.jobPosition?.name ?? 'Sin cargo' }}</span>
            </div>
          </div>
          <div class="hr-profile-hero__actions">
            <button type="button" class="hr-hero-btn hr-hero-btn--ghost" (click)="cancel()">Cancelar</button>
            <button
              type="button"
              class="hr-hero-btn hr-hero-btn--danger"
              [disabled]="form.invalid || saving()"
              (click)="submit()"
            >
              {{ saving() ? 'Guardando...' : 'Registrar retiro' }}
            </button>
          </div>
        </header>

        <form [formGroup]="form">
          <div class="hr-detail-card">
            <h3>Datos del retiro</h3>
            <div class="hr-form-grid-3">
              <div class="hr-field">
                <label>Fecha de retiro *</label>
                <input type="date" formControlName="retirementDate" />
              </div>
              <div class="hr-field">
                <label>Motivo *</label>
                <select formControlName="reasonId">
                  <option [ngValue]="''">Seleccionar</option>
                  @for (r of reasons(); track r.id) {
                    <option [ngValue]="r.id">{{ r.value }}</option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Razón / causa *</label>
                <select formControlName="causeId">
                  <option [ngValue]="''">Seleccionar</option>
                  @for (c of causes(); track c.id) {
                    <option [ngValue]="c.id">{{ c.value }}</option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Liquidación</label>
                <select formControlName="liquidationStatus">
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_PROCESO">En proceso</option>
                  <option value="OK">Pagada</option>
                  <option value="RECHAZADA">Rechazada</option>
                </select>
              </div>
              <div class="hr-field">
                <label>¿Volvería a trabajar?</label>
                <select formControlName="wouldReturn">
                  <option value="N-A">No aplica</option>
                  <option value="SI">Sí</option>
                  <option value="NO">No</option>
                </select>
              </div>
              <div class="hr-field col-3">
                <label>Observaciones</label>
                <textarea formControlName="observations" rows="3"></textarea>
              </div>
              <div class="hr-field col-3">
                <label>Lo que menos le gustó</label>
                <textarea formControlName="leastLiked" rows="3"></textarea>
              </div>
            </div>
          </div>

          <div class="hr-detail-card">
            <h3>Encuesta de salida</h3>
            <p class="hr-survey-note">Valora del 1 (deficiente) al 5 (excelente) cada dimensión.</p>
            <div class="hr-survey-grid">
              @for (q of surveyQuestions; track q.key) {
                <div class="hr-survey-row">
                  <span class="hr-survey-label">{{ q.label }}</span>
                  <div class="hr-survey-stars">
                    @for (i of [1,2,3,4,5]; track i) {
                      <button
                        type="button"
                        class="hr-survey-star"
                        [class.on]="valueOf(q.key) >= i"
                        (click)="setSurvey(q.key, i)"
                      >★</button>
                    }
                    <span class="hr-survey-value">{{ valueOf(q.key) }}/5</span>
                  </div>
                </div>
              }
            </div>
          </div>

          @if (submitError()) {
            <div class="hr-error">{{ submitError() }}</div>
          }
        </form>
      } @else {
        <p class="hr-error">No se pudo cargar el asociado.</p>
      }
    </div>
  `,
})
export class RetirementForm implements OnInit {
  private readonly api = inject(HrApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly surveyQuestions = SURVEY_QUESTIONS;
  readonly associate = signal<Associate | null>(null);
  readonly reasons = signal<CatalogValue[]>([]);
  readonly causes = signal<CatalogValue[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly submitError = signal<string | null>(null);

  form: FormGroup = this.fb.nonNullable.group({
    associateId: ['', Validators.required],
    retirementDate: [new Date().toISOString().slice(0, 10), Validators.required],
    reasonId: ['', Validators.required],
    causeId: ['', Validators.required],
    liquidationStatus: ['PENDIENTE'],
    observations: [''],
    leastLiked: [''],
    wouldReturn: ['N-A'],
    surveyPhysicalEnv: [3, [Validators.min(1), Validators.max(5)]],
    surveyInduction: [3, [Validators.min(1), Validators.max(5)]],
    surveyReinduction: [3, [Validators.min(1), Validators.max(5)]],
    surveyTraining: [3, [Validators.min(1), Validators.max(5)]],
    surveyGroupMotivation: [3, [Validators.min(1), Validators.max(5)]],
    surveyRecognition: [3, [Validators.min(1), Validators.max(5)]],
    surveyCompensation: [3, [Validators.min(1), Validators.max(5)]],
  });

  ngOnInit(): void {
    const associateId = this.route.snapshot.paramMap.get('associateId');
    if (!associateId) {
      this.loading.set(false);
      return;
    }
    this.form.patchValue({ associateId });

    forkJoin({
      associate: this.api.getAssociate(associateId),
      reasons: this.api.listCatalog('MOTIVO_RETIRO'),
      causes: this.api.listCatalog('RAZON_RETIRO'),
    }).subscribe({
      next: ({ associate, reasons, causes }) => {
        this.associate.set(associate);
        this.reasons.set(reasons);
        this.causes.set(causes);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  valueOf(key: keyof Retirement): number {
    return Number(this.form.get(key as string)?.value ?? 0);
  }

  setSurvey(key: keyof Retirement, value: number): void {
    this.form.patchValue({ [key]: value } as Partial<Retirement>);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set('Faltan campos obligatorios');
      this.toast.warning('Formulario incompleto', 'Completa los campos requeridos.');
      return;
    }
    this.saving.set(true);
    this.submitError.set(null);
    this.api.createRetirement(this.form.getRawValue() as Partial<Retirement>).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Retiro registrado', 'El asociado quedó marcado como RETIRADO');
        const a = this.associate();
        if (a) this.router.navigate(['/rrhh/asociados', a.id]);
        else this.router.navigate(['/rrhh/retiros']);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err.error?.message ?? 'Error registrando el retiro';
        this.submitError.set(msg);
        this.toast.error('No se pudo registrar el retiro', msg);
      },
    });
  }

  cancel(): void {
    const a = this.associate();
    this.router.navigate(a ? ['/rrhh/asociados', a.id] : ['/rrhh/retiros']);
  }
}
