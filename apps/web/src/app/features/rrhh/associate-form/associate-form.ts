import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { HrPageHeader } from '../../../shared/components/hr-page-header/hr-page-header';
import { ToastService } from '../../../shared/services/toast.service';
import { HrApiService } from '../services/hr-api.service';
import type {
  Associate,
  CatalogKind,
  CatalogValue,
  JobPosition,
  WorkCenter,
} from '../services/hr.types';

type CatalogMap = Partial<Record<CatalogKind, CatalogValue[]>>;

/**
 * Formulario de alta/edición de asociado. Estructura en 4 secciones para
 * evitar un formulario abrumador, con validaciones básicas y campos
 * sensibles marcados como no editables cuando el usuario no tiene el
 * permiso `hr_sensitive.view`.
 */
@Component({
  selector: 'app-associate-form',
  imports: [CommonModule, ReactiveFormsModule, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header [title]="associateId() ? 'Editar asociado' : 'Nuevo asociado'">
        <div actions class="hr-page-header__actions">
          <button type="button" class="hr-btn hr-btn-ghost" (click)="cancel()">Cancelar</button>
          <button
            type="button"
            class="hr-btn hr-btn-primary"
            [disabled]="form.invalid || saving()"
            (click)="submit()"
          >
            {{ saving() ? 'Guardando...' : (associateId() ? 'Guardar cambios' : 'Crear asociado') }}
          </button>
        </div>
      </app-hr-page-header>

      @if (loading()) {
        <p class="hr-loading">Cargando...</p>
      } @else {
        <nav class="hr-tabs">
          <button
            type="button" class="hr-tab"
            [class.active]="section() === 1"
            [class.has-error]="sectionErrors()[1] > 0"
            (click)="section.set(1)"
          >
            1. Identidad
            @if (sectionErrors()[1] > 0) {
              <span class="hr-tab-err">{{ sectionErrors()[1] }}</span>
            }
          </button>
          <button
            type="button" class="hr-tab"
            [class.active]="section() === 2"
            [class.has-error]="sectionErrors()[2] > 0"
            (click)="section.set(2)"
          >
            2. Contacto
            @if (sectionErrors()[2] > 0) {
              <span class="hr-tab-err">{{ sectionErrors()[2] }}</span>
            }
          </button>
          <button
            type="button" class="hr-tab"
            [class.active]="section() === 3"
            [class.has-error]="sectionErrors()[3] > 0"
            (click)="section.set(3)"
          >
            3. Laboral
            @if (sectionErrors()[3] > 0) {
              <span class="hr-tab-err">{{ sectionErrors()[3] }}</span>
            }
          </button>
          <button
            type="button" class="hr-tab"
            [class.active]="section() === 4"
            (click)="section.set(4)"
          >4. Sociodemográfico</button>
        </nav>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <section class="hr-detail-card hr-form-section" [class.hidden]="section() !== 1">
            <h3>Identidad</h3>
            <div class="hr-form-grid">
              <div class="hr-field">
                <label>Tipo documento</label>
                <select formControlName="documentType">
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="PA">Pasaporte</option>
                  <option value="PEP">PEP</option>
                </select>
              </div>
              <div class="hr-field">
                <label>Documento *</label>
                <input formControlName="documentNumber" type="text" />
              </div>
              <div class="hr-field">
                <label>Fecha expedición</label>
                <input formControlName="documentExpeditionDate" type="date" />
              </div>
              <div class="hr-field">
                <label>Nº carpeta</label>
                <input formControlName="folderNumber" type="number" min="0" />
              </div>

              <div class="hr-field">
                <label>Primer nombre *</label>
                <input formControlName="firstName" type="text" />
              </div>
              <div class="hr-field">
                <label>Segundo nombre</label>
                <input formControlName="secondName" type="text" />
              </div>
              <div class="hr-field">
                <label>Primer apellido *</label>
                <input formControlName="firstLastName" type="text" />
              </div>
              <div class="hr-field">
                <label>Segundo apellido</label>
                <input formControlName="secondLastName" type="text" />
              </div>

              <div class="hr-field">
                <label>Fecha nacimiento *</label>
                <input formControlName="birthDate" type="date" />
              </div>
              <div class="hr-field">
                <label>Sexo</label>
                <select formControlName="sexAtBirth">
                  <option [ngValue]="null">—</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div class="hr-field">
                <label>Estado civil</label>
                <select formControlName="maritalStatus">
                  <option [ngValue]="null">—</option>
                  <option value="SOLTERO">Soltero</option>
                  <option value="CASADO">Casado</option>
                  <option value="UNION_LIBRE">Unión libre</option>
                  <option value="DIVORCIADO">Divorciado</option>
                  <option value="VIUDO">Viudo</option>
                </select>
              </div>
              <div class="hr-field">
                <label>Nº acta</label>
                <input formControlName="actReference" type="text" />
              </div>
            </div>
          </section>

          <!-- Contacto -->
          <section class="hr-detail-card hr-form-section" [class.hidden]="section() !== 2">
            <h3>Contacto</h3>
            <div class="hr-form-grid">
              <div class="hr-field">
                <label>Celular *</label>
                <input formControlName="mobile" type="tel" />
              </div>
              <div class="hr-field">
                <label>Fijo</label>
                <input formControlName="landline" type="tel" />
              </div>
              <div class="hr-field col-2">
                <label>Email</label>
                <input formControlName="email" type="email" />
              </div>
              <div class="hr-field col-4">
                <label>Dirección</label>
                <input formControlName="address" type="text" />
              </div>
            </div>

            <h4>Contacto de emergencia</h4>
            <div class="hr-form-grid">
              <div class="hr-field col-2">
                <label>Nombre</label>
                <input formControlName="emergencyContactName" type="text" />
              </div>
              <div class="hr-field">
                <label>Parentesco</label>
                <input formControlName="emergencyContactRelationship" type="text" />
              </div>
              <div class="hr-field">
                <label>Teléfono</label>
                <input formControlName="emergencyContactPhone" type="tel" />
              </div>
            </div>
          </section>

          <!-- Laboral -->
          <section class="hr-detail-card hr-form-section" [class.hidden]="section() !== 3">
            <h3>Laboral</h3>
            <div class="hr-form-grid">
              <div class="hr-field">
                <label>Fecha ingreso *</label>
                <input formControlName="hireDate" type="date" />
              </div>
              <div class="hr-field col-2">
                <label>Cargo</label>
                <select formControlName="jobPositionId">
                  <option [ngValue]="null">Sin asignar</option>
                  @for (p of positions(); track p.id) {
                    <option [ngValue]="p.id">
                      {{ p.name }} @if (p.isCritical) { (crítico) }
                    </option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Motivo cambio</label>
                <input formControlName="positionChangeReason" type="text" />
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
              <div class="hr-field">
                <label>Salario ordinario</label>
                <input formControlName="ordinaryCompensation" type="number" min="0" step="1000" />
              </div>
              <div class="hr-field">
                <label>Salario promedio</label>
                <input formControlName="averageMonthlySalary" type="number" min="0" step="1000" />
              </div>

              <div class="hr-field col-2">
                <label>Cuenta banco</label>
                <input formControlName="bankAccount" type="text" />
              </div>
              <div class="hr-field">
                <label>Curso (código)</label>
                <input formControlName="courseCode" type="text" />
              </div>
              <div class="hr-field">
                <label>NIT escuela</label>
                <input formControlName="schoolNit" type="text" />
              </div>

              <div class="hr-field col-2">
                <label>Nº certificado curso</label>
                <input formControlName="courseCertificateNumber" type="text" />
              </div>
              <div class="hr-field">
                <label>Servicio funerario</label>
                <input formControlName="funeralService" type="text" />
              </div>
              <div class="hr-field">
                <label>Estado</label>
                <select formControlName="status">
                  <option value="ACTIVO">Activo</option>
                  <option value="VACACIONES">Vacaciones</option>
                  <option value="SUSPENDIDO">Suspendido</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>

              <div class="hr-field checkbox">
                <label>
                  <input type="checkbox" formControlName="psychophysicalValid" />
                  Psicofísico vigente
                </label>
              </div>
              <div class="hr-field checkbox">
                <label>
                  <input type="checkbox" formControlName="psychosensometricValid" />
                  Psicosensométrico vigente
                </label>
              </div>
              <div class="hr-field checkbox">
                <label>
                  <input type="checkbox" formControlName="hasSuraPolicy" />
                  Póliza SURA vigente
                </label>
              </div>
            </div>
          </section>

          <!-- Sociodemográfico -->
          <section class="hr-detail-card hr-form-section" [class.hidden]="section() !== 4">
            <h3>Sociodemográfico</h3>
            <div class="hr-form-grid">
              <div class="hr-field">
                <label>EPS</label>
                <select formControlName="epsId">
                  <option [ngValue]="null">—</option>
                  @for (v of catalog('EPS'); track v.id) {
                    <option [ngValue]="v.id">{{ v.value }}</option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Fondo pensión</label>
                <select formControlName="pensionFundId">
                  <option [ngValue]="null">—</option>
                  @for (v of catalog('FONDO_PENSION'); track v.id) {
                    <option [ngValue]="v.id">{{ v.value }}</option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Grupo sanguíneo</label>
                <select formControlName="bloodTypeId">
                  <option [ngValue]="null">—</option>
                  @for (v of catalog('RH'); track v.id) {
                    <option [ngValue]="v.id">{{ v.value }}</option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Género</label>
                <select formControlName="genderId">
                  <option [ngValue]="null">—</option>
                  @for (v of catalog('GENERO'); track v.id) {
                    <option [ngValue]="v.id">{{ v.value }}</option>
                  }
                </select>
              </div>

              <div class="hr-field">
                <label>Nivel de estudio</label>
                <select formControlName="educationLevelId">
                  <option [ngValue]="null">—</option>
                  @for (v of catalog('NIVEL_ESTUDIO'); track v.id) {
                    <option [ngValue]="v.id">{{ v.value }}</option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Rango ingresos</label>
                <select formControlName="incomeRangeId">
                  <option [ngValue]="null">—</option>
                  @for (v of catalog('RANGO_INGRESOS'); track v.id) {
                    <option [ngValue]="v.id">{{ v.value }}</option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Vivienda</label>
                <select formControlName="housingTypeId">
                  <option [ngValue]="null">—</option>
                  @for (v of catalog('TIPO_VIVIENDA'); track v.id) {
                    <option [ngValue]="v.id">{{ v.value }}</option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Estrato</label>
                <input formControlName="estrato" type="number" min="1" max="6" />
              </div>

              <div class="hr-field">
                <label>Medio transporte</label>
                <select formControlName="transportMeanId">
                  <option [ngValue]="null">—</option>
                  @for (v of catalog('MEDIO_TRANSPORTE'); track v.id) {
                    <option [ngValue]="v.id">{{ v.value }}</option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Tiempo traslado</label>
                <select formControlName="commuteTimeId">
                  <option [ngValue]="null">—</option>
                  @for (v of catalog('TIEMPO_TRASLADO'); track v.id) {
                    <option [ngValue]="v.id">{{ v.value }}</option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Hijos</label>
                <input formControlName="childrenCount" type="number" min="0" />
              </div>
              <div class="hr-field">
                <label>Dependientes</label>
                <input formControlName="dependentsCount" type="number" min="0" />
              </div>

              <!-- Sensibles (Ley 1581) -->
              @if (canEditSensitive()) {
                <div class="hr-field">
                  <label>Raza / etnia</label>
                  <select formControlName="raceId">
                    <option [ngValue]="null">—</option>
                    @for (v of catalog('RAZA'); track v.id) {
                      <option [ngValue]="v.id">{{ v.value }}</option>
                    }
                  </select>
                </div>
                <div class="hr-field">
                  <label>Religión</label>
                  <select formControlName="religionId">
                    <option [ngValue]="null">—</option>
                    @for (v of catalog('RELIGION'); track v.id) {
                      <option [ngValue]="v.id">{{ v.value }}</option>
                    }
                  </select>
                </div>
                <div class="hr-field">
                  <label>Orientación sexual</label>
                  <select formControlName="sexualOrientationId">
                    <option [ngValue]="null">—</option>
                    @for (v of catalog('ORIENTACION_SEXUAL'); track v.id) {
                      <option [ngValue]="v.id">{{ v.value }}</option>
                    }
                  </select>
                </div>
              } @else {
                <div class="hr-field col-3 hr-note-sensitive">
                  Datos sensibles Ley 1581 · solo GERENCIA y RRHH pueden editar
                </div>
              }

              <div class="hr-field col-4">
                <label>Proyecto de vida</label>
                <textarea formControlName="lifePlan" rows="3"></textarea>
              </div>
            </div>
          </section>

          @if (submitError()) {
            <div class="hr-error">{{ submitError() }}</div>
          }
        </form>
      }
    </div>
  `,
})
export class AssociateForm implements OnInit {
  private readonly api = inject(HrApiService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly associateId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly section = signal<1 | 2 | 3 | 4>(1);

  readonly positions = signal<JobPosition[]>([]);
  readonly workCenters = signal<WorkCenter[]>([]);
  readonly catalogs = signal<CatalogMap>({});

  readonly canEditSensitive = computed(() => this.auth.hasPermission('hr_sensitive.view'));

  /** Mapa control → sección para agrupar errores de validación por tab. */
  private readonly controlToSection: Record<string, 1 | 2 | 3 | 4> = {
    documentType: 1, documentNumber: 1, documentExpeditionDate: 1, folderNumber: 1,
    firstName: 1, secondName: 1, firstLastName: 1, secondLastName: 1,
    birthDate: 1, sexAtBirth: 1, maritalStatus: 1, actReference: 1,
    mobile: 2, landline: 2, email: 2, address: 2,
    emergencyContactName: 2, emergencyContactRelationship: 2, emergencyContactPhone: 2,
    hireDate: 3, jobPositionId: 3, workCenterId: 3, positionChangeReason: 3,
    ordinaryCompensation: 3, averageMonthlySalary: 3, bankAccount: 3,
    courseCode: 3, schoolNit: 3, courseCertificateNumber: 3, funeralService: 3,
    psychophysicalValid: 3, psychosensometricValid: 3, hasSuraPolicy: 3, status: 3,
  };

  /**
   * Cuenta cuántos controles inválidos hay por cada tab, para poder mostrar
   * un badge rojo en el tab correspondiente.
   */
  readonly sectionErrors = computed<Record<1 | 2 | 3 | 4, number>>(() => {
    // El signal es un truco: cambiamos section() para invalidar el computed
    // cuando el usuario navega. En realidad revisamos el form completo.
    void this.section();
    void this.saving();
    const counts: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    Object.entries(this.form.controls).forEach(([name, ctrl]) => {
      if (ctrl.invalid && (ctrl.touched || ctrl.dirty)) {
        const s = this.controlToSection[name] ?? 4;
        counts[s]++;
      }
    });
    return counts;
  });

  form: FormGroup = this.fb.nonNullable.group({
    // Identidad
    documentType: ['CC'],
    documentNumber: ['', [Validators.required, Validators.minLength(4)]],
    documentExpeditionDate: [null],
    folderNumber: [null],
    firstName: ['', Validators.required],
    secondName: [null],
    firstLastName: ['', Validators.required],
    secondLastName: [null],
    birthDate: ['', Validators.required],
    sexAtBirth: [null],
    maritalStatus: [null],
    actReference: [null],

    // Contacto
    mobile: ['', Validators.required],
    landline: [null],
    email: [null, [Validators.email]],
    address: [null],
    emergencyContactName: [null],
    emergencyContactRelationship: [null],
    emergencyContactPhone: [null],

    // Laboral
    hireDate: ['', Validators.required],
    jobPositionId: [null],
    workCenterId: [null],
    positionChangeReason: [null],
    ordinaryCompensation: [0],
    averageMonthlySalary: [0],
    bankAccount: [null],
    courseCode: [null],
    schoolNit: [null],
    courseCertificateNumber: [null],
    funeralService: [null],
    psychophysicalValid: [false],
    psychosensometricValid: [false],
    hasSuraPolicy: [false],
    status: ['ACTIVO'],

    // Sociodemográfico
    epsId: [null],
    pensionFundId: [null],
    bloodTypeId: [null],
    genderId: [null],
    housingTypeId: [null],
    educationLevelId: [null],
    incomeRangeId: [null],
    transportMeanId: [null],
    commuteTimeId: [null],
    estrato: [null],
    childrenCount: [0],
    dependentsCount: [0],
    lifePlan: [null],

    // Sensibles
    raceId: [null],
    religionId: [null],
    sexualOrientationId: [null],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.associateId.set(id);

    forkJoin({
      positions: this.api.listJobPositions(),
      workCenters: this.api.listWorkCenters(),
      catalogs: this.api.listAllCatalogs(),
    }).subscribe({
      next: ({ positions, workCenters, catalogs }) => {
        this.positions.set(positions);
        this.workCenters.set(workCenters);
        this.catalogs.set(catalogs);
        if (id) {
          this.api.getAssociate(id).subscribe({
            next: (a) => {
              this.patchForm(a);
              this.loading.set(false);
            },
            error: () => {
              this.loading.set(false);
              this.submitError.set('No se pudo cargar el asociado');
            },
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
        this.submitError.set('No se pudieron cargar los catálogos');
      },
    });
  }

  catalog(kind: CatalogKind): CatalogValue[] {
    return this.catalogs()[kind] ?? [];
  }

  private patchForm(a: Associate): void {
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(this.form.controls)) {
      if (key in a) patch[key] = (a as unknown as Record<string, unknown>)[key];
    }
    this.form.patchValue(patch);
  }

  submit(): void {
    if (this.form.invalid) {
      // Marca todos los controles como touched para que los badges de error
      // aparezcan en cada tab con problemas, y salta al primero.
      this.form.markAllAsTouched();
      const counts = this.sectionErrors();
      const firstBadSection = ([1, 2, 3, 4] as const).find((s) => counts[s] > 0);
      if (firstBadSection) this.section.set(firstBadSection);
      this.submitError.set('Revisa los campos marcados en rojo en las pestañas.');
      this.toast.warning('Formulario incompleto', 'Hay campos obligatorios sin llenar.');
      return;
    }
    this.saving.set(true);
    this.submitError.set(null);
    const payload = this.form.getRawValue();
    const id = this.associateId();
    const req = id
      ? this.api.updateAssociate(id, payload as Partial<Associate>)
      : this.api.createAssociate(payload as Partial<Associate>);
    req.subscribe({
      next: (a) => {
        this.saving.set(false);
        this.toast.success(id ? 'Asociado actualizado' : 'Asociado creado');
        this.router.navigate(['/rrhh/asociados', a.id]);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err.error?.message ?? 'Error guardando el asociado';
        this.submitError.set(msg);
        this.toast.error('No se pudo guardar', msg);
      },
    });
  }

  cancel(): void {
    const id = this.associateId();
    this.router.navigate(id ? ['/rrhh/asociados', id] : ['/rrhh/asociados']);
  }
}
