import { KeyValuePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { DocumentalApiService } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

type Slot = { slotId: string; code: string; count: number; items: unknown[] };

@Component({
  selector: 'app-doc-voxelsera',
  imports: [KeyValuePipe],
  template: `
    <h3>Mapa VOXELSERA (archivo físico)</h3>
    <p class="muted">4 estantes (A–D) × 9 compartimentos. A=Minutas · B=Retirados · C=Contratos · D=Correspondencia.</p>
    @if (loading()) {
      <p>Cargando mapa...</p>
    } @else {
      <div class="grid">
        @for (entry of slots() | keyvalue; track entry.key) {
          <div class="slot" [class.filled]="entry.value.count > 0">
            <strong>{{ entry.value.code || entry.key }}</strong>
            <span>{{ entry.value.count }} doc(s)</span>
          </div>
        }
      </div>
    }
  `,
  styles: [
    DOC_STYLES,
    `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      gap: .5rem;
      margin-top: 1rem;
    }
    .slot {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: .55rem;
      font-size: .75rem;
      display: flex;
      flex-direction: column;
      gap: .2rem;
      background: var(--surface-2, #f8fafc);
    }
    .slot.filled {
      background: var(--primary-50, #eef2ff);
      border-color: var(--primary-200, #c7d2fe);
      font-weight: 600;
    }
  `,
  ],
})
export class VoxelseraScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  readonly slots = signal<Record<string, Slot>>({});
  readonly loading = signal(true);

  ngOnInit(): void {
    this.api.voxelseraMap().subscribe({
      next: (res) => {
        this.slots.set(res.slots ?? {});
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
