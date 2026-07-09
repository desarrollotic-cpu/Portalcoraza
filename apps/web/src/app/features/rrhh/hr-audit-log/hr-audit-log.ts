import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HrPageHeader } from '../../../shared/components/hr-page-header/hr-page-header';
import { HrApiService } from '../services/hr-api.service';
import type { AssociateHistoryEntry } from '../services/hr.types';

@Component({
  selector: 'app-hr-audit-log',
  imports: [CommonModule, RouterLink, DatePipe, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Bitácora HRM"
        subtitle="Cambios campo a campo sobre fichas de personal. Requiere permiso hr_audit.view."
      />

      @if (loading()) {
        <div class="hr-loading">Cargando bitácora...</div>
      } @else {
        <div class="hr-table-wrap">
          <table class="hr-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Asociado</th>
                <th>Acción</th>
                <th>Campo</th>
                <th>Anterior</th>
                <th>Nuevo</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of entries(); track entry.id) {
                <tr>
                  <td style="white-space:nowrap">{{ entry.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>
                    @if (auth.hasPermission('associates.view')) {
                      <a [routerLink]="['/rrhh/asociados', entry.associateId]" class="hr-link">
                        {{ associateLabel(entry) }}
                      </a>
                    } @else {
                      {{ associateLabel(entry) }}
                    }
                  </td>
                  <td><span class="hr-badge-neutral">{{ entry.action }}</span></td>
                  <td class="mono">{{ entry.fieldName }}</td>
                  <td class="mono" style="color:var(--text-muted)">{{ entry.oldValue ?? '—' }}</td>
                  <td class="mono">{{ entry.newValue ?? '—' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="hr-empty">Sin registros de auditoría aún.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class HrAuditLog implements OnInit {
  private readonly api = inject(HrApiService);
  readonly auth = inject(AuthService);

  readonly entries = signal<AssociateHistoryEntry[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.api.listHrAudit(200).subscribe({
      next: (rows) => {
        this.entries.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  associateLabel(entry: AssociateHistoryEntry): string {
    const a = entry.associate;
    if (a?.fullName) return a.fullName;
    const name = [a?.firstName, a?.firstLastName].filter(Boolean).join(' ');
    if (name) return name;
    if (a?.documentNumber) return a.documentNumber;
    return entry.associateId.slice(0, 8) + '…';
  }
}
