import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssociatesApiService, AssociatePayload } from '../associates-api.service';

@Component({
  selector: 'app-associate-form',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section>
      <h2>{{ title() }}</h2>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="grid">
          <label>Documento<input formControlName="documentNumber" /></label>
          <label>Nombres<input formControlName="firstName" /></label>
          <label>Apellidos<input formControlName="lastName" /></label>
          <label>Teléfono<input formControlName="phone" /></label>
          <label>Correo<input formControlName="email" type="email" /></label>
          <label>Estado
            <select formControlName="status">
              <option>ACTIVO</option>
              <option>INACTIVO</option>
              <option>SUSPENDIDO</option>
              <option>VACACIONES</option>
              <option>RETIRADO</option>
            </select>
          </label>
        </div>

        <label>Dirección<textarea formControlName="address"></textarea></label>

        <div class="actions">
          <button type="button" (click)="cancel()">Cancelar</button>
          <button type="submit" [disabled]="form.invalid || saving()">{{ submitLabel() }}</button>
        </div>
      </form>
    </section>
  `,
  styles: `
    .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap: 0.75rem; }
    label { display:flex; flex-direction:column; gap:0.25rem; font-size:0.9rem; }
    input, select, textarea { padding: 0.5rem; border:1px solid var(--coraza-border); border-radius: 8px; }
    textarea { min-height: 80px; }
    .actions { margin-top:1rem; display:flex; gap:0.5rem; }
    .error { color: var(--coraza-error); }
  `,
})
export class AssociateForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AssociatesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly associateId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly title = computed(() =>
    this.associateId() ? 'Editar asociado' : 'Crear asociado',
  );

  readonly submitLabel = computed(() => (this.associateId() ? 'Guardar' : 'Crear'));

  readonly form = this.fb.nonNullable.group({
    documentNumber: [''],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    phone: [''],
    email: ['', [Validators.email]],
    address: [''],
    status: ['ACTIVO'],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.associateId.set(id);
    this.api.getById(id).subscribe({
      next: (a) => {
        this.form.patchValue({
          documentNumber: a.documentNumber ?? '',
          firstName: a.firstName ?? '',
          lastName: a.lastName ?? '',
          phone: a.phone ?? '',
          email: a.email ?? '',
          address: a.address ?? '',
          status: a.status,
        });
      },
      error: () => this.error.set('No se pudo cargar el asociado'),
    });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const payload: AssociatePayload = {
      ...this.form.getRawValue(),
    };

    this.saving.set(true);
    const id = this.associateId();
    const request$ = id ? this.api.update(id, payload) : this.api.create(payload);

    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        void this.router.navigate(['/rrhh/asociados', res.id]);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo guardar el asociado');
      },
    });
  }

  cancel(): void {
    void this.router.navigate(['/rrhh/asociados']);
  }
}
