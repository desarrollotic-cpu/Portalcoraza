import { Component, OnInit, inject, signal } from '@angular/core';
import { DocumentalApiService, RetentionItem } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

@Component({
  selector: 'app-doc-retention',
  imports: [],
  template: `
    <h3>Tabla de Retención Documental (TRD)</h3>
    @if (loading()) {
      <p>Cargando...</p>
    } @else {
      <table>
        <thead><tr><th>Dep.</th><th>Dependencia</th><th>Serie</th><th>Subserie</th><th>Gestión</th><th>Central</th><th>Disposición</th><th>Norma</th></tr></thead>
        <tbody>
          @for (t of items(); track t.id) {
            <tr>
              <td>{{ t.dependencyCode }}</td>
              <td>{{ t.dependencyName }}</td>
              <td>{{ t.seriesName }}</td>
              <td>{{ t.subseriesName ?? '—' }}</td>
              <td>{{ t.managementYears ?? '—' }}</td>
              <td>{{ t.centralYears ?? '—' }}</td>
              <td>{{ t.finalDisposition ?? '—' }}</td>
              <td>{{ t.legalBasis ?? '—' }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [DOC_STYLES],
})
export class RetentionScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  readonly items = signal<RetentionItem[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.api.trd().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
