import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  LucideBoxes,
  LucideCalendarClock,
  LucideClipboardList,
  LucideFileText,
  LucideHistory,
  LucideLayoutGrid,
  LucidePrinter,
  LucideRefreshCw,
  LucideSearch,
  LucideShieldCheck,
  LucideTrash2,
  LucideUsersRound,
  LucideX,
} from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';
import { Icon } from '../../../shared/components/icon/icon';
import { DocumentalApiService } from '../documental-api.service';
import {
  LoteHistorial,
  RotuloItem,
  addToPrintQueue,
  clearPrintQueue,
  getBatchesHistory,
  getPrintQueue,
  printQueue,
  printSpecificBatch,
  removeFromPrintQueue,
  restoreBatchToQueue,
} from '../rotulo-print';

@Component({
  selector: 'app-documental-layout',
  imports: [RouterOutlet, ModuleShell, Icon],
  template: `
    <app-module-shell
      title="Gestión Documental"
      subtitle="SGD Coraza — correspondencia, minutas, contratos, préstamos y archivo físico."
      [nav]="nav"
    >
      <!-- BOTÓN TOPBAR DE ACCIÓN RÁPIDA: COLA DE IMPRESIÓN (AHORRO DE PAPEL) -->
      <button
        moduleActions
        type="button"
        class="queue-topbar-btn"
        (click)="openModal()"
        title="Cola de impresión y reimpresión de lotes"
      >
        <app-icon [icon]="icons.Printer" [size]="16" [strokeWidth]="2" />
        <span class="queue-text">Cola de Tiras</span>
        <span class="queue-badge" [class.has-items]="queueCount() > 0">{{ queueCount() }}</span>
      </button>

      <router-outlet />
    </app-module-shell>

    <!-- MODAL DE COLA Y REIMPRESIÓN DE LOTES (AHORRO DE PAPEL) -->
    @if (modalOpen()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <div class="print-icon-box">
                <app-icon [icon]="icons.Printer" [size]="20" [strokeWidth]="2" />
              </div>
              <div>
                <h3>Centro de Impresión y Reimpresión de Rótulos</h3>
                <p>Imprime lotes en 1 sola hoja de papel o reimprime lotes anteriores guardados.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeModal()" aria-label="Cerrar">
              <app-icon [icon]="icons.X" [size]="18" [strokeWidth]="2" />
            </button>
          </div>

          <!-- TABS DEL MODAL -->
          <div class="modal-tabs">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'current'"
              (click)="activeTab.set('current')"
            >
              <app-icon [icon]="icons.Printer" [size]="14" [strokeWidth]="2" />
              <span>Cola Actual ({{ queueItems().length }})</span>
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'history'"
              (click)="activeTab.set('history')"
            >
              <app-icon [icon]="icons.History" [size]="14" [strokeWidth]="2" />
              <span>Historial de Lotes ({{ batchesHistory().length }})</span>
            </button>
          </div>

          <div class="modal-body">
            @if (activeTab() === 'current') {
              @if (queueItems().length === 0) {
                <div class="empty-queue">
                  <div class="empty-icon">📄</div>
                  <strong>La cola de impresión está vacía</strong>
                  <p>Cada vez que registres una Minuta, Contrato o Asociado (o pulses el botón "🏷️ Rótulo" en cualquier tabla), se guardará aquí automáticamente para imprimir en lote.</p>
                  <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:1rem;flex-wrap:wrap;">
                    <button type="button" class="btn-goto-history" (click)="loadRecentMinutes()" [disabled]="loadingRecent()">
                      <app-icon [icon]="icons.Refresh" [size]="14" [strokeWidth]="2" />
                      {{ loadingRecent() ? 'Cargando...' : '📥 Cargar Minutas Registradas a la Cola' }}
                    </button>
                    @if (batchesHistory().length > 0) {
                      <button type="button" class="btn-goto-history" (click)="activeTab.set('history')">
                        <app-icon [icon]="icons.History" [size]="14" [strokeWidth]="2" />
                        Ver lotes anteriores para reimprimir
                      </button>
                    }
                  </div>
                </div>
              } @else {
                <div class="queue-status-bar">
                  <span><strong>{{ queueItems().length }}</strong> tira(s) lista(s) para imprimir en lote:</span>
                  <button type="button" class="btn-clear" (click)="clearAll()">
                    <app-icon [icon]="icons.Trash" [size]="13" [strokeWidth]="2" />
                    Vaciar Cola
                  </button>
                </div>

                <div class="queue-list">
                  @for (it of queueItems(); track it.id; let idx = $index) {
                    <div class="queue-item">
                      <div class="item-info">
                        <span class="item-badge" [attr.data-mod]="it.modulo">{{ it.modulo }}</span>
                        <strong class="item-code">#{{ it.codigo }}</strong>
                        <span class="item-title">{{ it.titulo }}</span>
                        @if (it.slotFisico) {
                          <span class="item-slot">📍 {{ it.slotFisico }}</span>
                        }
                      </div>
                      <button type="button" class="btn-remove" (click)="removeItem(idx)" title="Quitar de la cola">
                        <app-icon [icon]="icons.X" [size]="14" [strokeWidth]="2" />
                      </button>
                    </div>
                  }
                </div>
              }
            } @else {
              <!-- HISTORIAL DE LOTES IMPRESOS PARA REIMPRIMIR -->
              @if (batchesHistory().length === 0) {
                <div class="empty-queue">
                  <div class="empty-icon">🕒</div>
                  <strong>No hay lotes previos en el historial</strong>
                  <p>Cuando imprimas tu primer lote de rótulos, quedará guardado aquí automáticamente para que puedas reimprimirlo cuando quieras.</p>
                </div>
              } @else {
                <div class="history-list">
                  @for (batch of batchesHistory(); track batch.id) {
                    <div class="history-card">
                      <div class="history-card-head">
                        <div class="history-card-title">
                          <span class="history-badge">Lote #{{ batch.id.replace('lote_', '') }}</span>
                          <span class="history-date">📅 {{ batch.fecha }}</span>
                          <span class="history-count">📄 {{ batch.cantidad }} rótulos</span>
                        </div>
                        <div class="history-actions">
                          <button
                            type="button"
                            class="btn-reprint"
                            (click)="reprintBatch(batch)"
                            title="Reimprimir este lote ahora mismo"
                          >
                            <app-icon [icon]="icons.Printer" [size]="14" [strokeWidth]="2" />
                            Reimprimir Lote
                          </button>
                          <button
                            type="button"
                            class="btn-restore"
                            (click)="restoreBatch(batch.id)"
                            title="Cargar estos documentos de nuevo a la cola actual"
                          >
                            <app-icon [icon]="icons.Refresh" [size]="13" [strokeWidth]="2" />
                            Restaurar a Cola
                          </button>
                        </div>
                      </div>
                      <div class="history-items-chips">
                        @for (item of batch.items; track item.id) {
                          <span class="history-chip">
                            <strong>#{{ item.codigo }}</strong> {{ item.titulo }}
                          </span>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            }
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" (click)="closeModal()">Cerrar</button>
            @if (activeTab() === 'current') {
              <button
                type="button"
                class="btn-print-all"
                [disabled]="queueItems().length === 0"
                (click)="printAll()"
              >
                <app-icon [icon]="icons.Printer" [size]="16" [strokeWidth]="2" />
                Imprimir Hoja Completa ({{ queueItems().length }} Tiras)
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .queue-topbar-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 0.65rem;
      padding: 0.45rem 0.85rem;
      font-weight: 700;
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .queue-topbar-btn:hover {
      background: #dbeafe;
      border-color: #93c5fd;
      transform: translateY(-1px);
    }
    .queue-text { font-weight: 700; }
    .queue-badge {
      background: #94a3b8;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      min-width: 20px;
      text-align: center;
    }
    .queue-badge.has-items {
      background: #2563eb;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
    }

    /* MODAL */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .modal-card {
      background: #ffffff;
      border-radius: 1.25rem;
      width: 100%;
      max-width: 680px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      max-height: 88vh;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .modal-title-wrap { display: flex; align-items: center; gap: 0.85rem; }
    .print-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #eff6ff;
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-header h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
    .modal-header p { margin: 0.15rem 0 0; font-size: 0.78rem; color: #64748b; }
    .btn-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 0.4rem;
      display: flex;
      align-items: center;
    }
    .btn-close:hover { background: #f1f5f9; color: #0f172a; }

    /* TABS */
    .modal-tabs {
      display: flex;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      padding: 0 1.5rem;
      gap: 0.5rem;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 0.75rem 0.95rem;
      font-size: 0.85rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab-btn:hover { color: #0f172a; }
    .tab-btn.active {
      color: #2563eb;
      border-bottom-color: #2563eb;
      background: #ffffff;
    }

    .modal-body {
      padding: 1.25rem 1.5rem;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .empty-queue {
      text-align: center;
      padding: 2.5rem 1.5rem;
      background: #f8fafc;
      border-radius: 0.85rem;
      border: 1px dashed #cbd5e1;
    }
    .empty-icon { font-size: 2.2rem; margin-bottom: 0.5rem; }
    .empty-queue strong { display: block; font-size: 0.95rem; color: #334155; margin-bottom: 0.3rem; }
    .empty-queue p { margin: 0; font-size: 0.82rem; color: #64748b; max-width: 420px; margin: 0 auto; line-height: 1.4; }
    .btn-goto-history {
      margin-top: 1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #ffffff;
      border: 1px solid #bfdbfe;
      color: #2563eb;
      padding: 0.45rem 0.85rem;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-goto-history:hover { background: #eff6ff; }

    .queue-status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: #334155;
    }
    .btn-clear {
      background: transparent;
      border: 1px solid #fca5a5;
      color: #dc2626;
      border-radius: 0.4rem;
      padding: 0.25rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .btn-clear:hover { background: #fee2e2; }

    .queue-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .queue-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.65rem;
      padding: 0.65rem 0.85rem;
      gap: 0.75rem;
    }
    .item-info { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; flex: 1; }
    .item-badge {
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 0.15rem 0.45rem;
      border-radius: 0.35rem;
      background: #e2e8f0;
      color: #475569;
    }
    .item-badge[data-mod='MINUTAS'] { background: #dbeafe; color: #1e40af; }
    .item-badge[data-mod='CONTRATOS'] { background: #e0e7ff; color: #3730a3; }
    .item-badge[data-mod='PERSONAL'] { background: #fef3c7; color: #92400e; }
    .item-code { color: #2563eb; font-size: 0.92rem; }
    .item-title { font-size: 0.85rem; font-weight: 600; color: #0f172a; }
    .item-slot { font-size: 0.75rem; color: #64748b; background: #f1f5f9; padding: 0.1rem 0.4rem; border-radius: 0.3rem; }
    
    .btn-remove {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 0.35rem;
      display: flex;
      align-items: center;
    }
    .btn-remove:hover { background: #fee2e2; color: #ef4444; }

    /* HISTORIAL CARDS */
    .history-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .history-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .history-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .history-card-title { display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap; }
    .history-badge { font-size: 0.72rem; font-weight: 800; background: #f1f5f9; color: #334155; padding: 0.15rem 0.45rem; border-radius: 0.35rem; }
    .history-date { font-size: 0.78rem; color: #64748b; font-weight: 600; }
    .history-count { font-size: 0.78rem; font-weight: 700; color: #2563eb; }
    .history-actions { display: flex; align-items: center; gap: 0.4rem; }
    .btn-reprint {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #1e40af;
      color: #ffffff;
      border: none;
      border-radius: 0.45rem;
      padding: 0.35rem 0.7rem;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-reprint:hover { background: #1e3a8a; }
    .btn-restore {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #475569;
      border-radius: 0.45rem;
      padding: 0.35rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-restore:hover { background: #f1f5f9; }
    .history-items-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .history-chip {
      font-size: 0.72rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.15rem 0.45rem;
      border-radius: 0.35rem;
      color: #334155;
    }
    .history-chip strong { color: #2563eb; }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
    }
    .btn-cancel {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      border-radius: 0.55rem;
      padding: 0.55rem 1rem;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .btn-cancel:hover { background: #f1f5f9; }
    
    .btn-print-all {
      border: none;
      background: #1e3a8a;
      color: #ffffff;
      border-radius: 0.55rem;
      padding: 0.55rem 1.25rem;
      font-weight: 800;
      font-size: 0.88rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      transition: background 0.2s;
    }
    .btn-print-all:hover { background: #172554; }
    .btn-print-all:disabled { background: #94a3b8; cursor: not-allowed; }
  `,
})
export class DocumentalLayout implements OnInit {
  readonly icons = {
    Printer: LucidePrinter,
    Trash: LucideTrash2,
    X: LucideX,
    History: LucideHistory,
    Refresh: LucideRefreshCw,
  };

