import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideArchive,
  LucideBookOpen,
  LucideCheck,
  LucideChevronRight,
  LucideEye,
  LucideFileText,
  LucideFolder,
  LucideLayers,
  LucideSearch,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { Icon } from '../../../shared/components/icon/icon';
import { DocumentalApiService } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

export interface VoxelItem {
  id: string;
  modulo: string;
  codigo: string | null;
  titulo: string;
}

export interface VoxelSlot {
  slotId: string;
  code: string;
  count: number;
  items: VoxelItem[];
}

export interface EstanteInfo {
  id: 'A' | 'B' | 'C' | 'D';
  nombre: string;
  subtitulo: string;
  modulo: string;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-doc-voxelsera',
  imports: [CommonModule, FormsModule, Icon],
  template: `
    <div class="voxelsera-wrap">
      <!-- HEADER PRINCIPAL -->
      <div class="toolbar">
        <div>
          <h3>VOXELSERA — Archivo Físico y Custodia</h3>
          <p class="muted">Distribución física de estantería inteligente por compartimentos (36 casillas organizadas en 4 estantes).</p>
        </div>
        <div class="search-box-header">
          <app-icon [icon]="icons.Search" [size]="16" [strokeWidth]="2" />
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por código, cédula o título..."
            (input)="onSearchChange()"
          />
          @if (searchQuery) {
            <button type="button" class="btn-clear-search" (click)="clearSearch()">
              <app-icon [icon]="icons.X" [size]="14" [strokeWidth]="2" />
            </button>
          }
        </div>
      </div>

      <!-- RESUMEN DE ESTANTES Y CAPACIDAD -->
      <div class="estantes-summary-grid">
        @for (est of estantes; track est.id) {
          <div
            class="estante-summary-card"
            [class.active]="selectedEstante() === est.id"
            (click)="selectedEstante.set(est.id)"
          >
            <div class="estante-head">
              <span class="estante-tag" [style.background]="est.color">Estante {{ est.id }}</span>
              <span class="estante-count">{{ getEstanteTotal(est.id) }} docs</span>
            </div>
            <h4>{{ est.nombre }}</h4>
            <p class="estante-desc">{{ est.subtitulo }}</p>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar-fill"
                [style.width.%]="getEstantePct(est.id)"
                [style.background]="est.color"
              ></div>
            </div>
            <div class="progress-footer">
              <span>9 casillas ({{ est.id }}1–{{ est.id }}9)</span>
              <strong>{{ getEstantePct(est.id) }}% ocupado</strong>
            </div>
          </div>
        }
      </div>

      <!-- TABS DE NAVEGACIÓN DE ESTANTE -->
      <div class="shelf-tabs">
        @for (est of estantes; track est.id) {
          <button
            type="button"
            class="shelf-tab-btn"
            [class.active]="selectedEstante() === est.id"
            (click)="selectedEstante.set(est.id)"
          >
            <span>Estante {{ est.id }} — {{ est.nombre }}</span>
            <span class="badge-count">{{ getEstanteTotal(est.id) }}</span>
          </button>
        }
      </div>

      <!-- MATRIZ 3x3 DEL ESTANTE SELECCIONADO -->
      @if (loading()) {
        <div class="loading-box"><p>Cargando mapa de compartimentos...</p></div>
      } @else {
        <div class="matrix-container">
          <div class="matrix-header">
            <div class="matrix-title">
              <app-icon [icon]="icons.Archive" [size]="20" [strokeWidth]="2" />
              <div>
                <h4>{{ currentEstanteInfo().nombre }}</h4>
                <p>{{ currentEstanteInfo().subtitulo }} · 9 compartimentos físicos</p>
              </div>
            </div>
            <div class="matrix-legend">
              <span class="legend-item"><span class="dot available"></span> Disponible</span>
              <span class="legend-item"><span class="dot occupied"></span> Con documentos</span>
              <span class="legend-item"><span class="dot selected"></span> Casilla seleccionada</span>
            </div>
          </div>

          <!-- GRID 3x3 DE COMPARTIMENTOS -->
          <div class="slots-grid-3x3">
            @for (slot of currentSlots(); track slot.slotId) {
              <div
                class="slot-card"
                [class.has-items]="slot.count > 0"
                [class.is-selected]="selectedSlot()?.slotId === slot.slotId"
                [class.is-highlighted]="isSlotHighlighted(slot.slotId)"
                (click)="openSlotDetails(slot)"
              >
                <div class="slot-badge">
                  <strong>{{ slot.slotId.replace('VOXEL_', '') }}</strong>
                  <span class="slot-status-icon" aria-hidden="true">
                    @if (slot.count > 0) {
                      ●
                    } @else {
                      ○
                    }
                  </span>
                </div>
                <div class="slot-info">
                  <div class="slot-count">
                    {{ slot.count }} {{ slot.count === 1 ? 'documento' : 'documentos' }}
                  </div>
                  <div class="slot-sub">
                    @if (slot.count > 0) {
                      <span>{{ slot.items[0].titulo | slice:0:30 }}...</span>
                    } @else {
                      <span class="muted-text">Compartimento vacío</span>
                    }
                  </div>
                </div>
                <div class="slot-action-indicator">
                  <span>Ver expedientes</span>
                  <app-icon [icon]="icons.ChevronRight" [size]="14" [strokeWidth]="2" />
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- PANEL LATERAL / DRAWER DE DETALLE DEL COMPARTIMENTO SELECCIONADO -->
      @if (selectedSlot()) {
        <div class="slot-drawer-backdrop" (click)="selectedSlot.set(null)">
          <div class="slot-drawer-card" (click)="$event.stopPropagation()">
            <div class="drawer-header">
              <div class="drawer-title-box">
                <span class="drawer-tag">Casilla {{ selectedSlot()!.slotId.replace('VOXEL_', '') }}</span>
                <div>
                  <h4>Expedientes en compartimento {{ selectedSlot()!.slotId }}</h4>
                  <p>{{ selectedSlot()!.count }} documento(s) físico(s) custodiado(s)</p>
                </div>
              </div>
              <button type="button" class="btn-close" (click)="selectedSlot.set(null)">
                <app-icon [icon]="icons.X" [size]="18" [strokeWidth]="2" />
              </button>
            </div>

            <div class="drawer-body">
              @if (selectedSlot()!.items.length === 0) {
                <div class="empty-drawer">
                  <app-icon [icon]="icons.Archive" [size]="36" [strokeWidth]="1.5" />
                  <h5>Compartimento Vacío</h5>
                  <p>No hay documentos registrados actualmente en esta casilla de archivo.</p>
                </div>
              } @else {
                <div class="drawer-items-list">
                  @for (item of selectedSlot()!.items; track item.id) {
                    <div class="drawer-item-card">
                      <div class="item-icon-tag">{{ getItemEmoji(item.modulo) }}</div>
                      <div class="item-content">
                        <div class="item-head">
                          <span class="item-mod-badge">{{ item.modulo }}</span>
                          @if (item.codigo) {
                            <strong class="item-code-text">{{ item.codigo }}</strong>
                          }
                        </div>
                        <h5 class="item-title">{{ item.titulo }}</h5>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="drawer-footer">
              <button type="button" class="btn-primary" (click)="selectedSlot.set(null)">
                Aceptar / Cerrar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    DOC_STYLES,
    `
    .voxelsera-wrap { display: flex; flex-direction: column; gap: 1.25rem; }
    
