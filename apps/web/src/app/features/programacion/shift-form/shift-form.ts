import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Associate, AssociatesApiService } from '../../rrhh/associates-api.service';
import { CreateShiftPayload, SchedulingApiService, ShiftType } from '../scheduling-api.service';

@Component({
  selector: 'app-shift-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section>
      <h2>{{ shiftId() ? 'Editar turno' : 'Asignar turno' }}</h2>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="grid">
          <label>Puesto
            <select formControlName="postId">
              <option value="">Seleccione...</option>
              @for (p of posts(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </label>
          <label>Asociado
            <select formControlName="associateId">
              <option value="">Seleccione...</option>
              @for (a of associates(); track a.id) {
                <option [value]="a.id">{{ associateLabel(a) }}</option>
              }
            </select>
          </label>
          <label>Fecha
            <input type="date" formControlName="shiftDate" />
          </label>
          <label>Tipo
            <select formControlName="shiftType">
              <option value="DAY">Diurno</option>
              <option value="NIGHT">Nocturno</option>
              <option value="REST">Descanso</option>
            </select>
          </label>
          <label>Jornada (horas)
            <select formControlName="workdayHours">
              <option [value]="8">8 horas</option>
              <option [value]="12">12 horas</option>
            </select>
          </label>
        </div>
        <label>Notas<textarea formControlName="notes"></textarea></label>

        <div class="actions">
          <a routerLink="/programacion">Cancelar</a>
          @if (shiftId()) {
            <button type="button" class="danger" (click)="remove()" [disabled]="saving()">
              Eliminar
            </button>
          }
          <button type="submit" [disabled]="form.invalid || saving()">Guardar</button>
        </div>
      </form>
    </section>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
    input, select, textarea { padding: 0.5rem; border: 1px solid var(--coraza-border); border-radius: 8px; }
    textarea { min-height: 70px; }
    .actions { margin-top: 1rem; display: flex; gap: 0.75rem; align-items: center; }
    .danger { background: #c62828; color: #fff; border: none; padding: 0.5rem 0.75rem; border-radius: 8px; cursor: pointer; }
    .error { color: var(--coraza-error); }
  `,
})
export class ShiftForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SchedulingApiService);
  private readonly associatesApi = inject(AssociatesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly posts = signal<{ id: string; name: string }[]>([]);
  readonly associates = signal<Associate[]>([]);
  readonly shiftId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    postId: ['', Validators.required],
    associateId: ['', Validators.required],
    shiftDate: ['', Validators.required],
    shiftType: ['DAY' as ShiftType, Validators.required],
    workdayHours: [8 as 8 | 12, Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) this.shiftId.set(routeId);

    if (qp.get('postId')) this.form.patchValue({ postId: qp.get('postId')! });
    if (qp.get('associateId')) this.form.patchValue({ associateId: qp.get('associateId')! });
    if (qp.get('shiftDate')) this.form.patchValue({ shiftDate: qp.get('shiftDate')! });

    forkJoin({
      posts: this.api.listPosts(),
      associates: this.associatesApi.list('ACTIVO'),
    }).subscribe({
      next: ({ posts, associates }) => {
        this.posts.set(posts);
        this.associates.set(associates);
        if (routeId) this.loadShift(routeId);
      },
    });
  }

  private loadShift(id: string): void {
    const postId = this.form.getRawValue().postId;
    const shiftDate = this.form.getRawValue().shiftDate;
    if (!postId || !shiftDate) return;

    this.api.listShifts({ postId, startDate: shiftDate, endDate: shiftDate }).subscribe({
      next: (shifts) => {
        const shift = shifts.find((s) => s.id === id);
        if (!shift) return;
        this.form.patchValue({
          postId: shift.postId,
          associateId: shift.associateId,
          shiftDate: shift.shiftDate,
          shiftType: shift.shiftType,
          workdayHours: shift.workdayHours,
          notes: shift.notes ?? '',
        });
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);

    const payload = this.form.getRawValue() as CreateShiftPayload;
    const id = this.shiftId();

    const req = id
      ? this.api.updateShift(id, payload)
      : this.api.createShift(payload);

    req.subscribe({
      next: () => this.router.navigate(['/programacion']),
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message ?? 'No se pudo guardar el turno');
      },
    });
  }

  remove(): void {
    const id = this.shiftId();
    if (!id || !window.confirm('¿Eliminar este turno?')) return;

    this.saving.set(true);
    this.api.deleteShift(id).subscribe({
      next: () => this.router.navigate(['/programacion']),
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo eliminar (requiere permiso scheduling.edit)');
      },
    });
  }

  associateLabel(a: Associate): string {
    const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
    return name || a.documentNumber || a.id;
  }
}