  readonly nav: ModuleNavItem[] = [
    { label: 'Panel', route: '/documental', exact: true, permission: 'documental.view', icon: LucideLayoutGrid },
    { label: 'Correspondencia', route: '/documental/correspondencia', permission: 'documental.view', icon: LucideFileText },
    { label: 'Minutas', route: '/documental/minutas', permission: 'documental.view', icon: LucideClipboardList },
    { label: 'Asociados Retirados', route: '/documental/asociados', permission: 'documental.view', icon: LucideUsersRound },
    { label: 'Contratos', route: '/documental/contratos', permission: 'documental.view', icon: LucideShieldCheck },
    { label: 'Préstamos', route: '/documental/prestamos', permission: 'documental.view', icon: LucideCalendarClock },
    { label: 'Biblioteca', route: '/documental/biblioteca', permission: 'documental.view', icon: LucideBoxes },
    { label: 'VOXELSERA', route: '/documental/voxelsera', permission: 'documental.view', icon: LucideBoxes },
    { label: 'Buscador Universal', route: '/documental/buscador', permission: 'documental.view', icon: LucideSearch },
    { label: 'Informes', route: '/documental/informes', permission: 'documental.view', icon: LucideClipboardList },
  ];

  readonly modalOpen = signal(false);
  readonly activeTab = signal<'current' | 'history'>('current');
  readonly queueItems = signal<Array<RotuloItem & { id: string }>>([]);
  readonly queueCount = signal(0);
  readonly batchesHistory = signal<LoteHistorial[]>([]);
  readonly loadingRecent = signal(false);

