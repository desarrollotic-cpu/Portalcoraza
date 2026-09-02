import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { liveCompliance } from '../sst-compliance';
import { SstPdfData, SstPdfService } from '../sst-pdf.service';
import {
  SstApiService,
  SstInspection,
  SstValoracion,
} from '../sst-api.service';

interface DraftRow {
  itemId: string;
  codigo: number;
  categoria: string;
  pregunta: string;
  valoracion: SstValoracion | '';
  valoracionAnterior: SstValoracion | null;
  hallazgo: string;
  planAccionPropuesto: string;
  responsablePlanAccion: string;
  fechaCompromiso: string;
  reincidenciaCount: number;
  evidencias: string[];
}

@Component({
  selector: 'app-sst-inspection-detail',
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <section class="page">
      @if (loading()) {
        <p class="loading-state">Cargando inspección…</p>
      } @else if (insp(); as i) {
        <header class="head">
          <div>
            <a class="back" routerLink="/sst/panel">← Volver al Panel</a>
            <h2>
              {{ i.tipo === 'SEGUIMIENTO' ? 'Seguimiento' : 'IPT inicial' }} —
              {{ i.workplace?.nombre }}
            </h2>
            <p>
              {{ i.workplace?.client?.nombre }} · {{ i.fecha | date: 'dd/MM/yyyy' }} ·
              {{ i.responsableNombre }} · <strong class="badge-status">{{ i.estado }}</strong>
            </p>
            @if (live(); as live) {
              <p class="live">
                Progreso {{ live.rated }}/{{ live.total }} ·
                @if (live.percent != null) {
                  Cumpl. {{ live.percent }}%
                  <span class="risk" [attr.data-nivel]="live.nivel">{{ live.nivel }}</span>
                  · SEGURO {{ live.seguro }} · RIESGOSO {{ live.riesgoso }} · N/A {{ live.na }}
                } @else {
                  Sin ítems evaluables aún (N/A no cuenta en %)
                }
              </p>
            }
          </div>
          <div class="actions">
            <!-- Botón de Generar PDF Oficial con Membrete en cualquier momento -->
            <button type="button" class="btn btn-pdf" (click)="generateOfficialPdf()" title="Generar e imprimir el PDF oficial con membrete y fotos">
              📄 PDF Oficial Membrete
            </button>

            @if (canEdit()) {
              <button type="button" class="btn ghost" (click)="markAllSafe()" title="Llenar ítems pendientes como Seguro">
                ⚡ Marcar todo Seguro
              </button>
              <button type="button" class="btn ghost" [disabled]="busy()" (click)="save(false)">
                💾 Guardar borrador
              </button>
              <button type="button" class="btn btn-complete" [disabled]="busy()" (click)="save(true)" title="Genera el PDF oficial y completa la inspección">
                ✓ Completar y Emitir PDF
              </button>
            }
            @if (canClose()) {
              <button type="button" class="btn danger" [disabled]="busy()" (click)="close()" title="Archivar definitivamente la inspección">
                🔒 Cerrar inspección
              </button>
            }
            @if (canReport()) {
              <button type="button" class="btn ghost" [disabled]="busy()" (click)="downloadReport('md')">
                📥 Informe MD
              </button>
              <button type="button" class="btn ghost" [disabled]="busy()" (click)="downloadReport('txt')">
                📥 Informe TXT
              </button>
            }
          </div>
        </header>

        <label class="obs">
          Observaciones generales
          <textarea
            [(ngModel)]="observaciones"
            name="obs"
            rows="2"
            [disabled]="!canEdit()"
            placeholder="Observaciones generales de la inspección en el puesto…"
          ></textarea>
        </label>

        @for (cat of categories(); track cat) {
          <div class="card">
            <h3>{{ cat }}</h3>
            @for (row of rowsByCategory().get(cat)!; track row.itemId) {
              <article class="item" [class.risky]="row.valoracion === 'RIESGOSO'">
                <div class="item-head">
                  <strong class="item-code">#{{ row.codigo }}</strong>
                  <span class="item-desc">{{ row.pregunta }}</span>
                </div>
                @if (row.valoracionAnterior) {
                  <div class="meta">Valoración anterior: <strong>{{ row.valoracionAnterior }}</strong></div>
                }
                <div class="vals">
                  @for (v of valoraciones; track v) {
                    <label class="radio" [class.checked]="row.valoracion === v">
                      <input
                        type="radio"
                        [name]="'v-' + row.itemId"
                        [value]="v"
                        [(ngModel)]="row.valoracion"
                        (ngModelChange)="bump()"
                        [disabled]="!canEdit()"
                      />
                      {{ v === 'N_A' ? 'N/A' : v }}
                    </label>
                  }
                </div>

                @if (row.valoracion === 'RIESGOSO') {
                  <div class="risk-fields">
                    <label>
                      Hallazgo identificado <span class="req">*</span>
                      <textarea
                        [(ngModel)]="row.hallazgo"
                        rows="2"
                        [disabled]="!canEdit()"
                        placeholder="Describe la condición riesgosa encontrada…"
                      ></textarea>
                    </label>
                    <label>
                      Plan de acción correctivo <span class="req">*</span>
                      <textarea
                        [(ngModel)]="row.planAccionPropuesto"
                        rows="2"
                        [disabled]="!canEdit()"
                        placeholder="Acción correctiva o preventiva a implementar…"
                      ></textarea>
                    </label>
                    <div class="row2">
                      <label>
                        Responsable del plan
                        <input
                          [(ngModel)]="row.responsablePlanAccion"
                          [disabled]="!canEdit()"
                          placeholder="Ej. Operaciones / Mantenimiento"
                        />
                      </label>
                      <label>
                        Fecha de compromiso
                        <input
                          type="date"
                          [(ngModel)]="row.fechaCompromiso"
                          [disabled]="!canEdit()"
                        />
                      </label>
                    </div>

                    <!-- Fotos / Evidencias RIESGOSO -->
                    <div class="evidence-box evidence-box-risk">
                      <div class="evidence-top">
                        <span class="evidence-label">📷 Evidencias fotográficas del hallazgo ({{ row.evidencias.length }})</span>
                        @if (canEdit()) {
                          <label class="btn-upload-photo">
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              (change)="onFileSelected($event, row)"
                              style="display: none;"
                            />
                            ➕ Tomar / Adjuntar foto
                          </label>
                        }
                      </div>
                      @if (row.evidencias.length > 0) {
                        <div class="evidence-thumbs">
                          @for (photo of row.evidencias; track $index; let idx = $index) {
                            <div class="thumb-card">
                              <img [src]="photo" alt="Evidencia" (click)="previewPhoto.set(photo)" />
                              @if (canEdit()) {
                                <button type="button" class="btn-del-photo" (click)="removePhoto(row, idx)" title="Eliminar foto">✕</button>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>

                    @if (row.reincidenciaCount >= 3) {
                      <p class="critical">⚠️ ALERTA CRÍTICA: {{ row.reincidenciaCount }} reincidencias en este puesto</p>
                    }
                  </div>
                }

                <!-- Campos adicionales para ítems SEGURO: observación + fotos de verificación -->
                @if (row.valoracion === 'SEGURO') {
                  <div class="safe-fields">
                    <label>
                      Observación / Nota de verificación
                      <textarea
                        [(ngModel)]="row.hallazgo"
                        rows="2"
                        [disabled]="!canEdit()"
                        placeholder="Ej. Se verificó condición en óptimo estado. Sin novedades."
                      ></textarea>
                    </label>

                    <!-- Fotos / Evidencias SEGURO -->
                    <div class="evidence-box evidence-box-safe">
                      <div class="evidence-top">
                        <span class="evidence-label evidence-label-safe">📷 Foto de verificación ({{ row.evidencias.length }})</span>
                        @if (canEdit()) {
                          <label class="btn-upload-photo btn-upload-safe">
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              (change)="onFileSelected($event, row)"
                              style="display: none;"
                            />
                            ➕ Tomar / Adjuntar foto
                          </label>
                        }
                      </div>
                      @if (row.evidencias.length > 0) {
                        <div class="evidence-thumbs">
                          @for (photo of row.evidencias; track $index; let idx = $index) {
                            <div class="thumb-card">
                              <img [src]="photo" alt="Verificación" (click)="previewPhoto.set(photo)" />
                              @if (canEdit()) {
                                <button type="button" class="btn-del-photo" (click)="removePhoto(row, idx)" title="Eliminar foto">✕</button>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </article>
            }
          </div>
        }
      }

      <!-- Modal de previsualización de foto a tamaño completo -->
      @if (previewPhoto(); as photoUrl) {
        <div class="modal-backdrop" (click)="previewPhoto.set(null)">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <img [src]="photoUrl" alt="Foto ampliada" class="modal-img" />
            <button type="button" class="modal-close" (click)="previewPhoto.set(null)">✕ Cerrar</button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .back { color: var(--brand, #0f766e); text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    .head h2 { margin: 0.2rem 0; font-size: 1.25rem; }
    .head p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.88rem; }
    .badge-status {
      background: #f1f5f9; padding: 0.15rem 0.45rem; border-radius: 0.3rem;
      border: 1px solid #e2e8f0; font-size: 0.8rem;
    }
    .live { margin: 0.35rem 0 0 !important; font-weight: 600; font-size: 0.88rem; }
    .risk[data-nivel='BAJO'] { color: #15803d; font-weight: 700; }
    .risk[data-nivel='MEDIO'] { color: #ca8a04; font-weight: 700; }
    .risk[data-nivel='ALTO'] { color: #b91c1c; font-weight: 700; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: flex-start; }
    .btn {
      border: 0; border-radius: 0.5rem; padding: 0.45rem 0.85rem; font-weight: 600; cursor: pointer;
      background: var(--brand, #0f766e); color: #fff; font-size: 0.85rem; transition: opacity 0.15s;
    }
    .btn-pdf {
      background: #1e293b; color: #fff; display: inline-flex; align-items: center; gap: 0.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    .btn-pdf:hover { background: #0f172a; }
    .btn-complete { background: #0f766e; font-weight: 700; }
    .btn.ghost { background: transparent; color: var(--brand, #0f766e); border: 1px solid var(--border, #cbd5e1); }
    .btn.danger { background: #b91c1c; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .obs { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; }
    textarea, input {
      font: inherit; font-weight: 400; padding: 0.45rem 0.6rem; border-radius: 0.45rem;
      border: 1px solid var(--border, #cbd5e1); width: 100%; box-sizing: border-box; background: var(--bg, #fff);
    }
    .card {
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.75rem; padding: 0.95rem 1.1rem;
    }
    .card h3 { margin: 0 0 0.75rem; font-size: 1rem; color: #0f172a; border-bottom: 2px solid #0f766e; padding-bottom: 0.35rem; }
    .item { padding: 0.85rem 0; border-top: 1px solid var(--border, #e2e8f0); }
    .item:first-of-type { border-top: 0; }
    .item.risky {
      background: color-mix(in srgb, #fecaca 22%, transparent);
      margin: 0.25rem -0.65rem; padding: 0.85rem 0.65rem; border-radius: 0.6rem;
      border: 1px solid rgba(220, 38, 38, 0.25);
    }
    .item-head { display: flex; gap: 0.55rem; font-size: 0.92rem; align-items: baseline; }
    .item-code {
      background: #0f766e; color: #fff; font-size: 0.75rem; font-weight: 800;
      padding: 0.15rem 0.45rem; border-radius: 0.3rem; min-width: 1.8rem; text-align: center;
    }
    .item-desc { font-weight: 600; color: #1e293b; line-height: 1.35; }
    .meta { color: var(--text-muted, #64748b); font-size: 0.78rem; margin: 0.25rem 0; }
    .vals { display: flex; flex-wrap: wrap; gap: 0.85rem; margin: 0.5rem 0; }
    .radio {
      display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 600;
      padding: 0.25rem 0.6rem; border-radius: 0.4rem; border: 1px solid transparent; cursor: pointer;
    }
    .radio.checked { background: #f1f5f9; border-color: #cbd5e1; }
    .risk-fields { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.5rem; }
    .risk-fields label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.82rem; font-weight: 600; }
    .req { color: #dc2626; font-weight: 700; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    .critical { color: #b91c1c; font-weight: 800; margin: 0.3rem 0 0; font-size: 0.85rem; }
    @media (max-width: 640px) { .row2 { grid-template-columns: 1fr; } }

    /* Evidencias fotográficas */
    .evidence-box {
      margin-top: 0.4rem; background: #fff; border: 1px dashed #cbd5e1;
      border-radius: 0.5rem; padding: 0.65rem 0.85rem; display: flex; flex-direction: column; gap: 0.5rem;
    }
    .evidence-box-risk { border-color: #fca5a5; background: #fff5f5; }
    .evidence-box-safe { border-color: #86efac; background: #f0fdf4; }
    .evidence-top { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .evidence-label { font-size: 0.82rem; font-weight: 700; color: #334155; }
    .evidence-label-safe { color: #166534; }
    .btn-upload-photo {
      background: #0f766e; color: #fff; font-size: 0.78rem; font-weight: 600;
      padding: 0.3rem 0.65rem; border-radius: 0.4rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;
    }
    .btn-upload-safe { background: #16a34a; }
    .btn-upload-photo:hover { opacity: 0.9; }
    .evidence-thumbs { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .thumb-card {
      position: relative; width: 72px; height: 72px; border-radius: 0.45rem; overflow: hidden;
      border: 1px solid #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.08); background: #f8fafc;
    }
    .thumb-card img {
      width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: transform 0.15s;
    }
    .thumb-card img:hover { transform: scale(1.05); }
    .btn-del-photo {
      position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%;
      background: rgba(0,0,0,0.7); color: #fff; border: 0; font-size: 0.65rem; font-weight: bold;
      cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;
    }

    /* Campos adicionales para ítems SEGURO */
    .safe-fields {
      background: #f0fdf4; border: 1px solid #86efac; border-radius: 0.5rem;
      padding: 0.75rem 0.9rem; margin-top: 0.4rem; display: flex; flex-direction: column; gap: 0.6rem;
    }
    .safe-fields label { font-size: 0.85rem; font-weight: 600; color: #166534; display: flex; flex-direction: column; gap: 0.3rem; }
    .safe-fields textarea {
      font-size: 0.85rem; padding: 0.45rem 0.6rem; border-radius: 0.4rem;
      border: 1px solid #86efac; resize: vertical; background: #fff; color: #1e293b;
    }
    .safe-fields textarea:focus { outline: 2px solid #16a34a; border-color: transparent; }

    /* Modal previsualización */
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.75);
      display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .modal-content {
      background: #fff; border-radius: 0.75rem; padding: 0.75rem; max-width: 90vw; max-height: 90vh;
      display: flex; flex-direction: column; gap: 0.5rem; align-items: center;
    }
    .modal-img { max-width: 85vw; max-height: 78vh; object-fit: contain; border-radius: 0.4rem; }
    .modal-close {
      background: #334155; color: #fff; border: 0; border-radius: 0.4rem; padding: 0.4rem 0.85rem;
      font-size: 0.85rem; font-weight: 600; cursor: pointer;
    }
  `,
})
export class SstInspectionDetail implements OnInit {
  private readonly api = inject(SstApiService);
  private readonly pdfService = inject(SstPdfService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly valoraciones: SstValoracion[] = ['SEGURO', 'RIESGOSO', 'N_A'];
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly insp = signal<SstInspection | null>(null);
  readonly drafts = signal<DraftRow[]>([]);
  readonly tick = signal(0);
  readonly previewPhoto = signal<string | null>(null);
  observaciones = '';

  readonly canEdit = computed(() => {
    const i = this.insp();
    return !!i && i.estado === 'BORRADOR' && this.auth.hasPermission('sst.inspect');
  });

  readonly canClose = computed(() => {
    const i = this.insp();
    return (
      !!i &&
      i.estado === 'COMPLETADA' &&
      this.auth.hasPermission('sst.inspect')
    );
  });

  readonly canReport = computed(() => {
    const i = this.insp();
    return !!i && (i.estado === 'COMPLETADA' || i.estado === 'CERRADA');
  });

  markAllSafe(): void {
    const current = this.drafts();
    for (const d of current) {
      if (!d.valoracion) {
        d.valoracion = 'SEGURO';
      }
    }
    this.drafts.set([...current]);
    this.bump();
    this.toast.success('Todos los ítems marcados como SEGURO. Ajusta los que requieran RIESGOSO.');
  }

  readonly live = computed(() => {
    this.tick();
    return liveCompliance(this.drafts().map((d) => d.valoracion));
  });

  bump(): void {
    this.tick.update((n) => n + 1);
  }

  readonly categories = computed(() => {
    const set = new Set(this.drafts().map((d) => d.categoria));
    return [...set];
  });

  readonly rowsByCategory = computed(() => {
    const map = new Map<string, DraftRow[]>();
    for (const row of this.drafts()) {
      const list = map.get(row.categoria) ?? [];
      list.push(row);
      map.set(row.categoria, list);
    }
    return map;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.load(id);
  }

  onFileSelected(event: Event, row: DraftRow): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    // Comprimir imagen a resolución estándar en Canvas antes de guardar
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          row.evidencias.push(compressedDataUrl);
          this.toast.success('Foto adjuntada como evidencia');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removePhoto(row: DraftRow, index: number): void {
    row.evidencias.splice(index, 1);
  }

  generateOfficialPdf(): void {
    const i = this.insp();
    if (!i) return;

    const pdfData: SstPdfData = {
      id: i.id,
      tipo: i.tipo,
      fecha: i.fecha || new Date().toISOString().slice(0, 10),
      clienteNombre: i.workplace?.client?.nombre || 'Coraza Seguridad C.T.A.',
      puestoNombre: i.workplace?.nombre || 'Puesto de Trabajo',
      ciudad: i.workplace?.ciudad || 'Medellín',
      tipoPuesto: i.workplace?.tipoPuesto || 'Servicio General',
      responsableNombre: i.responsableNombre,
      responsableCargo: i.responsableCargo || 'Inspector SST',
      observacionesGenerales: this.observaciones || i.observacionesGenerales || '',
      cumplimientoGlobal: this.live()?.percent ?? i.cumplimientoGlobal,
      nivelRiesgo: this.live()?.nivel ?? i.nivelRiesgo,
      items: this.drafts().map((d) => ({
        codigo: d.codigo,
        categoria: d.categoria,
        pregunta: d.pregunta,
        valoracion: d.valoracion || 'N_A',
        hallazgo: d.hallazgo || undefined,
        planAccionPropuesto: d.planAccionPropuesto || undefined,
        responsablePlanAccion: d.responsablePlanAccion || undefined,
        fechaCompromiso: d.fechaCompromiso || undefined,
        evidencias: d.evidencias,
      })),
    };

    this.pdfService.generateAndPrintPdf(pdfData);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.api.getInspection(id).subscribe({
      next: (insp) => this.apply(insp),
      error: (e: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.toast.error(e?.error?.message || 'Inspección no encontrada');
      },
    });
  }

  private apply(insp: SstInspection): void {
    this.insp.set(insp);
    this.observaciones = insp.observacionesGenerales || '';
    this.drafts.set(
      (insp.respuestas ?? []).map((r) => ({
        itemId: r.itemId,
        codigo: r.item?.codigo ?? 0,
        categoria: r.item?.categoria ?? 'Otros',
        pregunta: r.item?.pregunta ?? '',
        valoracion: (r.valoracion as SstValoracion) || '',
        valoracionAnterior: r.valoracionAnterior,
        hallazgo: r.hallazgo || '',
        planAccionPropuesto: r.planAccionPropuesto || '',
        responsablePlanAccion: r.responsablePlanAccion || '',
        fechaCompromiso: r.fechaCompromiso || '',
        reincidenciaCount: r.reincidenciaCount || 0,
        evidencias: (r.evidencias ?? []).map((ev) => ev.urlArchivo),
      })),
    );
    this.loading.set(false);
  }

  save(completar: boolean): void {
    const i = this.insp();
    if (!i) return;
    const respuestas = this.drafts()
      .filter((d) => d.valoracion)
      .map((d) => ({
        itemId: d.itemId,
        valoracion: d.valoracion as SstValoracion,
        hallazgo: d.hallazgo || undefined,
        planAccionPropuesto: d.planAccionPropuesto || undefined,
        responsablePlanAccion: d.responsablePlanAccion || undefined,
        fechaCompromiso: d.fechaCompromiso || undefined,
        evidenciasUrls: d.evidencias.length ? d.evidencias : undefined,
      }));

    if (completar && respuestas.length < this.drafts().length) {
      this.toast.error('Califica todos los 34 ítems antes de completar');
      return;
    }

    if (completar) {
      // 1. Generar automáticamente el PDF oficial completo con Membrete y Fotografías
      this.generateOfficialPdf();
    }

    this.busy.set(true);
    this.api
      .saveInspection(i.id, {
        observacionesGenerales: this.observaciones,
        completar,
        respuestas,
      })
      .subscribe({
        next: (insp) => {
          this.busy.set(false);
          this.apply(insp);
          this.toast.success(
            completar
              ? '✓ Inspección completada y PDF oficial generado con éxito'
              : 'Borrador guardado',
          );
        },
        error: (e: { error?: { message?: string } }) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo guardar la inspección');
        },
      });
  }

  close(): void {
    const i = this.insp();
    if (!i) return;
    this.busy.set(true);
    this.api.closeInspection(i.id).subscribe({
      next: (insp) => {
        this.busy.set(false);
        this.apply(insp);
        this.toast.success('Inspección archivada / cerrada');
      },
      error: (e: { error?: { message?: string } }) => {
        this.busy.set(false);
        this.toast.error(e?.error?.message || 'No se pudo cerrar');
      },
    });
  }

  downloadReport(kind: 'md' | 'txt'): void {
    const i = this.insp();
    if (!i) return;
    this.busy.set(true);
    this.api.report(i.id).subscribe({
      next: (rep) => {
        this.busy.set(false);
        const content = kind === 'md' ? rep.markdown : rep.ascii;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sst-${i.id.slice(0, 8)}.${kind === 'md' ? 'md' : 'txt'}`;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: (e: { error?: { message?: string } }) => {
        this.busy.set(false);
        this.toast.error(e?.error?.message || 'No se pudo generar el informe');
      },
    });
  }
}
