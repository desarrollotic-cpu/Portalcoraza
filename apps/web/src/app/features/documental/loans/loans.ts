import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentalApiService, Loan } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

@Component({
  selector: 'app-doc-loans',
  imports: [FormsModule],
  template: `
    <div class="toolbar">
      <h3>Préstamos de documentos</h3>
      @if (canCreate()) {
        <button class="btn-primary" (click)="toggle()">{{ showForm() ? 'Cerrar' : 'Nuevo préstamo' }}</button>
      }
    </div>

    @if (showForm()) {
      <form class="card" (ngSubmit)="save()">
        <label>Solicitante<input [(ngModel)]="model.requester" name="requester" required /></label>
        <label>Departamento<input [(ngModel)]="model.department" name="department" /></label>
        <label>Documento<input [(ngModel)]="model.document" name="document" /></label>
        <label>Código documento<input [(ngModel)]="model.documentCode" name="documentCode" /></label>
        <label>Fecha préstamo<input type="date" [(ngModel)]="model.loanDate" name="loanDate" /></label>
        <label>Fecha devolución<input type="date" [(ngModel)]="model.returnDate" name="returnDate" /></label>
        <div class="actions">
          <button type="submit" class="btn-primary" [disabled]="saving()">Guardar</button>
          @if (error()) { <span class="error">{{ error() }}</span> }
        </div>
      </form>
    }

    @if (loading()) {
      <p>Cargando...</p>
    } @else {
      <table>
        <thead><tr><th>Solicitante</th><th>Documento</th><th>Préstamo</th><th>Devolución</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          @for (l of items(); track l.id) {
            <tr>
              <td>{{ l.requester }}</td>
              <td>{{ l.document ?? '—' }}</td>
              <td>{{ l.loanDate ?? '—' }}</td>
              <td>{{ l.returnDate ?? '—' }}</td>
              <td>
                <span class="badge"
                  [class.ok]="l.status === 'ACTIVO' || l.status === 'DEVUELTO'"
                  [class.crit]="l.status === 'VENCIDO' || l.status === 'RECHAZADO'"
                  [class.warn]="l.status === 'PENDIENTE_APROBACION'">{{ l.status }}</span>
              </td>
              <td>
                @if (canManage()) {
                  @if (l.status === 'PENDIENTE_APROBACION') {
                    <button class="btn-ghost" (click)="approve(l)">Aprobar</button>
                    <button class="btn-ghost" (click)="reject(l)">Rechazar</button>
                  } @else if (l.status === 'ACTIVO' || l.status === 'VENCIDO') {
                    <button class="btn-ghost" (click)="ret(l)">Devolver</button>
                  } @else { <span class="muted">—</span> }
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="muted">Sin préstamos registrados.</td></tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [DOC_STYLES],
})
export class LoansScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly items = signal<Loan[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly canCreate = computed(() => this.auth.hasPermission('documental.create'));
  readonly canManage = computed(() => this.auth.hasPermission('documental.manage'));

  model = { requester: '', department: '', document: '', documentCode: '', loanDate: '', returnDate: '' };

  ngOnInit(): void {
    this.load();
  }

  toggle(): void {
    this.showForm.update((v) => !v);
  }

  private load(): void {
    this.loading.set(true);
    this.api.listLoans().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    const payload = Object.fromEntries(Object.entries(this.model).filter(([, v]) => v !== ''));
    this.api.createLoan(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.model = { requester: '', department: '', document: '', documentCode: '', loanDate: '', returnDate: '' };
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo registrar el préstamo.');
      },
    });
  }

  approve(l: Loan): void {
    this.api.approveLoan(l.id).subscribe({ next: () => this.load() });
  }

  reject(l: Loan): void {
    const motivo = window.prompt('Motivo de rechazo:') ?? '';
    this.api.rejectLoan(l.id, motivo).subscribe({ next: () => this.load() });
  }

  ret(l: Loan): void {
    this.api.returnLoan(l.id).subscribe({ next: () => this.load() });
  }
}