  private readonly api = inject(DocumentalApiService);

  ngOnInit(): void {
    this.refreshQueue();
    // Si la cola está vacía, precargar automáticamente los registros recientes para que siempre haya datos listos
    if (this.queueCount() === 0) {
      this.loadRecentMinutes();
    }
    window.addEventListener('storage', () => this.refreshQueue());
  }

  refreshQueue(): void {
    const items = getPrintQueue();
    this.queueItems.set(items);
    this.queueCount.set(items.length);
    this.batchesHistory.set(getBatchesHistory());
  }

  loadRecentMinutes(): void {
    this.loadingRecent.set(true);
    this.api.listMinutes().subscribe({
      next: (minutas) => {
        minutas.slice(0, 8).forEach((m) => {
          addToPrintQueue({
            id: m.id,
            modulo: 'MINUTAS',
            codigo: m.uniqueCode || String(m.numericCode ?? m.id),
            titulo: m.postName || 'MINUTA',
            fechas: `${m.startDate || ''} -- ${m.closeDate || ''}`,
            slotFisico: m.voxelsera || 'Estante A',
          });
        });
        this.loadingRecent.set(false);
        this.refreshQueue();
      },
      error: () => this.loadingRecent.set(false),
    });
  }

  openModal(): void {
    this.refreshQueue();
    this.activeTab.set('current');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  removeItem(idx: number): void {
    removeFromPrintQueue(idx);
    this.refreshQueue();
  }

  clearAll(): void {
    clearPrintQueue();
    this.refreshQueue();
  }

  printAll(): void {
    printQueue(false); // NO borra la cola automáticamente
    this.refreshQueue();
  }

  reprintBatch(batch: LoteHistorial): void {
    printSpecificBatch(batch.items);
  }

  restoreBatch(batchId: string): void {
    restoreBatchToQueue(batchId);
    this.refreshQueue();
    this.activeTab.set('current');
  }
}
