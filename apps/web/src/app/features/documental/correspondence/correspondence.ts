import { SlicePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Correspondence, DocumentalApiService } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

@Component({
  selector: 'app-doc-correspondence',
  imports: [FormsModule, SlicePipe],
  template: `
    <div class="toolbar">
      <h3>Correspondencia</h3>
      @if (canCreate()) {
        <button class="btn-primary" (click)="toggle()">{{ showForm() ? 'Cerrar' : 'Radicar documento' }}</button>
      }
    </div>

    @if (showForm()) {
      <form class="card" (ngSubmit)="save()">
        <label>Dependencia origen (sigla)<input [(ngModel)]="model.originDept" name="originDept" required /></label>
        <label>Dependencia destino<input [(ngModel)]="model.destinationDept" name="destinationDept" /></label>
        <label>Código dep. (TRD)<input [(ngModel)]="model.depCode" name="depCode" placeholder="100" /></label>
        <label>Código serie<input [(ngModel)]="model.serieCode" name="serieCode" placeholder="10" /></label>
        <label>Código subserie<input [(ngModel)]="model.subserieCode" name="subserieCode" placeholder="01" /></label>
        <label>Medio<input [(ngModel)]="model.medium" name="medium" /></label>
        <label>Tipo de documento<input [(ngModel)]="model.documentType" name="documentType" /></label>
        <label>Fecha documento<input type="date" [(ngModel)]="model.documentDate" name="documentDate" /></label>
        <label class="full">Asunto<input [(ngModel)]="model.subject" name="subject" /></label>
        <label class="full">Detalle<textarea [(ngModel)]="model.detail" name="detail" rows="2"></textarea></label>
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
        <thead><tr><th>Radicado</th><th>Origen → Destino</th><th>Asunto</th><th>Estado</th><th>Fecha</th></tr></thead>
        <tbody>
          @for (r of items(); track r.id) {
            <tr>
              <td>{{ r.documentCode ?? '—' }}</td>
              <td>{{ r.originDept }} → {{ r.destinationDept ?? '—' }}</td>
              <td>{{ r.subject ?? '—' }}</td>
              <td><span class="badge info">{{ r.status }}</span></td>
              <td>{{ r.documentDate ?? (r.createdAt | slice: 0:10) }}</td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="muted">Sin correspondencia registrada.</td></tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [DOC_STYLES],
})
export class CorrespondenceScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly items = signal<Correspondence[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly canCreate = computed(() => this.auth.hasPermission('documental.create'));

  model = { originDept: '', destinationDept: '', depCode: '', serieCode: '', subserieCode: '', medium: '', documentType: '', documentDate: '', subject: '', detail: '' };

  ngOnInit(): void {
    this.load();
  }

  toggle(): void {
    this.showForm.update((v) => !v);
  }

  private load(): void {
    this.loading.set(true);
    this.api.listCorrespondence().subscribe({
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
    this.api.createCorrespondence(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.model = { originDept: '', destinationDept: '', depCode: '', serieCode: '', subserieCode: '', medium: '', documentType: '', documentDate: '', subject: '', detail: '' };
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo registrar la correspondencia.');
      },
    });
  }
}
