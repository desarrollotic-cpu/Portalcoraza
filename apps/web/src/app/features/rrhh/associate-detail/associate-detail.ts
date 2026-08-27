import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideBell,
  LucideBriefcase,
  LucideCalendarOff,
  LucideCircleCheck,
  LucideCircleX,
  LucideDownload,
  LucideFileText,
  LucideHistory,
  LucideTrash2,
  LucideUpload,
  LucideUser,
} from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import { Icon } from '../../../shared/components/icon/icon';
import { ToastService } from '../../../shared/services/toast.service';
import { HrApiService } from '../services/hr-api.service';
import type {
  Associate,
  AssociateAbsence,
  AssociateDocumentItem,
  AssociateDocumentKind,
  AssociateHistoryEntry,
  HrAlert,
  PositionHistoryEntry,
} from '../services/hr.types';

const DOCUMENT_LABELS: Record<AssociateDocumentKind, string> = {
  CEDULA: 'Cédula',
  CERTIFICADO_CURSO: 'Certificado de curso',
  EXAMEN_PSICOFISICO: 'Examen psicofísico',
  EXAMEN_PSICOSENSOMETRICO: 'Examen psicosensométrico',
  POLIZA_SURA: 'Póliza SURA',
  CONTRATO: 'Contrato',
  ACTA: 'Acta',
  OTRO: 'Otro',
};

type TabId = 'personal' | 'laboral' | 'documentos' | 'ausencias' | 'alertas';

/**
 * Hoja de vida digital del asociado:
 *   Personal · Laboral · Documentos · Ausencias · Alertas/bitácora
 */
