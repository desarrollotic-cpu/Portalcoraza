import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Associate, AssociatesApiService } from '../../rrhh/associates-api.service';
import { DeliveryDialog } from '../delivery-dialog/delivery-dialog';

@Component({
  selector: 'app-delivery-new',
  imports: [RouterLink, DeliveryDialog],
  template: `
    <section>
      <header>
        <h2>Nueva entrega de dotación</h2>
        <p>Selecciona el asociado y registra la entrega con tallas y firma.</p>
      </header>

      @if (loading()) {
        <p>Cargando asociados...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <label>
          Asociado
          <select [value]="associateId()" (change)="onAssociateChange($event)">
            <option value="">Seleccione...</option>
            @for (a of associates(); track a.id) {
              <option [value]="a.id">{{ associateLabel(a) }}</option>
            }
          </select>
        </label>

        <div class="actions">
          <button type="button" (click)="openDialog()" [disabled]="!associateId()">
            Continuar con entrega
          </button>
          <a routerLink="/dotacion/entregas">Volver al listado</a>
        </div>
      }
    </section>

    <app-delivery-dialog
      [open]="dialogOpen()"
      [associateId]="associateId()"
      [subjectLabel]="subjectLabel()"
      (completed)="onCompleted()"
      (dismissed)="closeDialog()"
    />
  `,
  styles: `
    header h2 { margin: 0; color: var(--primary-dark); }
    header p { color: var(--coraza-text-muted); margin: 0.25rem 0 1rem; }
    label { display: flex; flex-direction: column; gap: 0.35rem; max-width: 420px; margin-bottom: 1rem; }
    select { padding: 0.5rem; border: 1px solid var(--coraza-border); border-radius: 8px; }
    .actions { display: flex; gap: 1rem; align-items: center; }
    .error { color: var(--coraza-error); }
  `,
})
export class DeliveryNew implements OnInit {
  private readonly associatesApi = inject(AssociatesApiService);

  readonly associates = signal<Associate[]>([]);
  readonly associateId = signal('');
  readonly subjectLabel = signal('');
  readonly dialogOpen = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.associatesApi.list('ACTIVO').subscribe({
      next: (list) => {
        this.associates.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los asociados');
      },
    });
  }

  onAssociateChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.associateId.set(id);
    const associate = this.associates().find((a) => a.id === id);
    this.subjectLabel.set(associate ? this.associateLabel(associate) : '');
  }

  openDialog(): void {
    if (!this.associateId()) return;
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  onCompleted(): void {
    this.closeDialog();
  }

  associateLabel(a: Associate): string {
    const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
    return name ? `${name} (${a.documentNumber ?? 's/doc'})` : (a.documentNumber ?? a.id);
  }
}
