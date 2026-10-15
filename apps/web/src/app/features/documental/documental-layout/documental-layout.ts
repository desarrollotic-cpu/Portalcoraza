import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  LucideHistory,
  LucidePrinter,
  LucideRefreshCw,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { DOCUMENTAL_NAV } from '../../../layouts/main-layout/portal-nav';
import { ModuleShell } from '../../../shared/components/module-shell/module-shell';
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
      @if (canPrintQueue()) {
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
      }

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
                <p>Imprime directo a la Niimbot B1 por Bluetooth (Chrome o Edge). No uses Imprimir del navegador: gasta el rollo en papel 800 mm.</p>
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
                  <div class="empty-icon" aria-hidden="true">—</div>
                  <strong>La cola de impresión está vacía</strong>
                  <p>Cada vez que registres una Minuta, Contrato, Correspondencia o Asociado (o pulses el botón "Rótulo" en cualquier tabla), se guardará aquí automáticamente para imprimir en lote.</p>
                  <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:1rem;flex-wrap:wrap;">
                    <button type="button" class="btn-goto-history" (click)="loadRecentMinutes()" [disabled]="loadingRecent()">
                      <app-icon [icon]="icons.Refresh" [size]="14" [strokeWidth]="2" />
                      {{ loadingRecent() ? 'Cargando...' : 'Cargar minutas registradas a la cola' }}
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
                          <span class="item-slot">{{ it.slotFisico }}</span>
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
                  <div class="empty-icon" aria-hidden="true">—</div>
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
                          <span class="history-date">{{ batch.fecha }}</span>
                          <span class="history-count">{{ batch.cantidad }} rótulos</span>
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
                Imprimir en Niimbot B1 ({{ queueItems().length }})
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
      background: color-mix(in srgb, var(--primary-600) 12%, var(--surface));
      color: #0d429c;
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
      background: color-mix(in srgb, var(--primary-600) 18%, var(--surface));
      border-color: #93c5fd;
      transform: translateY(-1px);
    }
    .queue-text { font-weight: 700; }
    .queue-badge {
      background: var(--neutral-400);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      min-width: 20px;
      text-align: center;
    }
    .queue-badge.has-items {
      background: #0d429c;
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
      background: var(--surface);
      border-radius: 1.25rem;
      width: 100%;
      max-width: 680px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      border: 1px solid var(--neutral-200);
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
      border-bottom: 1px solid var(--neutral-100);
    }
    .modal-title-wrap { display: flex; align-items: center; gap: 0.85rem; }
    .print-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--primary-600) 12%, var(--surface));
      color: #0d429c;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-header h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--neutral-900); }
    .modal-header p { margin: 0.15rem 0 0; font-size: 0.78rem; color: var(--neutral-500); }
    .btn-close {
      background: transparent;
      border: none;
      color: var(--neutral-400);
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 0.4rem;
      display: flex;
      align-items: center;
    }
    .btn-close:hover { background: var(--neutral-100); color: var(--neutral-900); }

    /* TABS */
    .modal-tabs {
      display: flex;
      border-bottom: 1px solid var(--neutral-200);
      background: var(--neutral-50);
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
      color: var(--neutral-500);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab-btn:hover { color: var(--neutral-900); }
    .tab-btn.active {
      color: #0d429c;
      border-bottom-color: #0d429c;
      background: var(--surface);
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
      background: var(--neutral-50);
      border-radius: 0.85rem;
      border: 1px dashed var(--neutral-300);
    }
    .empty-icon { font-size: 2.2rem; margin-bottom: 0.5rem; }
    .empty-queue strong { display: block; font-size: 0.95rem; color: var(--neutral-700); margin-bottom: 0.3rem; }
    .empty-queue p { margin: 0; font-size: 0.82rem; color: var(--neutral-500); max-width: 420px; margin: 0 auto; line-height: 1.4; }
    .btn-goto-history {
      margin-top: 1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: var(--surface);
      border: 1px solid #bfdbfe;
      color: #0d429c;
      padding: 0.45rem 0.85rem;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-goto-history:hover { background: color-mix(in srgb, var(--primary-600) 12%, var(--surface)); }

    .queue-status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: var(--neutral-700);
    }
    .btn-clear {
      background: transparent;
      border: 1px solid color-mix(in srgb, var(--error-500) 35%, var(--surface));
      color: var(--error-600);
      border-radius: 0.4rem;
      padding: 0.25rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .btn-clear:hover { background: color-mix(in srgb, var(--error-500) 16%, var(--surface)); }

    .queue-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .queue-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--neutral-50);
      border: 1px solid var(--neutral-200);
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
      background: var(--neutral-200);
      color: var(--neutral-600);
    }
    .item-badge[data-mod='MINUTAS'] { background: var(--primary-50); color: var(--primary-700); }
    .item-badge[data-mod='CONTRATOS'] { background: color-mix(in srgb, #0035eb 14%, var(--surface)); color: #3730a3; }
    .item-badge[data-mod='PERSONAL'] { background: color-mix(in srgb, var(--warning-500) 16%, var(--surface)); color: var(--warning-600); }
    .item-badge[data-mod='CORRESPONDENCIA'] { background: color-mix(in srgb, var(--primary-600) 18%, var(--surface)); color: #0d429c; }
    .item-code { color: #0d429c; font-size: 0.92rem; }
    .item-title { font-size: 0.85rem; font-weight: 600; color: var(--neutral-900); }
    .item-slot { font-size: 0.75rem; color: var(--neutral-500); background: var(--neutral-100); padding: 0.1rem 0.4rem; border-radius: 0.3rem; }
    
    .btn-remove {
      background: transparent;
      border: none;
      color: var(--neutral-400);
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 0.35rem;
      display: flex;
      align-items: center;
    }
    .btn-remove:hover { background: color-mix(in srgb, var(--error-500) 16%, var(--surface)); color: var(--error-500); }

    /* HISTORIAL CARDS */
    .history-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .history-card {
      background: var(--surface);
      border: 1px solid var(--neutral-200);
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
    .history-badge { font-size: 0.72rem; font-weight: 800; background: var(--neutral-100); color: var(--neutral-700); padding: 0.15rem 0.45rem; border-radius: 0.35rem; }
    .history-date { font-size: 0.78rem; color: var(--neutral-500); font-weight: 600; }
    .history-count { font-size: 0.78rem; font-weight: 700; color: #0d429c; }
    .history-actions { display: flex; align-items: center; gap: 0.4rem; }
    .btn-reprint {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--primary-600);
      color: #ffffff;
      border: none;
      border-radius: 0.45rem;
      padding: 0.35rem 0.7rem;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-reprint:hover { background: var(--primary-700, #043383); }
    .btn-restore {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: var(--neutral-50);
      border: 1px solid var(--neutral-300);
      color: var(--neutral-600);
      border-radius: 0.45rem;
      padding: 0.35rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-restore:hover { background: var(--neutral-100); }
    .history-items-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .history-chip {
      font-size: 0.72rem;
      background: var(--neutral-50);
      border: 1px solid var(--neutral-200);
      padding: 0.15rem 0.45rem;
      border-radius: 0.35rem;
      color: var(--neutral-700);
    }
    .history-chip strong { color: #0d429c; }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--neutral-100);
      background: var(--neutral-50);
    }
    .btn-cancel {
      border: 1px solid var(--neutral-300);
      background: var(--surface);
      color: var(--neutral-600);
      border-radius: 0.55rem;
      padding: 0.55rem 1rem;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .btn-cancel:hover { background: var(--neutral-100); }
    
    .btn-print-all {
      border: none;
      background: var(--primary-600, #0d429c);
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
    .btn-print-all:hover { background: var(--primary-700, #043383); }
    .btn-print-all:disabled { background: var(--neutral-400); cursor: not-allowed; }
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

  readonly nav = DOCUMENTAL_NAV;

  readonly modalOpen = signal(false);
  readonly activeTab = signal<'current' | 'history'>('current');
  readonly queueItems = signal<Array<RotuloItem & { id: string }>>([]);
  readonly queueCount = signal(0);
  readonly batchesHistory = signal<LoteHistorial[]>([]);
  readonly loadingRecent = signal(false);

  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  canPrintQueue(): boolean {
    return this.auth.hasPermission('documental.view');
  }

  ngOnInit(): void {
    if (
      !this.auth.hasPermission('documental.view') &&
      this.auth.hasPermission('documental.loans')
    ) {
      const path = this.router.url.split('?')[0];
      if (path === '/documental' || path === '/documental/') {
        void this.router.navigate(['/documental/prestamos']);
        return;
      }
    }
    if (!this.auth.hasPermission('documental.view')) {
      return;
    }
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
