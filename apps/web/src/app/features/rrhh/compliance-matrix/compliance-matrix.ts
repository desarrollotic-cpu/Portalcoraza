import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideCircleCheck, LucideCircleX, LucideDownload } from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import { HrPageHeader } from '../../../shared/components/hr-page-header/hr-page-header';
import { Icon } from '../../../shared/components/icon/icon';
import { HrApiService } from '../services/hr-api.service';
import type { ComplianceMatrixRow } from '../services/hr.types';

@Component({
  selector: 'app-compliance-matrix',
  imports: [CommonModule, FormsModule, RouterLink, Icon, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Matriz de cumplimiento SST"
        subtitle="Personal en cargos críticos: curso, psicofísico, psicosensométrico y póliza SURA."
      >
        @if (auth.hasPermission('hr_export.excel')) {
          <button actions type="button" class="hr-btn hr-btn-primary" (click)="exportExcel()">
            <app-icon [icon]="icons.Download" [size]="16" /> Descargar Excel
          </button>
        }
      </app-hr-page-header>

      <div class="hr-filters">
        <label class="hr-chip" style="cursor:pointer;display:inline-flex;align-items:center;gap:0.35rem;">
          <input type="checkbox" [(ngModel)]="onlyMissing" style="accent-color:var(--primary-500)" />
          Solo con requisitos pendientes
        </label>
      </div>

      @if (loading()) {
        <div class="hr-loading">Cargando personal crítico...</div>
      } @else {
        <div class="hr-summary">
          <div class="hr-stat"><span>Total críticos</span><strong>{{ rows().length }}</strong></div>
          <div class="hr-stat hr-stat-ok"><span>Al día</span><strong>{{ complete().length }}</strong></div>
          <div class="hr-stat hr-stat-warn"><span>Pendientes</span><strong>{{ pending().length }}</strong></div>
        </div>

        <div class="hr-table-wrap">
          <table class="hr-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombre</th>
                <th>Cargo</th>
                <th>Centro</th>
                <th class="cell-center">Curso</th>
                <th class="cell-center">Psicofísico</th>
                <th class="cell-center">Psicosensométrico</th>
                <th class="cell-center">Póliza</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (a of filtered(); track a.associateId) {
                <tr>
                  <td class="mono">{{ a.documentNumber }}</td>
                  <td>
                    @if (auth.hasPermission('associates.view')) {
                      <a [routerLink]="['/rrhh/asociados', a.associateId]" class="hr-link">{{ a.fullName }}</a>
                    } @else {
                      {{ a.fullName }}
                    }
                  </td>
                  <td>{{ a.positionName ?? '—' }}</td>
                  <td>{{ a.workCenterCode ?? '—' }}</td>
                  <td class="cell-center" [class.cell-ok]="a.courseValid" [class.cell-ko]="!a.courseValid">
                    <app-icon [icon]="a.courseValid ? icons.Check : icons.X" [size]="16" />
                  </td>
                  <td class="cell-center" [class.cell-ok]="a.psychophysicalValid" [class.cell-ko]="!a.psychophysicalValid">
                    <app-icon [icon]="a.psychophysicalValid ? icons.Check : icons.X" [size]="16" />
                  </td>
                  <td class="cell-center" [class.cell-ok]="a.psychosensometricValid" [class.cell-ko]="!a.psychosensometricValid">
                    <app-icon [icon]="a.psychosensometricValid ? icons.Check : icons.X" [size]="16" />
                  </td>
                  <td class="cell-center" [class.cell-ok]="a.hasSuraPolicy" [class.cell-ko]="!a.hasSuraPolicy">
                    <app-icon [icon]="a.hasSuraPolicy ? icons.Check : icons.X" [size]="16" />
                  </td>
                  <td>
                    @if (a.isComplete) {
                      <span class="hr-badge-ok">Cumple</span>
                    } @else {
                      <span class="hr-badge-ko">Pendiente</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="9" class="hr-empty">Sin personal en cargos críticos.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class ComplianceMatrix implements OnInit {
  private readonly api = inject(HrApiService);
  readonly auth = inject(AuthService);
  readonly icons = { Check: LucideCircleCheck, X: LucideCircleX, Download: LucideDownload };

  readonly rows = signal<ComplianceMatrixRow[]>([]);
  readonly loading = signal(true);
  onlyMissing = false;

  readonly complete = computed(() => this.rows().filter((a) => a.isComplete));
  readonly pending = computed(() => this.rows().filter((a) => !a.isComplete));
  readonly filtered = computed(() => (this.onlyMissing ? this.pending() : this.rows()));

  ngOnInit(): void {
    this.api.complianceMatrix().subscribe({
      next: (data) => {
        this.rows.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  exportExcel(): void {
    this.api.downloadBlob(this.api.exportComplianceUrl()).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'matriz-sst.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
      },
    });
  }
}
