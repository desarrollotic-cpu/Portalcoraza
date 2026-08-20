import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentalApiService } from '../documental-api.service';

@Component({
  selector: 'app-public-loan-request',
  imports: [FormsModule],
  template: `
    <div class="public-page">
      <div class="card-container">
        <header class="header">
          <div class="logo-box">🛡️</div>
          <div class="header-text">
            <h2>CORAZA SEGURIDAD C.T.A.</h2>
            <h3>Sistema de Gestión Documental · Solicitud de Préstamo</h3>
            <p>Radica tu solicitud de préstamo de documentos o expedientes físicos del archivo central.</p>
          </div>
        </header>

        @if (successId()) {
          <div class="success-box">
            <div class="check-circle">✅</div>
            <h4>¡Solicitud Radicada Exitosamente!</h4>
            <p class="radicado">Radicado: <strong>{{ successId() }}</strong></p>
            <p class="info-text">
              Tu solicitud ha sido registrada en el sistema y se encuentra en estado
              <span class="badge-pending">PENDIENTE DE APROBACIÓN</span>.
            </p>
            <div class="steps-box">
              <strong>Próximos pasos:</strong>
              <ol>
                <li>El encargado de Gestión Documental verificará la disponibilidad del expediente.</li>
                <li>Recibirás confirmación para acercarte al archivo central a retirar el documento físico.</li>
                <li>Recuerda realizar la devolución en la fecha estimada indicada.</li>
              </ol>
            </div>
            <button type="button" class="btn-primary" (click)="resetForm()">
              Radicar otra solicitud
            </button>
          </div>
        } @else {
          <form (ngSubmit)="submit()">
            @if (error()) {
              <div class="error-banner">{{ error() }}</div>
            }

            <div class="form-grid">
              <label class="form-group span-2">
                <span class="label-text">Nombre Completo del Solicitante *</span>
                <input
                  type="text"
                  [(ngModel)]="model.nombre"
                  name="nombre"
                  required
                  placeholder="Ej: Juan Carlos Pérez Gómez"
                />
              </label>

              <label class="form-group">
                <span class="label-text">Cédula de Ciudadanía *</span>
                <input
                  type="text"
                  [(ngModel)]="model.cedula"
                  name="cedula"
                  required
                  placeholder="Ej: 1069469248"
                />
              </label>

              <label class="form-group">
                <span class="label-text">Departamento / Área Solicitante *</span>
                <select [(ngModel)]="model.departamento" name="departamento" required>
                  <option value="">-- Seleccionar Área --</option>
                  <option value="OPERACIONES">🛡️ Operaciones / Vigilancia</option>
                  <option value="GESTION_HUMANA">👥 Gestión Humana / RRHH</option>
                  <option value="ADMINISTRATIVO">💼 Administrativo y Financiero</option>
                  <option value="COMERCIAL">🤝 Comercial</option>
                  <option value="SST">🦺 Seguridad y Salud (SST)</option>
                  <option value="GERENCIA">👔 Gerencia General</option>
                  <option value="OTRO">📁 Otra Dependencia</option>
                </select>
              </label>

              <label class="form-group span-2">
                <span class="label-text">Documento, Carpeta o Expediente Requerido *</span>
                <input
                  type="text"
                  [(ngModel)]="model.documento"
                  name="documento"
                  required
                  placeholder="Ej: Hoja de Vida Asociado X, Contrato Cliente Y, Minuta Puesto Z..."
                />
              </label>

              <label class="form-group span-2">
                <span class="label-text">Motivo o Justificación del Préstamo *</span>
                <textarea
                  [(ngModel)]="model.motivo"
                  name="motivo"
                  rows="3"
                  required
                  placeholder="Describe brevemente el trámite, consulta o auditoría que requiere este documento..."
                ></textarea>
              </label>

              <label class="form-group">
                <span class="label-text">Fecha Estimada de Devolución *</span>
                <input
                  type="date"
                  [(ngModel)]="model.fechaDevolucion"
                  name="fechaDevolucion"
                  required
                />
              </label>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-submit" [disabled]="submitting()">
                {{ submitting() ? 'Radicando...' : '📤 Radicar Solicitud de Préstamo' }}
              </button>
            </div>
          </form>
        }

        <footer class="footer">
          <span>Coraza Seguridad C.T.A. · Archivo Central & Custodia Documental</span>
        </footer>
      </div>
    </div>
  `,
  styles: `
    .public-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem 1rem;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .card-container {
      background: #ffffff;
      border-radius: 1.25rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      width: 100%;
      max-width: 640px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: #ffffff;
      padding: 1.75rem 2rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .logo-box {
      font-size: 2.4rem;
      background: rgba(255, 255, 255, 0.15);
      width: 58px;
      height: 58px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-text h2 { margin: 0; font-size: 1.15rem; font-weight: 900; letter-spacing: 0.05em; }
    .header-text h3 { margin: 0.2rem 0; font-size: 0.95rem; font-weight: 700; color: #93c5fd; }
    .header-text p { margin: 0.35rem 0 0; font-size: 0.8rem; color: rgba(255, 255, 255, 0.8); line-height: 1.35; }

    form { padding: 1.75rem 2rem; }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .span-2 { grid-column: span 2; }

    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .label-text { font-size: 0.82rem; font-weight: 700; color: #334155; }
    input, select, textarea {
      font: inherit;
      border: 1px solid #cbd5e1;
      border-radius: 0.6rem;
      padding: 0.65rem 0.85rem;
      color: #0f172a;
      background: #f8fafc;
      transition: all 0.2s;
    }
    input:focus, select:focus, textarea:focus {
      border-color: #2563eb;
      background: #ffffff;
      outline: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .form-actions { margin-top: 1.25rem; }
    .btn-submit {
      width: 100%;
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      border-radius: 0.65rem;
      padding: 0.9rem;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-submit:hover { background: #172554; }
    .btn-submit:disabled { background: #94a3b8; cursor: not-allowed; }

    .error-banner {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
      padding: 0.75rem 1rem;
      border-radius: 0.6rem;
      margin-bottom: 1rem;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .success-box {
      padding: 2.5rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .check-circle { font-size: 3rem; margin-bottom: 0.5rem; }
    .success-box h4 { margin: 0; font-size: 1.4rem; color: #0f172a; font-weight: 800; }
    .radicado { margin: 0.5rem 0; font-size: 1.1rem; color: #1e40af; }
    .info-text { font-size: 0.9rem; color: #475569; margin: 0.25rem 0 1.25rem; }
    .badge-pending {
      background: #fef3c7;
      color: #92400e;
      font-weight: 800;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.78rem;
    }

    .steps-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.85rem;
      padding: 1.25rem 1.5rem;
      text-align: left;
      width: 100%;
      margin-bottom: 1.5rem;
    }
    .steps-box strong { display: block; font-size: 0.88rem; color: #1e293b; margin-bottom: 0.5rem; }
    .steps-box ol { margin: 0; padding-left: 1.25rem; font-size: 0.82rem; color: #475569; display: flex; flex-direction: column; gap: 0.4rem; }

    .btn-primary {
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      border-radius: 0.65rem;
      padding: 0.75rem 1.5rem;
      font-weight: 800;
      font-size: 0.9rem;
      cursor: pointer;
    }

    .footer {
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      padding: 0.85rem 1.5rem;
      text-align: center;
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 600;
    }

    @media (max-width: 580px) {
      .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
      .header { flex-direction: column; text-align: center; padding: 1.5rem 1rem; }
      form { padding: 1.25rem 1rem; }
    }
  `,
})
export class PublicLoanRequestComponent {
  private readonly api = inject(DocumentalApiService);

  model = {
    nombre: '',
    cedula: '',
    departamento: '',
    documento: '',
    motivo: '',
    fechaDevolucion: '',
  };

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly successId = signal<string | null>(null);

  submit(): void {
    if (!this.model.nombre || !this.model.cedula || !this.model.documento) {
      this.error.set('Por favor completa todos los campos requeridos (*).');
      return;
    }
    this.submitting.set(true);
    this.error.set(null);

    this.api.publicLoanRequest(this.model).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.successId.set(res.id);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set('No se pudo radicar la solicitud. Por favor intenta de nuevo.');
      },
    });
  }

  resetForm(): void {
    this.successId.set(null);
    this.model = {
      nombre: '',
      cedula: '',
      departamento: '',
      documento: '',
      motivo: '',
      fechaDevolucion: '',
    };
  }
}
