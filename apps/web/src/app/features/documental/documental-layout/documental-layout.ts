import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideBoxes,
  LucideCalendarClock,
  LucideClipboardList,
  LucideFileText,
  LucideLayoutGrid,
  LucidePrinter,
  LucideSearch,
  LucideShieldCheck,
  LucideTrash2,
  LucideUsersRound,
  LucideX,
} from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';
import { Icon } from '../../../shared/components/icon/icon';
import {
  RotuloItem,
  clearPrintQueue,
  getPrintQueue,
  printQueue,
  removeFromPrintQueue,
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
        title="Cola de impresión de tiras y rótulos (Ahorro de Papel)"
      >
        <app-icon [icon]="icons.Printer" [size]="16" [strokeWidth]="2" />
        <span class="queue-text">Cola de Tiras</span>
        <span class="queue-badge" [class.has-items]="queueCount() > 0">{{ queueCount() }}</span>
      </button>

      <router-outlet />
    </app-module-shell>

    <!-- MODAL DE COLA DE IMPRESIÓN (AHORRO DE PAPEL) -->
    @if (modalOpen()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <div class="print-icon-box">
                <app-icon [icon]="icons.Printer" [size]="20" [strokeWidth]="2" />
              </div>
              <div>
                <h3>Cola de Impresión de Tiras (Ahorro de Papel)</h3>
                <p>Acumula los rótulos registrados para imprimirlos todos juntos en 1 sola hoja de papel.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeModal()" aria-label="Cerrar">
              <app-icon [icon]="icons.X" [size]="18" [strokeWidth]="2" />
            </button>
          </div>

          <div class="modal-body">
            @if (queueItems().length === 0) {
              <div class="empty-queue">
                <div class="empty-icon">📄</div>
                <strong>La cola de impresión está vacía</strong>
                <p>Cada vez que registres una Minuta, Contrato o Asociado, se guardará aquí automáticamente para imprimir todo junto en lote.</p>
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
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" (click)="closeModal()">Cerrar</button>
            <button
              type="button"
              class="btn-print-all"
              [disabled]="queueItems().length === 0"
              (click)="printAll()"
            >
              <app-icon [icon]="icons.Printer" [size]="16" [strokeWidth]="2" />
              Imprimir Hoja Completa ({{ queueItems().length }} Tiras)
            </button>
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
    .queue-badge {
      background: #94a3b8;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 900;
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
      max-width: 620px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      max-height: 85vh;
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
    { label: 'Workflows', route: '/documental/workflows', permission: 'documental.view', icon: LucideBell },
    { label: 'TRD', route: '/documental/trd', permission: 'documental.view', icon: LucideFileText },
    { label: 'Buscador Universal', route: '/documental/buscador', permission: 'documental.view', icon: LucideSearch },
    { label: 'Informes', route: '/documental/informes', permission: 'documental.view', icon: LucideClipboardList },
  ];

  readonly modalOpen = signal(false);
  readonly queueItems = signal<Array<RotuloItem & { id: string }>>([]);
  readonly queueCount = signal(0);

  ngOnInit(): void {
    this.refreshQueue();
    // Escuchar cambios periódicos en la cola
    window.addEventListener('storage', () => this.refreshQueue());
  }

  refreshQueue(): void {
    const items = getPrintQueue();
    this.queueItems.set(items);
    this.queueCount.set(items.length);
  }

  openModal(): void {
    this.refreshQueue();
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
    printQueue();
    this.refreshQueue();
    this.closeModal();
  }
}
