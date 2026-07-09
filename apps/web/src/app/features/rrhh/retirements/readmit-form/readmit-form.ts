import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ToastService } from '../../../../shared/services/toast.service';
import { HrApiService } from '../../services/hr-api.service';
import type { Associate, JobPosition, WorkCenter } from '../../services/hr.types';

/**
 * Formulario de reingreso de un asociado RETIRADO.
 */
@Component({
  selector: 'app-readmit-form',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="hr-page">
      @if (loading()) {
        <p class="hr-loading">Cargando...</p>
      } @else if (associate(); as a) {
        <header class="hr-profile-hero">
          <div>
            <h1>Reingreso</h1>
            <div class="hr-profile-hero__meta">
              <span>{{ a.firstName }} {{ a.firstLastName }} · {{ a.documentNumber }}</span>
            </div>
          </div>
        </header>

        @if (a.status !== 'RETIRADO') {
          <div class="hr-alert-warn">Este asociado no está en estado RETIRADO. Estado actual: {{ a.status }}.</div>
        } @else {
          <form [formGroup]="form" class="hr-detail-card">
            <div class="hr-grid-2">
              <div class="hr-field">
                <label>Nueva fecha de ingreso *</label>
                <input type="date" formControlName="hireDate" />
              </div>
              <div class="hr-field">
                <label>Nº carpeta</label>
                <input type="number" formControlName="folderNumber" min="0" />
              </div>
              <div class="hr-field col-2">
                <label>Cargo *</label>
                <select formControlName="jobPositionId">
                  <option [ngValue]="''">Seleccionar</option>
                  @for (p of positions(); track p.id) {
                    <option [ngValue]="p.id">{{ p.name }}</option>
                  }
                </select>
              </div>
              <div class="hr-field col-2">
                <label>Centro de trabajo</label>
                <select formControlName="workCenterId">
                  <option [ngValue]="null">Sin asignar</option>
                  @for (wc of workCenters(); track wc.id) {
                    <option [ngValue]="wc.id">{{ wc.code }} — {{ wc.clientName }}</option>
                  }
                </select>
              </div>
              <div class="hr-field col-2">
                <label>Motivo del reingreso</label>
                <input type="text" formControlName="reason" placeholder="Ej. Retorno tras licencia" />
              </div>
            </div>

            <div class="hr-form-actions">
              <button type="button" class="hr-btn hr-btn-ghost" (click)="cancel()">Cancelar</button>
              <button
                type="button"
                class="hr-btn hr-btn-primary"
                [disabled]="form.invalid || saving()"
                (click)="submit()"
              >
                {{ saving() ? 'Guardando...' : 'Procesar reingreso' }}
              </button>
            </div>
            @if (submitError()) { <div class="hr-error">{{ submitError() }}</div> }
          </form>
        }
      }
    </div>
  `,
})
export class ReadmitForm implements OnInit {
  private readonly api = inject(HrApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly associate = signal<Associate | null>(null);
  readonly positions = signal<JobPosition[]>([]);
  readonly workCenters = signal<WorkCenter[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly submitError = signal<string | null>(null);

  form: FormGroup = this.fb.nonNullable.group({
    hireDate: [new Date().toISOString().slice(0, 10), Validators.required],
    folderNumber: [null],
    jobPositionId: ['', Validators.required],
    workCenterId: [null],
    reason: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    forkJoin({
      associate: this.api.getAssociate(id),
      positions: this.api.listJobPositions(),
      workCenters: this.api.listWorkCenters(),
    }).subscribe({
      next: ({ associate, positions, workCenters }) => {
        this.associate.set(associate);
        this.positions.set(positions);
        this.workCenters.set(workCenters);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  submit(): void {
    const a = this.associate();
    if (!a || this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Formulario incompleto', 'Completa los campos requeridos.');
      return;
    }
    this.saving.set(true);
    this.api.readmitAssociate(a.id, this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Asociado reingresado', 'Se conservó el historial anterior');
        this.router.navigate(['/rrhh/asociados', a.id]);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err.error?.message ?? 'Error procesando el reingreso';
        this.submitError.set(msg);
        this.toast.error('No se pudo reingresar', msg);
      },
    });
  }

  cancel(): void {
    const a = this.associate();
    this.router.navigate(a ? ['/rrhh/asociados', a.id] : ['/rrhh/asociados']);
  }
}
