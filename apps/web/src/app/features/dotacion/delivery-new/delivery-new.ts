import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DeliveryDialog } from '../delivery-dialog/delivery-dialog';
import { DeliverableAssociate, InventoryApiService } from '../inventory-api.service';

interface SelectableAssociate {
  id: string;
  documentNumber: string;
  label: string;
  status: string;
}

function toSelectable(a: DeliverableAssociate): SelectableAssociate {
  const name = [a.firstName, a.secondName, a.firstLastName, a.secondLastName]
    .filter(Boolean)
    .join(' ');
  const statusHint = a.status === 'VACACIONES' ? ' · vacaciones' : '';
  return {
    id: a.id,
    documentNumber: a.documentNumber,
    label: name
      ? `${name} (${a.documentNumber})${statusHint}`
      : a.documentNumber,
    status: a.status,
  };
}

@Component({
  selector: 'app-delivery-new',
  imports: [RouterLink, DeliveryDialog],
  template: `
    <section>
      <header>
        <h2>Nueva entrega de dotación</h2>
        <p>Selecciona un asociado activo o en vacaciones y registra la entrega con tallas y firma.</p>
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
              <option [value]="a.id">{{ a.label }}</option>
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
  private readonly api = inject(InventoryApiService);

  readonly associates = signal<SelectableAssociate[]>([]);
  readonly associateId = signal('');
  readonly subjectLabel = signal('');
  readonly dialogOpen = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api
      .listEligibleAssociates()
      .pipe(map((rows) => rows.map(toSelectable)))
      .subscribe({
        next: (list) => {
          this.associates.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudieron cargar los asociados elegibles');
        },
      });
  }

  onAssociateChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.associateId.set(id);
    const associate = this.associates().find((a) => a.id === id);
    this.subjectLabel.set(associate?.label ?? '');
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
}