    .search-box-header {
      position: relative;
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 0.6rem;
      padding: 0.4rem 0.75rem;
      gap: 0.5rem;
      min-width: 280px;
      color: #64748b;
    }
    .search-box-header input {
      border: none;
      outline: none;
      font: inherit;
      font-size: 0.84rem;
      width: 100%;
      background: transparent;
      color: #0f172a;
    }
    .btn-clear-search { background: transparent; border: none; color: #94a3b8; cursor: pointer; }

    /* TARJETAS RESUMEN DE ESTANTES */
    .estantes-summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 1rem;
    }
    .estante-summary-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: 1rem;
      padding: 1.15rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .estante-summary-card:hover { transform: translateY(-2px); box-shadow: 0 8px 15px -3px rgba(0,0,0,0.06); }
    .estante-summary-card.active { border-color: #0369a1; background: #f8fafc; }
    
    .estante-head { display: flex; justify-content: space-between; align-items: center; }
    .estante-tag { color: #ffffff; font-size: 0.72rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 0.35rem; }
    .estante-count { font-size: 0.85rem; font-weight: 800; color: #0f172a; }
    .estante-summary-card h4 { margin: 0.2rem 0 0; font-size: 0.95rem; font-weight: 800; color: #1e293b; }
    .estante-desc { margin: 0; font-size: 0.76rem; color: #64748b; }
    
    .progress-bar-wrap { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 0.35rem; }
    .progress-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
    .progress-footer { display: flex; justify-content: space-between; font-size: 0.72rem; color: #64748b; margin-top: 0.15rem; }

    /* SHELF TABS */
    .shelf-tabs { display: flex; gap: 0.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.25rem; overflow-x: auto; }
    .shelf-tab-btn {
      background: transparent;
      border: none;
      border-radius: 0.5rem 0.5rem 0 0;
      padding: 0.6rem 1rem;
      font-size: 0.84rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 3px solid transparent;
      margin-bottom: -0.25rem;
    }
    .shelf-tab-btn:hover { color: #0369a1; background: #f1f5f9; }
    .shelf-tab-btn.active { color: #0369a1; border-bottom-color: #0369a1; background: #f0f9ff; }
    .badge-count { background: #cbd5e1; color: #334155; font-size: 0.72rem; padding: 0.1rem 0.4rem; border-radius: 1rem; font-weight: 800; }
    .shelf-tab-btn.active .badge-count { background: #0369a1; color: #ffffff; }

    /* MATRIZ 3x3 */
    .matrix-container {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .matrix-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .matrix-title { display: flex; align-items: center; gap: 0.75rem; color: #0369a1; }
    .matrix-title h4 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
    .matrix-title p { margin: 0.1rem 0 0; font-size: 0.78rem; color: #64748b; }

    .matrix-legend { display: flex; gap: 1rem; font-size: 0.75rem; color: #475569; }
    .legend-item { display: flex; align-items: center; gap: 0.35rem; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .dot.available { background: #10b981; }
    .dot.occupied { background: #3b82f6; }
    .dot.selected { background: #6366f1; }

    /* GRID 3x3 */
    .slots-grid-3x3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .slot-card {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 0.85rem;
      padding: 1.15rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: all 0.2s ease;
      min-height: 120px;
    }
    .slot-card:hover {
      border-color: #93c5fd;
      background: #f0f9ff;
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.06);
    }
    .slot-card.has-items { border-color: #bfdbfe; background: #ffffff; }
    .slot-card.is-selected { border-color: #0369a1; background: #f0f9ff; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
    .slot-card.is-highlighted { border-color: #f59e0b; background: #fffbeb; animation: pulse 1.5s infinite; }

    .slot-badge { display: flex; justify-content: space-between; align-items: center; }
    .slot-badge strong { font-size: 1.1rem; font-weight: 900; color: #0c4a6e; }
    .slot-count { font-size: 0.84rem; font-weight: 800; color: #0f172a; }
    .slot-sub { font-size: 0.74rem; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .slot-action-indicator {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
      padding-top: 0.35rem;
      border-top: 1px dashed #e2e8f0;
      font-size: 0.72rem;
      font-weight: 700;
      color: #0369a1;
    }

    /* DRAWER MODAL */
    .slot-drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
    }
    .slot-drawer-card {
      background: #ffffff;
      width: 100%;
      max-width: 480px;
      height: 100%;
      box-shadow: -10px 0 25px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      animation: slideInRight 0.25s ease;
    }
    .drawer-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .drawer-tag { background: #f0f9ff; color: #0369a1; font-size: 0.75rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 0.35rem; }
    .drawer-title-box h4 { margin: 0.2rem 0 0; font-size: 1rem; font-weight: 800; color: #0f172a; }
    .drawer-title-box p { margin: 0; font-size: 0.75rem; color: #64748b; }
    .btn-close { background: transparent; border: none; color: #94a3b8; cursor: pointer; }
    
    .drawer-body { padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 0.85rem; }
    .empty-drawer { text-align: center; padding: 3rem 1rem; color: #94a3b8; }
    .empty-drawer h5 { margin: 0.5rem 0 0.2rem; font-size: 1rem; color: #475569; }
    .empty-drawer p { margin: 0; font-size: 0.8rem; }

    .drawer-items-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .drawer-item-card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.65rem;
      padding: 0.75rem 0.9rem;
    }
    .item-icon-tag { font-size: 1.25rem; }
    .item-content { flex: 1; min-width: 0; }
    .item-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem; }
    .item-mod-badge { background: #e2e8f0; color: #334155; font-size: 0.68rem; font-weight: 800; padding: 0.1rem 0.35rem; border-radius: 0.25rem; }
    .item-code-text { font-size: 0.76rem; color: #0369a1; font-weight: 800; }
    .item-title { margin: 0; font-size: 0.84rem; font-weight: 700; color: #0f172a; line-height: 1.3; }

    .drawer-footer { padding: 1rem 1.5rem; border-top: 1px solid #f1f5f9; background: #f8fafc; display: flex; justify-content: flex-end; }

    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
    }

    @media (max-width: 768px) {
      .slots-grid-3x3 { grid-template-columns: 1fr; }
    }
  `,
  ],
})
export class VoxelseraScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);

  readonly icons = {
    Archive: LucideArchive,
    BookOpen: LucideBookOpen,
    Check: LucideCheck,
    ChevronRight: LucideChevronRight,
    Eye: LucideEye,
    FileText: LucideFileText,
    Folder: LucideFolder,
    Layers: LucideLayers,
    Search: LucideSearch,
    Users: LucideUsers,
    X: LucideX,
  };

  readonly estantes: EstanteInfo[] = [
    {
      id: 'A',
      nombre: 'Estante A — Minutas de Vigilancia',
      subtitulo: 'Libros de servicio, control de visitantes y correspondencia',
      modulo: 'MINUTAS',
      color: '#0369a1',
      icon: 'FileText',
    },
    {
      id: 'B',
      nombre: 'Estante B — Asociados Retirados',
      subtitulo: 'Expedientes laborales de bajas, paz y salvos y hojas de vida',
      modulo: 'ASOCIADOS RETIRADOS',
      color: '#10b981',
      icon: 'Users',
    },
    {
      id: 'C',
      nombre: 'Estante C — Contratos y Convenios',
      subtitulo: 'Contratos comerciales de vigilancia, pólizas y convenios CTA',
      modulo: 'CONTRATOS',
      color: '#f59e0b',
      icon: 'BookOpen',
    },
    {
      id: 'D',
      nombre: 'Estante D — Correspondencia y Salida Libre',
      subtitulo: 'Paquetería del día y compartimentos de custodia temporal',
      modulo: 'CORRESPONDENCIA',
      color: '#6366f1',
      icon: 'Archive',
    },
  ];

  readonly slots = signal<Record<string, VoxelSlot>>({});
  readonly loading = signal(true);
  readonly selectedEstante = signal<'A' | 'B' | 'C' | 'D'>('A');
  readonly selectedSlot = signal<VoxelSlot | null>(null);

  searchQuery = '';

  readonly currentEstanteInfo = computed(() => {
    const id = this.selectedEstante();
    return this.estantes.find((e) => e.id === id) || this.estantes[0];
  });

  readonly currentSlots = computed<VoxelSlot[]>(() => {
    const est = this.selectedEstante();
    const map = this.slots();
    const result: VoxelSlot[] = [];

    for (let i = 1; i <= 9; i++) {
      const key = `VOXEL_${est}${i}`;
      if (map[key]) {
        result.push(map[key]);
      } else {
        result.push({
          slotId: key,
          code: `${est}${i}`,
          count: 0,
          items: [],
        });
      }
    }
    return result;
  });

  ngOnInit(): void {
    this.loadMap();
  }

  loadMap(): void {
    this.loading.set(true);
    this.api.voxelseraMap().subscribe({
      next: (res) => {
        this.slots.set((res.slots as unknown as Record<string, VoxelSlot>) ?? {});
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getEstanteTotal(est: 'A' | 'B' | 'C' | 'D'): number {
    const map = this.slots();
    let total = 0;
    for (let i = 1; i <= 9; i++) {
      const key = `VOXEL_${est}${i}`;
      if (map[key]) total += map[key].count;
    }
    return total;
  }

  getEstantePct(est: 'A' | 'B' | 'C' | 'D'): number {
    const map = this.slots();
    let occupiedSlots = 0;
    for (let i = 1; i <= 9; i++) {
      const key = `VOXEL_${est}${i}`;
      if (map[key] && map[key].count > 0) occupiedSlots++;
    }
    return Math.round((occupiedSlots / 9) * 100);
  }

  openSlotDetails(slot: VoxelSlot): void {
    this.selectedSlot.set(slot);
  }

  getItemEmoji(modulo: string): string {
    switch (modulo) {
      case 'MINUTAS': return 'MN';
      case 'ASOCIADOS RETIRADOS': return 'AR';
      case 'CONTRATOS': return 'CT';
      case 'CORRESPONDENCIA': return 'CR';
      default: return 'DC';
    }
  }

  onSearchChange(): void {
    if (!this.searchQuery.trim()) return;
    const q = this.searchQuery.toLowerCase().trim();
    const map = this.slots();

    for (const key of Object.keys(map)) {
      const s = map[key];
      const match = s.items.some(
        (it) =>
          it.titulo.toLowerCase().includes(q) ||
          (it.codigo && it.codigo.toLowerCase().includes(q)),
      );
      if (match) {
        const estanteLetter = key.replace('VOXEL_', '').charAt(0) as 'A' | 'B' | 'C' | 'D';
        if (['A', 'B', 'C', 'D'].includes(estanteLetter)) {
          this.selectedEstante.set(estanteLetter);
          break;
        }
      }
    }
  }

  isSlotHighlighted(slotId: string): boolean {
    if (!this.searchQuery.trim()) return false;
    const q = this.searchQuery.toLowerCase().trim();
    const s = this.slots()[slotId];
    if (!s) return false;
    return s.items.some(
      (it) =>
        it.titulo.toLowerCase().includes(q) ||
        (it.codigo && it.codigo.toLowerCase().includes(q)),
    );
  }

  clearSearch(): void {
    this.searchQuery = '';
  }
}
