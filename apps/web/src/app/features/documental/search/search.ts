import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentalApiService, SearchResult } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

@Component({
  selector: 'app-doc-search',
  imports: [FormsModule],
  template: `
    <h3>Buscador Universal</h3>
    <p class="muted">Herramientas → búsqueda en contratos, correspondencia, minutas, retirados y préstamos.</p>
    <form class="toolbar" (ngSubmit)="run()">
      <input style="min-width:320px" [(ngModel)]="query" name="query" placeholder="NIT, cliente, cédula, código, asunto..." />
      <button class="btn-primary" type="submit" [disabled]="loading()">Buscar</button>
    </form>

    @if (loading()) {
      <p>Buscando...</p>
    } @else if (searched()) {
      <p class="muted">{{ results().length }} resultado(s).</p>
      <table>
        <thead><tr><th>Módulo</th><th>Título</th><th>Código</th><th>Fecha</th><th>Ubicación</th></tr></thead>
        <tbody>
          @for (r of results(); track r.modulo + r.id) {
            <tr>
              <td><span class="badge info">{{ r.modulo }}</span></td>
              <td>{{ r.titulo }}</td>
              <td>{{ r.codigo }}</td>
              <td>{{ r.fecha ?? '—' }}</td>
              <td>{{ r.voxelsera ?? '—' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="muted">Sin coincidencias.</td></tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [DOC_STYLES],
})
export class SearchScreen {
  private readonly api = inject(DocumentalApiService);
  query = '';
  readonly results = signal<SearchResult[]>([]);
  readonly loading = signal(false);
  readonly searched = signal(false);

  run(): void {
    if (!this.query.trim()) return;
    this.loading.set(true);
    this.api.search(this.query.trim()).subscribe({
      next: ({ resultados }) => {
        this.results.set(resultados);
        this.searched.set(true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
