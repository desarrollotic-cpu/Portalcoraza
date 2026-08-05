import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentalApiService, Workflow } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

@Component({
  selector: 'app-doc-workflows',
  imports: [],
  template: `
    <h3>Workflows pendientes</h3>
    @if (loading()) {
      <p>Cargando...</p>
    } @else {
      <table>
        <thead><tr><th>Tipo</th><th>Aprobador</th><th>SLA (días)</th><th>Comentarios</th><th>Acciones</th></tr></thead>
        <tbody>
          @for (w of items(); track w.id) {
            <tr>
              <td>{{ w.workflowType ?? '—' }}</td>
              <td>{{ w.approver ?? '—' }}</td>
              <td>{{ w.slaDays ?? '—' }}</td>
              <td>{{ w.comments ?? '—' }}</td>
              <td>
                @if (canManage()) {
                  <button class="btn-ghost" (click)="resolve(w, 'APROBAR')">Aprobar</button>
                  <button class="btn-ghost" (click)="resolve(w, 'RECHAZAR')">Rechazar</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="muted">Sin workflows pendientes.</td></tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [DOC_STYLES],
})
export class WorkflowsScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly items = signal<Workflow[]>([]);
  readonly loading = signal(true);
  readonly canManage = computed(() => this.auth.hasPermission('documental.manage'));

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.pendingWorkflows().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resolve(w: Workflow, decision: 'APROBAR' | 'RECHAZAR'): void {
    const comment = window.prompt(`Comentario (${decision}):`) ?? '';
    this.api.resolveWorkflow(w.id, decision, comment).subscribe({ next: () => this.load() });
  }
}
