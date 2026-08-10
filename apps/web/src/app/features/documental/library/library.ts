import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentalApiService, LibraryFile, LibraryFolder } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

@Component({
  selector: 'app-doc-library',
  imports: [FormsModule],
  template: `
    <div class="toolbar">
      <h3>Biblioteca documental</h3>
      @if (canManage()) {
        <div>
          <button class="btn-ghost" (click)="toggle('folder')">Nueva carpeta</button>
          <button class="btn-primary" (click)="toggle('file')">Nuevo documento</button>
        </div>
      }
    </div>

    @if (formType() === 'folder') {
      <form class="card" (ngSubmit)="saveFolder()">
        <label>Nombre de carpeta<input [(ngModel)]="folder.name" name="name" required /></label>
        <label>Color<input type="color" [(ngModel)]="folder.color" name="color" /></label>
        <div class="actions"><button class="btn-primary" type="submit">Crear carpeta</button></div>
      </form>
    }

    @if (formType() === 'file') {
      <form class="card" (ngSubmit)="saveFile()">
        <label>Nombre<input [(ngModel)]="file.name" name="name" required /></label>
        <label>Categoría<input [(ngModel)]="file.category" name="category" /></label>
        <label>Versión<input [(ngModel)]="file.version" name="version" placeholder="1.0" /></label>
        <label>Carpeta
          <select [(ngModel)]="file.folderId" name="folderId">
            <option value="">Raíz</option>
            @for (f of folders(); track f.id) { <option [value]="f.id">{{ f.name }}</option> }
          </select>
        </label>
        <label class="full">URL del archivo<input [(ngModel)]="file.url" name="url" /></label>
        <div class="actions"><button class="btn-primary" type="submit">Registrar documento</button></div>
      </form>
    }

    @if (loading()) {
      <p>Cargando...</p>
    } @else {
      @for (f of folders(); track f.id) {
        <div style="margin-bottom:1rem">
          <h4 style="display:flex;align-items:center;gap:.5rem">
            <span style="width:12px;height:12px;border-radius:3px;display:inline-block" [style.background]="f.color"></span>
            {{ f.name }}
            @if (canManage() && !f.isSystem) { <button class="btn-ghost" (click)="delFolder(f)">Borrar</button> }
          </h4>
          <table>
            <thead><tr><th>Documento</th><th>Categoría</th><th>Versión</th><th></th></tr></thead>
            <tbody>
              @for (doc of filesOf(f.id); track doc.id) {
                <tr>
                  <td>@if (doc.url) { <a [href]="doc.url" target="_blank" rel="noopener">{{ doc.name }}</a> } @else { {{ doc.name }} }</td>
                  <td>{{ doc.category ?? '—' }}</td>
                  <td>{{ doc.version }}</td>
                  <td>@if (canManage()) { <button class="btn-ghost" (click)="delFile(doc)">Eliminar</button> }</td>
                </tr>
              } @empty { <tr><td colspan="4" class="muted">Carpeta vacía.</td></tr> }
            </tbody>
          </table>
        </div>
      }
      @if (rootFiles().length > 0) {
        <div>
          <h4>Sin carpeta</h4>
          <table>
            <tbody>
              @for (doc of rootFiles(); track doc.id) {
                <tr>
                  <td>{{ doc.name }}</td>
                  <td>@if (canManage()) { <button class="btn-ghost" (click)="delFile(doc)">Eliminar</button> }</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: [DOC_STYLES],
})
export class LibraryScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly folders = signal<LibraryFolder[]>([]);
  readonly files = signal<LibraryFile[]>([]);
  readonly loading = signal(true);
  readonly formType = signal<'folder' | 'file' | null>(null);
  readonly canManage = computed(() => this.auth.hasPermission('documental.manage'));

  folder = { name: '', color: '#2563eb' };
  file = { name: '', category: '', version: '1.0', folderId: '', url: '' };

  ngOnInit(): void {
    this.load();
  }

  toggle(type: 'folder' | 'file'): void {
    this.formType.update((cur) => (cur === type ? null : type));
  }

  filesOf(folderId: string): LibraryFile[] {
    return this.files().filter((f) => f.folderId === folderId);
  }

  rootFiles(): LibraryFile[] {
    return this.files().filter((f) => !f.folderId);
  }

  private load(): void {
    this.loading.set(true);
    this.api.libraryTree().subscribe({
      next: ({ folders, files }) => {
        this.folders.set(folders);
        this.files.set(files);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  saveFolder(): void {
    this.api.createFolder({ name: this.folder.name, color: this.folder.color }).subscribe({
      next: () => {
        this.folder = { name: '', color: '#2563eb' };
        this.formType.set(null);
        this.load();
      },
    });
  }

  saveFile(): void {
    const payload = Object.fromEntries(Object.entries(this.file).filter(([, v]) => v !== ''));
    this.api.createFile(payload).subscribe({
      next: () => {
        this.file = { name: '', category: '', version: '1.0', folderId: '', url: '' };
        this.formType.set(null);
        this.load();
      },
    });
  }

  delFolder(f: LibraryFolder): void {
    if (window.confirm(`¿Borrar la carpeta "${f.name}"? Sus documentos quedarán sin carpeta.`)) {
      this.api.deleteFolder(f.id).subscribe({ next: () => this.load() });
    }
  }

  delFile(doc: LibraryFile): void {
    if (window.confirm(`¿Eliminar "${doc.name}"?`)) {
      this.api.deleteFile(doc.id).subscribe({ next: () => this.load() });
    }
  }
}