@Component({
  selector: 'app-associate-detail',
  imports: [CommonModule, FormsModule, RouterLink, Icon],
  template: `
    <div class="hr-page">
      @if (loading()) {
        <p class="hr-loading">Cargando ficha...</p>
      } @else if (error()) {
        <p class="hr-error">{{ error() }}</p>
      } @else if (associate(); as a) {
        <header class="hr-profile-hero">
          <div class="hr-profile-hero__main">
            <div class="hr-profile-hero__avatar">{{ initials(a) }}</div>
            <div>
              <h1>{{ a.fullName }}</h1>
              <div class="hr-profile-hero__meta">
                <span class="hr-hero-badge" [attr.data-color]="statusColor(a.status)">
                  {{ a.status }}
                </span>
                <span>{{ a.documentType }} · {{ a.documentNumber }}</span>
                @if (a.jobPosition) {
                  <span>· {{ a.jobPosition.name }}</span>
                }
                @if (a.workCenter) {
                  <span>· {{ a.workCenter.code }}</span>
                }
              </div>
            </div>
          </div>
          <div class="hr-profile-hero__actions">
            @if (auth.hasPermission('associates.edit') && a.status !== 'RETIRADO') {
              <a [routerLink]="['/rrhh/asociados', a.id, 'editar']" class="hr-hero-btn hr-hero-btn--light">Editar</a>
            }
            @if (a.status !== 'RETIRADO' && auth.hasPermission('retirements.create')) {
              <a [routerLink]="['/rrhh/retiros/nuevo', a.id]" class="hr-hero-btn hr-hero-btn--ghost">Registrar retiro</a>
            }
          </div>
        </header>

        <!-- Quick stats -->
        <section class="hr-summary">
          <div><span>Edad</span><strong>{{ a.currentAge }} años</strong></div>
          <div><span>Edad al ingreso</span><strong>{{ a.ageAtHire }} años</strong></div>
          <div><span>Antigüedad</span><strong>{{ a.tenureYears }} años</strong></div>
          <div>
            <span>Cumplimiento SST</span>
            <strong class="hr-stat-inline">
              <span class="hr-sst-light" [class.on]="a.psychophysicalValid" title="Psicofísico">
                <app-icon [icon]="a.psychophysicalValid ? icons.Check : icons.X" [size]="12" />
              </span>
              <span class="hr-sst-light" [class.on]="a.psychosensometricValid" title="Psicosensométrico">
                <app-icon [icon]="a.psychosensometricValid ? icons.Check : icons.X" [size]="12" />
              </span>
              <span class="hr-sst-light" [class.on]="a.hasSuraPolicy" title="Póliza SURA">
                <app-icon [icon]="a.hasSuraPolicy ? icons.Check : icons.X" [size]="12" />
              </span>
            </strong>
          </div>
        </section>

        <!-- Tabs -->
        <nav class="hr-tabs">
          <button
            type="button"
            class="hr-tab"
            [class.active]="tab() === 'personal'"
            (click)="tab.set('personal')"
          >
            <app-icon [icon]="icons.User" [size]="16" /> Personal
          </button>
          <button
            type="button"
            class="hr-tab"
            [class.active]="tab() === 'laboral'"
            (click)="tab.set('laboral')"
          >
            <app-icon [icon]="icons.Briefcase" [size]="16" /> Laboral
          </button>
          <button
            type="button"
            class="hr-tab"
            [class.active]="tab() === 'documentos'"
            (click)="tab.set('documentos')"
          >
            <app-icon [icon]="icons.FileText" [size]="16" /> Documentos ({{ documents().length }})
          </button>
          @if (auth.hasPermission('absences.view')) {
            <button
              type="button"
              class="hr-tab"
              [class.active]="tab() === 'ausencias'"
              (click)="tab.set('ausencias')"
            >
              <app-icon [icon]="icons.CalendarOff" [size]="16" /> Ausencias ({{ absences().length }})
            </button>
          }
          <button
            type="button"
            class="hr-tab"
            [class.active]="tab() === 'alertas'"
            (click)="tab.set('alertas')"
          >
            <app-icon [icon]="icons.Bell" [size]="16" /> Alertas y bitácora
          </button>
        </nav>

        <!-- Personal -->
        @if (tab() === 'personal') {
          <section class="hr-tab-panel">
            <div class="hr-grid-2">
              <div class="hr-detail-card">
                <h3>Identidad</h3>
                <dl class="hr-dl">
                  <div><dt>Nombres</dt><dd>{{ a.firstName }} {{ a.secondName ?? '' }}</dd></div>
                  <div><dt>Apellidos</dt><dd>{{ a.firstLastName }} {{ a.secondLastName ?? '' }}</dd></div>
                  <div><dt>Documento</dt><dd>{{ a.documentType }} {{ a.documentNumber }}</dd></div>
                  <div><dt>Expedido</dt><dd>{{ a.documentExpeditionDate ?? '—' }}</dd></div>
                  <div><dt>Nacimiento</dt><dd>{{ a.birthDate }}</dd></div>
                  <div><dt>Sexo</dt><dd>{{ a.sexAtBirth ?? '—' }}</dd></div>
                  <div><dt>Estado civil</dt><dd>{{ a.maritalStatus ?? '—' }}</dd></div>
                  <div><dt>Carpeta</dt><dd>{{ a.folderNumber ?? '—' }}</dd></div>
                  <div><dt>Acta</dt><dd>{{ a.actReference ?? '—' }}</dd></div>
                </dl>
              </div>

              <div class="hr-detail-card">
                <h3>Contacto</h3>
                <dl class="hr-dl">
                  <div><dt>Celular</dt><dd>{{ a.mobile }}</dd></div>
                  <div><dt>Fijo</dt><dd>{{ a.landline ?? '—' }}</dd></div>
                  <div><dt>Email</dt><dd>{{ a.email ?? '—' }}</dd></div>
                  <div><dt>Dirección</dt><dd>{{ a.address ?? '—' }}</dd></div>
                  <div><dt>Contacto emerg.</dt><dd>{{ a.emergencyContactName ?? '—' }}</dd></div>
                  <div><dt>Parentesco</dt><dd>{{ a.emergencyContactRelationship ?? '—' }}</dd></div>
                  <div><dt>Teléfono emerg.</dt><dd>{{ a.emergencyContactPhone ?? '—' }}</dd></div>
                </dl>
              </div>

              <div class="hr-detail-card">
                <h3>Salud y afiliaciones</h3>
                <dl class="hr-dl">
                  <div><dt>EPS</dt><dd>{{ a.eps?.value ?? '—' }}</dd></div>
                  <div><dt>Fondo pensión</dt><dd>{{ a.pensionFund?.value ?? '—' }}</dd></div>
                  <div><dt>RH</dt><dd>{{ a.bloodType?.value ?? '—' }}</dd></div>
                  <div><dt>Servicio funerario</dt><dd>{{ a.funeralService ?? '—' }}</dd></div>
                </dl>
              </div>

              <div class="hr-detail-card">
                <h3>Sociodemográfico</h3>
                <dl class="hr-dl">
                  <div><dt>Género</dt><dd>{{ a.gender?.value ?? '—' }}</dd></div>
                  <div><dt>Hijos</dt><dd>{{ a.childrenCount }}</dd></div>
                  <div><dt>Dependientes</dt><dd>{{ a.dependentsCount }}</dd></div>
                  <div><dt>Estrato</dt><dd>{{ a.estrato ?? '—' }}</dd></div>
                  <div><dt>Nivel de estudio</dt><dd>{{ a.educationLevel?.value ?? '—' }}</dd></div>
                  <div><dt>Rango ingresos</dt><dd>{{ a.incomeRange?.value ?? '—' }}</dd></div>
                  <div><dt>Vivienda</dt><dd>{{ a.housingType?.value ?? '—' }}</dd></div>
                  <div><dt>Transporte</dt><dd>{{ a.transportMean?.value ?? '—' }}</dd></div>
                  <div><dt>Traslado</dt><dd>{{ a.commuteTime?.value ?? '—' }}</dd></div>
                </dl>
              </div>

              <div class="hr-detail-card hr-card-sensitive">
                <h3>
                  Datos sensibles
                  @if (isMasked(a)) {
                    <span class="hr-badge-masked">Ley 1581 · oculto</span>
                  }
                </h3>
                <dl class="hr-dl">
                  <div><dt>Raza / etnia</dt><dd>{{ a.race?.value ?? '—' }}</dd></div>
                  <div><dt>Religión</dt><dd>{{ a.religion?.value ?? '—' }}</dd></div>
                  <div><dt>Orientación sexual</dt><dd>{{ a.sexualOrientation?.value ?? '—' }}</dd></div>
                </dl>
                @if (a.lifePlan) {
                  <div class="hr-life-plan">
                    <strong>Proyecto de vida:</strong>
                    <p>{{ a.lifePlan }}</p>
                  </div>
                }
              </div>
            </div>
          </section>
        }

        <!-- Laboral -->
        @if (tab() === 'laboral') {
          <section class="hr-tab-panel">
            <div class="hr-grid-2">
              <div class="hr-detail-card">
                <h3>Contrato</h3>
                <dl class="hr-dl">
                  <div><dt>Cargo actual</dt><dd>{{ a.jobPosition?.name ?? '—' }}</dd></div>
                  <div><dt>Centro</dt><dd>{{ a.workCenter?.clientName ?? '—' }}</dd></div>
                  <div><dt>Ingreso</dt><dd>{{ a.hireDate }}</dd></div>
                  <div><dt>Salario ordinario</dt><dd>\${{ a.ordinaryCompensation | number:'1.0-0' }}</dd></div>
                  <div><dt>Salario promedio</dt><dd>\${{ a.averageMonthlySalary | number:'1.0-0' }}</dd></div>
                  <div><dt>Cuenta banco</dt><dd>{{ a.bankAccount ?? '—' }}</dd></div>
                </dl>
              </div>
              <div class="hr-detail-card">
                <h3>Cumplimiento SST</h3>
                <dl class="hr-dl">
                  <div><dt>Psicofísico</dt><dd>{{ a.psychophysicalValid ? 'Vigente' : 'Vencido / faltante' }}</dd></div>
                  <div><dt>Psicosensométrico</dt><dd>{{ a.psychosensometricValid ? 'Vigente' : 'Vencido / faltante' }}</dd></div>
                  <div><dt>Curso</dt><dd>{{ a.courseCode ?? '—' }}</dd></div>
                  <div><dt>Escuela NIT</dt><dd>{{ a.schoolNit ?? '—' }}</dd></div>
                  <div><dt>Nº certificado</dt><dd>{{ a.courseCertificateNumber ?? '—' }}</dd></div>
                  <div><dt>Póliza SURA</dt><dd>{{ a.hasSuraPolicy ? 'Sí' : 'No' }}</dd></div>
                </dl>
              </div>
            </div>

            <div class="hr-detail-card">
              <h3><app-icon [icon]="icons.History" [size]="18" /> Historial de cargos</h3>
              @if (positionHistory().length === 0) {
                <p class="hr-empty">Solo cargo actual. Sin cambios registrados.</p>
              } @else {
                <div class="hr-timeline">
                  @for (h of positionHistory(); track h.id) {
                    <div class="hr-timeline-item">
                      <div class="hr-timeline-date">{{ h.changedAt | date:'mediumDate' }}</div>
                      <div class="hr-timeline-body">
                        <strong>{{ h.jobPosition.name }}</strong>
                        @if (h.workCenter) {
                          <span> · {{ h.workCenter.code }} — {{ h.workCenter.clientName }}</span>
                        }
                        @if (h.changeReason) {
                          <div class="hr-timeline-reason">{{ h.changeReason }}</div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </section>
        }

        <!-- Documentos -->
        @if (tab() === 'documentos') {
          <section class="hr-tab-panel">
            @if (auth.hasPermission('hr_documents.upload')) {
              <div class="hr-detail-card hr-upload-card">
                <h3><app-icon [icon]="icons.Upload" [size]="18" /> Subir documento</h3>
                <div class="hr-upload-row">
                  <select [(ngModel)]="uploadKind" [ngModelOptions]="{ standalone: true }">
                    @for (k of docKinds; track k.value) {
                      <option [value]="k.value">{{ k.label }}</option>
                    }
                  </select>
                  <input
                    type="date"
                    [(ngModel)]="uploadExpiration"
                    [ngModelOptions]="{ standalone: true }"
                    placeholder="Vence"
                  />
                  <input type="file" (change)="onFileChange($event)" accept=".pdf,image/*" />
                  <button
                    type="button"
                    class="hr-btn hr-btn-primary"
                    [disabled]="!selectedFile || uploading()"
                    (click)="uploadDoc()"
                  >
                    {{ uploading() ? 'Subiendo...' : 'Subir' }}
                  </button>
                </div>
              </div>
            }

            <div class="hr-detail-card">
              <h3>Documentos ({{ documents().length }})</h3>
              @if (documents().length === 0) {
                <p class="hr-empty">Sin documentos cargados aún.</p>
              } @else {
                <table class="hr-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Archivo</th>
                      <th>Vence</th>
                      <th>Subido</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of documents(); track d.id) {
                      <tr>
                        <td><span class="hr-doc-kind">{{ docLabel(d.documentKind) }}</span></td>
                        <td>{{ d.fileName ?? 'archivo' }}</td>
                        <td [class.hr-expired]="isExpired(d)">
                          {{ d.expirationDate ?? '—' }}
                        </td>
                        <td>{{ d.uploadedAt | date:'shortDate' }}</td>
                        <td class="row-actions">
                          <a [href]="d.fileUrl" target="_blank" rel="noopener" class="hr-link">
                            <app-icon [icon]="icons.Download" [size]="14" /> Ver
                          </a>
                          @if (auth.hasPermission('hr_documents.delete')) {
                            <button type="button" class="hr-btn-danger-sm" (click)="deleteDoc(d.id)">
                              <app-icon [icon]="icons.Trash" [size]="14" />
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          </section>
        }

        <!-- Ausentismo -->
        @if (tab() === 'ausencias') {
          <section class="hr-tab-panel">
            <div class="hr-detail-card">
              <h3>
                <app-icon [icon]="icons.CalendarOff" [size]="18" />
                Historial de ausencias
                <a routerLink="/rrhh/ausentismo" class="hr-link" style="margin-left: 0.75rem; font-weight: 500">
                  Abrir panel
                </a>
              </h3>
              @if (absences().length === 0) {
                <p class="hr-empty">Sin ausencias registradas.</p>
              } @else {
                <table class="hr-table">
                  <thead>
                    <tr>
                      <th>Clase</th>
                      <th>Evento</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Días</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (ab of absences(); track ab.id) {
                      <tr>
                        <td>{{ ab.kind === 'MEDICO' ? 'Médico' : 'Admin' }}</td>
                        <td>{{ ab.eventType }}</td>
                        <td>{{ ab.startDate }}</td>
                        <td>{{ ab.endDate }}</td>
                        <td>{{ ab.absenceDays }}</td>
                        <td>
                          @if (ab.diagnosis) {
                            {{ ab.diagnosis.codigo }} — {{ ab.diagnosis.descripcion }}
                          } @else {
                            {{ ab.cause || ab.incapacityOrigin || '—' }}
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          </section>
        }

        <!-- Alertas y bitácora -->
        @if (tab() === 'alertas') {
          <section class="hr-tab-panel">
            <div class="hr-detail-card">
              <h3><app-icon [icon]="icons.Bell" [size]="18" /> Alertas HRM ({{ alerts().length }})</h3>
              @if (alerts().length === 0) {
                <p class="hr-empty">Sin alertas activas para este asociado.</p>
              } @else {
                <ul class="hr-alert-list">
                  @for (al of alerts(); track al.id) {
                    <li class="hr-alert-item hr-alert-item--compact" [class.resolved]="al.status === 'RESUELTA'">
                      <div>
                        <strong>{{ formatAlertType(al.alertType) }}</strong>
                        <div class="hr-alert-item__meta">Vence: {{ al.expirationDate }} · {{ al.status }}</div>
                      </div>
                      @if (al.status === 'PENDIENTE' && auth.hasPermission('hr_alerts.resolve')) {
                        <button type="button" class="hr-btn hr-btn-ghost hr-btn-sm" (click)="resolveAlert(al.id)">
                          Marcar resuelta
                        </button>
                      }
                    </li>
                  }
                </ul>
              }
            </div>

            <div class="hr-detail-card">
              <h3><app-icon [icon]="icons.History" [size]="18" /> Bitácora de cambios</h3>
              @if (history().length === 0) {
                <p class="hr-empty">Sin historial registrado.</p>
              } @else {
                <div class="hr-timeline">
                  @for (h of history(); track h.id) {
                    <div class="hr-timeline-item">
                      <div class="hr-timeline-date">{{ h.createdAt | date:'medium' }}</div>
                      <div class="hr-timeline-body">
                        <strong>{{ h.action }}</strong> · <span class="hr-field-name">{{ h.fieldName }}</span>
                        <div class="hr-change">
                          <span class="hr-change-old">{{ h.oldValue ?? '—' }}</span>
                          <span>→</span>
                          <span class="hr-change-new">{{ h.newValue ?? '—' }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
})
export class AssociateDetail implements OnInit {
  private readonly api = inject(HrApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly icons = {
    User: LucideUser,
    Briefcase: LucideBriefcase,
    FileText: LucideFileText,
    Bell: LucideBell,
    History: LucideHistory,
    Check: LucideCircleCheck,
    X: LucideCircleX,
    Upload: LucideUpload,
    Download: LucideDownload,
    Trash: LucideTrash2,
    CalendarOff: LucideCalendarOff,
  };

  readonly docKinds: { value: AssociateDocumentKind; label: string }[] = Object.entries(DOCUMENT_LABELS).map(
    ([value, label]) => ({ value: value as AssociateDocumentKind, label }),
  );

  readonly associate = signal<Associate | null>(null);
  readonly documents = signal<AssociateDocumentItem[]>([]);
  readonly absences = signal<AssociateAbsence[]>([]);
  readonly alerts = signal<HrAlert[]>([]);
  readonly history = signal<AssociateHistoryEntry[]>([]);
  readonly positionHistory = signal<PositionHistoryEntry[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly tab = signal<TabId>('personal');

  selectedFile: File | null = null;
  uploadKind: AssociateDocumentKind = 'CERTIFICADO_CURSO';
  uploadExpiration: string = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID inválido');
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  private load(id: string): void {
    this.api.getAssociate(id).subscribe({
      next: (a) => {
        this.associate.set(a);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.status === 403 ? 'Sin permiso' : 'No se pudo cargar el asociado');
      },
    });
    this.api.listAssociateDocuments(id).subscribe({ next: (rows) => this.documents.set(rows), error: () => {} });
    this.api.alertsByAssociate(id).subscribe({ next: (rows) => this.alerts.set(rows), error: () => {} });
    this.api.getAssociateHistory(id).subscribe({ next: (rows) => this.history.set(rows), error: () => {} });
    this.api.getPositionHistory(id).subscribe({ next: (rows) => this.positionHistory.set(rows), error: () => {} });
    if (this.auth.hasPermission('absences.view')) {
      this.api.listAbsences({ associateId: id }).subscribe({
        next: (rows) => this.absences.set(rows),
        error: () => {},
      });
    }
  }

  initials(a: Associate): string {
    return `${a.firstName.charAt(0)}${a.firstLastName.charAt(0)}`.toUpperCase();
  }

  statusColor(status: string): string {
    switch (status) {
      case 'ACTIVO':
      case 'VACACIONES':
        return 'green';
      case 'RETIRADO':
        return 'red';
      default:
        return 'gray';
    }
  }

  isMasked(a: Associate): boolean {
    return a.race?.value === '*** OCULTO ***';
  }

  docLabel(k: AssociateDocumentKind): string {
    return DOCUMENT_LABELS[k];
  }

  isExpired(d: AssociateDocumentItem): boolean {
    if (!d.expirationDate) return false;
    return new Date(d.expirationDate) < new Date();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  uploadDoc(): void {
    const a = this.associate();
    if (!a || !this.selectedFile) return;
    this.uploading.set(true);
    this.api
      .uploadAssociateDocument(
        a.id,
        this.selectedFile,
        this.uploadKind,
        this.uploadExpiration || undefined,
      )
      .subscribe({
        next: () => {
          this.uploading.set(false);
          this.selectedFile = null;
          this.uploadExpiration = '';
          this.toast.success('Documento cargado', 'Se actualizaron los indicadores SST');
          this.load(a.id);
        },
        error: (err) => {
          this.uploading.set(false);
          this.toast.error(
            'Error al subir documento',
            err.error?.message ?? 'Verifica el tipo y tamaño del archivo',
          );
        },
      });
  }

  deleteDoc(id: string): void {
    if (!confirm('¿Eliminar este documento?')) return;
    this.api.deleteAssociateDocument(id).subscribe({
      next: () => {
        const a = this.associate();
        this.toast.info('Documento eliminado');
        if (a) this.load(a.id);
      },
      error: () => this.toast.error('No se pudo eliminar el documento'),
    });
  }

  resolveAlert(id: string): void {
    this.api.resolveAlert(id).subscribe({
      next: () => {
        const a = this.associate();
        this.toast.success('Alerta resuelta');
        if (a) this.load(a.id);
      },
      error: () => this.toast.error('No se pudo resolver la alerta'),
    });
  }

  formatAlertType(t: HrAlert['alertType']): string {
    return t.replace(/_/g, ' ').toLowerCase();
  }
}
