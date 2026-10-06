import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentalApiService, Minute } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';
import { addToPrintQueue, getPrintQueue, printQueue, printRotulo } from '../rotulo-print';

@Component({
  selector: 'app-doc-minutes',
  imports: [FormsModule],
  template: `
    <div class="toolbar">
      <h3>Minutas</h3>
      <div class="actions-inline">
        @if (queueCount() > 0) {
          <button type="button" class="btn-ghost" (click)="printCola()">
            Cola de impresión ({{ queueCount() }})
          </button>
        }
        @if (canCreate()) {
          <button class="btn-primary" (click)="toggle()">{{ showForm() ? 'Cerrar' : 'Nueva minuta' }}</button>
        }
      </div>
    </div>

    <div class="search-bar">
      <input
        type="search"
        [(ngModel)]="query"
        name="minuteSearch"
        placeholder="Buscar por código, puesto o tipo..."
        (ngModelChange)="onSearch($event)"
        autocomplete="off"
      />
      <span class="muted">{{ items().length }} resultado(s)</span>
    </div>

    @if (showForm()) {
      <form class="card" (ngSubmit)="save()">
        @if (editingId()) {
          <p class="code-preview">Editando {{ editingCode() }} — el código no cambia</p>
        }
        <label>
          Tipo de Minuta *
          <select [(ngModel)]="model.minuteType" name="minuteType" required [disabled]="!!editingId()">
            <option value="SERVICIO"> SERVICIO — Minuta de Puesto de Vigilancia</option>
            <option value="VISITANTES"> VISITANTES — Control de Ingreso y Accesos</option>
            <option value="CORRESPONDENCIA"> CORRESPONDENCIA — Paquetería y Sobres</option>
          </select>
        </label>
        <label>Nombre del Puesto de Vigilancia *
          @if (posts().length && !manualPost) {
            <input class="post-filter" [(ngModel)]="postFilter" name="postFilter" placeholder="Filtrar puesto" autocomplete="off" />
            <select [(ngModel)]="model.postName" name="postName" required>
              <option value="">Seleccione el puesto</option>
              @for (name of visiblePosts(); track name) {
                <option [value]="name">{{ name }}</option>
              }
            </select>
            <button type="button" class="linkish" (click)="writePost()">No está en la lista — escribirlo</button>
          } @else {
            <input [(ngModel)]="model.postName" name="postName" required placeholder="Escriba el nombre del puesto" />
            @if (posts().length) {
              <button type="button" class="linkish" (click)="pickFromList()">Elegir de la lista</button>
            }
          }
        </label>
        <label>Fecha Inicio *<input type="date" [(ngModel)]="model.startDate" name="startDate" required /></label>
        <label>Fecha Cierre *<input type="date" [(ngModel)]="model.closeDate" name="closeDate" required /></label>
        <label>
          Ubicación en Archivo (Voxelsera) *
          <select [(ngModel)]="model.voxelsera" name="voxelsera" required>
            <option value="">-- Selecciona una casilla obligatoria * --</option>
            <option value="VOXEL_A1"> Estante A — Casilla A1 (Minutas)</option>
            <option value="VOXEL_A2"> Estante A — Casilla A2 (Minutas)</option>
            <option value="VOXEL_A3"> Estante A — Casilla A3 (Minutas)</option>
            <option value="VOXEL_A4"> Estante A — Casilla A4 (Minutas)</option>
            <option value="VOXEL_A5"> Estante A — Casilla A5 (Minutas)</option>
            <option value="VOXEL_A6"> Estante A — Casilla A6 (Minutas)</option>
            <option value="VOXEL_A7"> Estante A — Casilla A7 (Minutas)</option>
            <option value="VOXEL_A8"> Estante A — Casilla A8 (Minutas)</option>
            <option value="VOXEL_A9"> Estante A — Casilla A9 (Minutas)</option>
          </select>
        </label>
        <label class="full">Observaciones (Opcional)<textarea [(ngModel)]="model.observations" name="observations" rows="2" placeholder="Novedades de cierre, estado del libro físico..."></textarea></label>
        <div class="actions">
          <button type="submit" class="btn-primary" [disabled]="saving()">
            {{ editingId() ? 'Guardar cambios' : 'Guardar minuta' }}
          </button>
          @if (!editingId()) {
            <button type="button" class="btn-ghost" [disabled]="saving()" (click)="save(true)">
              Guardar y otra
            </button>
          }
          @if (error()) { <span class="error">{{ error() }}</span> }
        </div>
      </form>
    }

    @if (lastSaved()) {
      <div class="toast-ok">
        Minuta <strong>{{ lastSaved()!.uniqueCode }}</strong> registrada y agregada a la cola de impresión.
        <button type="button" class="btn-primary" (click)="printSaved()">Imprimir rótulo</button>
        <button type="button" class="btn-ghost" (click)="lastSaved.set(null)">Cerrar</button>
      </div>
    }

    @if (loading()) {
      <p>Cargando...</p>
    } @else {
      <table>
        <thead><tr><th>Código</th><th>Tipo</th><th>Puesto</th><th>Inicio</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          @for (m of items(); track m.id) {
            <tr>
              <td>{{ m.uniqueCode ?? '—' }}</td>
              <td>{{ m.minuteType }}</td>
              <td>{{ m.postName ?? '—' }}</td>
              <td>{{ m.startDate ?? '—' }}</td>
              <td><span class="badge ok">{{ m.status }}</span></td>
              <td>
                @if (canCreate()) {
                  <button type="button" class="btn-ghost" (click)="startEdit(m)">Editar</button>
                }
                <button type="button" class="btn-ghost" (click)="printOne(m)" title="Generar rótulo para imprimir">
                  Imprimir rótulo
                </button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="muted">{{ query.trim() ? 'Sin coincidencias. Prueba código o nombre del puesto.' : 'Sin minutas registradas.' }}</td></tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [
    DOC_STYLES,
    `
    .actions-inline { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
    .toast-ok {
      display: flex; flex-wrap: wrap; align-items: center; gap: .75rem;
      margin-bottom: 1rem; padding: .85rem 1rem;
      background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px;
      font-size: .9rem;
    }
    .code-preview { grid-column:1/-1; font-weight:700; margin:0; }
    .post-filter { margin-bottom: .35rem; }
    .linkish {
      display: block; margin-top: .35rem; padding: 0;
      background: none; border: 0; color: #1d4ed8; cursor: pointer;
      font-size: .82rem; text-decoration: underline; text-align: left;
    }
  `,
  ],
})
export class MinutesScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly items = signal<Minute[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastSaved = signal<Minute | null>(null);
  readonly queueCount = signal(0);
  readonly canCreate = computed(() => this.auth.hasPermission('documental.create'));
  readonly editingId = signal<string | null>(null);
  readonly editingCode = signal('');
  readonly posts = signal<string[]>([]);

  model = {
    minuteType: 'SERVICIO',
    postName: '',
    startDate: '',
    closeDate: '',
    voxelsera: '',
    observations: '',
  };
  query = '';
  postFilter = '';
  manualPost = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  visiblePosts(): string[] {
    const q = this.postFilter.trim().toLowerCase();
    const all = this.posts();
    if (!q) return all;
    return all.filter((name) => name.toLowerCase().includes(q));
  }

  writePost(): void {
    this.manualPost = true;
    this.model.postName = '';
    this.postFilter = '';
  }

  pickFromList(): void {
    this.manualPost = false;
    this.model.postName = '';
    this.postFilter = '';
  }

  ngOnInit(): void {
    this.refreshQueue();
    this.load();
    this.api.listMinutePosts().subscribe({
      next: (names) => {
        const current = localStorage.getItem('doc-minute-post');
        this.posts.set(current && !names.includes(current) ? [current, ...names] : names);
      },
      error: () => this.posts.set([]),
    });
  }

  toggle(): void {
    if (this.showForm()) {
      this.showForm.set(false);
      this.resetForm();
      return;
    }
    this.resetForm();
    this.showForm.set(true);
  }

  startEdit(m: Minute): void {
    this.editingId.set(m.id);
    this.editingCode.set(m.uniqueCode || String(m.numericCode ?? ''));
    this.model = {
      minuteType: m.minuteType || 'SERVICIO',
      postName: m.postName ?? '',
      startDate: (m.startDate ?? '').slice(0, 10),
      closeDate: (m.closeDate ?? '').slice(0, 10),
      voxelsera: m.voxelsera ?? '',
      observations: m.observations ?? '',
    };
    const name = m.postName ?? '';
    if (name && !this.posts().includes(name)) this.posts.update((list) => [name, ...list]);
    this.postFilter = '';
    this.manualPost = false;
    this.error.set(null);
    this.showForm.set(true);
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.editingCode.set('');
    this.postFilter = '';
    this.manualPost = false;
    this.model = {
      minuteType: localStorage.getItem('doc-minute-type') || 'SERVICIO',
      postName: localStorage.getItem('doc-minute-post') || '',
      startDate: '',
      closeDate: '',
      voxelsera: localStorage.getItem('doc-minute-voxel') || '',
      observations: '',
    };
    this.error.set(null);
  }

  private refreshQueue(): void {
    this.queueCount.set(getPrintQueue().length);
  }

  onSearch(_value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 280);
  }

  private load(): void {
    this.loading.set(true);
    this.api.listMinutes(this.query).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(andAnother = false): void {
    if (
      !this.model.minuteType ||
      !this.model.postName?.trim() ||
      !this.model.startDate ||
      !this.model.closeDate ||
      !this.model.voxelsera
    ) {
      this.error.set(' Debes completar todos los campos obligatorios (*): Tipo, Puesto, Fecha Inicio, Fecha Cierre y Ubicación en Estante.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const payload = Object.fromEntries(Object.entries(this.model).filter(([, v]) => v !== ''));
    const editId = this.editingId();
    const req = editId ? this.api.updateMinute(editId, payload) : this.api.createMinute(payload);
    req.subscribe({
      next: (saved) => {
        this.saving.set(false);
        if (!editId) {
          localStorage.setItem('doc-minute-type', this.model.minuteType);
          localStorage.setItem('doc-minute-post', this.model.postName);
          localStorage.setItem('doc-minute-voxel', this.model.voxelsera);
          const slot = saved.voxelsera || this.model.voxelsera || 'Estante A';
          addToPrintQueue({
            id: saved.id,
            modulo: 'MINUTAS',
            codigo: saved.uniqueCode || String(saved.numericCode ?? saved.id),
            titulo: saved.postName || this.model.postName || 'MINUTA',
            fechas: `${saved.startDate || this.model.startDate || ''} -- ${saved.closeDate || this.model.closeDate || ''}`,
            slotFisico: slot,
          });
          this.refreshQueue();
          this.lastSaved.set(saved);
        }
        if (andAnother && !editId) {
          this.model.startDate = '';
          this.model.closeDate = '';
          this.model.observations = '';
          this.showForm.set(true);
        } else {
          this.showForm.set(false);
          this.resetForm();
        }
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.error.set(editId ? 'No se pudo guardar la minuta.' : 'No se pudo registrar la minuta.');
      },
    });
  }

  printOne(m: Minute): void {
    printRotulo({
      modulo: 'MINUTAS',
      codigo: m.uniqueCode || String(m.numericCode ?? m.id),
      titulo: m.postName || 'MINUTA',
      fechas: `${m.startDate || ''} -- ${m.closeDate || ''}`,
      slotFisico: m.voxelsera || 'Estante A',
    });
  }

  printSaved(): void {
    const m = this.lastSaved();
    if (m) this.printOne(m);
  }

  printCola(): void {
    printQueue();
  }
}
