import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideCheck,
  LucideClock,
  LucideCopy,
  LucideExternalLink,
  LucideEye,
  LucideFileText,
  LucideMail,
  LucidePlus,
  LucideQrCode,
  LucideX,
} from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import { Icon } from '../../../shared/components/icon/icon';
import { DocumentalApiService, Loan } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

@Component({
  selector: 'app-doc-loans',
  imports: [FormsModule, Icon],
  template: `
    <div class="loans-container">
      <!-- HEADER Y ACCIONES PRINCIPALES -->
      <div class="toolbar">
        <div>
          <h3>Préstamos de Documentos y Custodia</h3>
          <p class="muted">Control de salida física de expedientes, solicitudes públicas, notificaciones de vencimiento y devoluciones.</p>
        </div>
        <div class="header-btns">
          <button type="button" class="btn-qr-share" (click)="openQrModal()">
            <app-icon [icon]="icons.QrCode" [size]="16" [strokeWidth]="2" />
            <span>Enlace / QR Público</span>
          </button>
          @if (canCreate()) {
            <button class="btn-primary" (click)="toggle()">
              <app-icon [icon]="showForm() ? icons.X : icons.Plus" [size]="16" [strokeWidth]="2" />
              <span>{{ showForm() ? 'Cerrar Formulario' : 'Nuevo Préstamo' }}</span>
            </button>
          }
        </div>
      </div>

      <!-- BANNER DE ENLACE PÚBLICO COMPARTIBLE -->
      <div class="public-link-banner">
        <div class="banner-left">
          <div class="qr-icon-circle">
            <app-icon [icon]="icons.QrCode" [size]="20" [strokeWidth]="2" />
          </div>
          <div>
            <strong>Enlace Público de Solicitud de Préstamos (Sin Login)</strong>
            <p>El solicitante ingresa su correo y el sistema le notificará automáticamente desde <strong>Documental&#64;corazaseguridadcta.com</strong> cuando venza la fecha.</p>
          </div>
        </div>
        <div class="banner-actions">
          <button type="button" class="btn-banner-action" (click)="copyPublicLink()">
            <app-icon [icon]="copied() ? icons.Check : icons.Copy" [size]="14" [strokeWidth]="2" />
            <span>{{ copied() ? '¡Copiado!' : 'Copiar Enlace' }}</span>
          </button>
          <button type="button" class="btn-banner-action primary" (click)="openQrModal()">
            <app-icon [icon]="icons.QrCode" [size]="14" [strokeWidth]="2" />
            <span>Ver Código QR</span>
          </button>
        </div>
      </div>

      <!-- ALERTAS DE SOLICITUDES PENDIENTES -->
      @if (pendingCount() > 0) {
        <div class="pending-alert-box">
          <div class="alert-icon">⏳</div>
          <div class="alert-content">
            <strong>Hay {{ pendingCount() }} solicitud(es) pública(s) pendiente(s) de aprobación</strong>
            <p>Revisa la disponibilidad del expediente y pulsa Aprobar o Rechazar.</p>
          </div>
        </div>
      }

      @if (emailStatusMsg()) {
        <div class="email-toast">
          {{ emailStatusMsg() }}
        </div>
      }

      <!-- FORMULARIO DE REGISTRO MANUAL DE PRÉSTAMO -->
      @if (showForm()) {
        <form class="card form-loan" (ngSubmit)="save()">
          <div class="form-title">
            <app-icon [icon]="icons.FileText" [size]="18" [strokeWidth]="2" />
            <h4>Registrar Préstamo Directo</h4>
          </div>
          <div class="form-grid">
            <label>
              <span>Solicitante *</span>
              <input [(ngModel)]="model.requester" name="requester" required placeholder="Nombre completo del solicitante" />
            </label>
            <label>
              <span>Correo Electrónico (Para Alertas de Vencimiento)</span>
              <input type="email" [(ngModel)]="model.email" name="email" placeholder="Ej: funcionario@corazaseguridadcta.com" />
            </label>
            <label>
              <span>Departamento / Área</span>
              <input [(ngModel)]="model.department" name="department" placeholder="Ej: Operaciones, RRHH..." />
            </label>
            <label>
              <span>Documento / Carpeta Prestada *</span>
              <input [(ngModel)]="model.document" name="document" required placeholder="Ej: Carpeta Contrato #120..." />
            </label>
            <label>
              <span>Código de Documento</span>
              <input [(ngModel)]="model.documentCode" name="documentCode" placeholder="Ej: CTR-120-2026, MIN-VIS-004..." />
            </label>
            <label>
              <span>Fecha de Préstamo *</span>
              <input type="date" [(ngModel)]="model.loanDate" name="loanDate" required />
            </label>
            <label>
              <span>Fecha Estimada de Devolución</span>
              <input type="date" [(ngModel)]="model.returnDate" name="returnDate" />
            </label>
          </div>
          <div class="actions">
            <button type="submit" class="btn-primary" [disabled]="saving()">
              {{ saving() ? 'Guardando...' : 'Registrar Préstamo' }}
            </button>
            <button type="button" class="btn-ghost" (click)="toggle()">Cancelar</button>
            @if (error()) { <span class="error">{{ error() }}</span> }
          </div>
        </form>
      }

      <!-- LISTADO TABLA DE PRÉSTAMOS -->
      @if (loading()) {
        <div class="loading-box"><p>Cargando préstamos...</p></div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Solicitante & Correo</th>
                <th>Área / Dpto</th>
                <th>Documento</th>
                <th>Fecha Préstamo</th>
                <th>Fecha Devolución</th>
                <th>Estado</th>
                <th style="text-align:right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (l of items(); track l.id) {
                <tr [class.row-pending]="l.status === 'PENDIENTE_APROBACION'" [class.row-vencido]="l.status === 'VENCIDO'">
                  <td>
                    <strong>{{ l.requester }}</strong>
                    @if (l.email) {
                      <div class="email-tag">
                        <app-icon [icon]="icons.Mail" [size]="11" [strokeWidth]="2" />
                        <span>{{ l.email }}</span>
                      </div>
                    }
                    @if (l.observations) {
                      <div class="obs-text">{{ l.observations }}</div>
                    }
                  </td>
                  <td>{{ l.department ?? '—' }}</td>
                  <td>
                    <span>{{ l.document ?? '—' }}</span>
                    @if (l.documentCode) {
                      <div class="doc-code-tag">#{{ l.documentCode }}</div>
                    }
                  </td>
                  <td>{{ l.loanDate ?? '—' }}</td>
                  <td>
                    <span>{{ l.returnDate ?? '—' }}</span>
                    @if (l.overdueNotifiedAt) {
                      <div class="notif-badge" title="Notificación de vencimiento enviada">
                         Notificado
                      </div>
                    }
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.ok]="l.status === 'ACTIVO' || l.status === 'DEVUELTO'"
                      [class.crit]="l.status === 'VENCIDO' || l.status === 'RECHAZADO'"
                      [class.warn]="l.status === 'PENDIENTE_APROBACION'"
                    >
                      {{ l.status }}
                    </span>
                  </td>
                  <td style="text-align:right">
                    <div class="btn-group-right">
                      <button type="button" class="btn-act-view" (click)="openDetailModal(l)" title="Ver detalle completo de la solicitud">
                        <app-icon [icon]="icons.Eye" [size]="13" [strokeWidth]="2" />
                        <span>Detalles</span>
                      </button>
                      @if (canManage()) {
                        @if (l.status === 'PENDIENTE_APROBACION') {
                          <button type="button" class="btn-act-approve" (click)="requestApprove(l)" title="Aprobar Solicitud">
                            <app-icon [icon]="icons.Check" [size]="13" [strokeWidth]="2.5" />
                            Aprobar
                          </button>
                          <button type="button" class="btn-act-reject" (click)="requestReject(l)" title="Rechazar Solicitud">
                            <app-icon [icon]="icons.X" [size]="13" [strokeWidth]="2.5" />
                            Rechazar
                          </button>
                        } @else if (l.status === 'RECHAZADO') {
                          <button type="button" class="btn-act-approve" (click)="requestApprove(l)" title="Reconsiderar y Aprobar Solicitud">
                            <app-icon [icon]="icons.Check" [size]="13" [strokeWidth]="2.5" />
                            Aprobar / Confirmar
                          </button>
                          @if (l.email) {
                            <button type="button" class="btn-notify-email" (click)="requestReject(l)" title="Reenviar notificación de rechazo con motivo">
                              <app-icon [icon]="icons.Mail" [size]="12" [strokeWidth]="2" />
                              <span>Notificar</span>
                            </button>
                          }
                        } @else if (l.status === 'ACTIVO' || l.status === 'VENCIDO') {
                          @if (l.email) {
                            <button
                              type="button"
                              class="btn-notify-email"
                              (click)="requestNotify(l)"
                              title="Enviar recordatorio de devolución por correo"
                            >
                              <app-icon [icon]="icons.Mail" [size]="12" [strokeWidth]="2" />
                              <span>Notificar</span>
                            </button>
                          }
                          <button type="button" class="btn-act-reject" (click)="requestReject(l)" title="Rechazar o Anular Préstamo">
                            <app-icon [icon]="icons.X" [size]="13" [strokeWidth]="2.5" />
                            Rechazar
                          </button>
                          <button type="button" class="btn-ghost btn-return" (click)="requestReturn(l)">
                             Devolver
                          </button>
                        }
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="muted" style="text-align:center;padding:2rem">Sin préstamos registrados en el sistema.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- MODAL DE CONFIRMACIÓN CON BOTÓN DE ACEPTAR / CANCELAR -->
    @if (confirmModal(); as cm) {
      <div class="modal-backdrop" (click)="closeConfirmModal()">
        <div class="confirm-modal-card" (click)="$event.stopPropagation()">
          <div class="confirm-modal-header" [class.danger]="cm.type === 'reject'" [class.success]="cm.type === 'approve'" [class.info]="cm.type === 'notify' || cm.type === 'return'">
            <div class="confirm-icon-box">
              @if (cm.type === 'approve') {
                <app-icon [icon]="icons.Check" [size]="24" [strokeWidth]="2.5" />
              } @else if (cm.type === 'reject') {
                <app-icon [icon]="icons.X" [size]="24" [strokeWidth]="2.5" />
              } @else if (cm.type === 'notify') {
                <app-icon [icon]="icons.Mail" [size]="24" [strokeWidth]="2" />
              } @else {
                <app-icon [icon]="icons.FileText" [size]="24" [strokeWidth]="2" />
              }
            </div>
            <div>
              @if (cm.type === 'approve') {
                <h4>¿Confirmar Aprobación de Préstamo?</h4>
                <p>Se autorizará la entrega física del expediente</p>
              } @else if (cm.type === 'reject') {
                <h4>¿Confirmar Rechazo de Solicitud?</h4>
                <p>Se registrará el rechazo y se notificará el motivo</p>
              } @else if (cm.type === 'notify') {
                <h4>¿Confirmar Envío de Notificación?</h4>
                <p>Se enviará el recordatorio por correo electrónico</p>
              } @else {
                <h4>¿Confirmar Devolución Física?</h4>
                <p>Se cerrará el préstamo y se detendrán los avisos</p>
              }
            </div>
            <button type="button" class="btn-close" (click)="closeConfirmModal()">
              <app-icon [icon]="icons.X" [size]="18" [strokeWidth]="2" />
            </button>
          </div>

          <div class="confirm-modal-body">
            <div class="confirm-summary-box">
              <div class="confirm-row">
                <span class="lbl">👤 Solicitante:</span>
                <span class="val">{{ cm.loan.requester }}</span>
              </div>
              <div class="confirm-row">
                <span class="lbl">📄 Expediente:</span>
                <span class="val">{{ cm.loan.document || '—' }}</span>
              </div>
              <div class="confirm-row">
                <span class="lbl">📧 Correo Destino:</span>
                <span class="val" style="color:#0284c7; font-weight:700;">{{ cm.loan.email || '⚠️ Sin correo registrado' }}</span>
              </div>
            </div>

            @if (cm.type === 'reject') {
              <div class="reject-reason-group">
                <label for="rejectReason">Motivo del Rechazo (se incluirá en el correo):</label>
                <textarea
                  id="rejectReason"
                  rows="3"
                  [(ngModel)]="cm.reason"
                  placeholder="Escriba el motivo: ej. Documento en consulta física por auditoría..."
                ></textarea>
              </div>
            }

            <div class="confirm-alert-note">
              @if (cm.loan.email) {
                ℹ️ <strong>Confirmación:</strong> Al pulsar <strong>Aceptar</strong>, el sistema aplicará la acción y despachará el correo a <u>{{ cm.loan.email }}</u>. Si pulsa <strong>Cancelar</strong>, nada será modificado ni enviado.
              } @else {
                ℹ️ Al pulsar <strong>Aceptar</strong>, se aplicará el cambio en el sistema. Si pulsa <strong>Cancelar</strong>, se aborta la operación.
              }
            </div>
          </div>

          <div class="confirm-modal-footer">
            <button type="button" class="btn-ghost" (click)="closeConfirmModal()">
              Cancelar
            </button>
            <button
              type="button"
              class="btn-accept"
              [class.btn-accept-approve]="cm.type === 'approve'"
              [class.btn-accept-reject]="cm.type === 'reject'"
              [class.btn-accept-notify]="cm.type === 'notify'"
              [class.btn-accept-return]="cm.type === 'return'"
              (click)="executeConfirmedAction()"
            >
              @if (cm.type === 'approve') {
                <app-icon [icon]="icons.Check" [size]="15" [strokeWidth]="2.5" />
                <span>Aceptar y Aprobar</span>
              } @else if (cm.type === 'reject') {
                <app-icon [icon]="icons.X" [size]="15" [strokeWidth]="2.5" />
                <span>Aceptar y Rechazar</span>
              } @else if (cm.type === 'notify') {
                <app-icon [icon]="icons.Mail" [size]="15" [strokeWidth]="2" />
                <span>Aceptar y Enviar</span>
              } @else {
                <app-icon [icon]="icons.Check" [size]="15" [strokeWidth]="2" />
                <span>Aceptar y Devolver</span>
              }
            </button>
            @if (cm.loan.email) {
              <button
                type="button"
                class="btn-gmail-direct"
                (click)="openGmailDirect(cm.loan, cm.type, cm.reason)"
                title="Abre la ventana de redacción en tu Gmail listo para enviar y quedar en tu carpeta de Enviados"
              >
                <app-icon [icon]="icons.Mail" [size]="15" [strokeWidth]="2" />
                <span>Abrir en Gmail (Enviados)</span>
              </button>
            }
          </div>
        </div>
      </div>
    }

    <!-- MODAL DE DETALLE COMPLETO DE LA SOLICITUD (OJO DE INSPECCIÓN) -->
    @if (selectedLoan(); as loan) {
      <div class="modal-backdrop" (click)="closeDetailModal()">
        <div class="detail-modal-card" (click)="$event.stopPropagation()">
          <div class="detail-modal-header">
            <div class="detail-title-box">
              <div class="icon-circle-detail">
                <app-icon [icon]="icons.FileText" [size]="22" [strokeWidth]="2" />
              </div>
              <div>
                <h4>Detalle de Solicitud de Préstamo</h4>
                <div class="detail-sub-meta">
                  <span>ID: #{{ loan.id.slice(0, 8) }}</span>
                  <span class="badge" [class.ok]="loan.status === 'ACTIVO' || loan.status === 'DEVUELTO'" [class.crit]="loan.status === 'VENCIDO' || loan.status === 'RECHAZADO'" [class.warn]="loan.status === 'PENDIENTE_APROBACION'">
                    {{ loan.status }}
                  </span>
                </div>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeDetailModal()">
              <app-icon [icon]="icons.X" [size]="18" [strokeWidth]="2" />
            </button>
          </div>

          <div class="detail-modal-body">
            <div class="detail-grid">
              <div class="detail-item full-width">
                <span class="detail-label">👤 Solicitante & Identificación</span>
                <div class="detail-val-strong">{{ loan.requester }}</div>
              </div>

              <div class="detail-item">
                <span class="detail-label">📧 Correo de Contacto / Notificación</span>
                <div class="detail-val">{{ loan.email || 'No registrado' }}</div>
              </div>

              <div class="detail-item">
                <span class="detail-label">🏢 Área / Dependencia</span>
                <div class="detail-val">{{ loan.department || 'No especificada' }}</div>
              </div>

              <div class="detail-item full-width doc-highlight-box">
                <span class="detail-label">📄 Expediente / Documento Solicitado</span>
                <div class="detail-val-strong doc-name">{{ loan.document || '—' }}</div>
                @if (loan.documentCode) {
                  <span class="doc-code-pill">Radicado / Código: #{{ loan.documentCode }}</span>
                }
              </div>

              <div class="detail-item">
                <span class="detail-label">📅 Fecha de Solicitud / Préstamo</span>
                <div class="detail-val">{{ loan.loanDate || '—' }}</div>
              </div>

              <div class="detail-item">
                <span class="detail-label">📅 Fecha Estimada de Devolución</span>
                <div class="detail-val" [style.color]="loan.status === 'VENCIDO' ? '#dc2626' : 'inherit'" [style.font-weight]="loan.status === 'VENCIDO' ? '800' : '600'">
                  {{ loan.returnDate || 'Sin fecha límite' }}
                </div>
              </div>

              @if (loan.realReturnDate) {
                <div class="detail-item full-width">
                  <span class="detail-label">✅ Fecha Real de Devolución Física</span>
                  <div class="detail-val" style="color:#16a34a; font-weight:700;">{{ loan.realReturnDate }}</div>
                </div>
              }

              @if (loan.observations) {
                <div class="detail-item full-width obs-card-box">
                  <span class="detail-label">📝 Motivo / Justificación / Observaciones</span>
                  <div class="obs-content-text">{{ loan.observations }}</div>
                </div>
              }
            </div>
          </div>

          <div class="detail-modal-footer">
            <button type="button" class="btn-ghost" (click)="closeDetailModal()">Cerrar</button>
            
            <div class="modal-footer-actions">
              @if (canManage()) {
                @if (loan.status === 'PENDIENTE_APROBACION') {
                  <button type="button" class="btn-act-reject modal-btn" (click)="requestReject(loan); closeDetailModal()">
                    <app-icon [icon]="icons.X" [size]="14" [strokeWidth]="2" />
                    <span>Rechazar Solicitud</span>
                  </button>
                  <button type="button" class="btn-act-approve modal-btn" (click)="requestApprove(loan); closeDetailModal()">
                    <app-icon [icon]="icons.Check" [size]="14" [strokeWidth]="2.5" />
                    <span>Aprobar Solicitud</span>
                  </button>
                } @else if (loan.status === 'RECHAZADO') {
                  <button type="button" class="btn-act-approve modal-btn" (click)="requestApprove(loan); closeDetailModal()">
                    <app-icon [icon]="icons.Check" [size]="14" [strokeWidth]="2.5" />
                    <span>Reconsiderar y Aprobar</span>
                  </button>
                } @else if (loan.status === 'ACTIVO' || loan.status === 'VENCIDO') {
                  <button type="button" class="btn-act-reject modal-btn" (click)="requestReject(loan); closeDetailModal()">
                    <app-icon [icon]="icons.X" [size]="14" [strokeWidth]="2" />
                    <span>Anular / Rechazar</span>
                  </button>
                  <button type="button" class="btn-primary modal-btn" (click)="requestReturn(loan); closeDetailModal()">
                    <span>Registrar Devolución</span>
                  </button>
                }
              }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- MODAL DE CÓDIGO QR / ENLACE PÚBLICO -->
    @if (qrModalOpen()) {
      <div class="modal-backdrop" (click)="closeQrModal()">
        <div class="qr-modal-card" (click)="$event.stopPropagation()">
          <div class="qr-modal-header">
            <div class="qr-title-box">
              <app-icon [icon]="icons.QrCode" [size]="22" [strokeWidth]="2" />
              <div>
                <h4>Solicitud Pública de Préstamos</h4>
                <p>Código QR para escanear desde dispositivos móviles</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeQrModal()">
              <app-icon [icon]="icons.X" [size]="18" [strokeWidth]="2" />
            </button>
          </div>

          <div class="qr-modal-body">
            <div class="qr-box-inner" id="printableQrBox">
              <div class="qr-corp-header">
                <strong>CORAZA SEGURIDAD C.T.A.</strong>
                <span>Sistema de Gestión Documental</span>
              </div>
              <div class="qr-image-wrap">
                <img
                  [src]="qrImageUrl()"
                  alt="QR Solicitud de Préstamos"
                  class="qr-code-img"
                />
              </div>
              <div class="qr-instructions">
                <strong>ESCANEA PARA SOLICITAR PRÉSTAMO</strong>
                <p>Abre la cámara de tu celular para radicar la solicitud de expedientes físicos sin iniciar sesión. Las alertas de vencimiento se enviarán desde Documental&#64;corazaseguridadcta.com.</p>
              </div>
            </div>

            <div class="link-copy-box">
              <input type="text" [value]="publicUrl()" readonly />
              <button type="button" class="btn-copy" (click)="copyPublicLink()">
                <app-icon [icon]="copied() ? icons.Check : icons.Copy" [size]="14" [strokeWidth]="2" />
                <span>{{ copied() ? 'Copiado' : 'Copiar' }}</span>
              </button>
            </div>
          </div>

          <div class="qr-modal-footer">
            <button type="button" class="btn-ghost" (click)="closeQrModal()">Cerrar</button>
            <button type="button" class="btn-primary" (click)="printQrSheet()">
               Imprimir Cartel / Ficha QR
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    DOC_STYLES,
    `
    .loans-container { display: flex; flex-direction: column; gap: 1rem; }
    .header-btns { display: flex; gap: 0.5rem; align-items: center; }

    .btn-qr-share {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: #f0f9ff;
      color: #0369a1;
      border: 1px solid #bfdbfe;
      border-radius: 0.55rem;
      padding: 0.45rem 0.85rem;
      font-weight: 700;
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-qr-share:hover { background: #e0f2fe; }

    /* BANNER ENLACE PÚBLICO */
    .public-link-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 1px solid #86efac;
      border-radius: 0.85rem;
      padding: 1rem 1.25rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .banner-left { display: flex; align-items: center; gap: 0.85rem; }
    .qr-icon-circle {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: #15803d;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .banner-left strong { display: block; font-size: 0.92rem; color: #14532d; }
    .banner-left p { margin: 0.15rem 0 0; font-size: 0.78rem; color: #166534; }

    .banner-actions { display: flex; gap: 0.5rem; align-items: center; }
    .btn-banner-action {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #ffffff;
      color: #15803d;
      border: 1px solid #86efac;
      border-radius: 0.5rem;
      padding: 0.45rem 0.85rem;
      font-weight: 700;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-banner-action:hover { background: #f0fdf4; border-color: #4ade80; }
    .btn-banner-action.primary {
      background: #15803d;
      color: #ffffff;
      border-color: #15803d;
    }
    .btn-banner-action.primary:hover { background: #166534; }

    /* ALERT PENDING */
    .pending-alert-box {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #f59e0b;
      padding: 0.85rem 1.15rem;
      border-radius: 0.65rem;
    }
    .alert-icon { font-size: 1.5rem; }
    .alert-content strong { display: block; font-size: 0.88rem; color: #92400e; }
    .alert-content p { margin: 0.15rem 0 0; font-size: 0.78rem; color: #b45309; }

    .email-toast {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 0.75rem 1rem;
      border-radius: 0.6rem;
      font-size: 0.84rem;
      font-weight: 700;
      animation: fadeIn 0.2s ease;
    }

    /* FORM */
    .form-loan {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.85rem;
      padding: 1.25rem;
    }
    .form-title { display: flex; align-items: center; gap: 0.5rem; color: var(--primary-700); margin-bottom: 1rem; }
    .form-title h4 { margin: 0; font-size: 0.95rem; font-weight: 800; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem; }
    .form-grid label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); }

    /* TABLE */
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 0.85rem; background: var(--surface); }
    .row-pending { background: #fffdf5; }
    .row-vencido { background: #fff5f5; }
    .email-tag { display: flex; align-items: center; gap: 0.3rem; font-size: 0.74rem; color: #0369a1; font-weight: 600; margin-top: 0.15rem; }
    .obs-text { font-size: 0.74rem; color: var(--text-muted); margin-top: 0.2rem; }
    .doc-code-tag { font-size: 0.72rem; color: #0369a1; font-weight: 700; }
    .notif-badge { font-size: 0.68rem; color: #b45309; background: #fef3c7; padding: 0.1rem 0.4rem; border-radius: 0.3rem; display: inline-block; margin-top: 0.2rem; font-weight: 700; }
    
    .btn-group-right { display: flex; gap: 0.35rem; justify-content: flex-end; align-items: center; }
    .btn-act-view {
      background: #f8fafc;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 0.35rem;
      padding: 0.25rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      transition: all 0.15s;
    }
    .btn-act-view:hover {
      background: #e2e8f0;
      color: #0f172a;
      border-color: #94a3b8;
    }
    .btn-act-approve {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      border-radius: 0.35rem;
      padding: 0.25rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 800;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .btn-act-approve:hover { background: #d1fae5; }
    .btn-act-reject {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
      border-radius: 0.35rem;
      padding: 0.25rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 800;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .btn-act-reject:hover { background: #fee2e2; }
    
    .btn-notify-email {
      background: #f0f9ff;
      color: #0369a1;
      border: 1px solid #bfdbfe;
      border-radius: 0.35rem;
      padding: 0.25rem 0.55rem;
      font-size: 0.74rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .btn-notify-email:hover { background: #e0f2fe; }

    .btn-return { font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 0.35rem; font-weight: 700; }

    /* MODAL DE DETALLE COMPLETO (OJO) */
    .detail-modal-card {
      background: #ffffff;
      border-radius: 1.25rem;
      width: 100%;
      max-width: 580px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: modalSlideUp 0.2s ease-out;
    }
    @keyframes modalSlideUp {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .detail-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .detail-title-box { display: flex; align-items: center; gap: 0.75rem; }
    .icon-circle-detail {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: #e0f2fe;
      color: #0369a1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .detail-title-box h4 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
    .detail-sub-meta { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem; font-size: 0.75rem; color: #64748b; }

    .detail-modal-body {
      padding: 1.5rem;
      max-height: 70vh;
      overflow-y: auto;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .detail-item.full-width { grid-column: span 2; }
    .detail-label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.02em; }
    .detail-val { font-size: 0.88rem; color: #1e293b; font-weight: 600; }
    .detail-val-strong { font-size: 0.95rem; font-weight: 800; color: #0f172a; }
    
    .doc-highlight-box {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 0.65rem;
      padding: 0.85rem 1rem;
    }
    .doc-name { color: #0369a1; font-size: 1rem; }
    .doc-code-pill { display: inline-block; background: #e0f2fe; color: #0284c7; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 800; margin-top: 0.35rem; }

    .obs-card-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 0.65rem;
      padding: 0.85rem 1rem;
    }
    .obs-content-text { font-size: 0.85rem; color: #92400e; font-weight: 600; line-height: 1.5; white-space: pre-wrap; margin-top: 0.25rem; }

    .detail-modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      gap: 0.5rem;
    }
    .modal-footer-actions { display: flex; gap: 0.5rem; align-items: center; }
    .modal-btn { padding: 0.45rem 0.85rem; font-size: 0.82rem; }

    /* MODAL DE CONFIRMACIÓN */
    .confirm-modal-card {
      background: #ffffff;
      border-radius: 1.25rem;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .confirm-modal-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .confirm-modal-header.success { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .confirm-modal-header.danger { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
    .confirm-modal-header.info { background: #f0f9ff; border-color: #bae6fd; color: #075985; }

    .confirm-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
    }
    .confirm-modal-header.success .confirm-icon-box { color: #16a34a; }
    .confirm-modal-header.danger .confirm-icon-box { color: #dc2626; }
    .confirm-modal-header.info .confirm-icon-box { color: #0284c7; }

    .confirm-modal-header h4 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
    .confirm-modal-header p { margin: 0.15rem 0 0; font-size: 0.78rem; color: #64748b; }

    .confirm-modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .confirm-summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .confirm-row { display: flex; justify-content: space-between; font-size: 0.84rem; }
    .confirm-row .lbl { color: #64748b; font-weight: 600; }
    .confirm-row .val { color: #0f172a; font-weight: 700; text-align: right; }

    .reject-reason-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .reject-reason-group label { font-size: 0.8rem; font-weight: 700; color: #334155; }
    .reject-reason-group textarea {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      padding: 0.65rem;
      font-size: 0.84rem;
      font-family: inherit;
      resize: vertical;
    }
    .reject-reason-group textarea:focus { outline: none; border-color: #ef4444; box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2); }

    .confirm-alert-note {
      background: #f1f5f9;
      border-left: 3px solid #64748b;
      border-radius: 0.4rem;
      padding: 0.65rem 0.85rem;
      font-size: 0.78rem;
      color: #334155;
      line-height: 1.4;
    }

    .confirm-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    .btn-accept {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      border: none;
      border-radius: 0.55rem;
      padding: 0.55rem 1.1rem;
      font-size: 0.85rem;
      font-weight: 800;
      color: #ffffff;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-accept-approve { background: #16a34a; }
    .btn-accept-approve:hover { background: #15803d; }
    .btn-accept-reject { background: #dc2626; }
    .btn-accept-reject:hover { background: #b91c1c; }
    .btn-accept-notify { background: #0284c7; }
    .btn-accept-notify:hover { background: #0369a1; }
    .btn-accept-return { background: #0c4a6e; }
    .btn-accept-return:hover { background: #075985; }
    .btn-gmail-direct {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      border: 1px solid #ea4335;
      background: #fef2f2;
      border-radius: 0.55rem;
      padding: 0.55rem 1rem;
      font-size: 0.85rem;
      font-weight: 800;
      color: #b91c1c;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-gmail-direct:hover {
      background: #fee2e2;
      border-color: #dc2626;
      color: #991b1b;
    }

    /* MODAL QR */
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
    }
    .qr-modal-card {
      background: #ffffff;
      border-radius: 1.25rem;
      width: 100%;
      max-width: 460px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .qr-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .qr-title-box { display: flex; align-items: center; gap: 0.75rem; color: #0c4a6e; }
    .qr-title-box h4 { margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a; }
    .qr-title-box p { margin: 0.1rem 0 0; font-size: 0.75rem; color: #64748b; }
    .btn-close { background: transparent; border: none; color: #94a3b8; cursor: pointer; }
    .btn-close:hover { color: #0f172a; }

    .qr-modal-body { padding: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }
    .qr-box-inner {
      background: #ffffff;
      border: 2px dashed #94a3b8;
      border-radius: 1rem;
      padding: 1.5rem;
      text-align: center;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .qr-corp-header strong { display: block; font-size: 0.9rem; color: #0f172a; font-weight: 900; }
    .qr-corp-header span { font-size: 0.75rem; color: #64748b; }
    .qr-image-wrap { margin: 1rem 0; padding: 0.5rem; background: #ffffff; border-radius: 0.5rem; }
    .qr-code-img { width: 180px; height: 180px; display: block; }
    .qr-instructions strong { display: block; font-size: 0.85rem; color: #0c4a6e; margin-bottom: 0.25rem; }
    .qr-instructions p { margin: 0; font-size: 0.76rem; color: #475569; line-height: 1.35; max-width: 280px; }

    .link-copy-box { display: flex; gap: 0.4rem; width: 100%; }
    .link-copy-box input { flex: 1; font-size: 0.78rem; padding: 0.45rem 0.65rem; border: 1px solid #cbd5e1; border-radius: 0.4rem; background: #f8fafc; }
    .btn-copy {
      background: #0c4a6e;
      color: #ffffff;
      border: none;
      border-radius: 0.4rem;
      padding: 0.45rem 0.85rem;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .btn-copy:hover { background: #075985; }

    .qr-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
    }
  `,
  ],
})
export class LoansScreen implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);

  readonly icons = {
    Check: LucideCheck,
    Clock: LucideClock,
    Copy: LucideCopy,
    ExternalLink: LucideExternalLink,
    Eye: LucideEye,
    FileText: LucideFileText,
    Mail: LucideMail,
    Plus: LucidePlus,
    QrCode: LucideQrCode,
    X: LucideX,
  };

  readonly items = signal<Loan[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly qrModalOpen = signal(false);
  readonly copied = signal(false);
  readonly emailStatusMsg = signal<string | null>(null);
  readonly selectedLoan = signal<Loan | null>(null);
  readonly confirmModal = signal<{
    type: 'approve' | 'reject' | 'notify' | 'return';
    loan: Loan;
    reason?: string;
  } | null>(null);

  readonly canCreate = computed(() => this.auth.hasPermission('documental.create'));
  readonly canManage = computed(() => this.auth.hasPermission('documental.manage'));

  readonly pendingCount = computed(() =>
    this.items().filter((l) => l.status === 'PENDIENTE_APROBACION').length,
  );

  readonly publicUrl = computed(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portalcoraza-web.onrender.com';
    return `${origin}/#/solicitud-prestamo`;
  });

  readonly qrImageUrl = computed(() => {
    const enc = encodeURIComponent(this.publicUrl());
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${enc}&margin=6`;
  });

  model = {
    requester: '',
    department: '',
    document: '',
    documentCode: '',
    email: '',
    loanDate: new Date().toISOString().slice(0, 10),
    returnDate: '',
  };

  ngOnInit(): void {
    this.load();
  }

  toggle(): void {
    this.showForm.update((v) => !v);
  }

  openDetailModal(l: Loan): void {
    this.selectedLoan.set(l);
  }

  closeDetailModal(): void {
    this.selectedLoan.set(null);
  }

  requestApprove(loan: Loan): void {
    this.confirmModal.set({
      type: 'approve',
      loan,
    });
  }

  requestReject(loan: Loan): void {
    this.confirmModal.set({
      type: 'reject',
      loan,
      reason: 'Expediente en consulta física por auditoría / No disponible temporalmente',
    });
  }

  requestNotify(loan: Loan): void {
    this.confirmModal.set({
      type: 'notify',
      loan,
    });
  }

  requestReturn(loan: Loan): void {
    this.confirmModal.set({
      type: 'return',
      loan,
    });
  }

  closeConfirmModal(): void {
    this.confirmModal.set(null);
  }

  executeConfirmedAction(): void {
    const cm = this.confirmModal();
    if (!cm) return;

    const { type, loan, reason } = cm;
    this.closeConfirmModal();

    if (type === 'approve') {
      this.api.approveLoan(loan.id).subscribe({
        next: () => {
          if (loan.email) {
            this.emailStatusMsg.set(`✅ Solicitud Aprobada / Confirmada. Notificación formal enviada a ${loan.email}`);
            setTimeout(() => this.emailStatusMsg.set(null), 5000);
          }
          this.load();
        },
        error: () => {
          this.emailStatusMsg.set('❌ Error al aprobar la solicitud.');
          setTimeout(() => this.emailStatusMsg.set(null), 4000);
        },
      });
    } else if (type === 'reject') {
      const motivoFinal = reason?.trim() || 'No cumple con los requisitos o expediente no disponible temporalmente';
      this.api.rejectLoan(loan.id, motivoFinal).subscribe({
        next: () => {
          if (loan.email) {
            this.emailStatusMsg.set(`❌ Solicitud Rechazada. Notificación del motivo enviada a ${loan.email}`);
            setTimeout(() => this.emailStatusMsg.set(null), 5000);
          }
          this.load();
        },
        error: () => {
          this.emailStatusMsg.set('❌ Error al rechazar la solicitud.');
          setTimeout(() => this.emailStatusMsg.set(null), 4000);
        },
      });
    } else if (type === 'notify') {
      if (!loan.email) return;
      this.api.sendLoanReminder(loan.id).subscribe({
        next: () => {
          this.emailStatusMsg.set(`📧 Correo de recordatorio formal enviado a ${loan.email}`);
          this.load();
          setTimeout(() => this.emailStatusMsg.set(null), 5000);
        },
        error: () => {
          this.emailStatusMsg.set('No se pudo enviar el recordatorio.');
          setTimeout(() => this.emailStatusMsg.set(null), 4000);
        },
      });
    } else if (type === 'return') {
      this.api.returnLoan(loan.id).subscribe({
        next: () => {
          this.emailStatusMsg.set('✅ Devolución física registrada en archivo.');
          setTimeout(() => this.emailStatusMsg.set(null), 5000);
          this.load();
        },
      });
    }
  }

  openGmailDirect(loan: Loan, type: 'approve' | 'reject' | 'notify' | 'return', reason?: string): void {
    if (!loan.email) return;

    let subject = '';
    let body = '';

    if (type === 'approve') {
      subject = `✅ Notificación de Préstamo de Expediente #${loan.documentCode || loan.document || 'Oficial'} — Coraza Seguridad C.T.A.`;
      body = `Cordial saludo, ${loan.requester || ''}.\n\nSe le informa que su solicitud de préstamo para el expediente "${loan.document || loan.documentCode || 'Expediente Documental'}" ha sido APROBADA y autorizada por la administración de Gestión Documental.\n\nFecha de Préstamo: ${loan.loanDate ? String(loan.loanDate).slice(0, 10) : new Date().toISOString().slice(0, 10)}\nFecha Límite de Devolución: ${loan.returnDate ? String(loan.returnDate).slice(0, 10) : 'Fecha no especificada'}\n\nPor favor acérquese al archivo físico para la recepción del material documental.\n\nAtentamente,\nGestión Documental & Archivo Central\nCORAZA SEGURIDAD C.T.A.`;
    } else if (type === 'reject') {
      subject = `❌ Respuesta a Solicitud de Préstamo #${loan.documentCode || loan.document || 'Oficial'} — Coraza Seguridad C.T.A.`;
      body = `Cordial saludo, ${loan.requester || ''}.\n\nSe le notifica que su solicitud de préstamo para el expediente "${loan.document || loan.documentCode || 'Expediente Documental'}" NO PUDO SER APROBADA en este momento.\n\nMotivo del Rechazo: ${reason || 'Documento no disponible temporalmente o en consulta por auditoría interna'}.\n\nPara mayor información o radicación formal, favor comunicarse con el área de Gestión Documental.\n\nAtentamente,\nGestión Documental & Archivo Central\nCORAZA SEGURIDAD C.T.A.`;
    } else if (type === 'notify') {
      subject = `⚠️ Recordatorio de Devolución de Expediente — Coraza Seguridad C.T.A.`;
      body = `Cordial saludo, ${loan.requester || ''}.\n\nLe recordamos comedidamente que el préstamo del expediente "${loan.document || loan.documentCode || 'Expediente Documental'}" se encuentra pendiente de devolución física en el archivo central.\n\nFecha de Devolución Programada: ${loan.returnDate ? String(loan.returnDate).slice(0, 10) : 'Vencida'}\n\nFavor realizar la entrega física para el cierre formal del acta de préstamo.\n\nAtentamente,\nGestión Documental & Archivo Central\nCORAZA SEGURIDAD C.T.A.`;
    } else {
      subject = `📋 Acta de Devolución de Expediente — Coraza Seguridad C.T.A.`;
      body = `Cordial saludo, ${loan.requester || ''}.\n\nSe confirma la recepción física y cierre formal del préstamo del expediente "${loan.document || loan.documentCode || 'Expediente Documental'}".\n\nAtentamente,\nGestión Documental & Archivo Central\nCORAZA SEGURIDAD C.T.A.`;
    }

    const encTo = encodeURIComponent(loan.email.trim());
    const encSub = encodeURIComponent(subject);
    const encBody = encodeURIComponent(body);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encTo}&su=${encSub}&body=${encBody}`;
    if (typeof window !== 'undefined') {
      window.open(gmailUrl, '_blank');
    }
  }

  openQrModal(): void {
    this.qrModalOpen.set(true);
    this.copied.set(false);
  }

  closeQrModal(): void {
    this.qrModalOpen.set(false);
  }

  copyPublicLink(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.publicUrl());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    }
  }

  printQrSheet(): void {
    const url = this.publicUrl();
    const qrImg = this.qrImageUrl();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Cartel QR - Solicitud de Préstamos Coraza C.T.A.</title>
          <style>
            * { box-sizing: border-box; font-family: system-ui, sans-serif; }
            body { padding: 40px; text-align: center; color: #0f172a; }
            .card {
              max-width: 500px; margin: 0 auto; border: 3px solid #0c4a6e;
              border-radius: 20px; padding: 30px;
            }
            h1 { font-size: 22px; color: #0c4a6e; margin: 0; }
            h2 { font-size: 16px; color: #475569; margin: 5px 0 20px; font-weight: normal; }
            img { width: 240px; height: 240px; border-radius: 10px; margin: 10px 0; }
            .inst { font-size: 14px; font-weight: bold; color: #0c4a6e; margin-top: 15px; }
            .desc { font-size: 12px; color: #64748b; margin-top: 5px; }
            .url { font-size: 11px; color: #0369a1; margin-top: 15px; word-break: break-all; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>CORAZA SEGURIDAD C.T.A.</h1>
            <h2>Sistema de Gestión Documental · Archivo Central</h2>
            <img src="${qrImg}" alt="QR" />
            <div class="inst">ESCANEA ESTE CÓDIGO QR CON TU CELULAR</div>
            <div class="desc">Para radicar solicitudes de préstamo y consulta de expedientes físicos sin iniciar sesión.</div>
            <div class="url">${url}</div>
          </div>
          <script>
            setTimeout(() => { window.print(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  private load(): void {
    this.loading.set(true);
    this.api.listLoans().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    const payload = Object.fromEntries(Object.entries(this.model).filter(([, v]) => v !== ''));
    this.api.createLoan(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.model = {
          requester: '',
          department: '',
          document: '',
          documentCode: '',
          email: '',
          loanDate: new Date().toISOString().slice(0, 10),
          returnDate: '',
        };
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo registrar el préstamo.');
      },
    });
  }
}
