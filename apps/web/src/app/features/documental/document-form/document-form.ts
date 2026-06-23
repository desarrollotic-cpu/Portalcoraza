import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CreateDocumentRecordPayload,
  DocumentType,
  DocumentalApiService,
} from '../documental-api.service';

@Component({
  selector: 'app-document-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section>
      <h2>{{ title() }}</h2>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="grid">
          <label>Código<input formControlName="code" /></label>
          <label>Título<input formControlName="title" /></label>
          <label>Tipo
            <select formControlName="documentTypeId">
              <option value="">Seleccione...</option>
              @for (t of types(); track t.id) {
                <option [value]="t.id">{{ t.name }} ({{ t.code }})</option>
              }
            </select>
          </label>
          <label>Fecha registro<input type="date" formControlName="registeredAt" /></label>
          <label>Ubicación física<input formControlName="physicalLocation" /></label>
        </div>
        <label>Observaciones<textarea formControlName="observations"></textarea></label>

        <div class="actions">
          <a routerLink="/documental">Cancelar</a>
          <button type="submit" [disabled]="form.invalid || saving()">Guardar</button>
        </div>
      </form>
    </section>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
    input, select, textarea { padding: 0.5rem; border: 1px solid var(--coraza-border); border-radius: 8px; }
    textarea { min-height: 80px; }
    .actions { margin-top: 1rem; display: flex; gap: 0.75rem; align-items: center; }
    .error { color: var(--coraza-error); }
  `,
})
export class DocumentForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(DocumentalApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly recordId = signal<string | null>(null);
  readonly types = signal<DocumentType[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly title = computed(() => (this.recordId() ? 'Editar documento' : 'Nuevo documento'));

  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    title: ['', Validators.required],
    documentTypeId: ['', Validators.required],
    registeredAt: [this.today(), Validators.required],
    physicalLocation: [''],
    observations: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.recordId.set(id);
      this.form.controls.code.disable();
    }

    this.api.listTypes().subscribe({
      next: (types) => {
        this.types.set(types);
        if (id) this.loadRecord(id);
      },
      error: () => this.error.set('No se pudieron cargar tipos documentales'),
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue() as CreateDocumentRecordPayload;
    const payload: CreateDocumentRecordPayload = {
      ...raw,
      physicalLocation: raw.physicalLocation || undefined,
      observations: raw.observations || undefined,
    };

    const id = this.recordId();
    const req = id ? this.api.updateRecord(id, payload) : this.api.createRecord(payload);

    req.subscribe({
      next: () => this.router.navigate(['/documental']),
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message ?? 'No se pudo guardar el documento');
      },
    });
  }

  private loadRecord(id: string): void {
    this.api.listRecords().subscribe({
      next: (records) => {
        const doc = records.find((r) => r.id === id);
        if (!doc) {
          this.error.set('Documento no encontrado');
          return;
        }
        this.form.patchValue({
          code: doc.code,
          title: doc.title,
          documentTypeId: doc.documentTypeId,
          registeredAt: doc.registeredAt,
          physicalLocation: doc.physicalLocation ?? '',
          observations: doc.observations ?? '',
        });
      },
      error: () => this.error.set('No se pudo cargar el documento'),
    });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
