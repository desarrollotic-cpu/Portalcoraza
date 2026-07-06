import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import {
  DocumentRecord,
  DocumentType,
  DocumentalApiService,
} from '../documental-api.service';

@Component({
  selector: 'app-documents-list',
  imports: [RouterLink],
  template: `
    <section>
      <header class="toolbar">
        <div class="filters">
          <label>
            Buscar por código
            <input
              type="search"
              [value]="codeQuery()"
              (input)="onCodeSearch($event)"
              placeholder="Ej. DOC-001"
            />
          </label>
          <label>
            Tipo
            <select [value]="typeFilter()" (change)="onTypeFilter($event)">
              <option value="">Todos</option>
              @for (t of types(); track t.id) {
                <option [value]="t.id">{{ t.name }} ({{ t.code }})</option>
              }
            </select>
          </label>
        </div>
        @if (canCreate()) {
          <a routerLink="/documental/nuevo" class="btn-primary">Nuevo documento</a>
        }
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Tipo</th>
              <th>Ubicación física</th>
              <th>Fecha registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (doc of filteredRecords(); track doc.id) {
              <tr>
                <td>{{ doc.code }}</td>
                <td>{{ doc.title }}</td>
                <td>{{ doc.documentType?.name ?? '—' }}</td>
                <td>{{ doc.physicalLocation ?? '—' }}</td>
                <td>{{ doc.registeredAt }}</td>
                <td>
                  @if (canCreate()) {
                    <a [routerLink]="['/documental', doc.id, 'editar']">Editar</a>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">No hay documentos registrados.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: end;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .btn-primary {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: var(--primary);
      color: var(--text-on-primary);
      text-decoration: none;
      border-radius: var(--coraza-radius);
      font-size: 0.9rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .filters { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
    input, select { padding: 0.45rem 0.6rem; border: 1px solid var(--coraza-border); border-radius: 8px; min-width: 200px; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--coraza-border); text-align: left; }
    th { background: var(--primary-50); font-size: 0.75rem; text-transform: uppercase; }
    .error { color: var(--coraza-error); }
  `,
})
export class DocumentsList implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly types = signal<DocumentType[]>([]);
  readonly records = signal<DocumentRecord[]>([]);
  readonly codeQuery = signal('');
  readonly typeFilter = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly canCreate = computed(() => this.auth.hasPermission('documental.create'));

  readonly filteredRecords = computed(() => {
    const typeId = this.typeFilter();
    if (!typeId) return this.records();
    return this.records().filter((r) => r.documentTypeId === typeId);
  });

  ngOnInit(): void {
    this.load();
  }

  onCodeSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.codeQuery.set(value);
    this.load(value);
  }

  onTypeFilter(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
  }

  private load(code?: string): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      types: this.api.listTypes(),
      records: this.api.listRecords(code ?? this.codeQuery()),
    }).subscribe({
      next: ({ types, records }) => {
        this.types.set(types);
        this.records.set(records);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el registro documental');
      },
    });
  }
}
