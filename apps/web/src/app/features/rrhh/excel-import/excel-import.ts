import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAlertTriangle,
  LucideCircleCheck,
  LucideDownload,
  LucideFileSpreadsheet,
  LucideUpload,
} from '@lucide/angular';
import { HrPageHeader } from '../../../shared/components/hr-page-header/hr-page-header';
import { Icon } from '../../../shared/components/icon/icon';
import { HrApiService } from '../services/hr-api.service';
import type { ExcelImportPreview } from '../services/hr.types';

type Step = 'upload' | 'preview' | 'done';

/**
 * Wizard de importación masiva de asociados desde Excel.
 */
@Component({
  selector: 'app-excel-import',
  imports: [CommonModule, RouterLink, Icon, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Importar asociados desde Excel"
        subtitle="Columnas esperadas: documento, nombres, apellidos, fecha nacimiento, fecha ingreso, celular, cargo, centro trabajo, EPS, salarios, etc."
      >
        <div actions class="hr-page-header__actions">
          <a [href]="templateUrl()" target="_blank" rel="noopener" class="hr-btn hr-btn-ghost">
            <app-icon [icon]="icons.File" [size]="16" /> Plantilla en blanco
          </a>
          <a [href]="exportUrl()" target="_blank" rel="noopener" class="hr-btn hr-btn-ghost">
            <app-icon [icon]="icons.Download" [size]="16" /> Exportar actuales
          </a>
        </div>
      </app-hr-page-header>

      <ol class="hr-stepper">
        <li [class.active]="step() === 'upload'" [class.done]="step() !== 'upload'">
          <span class="hr-stepper__idx">1</span> Subir archivo
        </li>
        <li [class.active]="step() === 'preview'" [class.done]="step() === 'done'">
          <span class="hr-stepper__idx">2</span> Previsualizar
        </li>
        <li [class.active]="step() === 'done'">
          <span class="hr-stepper__idx">3</span> Confirmar
        </li>
      </ol>

      @if (step() === 'upload') {
        <section class="hr-detail-card hr-import-upload">
          <label class="hr-dropzone">
            <input type="file" accept=".xlsx,.xls" (change)="onFileChange($event)" />
            <app-icon [icon]="icons.Upload" [size]="40" />
            <p>Haz clic o arrastra tu archivo <strong>.xlsx</strong> aquí</p>
            @if (selectedFile) {
              <p class="hr-dropzone__filename">{{ selectedFile.name }}</p>
            }
          </label>
          <button
            type="button"
            class="hr-btn hr-btn-primary"
            [disabled]="!selectedFile || uploading()"
            (click)="preview()"
          >
            {{ uploading() ? 'Analizando...' : 'Analizar archivo' }}
          </button>
        </section>
      }

      @if (step() === 'preview' && previewData(); as p) {
        <section class="hr-detail-card">
          <div class="hr-import-preview-summary">
            <div class="hr-stat"><span>Total filas</span><strong>{{ p.totalRows }}</strong></div>
            <div class="hr-stat hr-stat-ok"><span>Válidas</span><strong>{{ p.validRows }}</strong></div>
            <div class="hr-stat hr-stat-info"><span>Nuevos</span><strong>{{ p.newRows }}</strong></div>
            <div class="hr-stat hr-stat-info"><span>Actualizaciones</span><strong>{{ p.updateRows }}</strong></div>
            <div class="hr-stat hr-stat-warn"><span>Con errores</span><strong>{{ p.invalidRows }}</strong></div>
          </div>

          <div class="hr-table-wrap hr-table-scroll">
            <table class="hr-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Estado</th>
                  <th>Acción</th>
                  <th>Documento</th>
                  <th>Nombre</th>
                  <th>Cargo</th>
                  <th>Centro</th>
                  <th>Errores</th>
                </tr>
              </thead>
              <tbody>
                @for (row of p.rows; track row.rowIndex) {
                  <tr [class.error-row]="!row.ok">
                    <td>{{ row.rowIndex }}</td>
                    <td>
                      @if (row.ok) {
                        <app-icon [icon]="icons.Check" [size]="16" />
                      } @else {
                        <app-icon [icon]="icons.Alert" [size]="16" />
                      }
                    </td>
                    <td>
                      @if (row.importAction === 'CREATE') {
                        <span class="hr-pill hr-pill-create">Nuevo</span>
                      } @else if (row.importAction === 'UPDATE') {
                        <span class="hr-pill hr-pill-update">Actualizar</span>
                      } @else {
                        —
                      }
                    </td>
                    <td>{{ getVal(row.parsed, 'documentNumber') }}</td>
                    <td>{{ getVal(row.parsed, 'firstName') }} {{ getVal(row.parsed, 'firstLastName') }}</td>
                    <td>{{ getVal(row.parsed, 'jobPositionName') }}</td>
                    <td>{{ getVal(row.parsed, 'workCenterCode') }}</td>
                    <td class="errors-cell">
                      @for (err of row.errors; track err) {
                        <span class="hr-err-pill">{{ err }}</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="hr-form-actions">
            <button type="button" class="hr-btn hr-btn-ghost" (click)="reset()">Cancelar</button>
            <button
              type="button"
              class="hr-btn hr-btn-primary"
              [disabled]="p.validRows === 0 || importing()"
              (click)="confirm()"
            >
              {{ importing() ? 'Importando...' : 'Importar ' + p.validRows + ' filas válidas' }}
            </button>
          </div>
        </section>
      }

      @if (step() === 'done' && result(); as r) {
        <section class="hr-detail-card hr-import-done">
          <app-icon [icon]="icons.Check" [size]="48" />
          <h2>Importación completada</h2>
          <div class="hr-import-done-summary">
            <div><span>Creados</span><strong>{{ r.created }}</strong></div>
            <div><span>Actualizados</span><strong>{{ r.updated }}</strong></div>
            <div><span>Omitidos</span><strong>{{ r.skipped }}</strong></div>
            <div><span>Total procesado</span><strong>{{ r.total }}</strong></div>
          </div>
          <div class="hr-form-actions">
            <button type="button" class="hr-btn hr-btn-ghost" (click)="reset()">Importar otro archivo</button>
            <a routerLink="/rrhh/asociados" class="hr-btn hr-btn-primary">Ver directorio</a>
          </div>
        </section>
      }

      @if (error()) {
        <div class="hr-error">{{ error() }}</div>
      }
    </div>
  `,
})
export class ExcelImport {
  private readonly api = inject(HrApiService);

  readonly icons = {
    Upload: LucideUpload,
    Download: LucideDownload,
    Check: LucideCircleCheck,
    Alert: LucideAlertTriangle,
    File: LucideFileSpreadsheet,
  };

  readonly step = signal<Step>('upload');
  readonly previewData = signal<ExcelImportPreview | null>(null);
  readonly uploading = signal(false);
  readonly importing = signal(false);
  readonly result = signal<{ created: number; updated: number; skipped: number; total: number } | null>(null);
  readonly error = signal<string | null>(null);

  selectedFile: File | null = null;

  readonly exportUrl = computed(() => this.api.exportAssociatesUrl());
  readonly templateUrl = computed(() => this.api.excelTemplateUrl());

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.error.set(null);
  }

  preview(): void {
    if (!this.selectedFile) return;
    this.uploading.set(true);
    this.error.set(null);
    this.api.previewExcelImport(this.selectedFile).subscribe({
      next: (data) => {
        this.previewData.set(data);
        this.uploading.set(false);
        this.step.set('preview');
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err.error?.message ?? 'Error analizando el archivo');
      },
    });
  }

  confirm(): void {
    const p = this.previewData();
    if (!p) return;
    const validRows = p.rows.filter((r) => r.ok).map((r) => r.parsed);
    if (validRows.length === 0) return;

    this.importing.set(true);
    this.api.executeExcelImport(validRows).subscribe({
      next: (r) => {
        this.importing.set(false);
        this.result.set(r);
        this.step.set('done');
      },
      error: (err) => {
        this.importing.set(false);
        this.error.set(err.error?.message ?? 'Error ejecutando la importación');
      },
    });
  }

  reset(): void {
    this.selectedFile = null;
    this.previewData.set(null);
    this.result.set(null);
    this.error.set(null);
    this.step.set('upload');
  }

  getVal(parsed: Record<string, unknown>, key: string): string {
    const v = parsed[key];
    if (v === null || v === undefined) return '—';
    return String(v);
  }
}
