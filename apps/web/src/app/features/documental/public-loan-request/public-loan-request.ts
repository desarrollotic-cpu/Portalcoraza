import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DEPARTAMENTOS_CORAZA } from '../departamentos-coraza';
import { DocumentalApiService } from '../documental-api.service';

@Component({
  selector: 'app-public-loan-request',
  imports: [FormsModule],
  template: `
    <div class="public-page">
      <div class="card-container">
        <header class="header">
          <div class="logo-box" aria-hidden="true">C</div>
          <div class="header-text">
            <h2>CORAZA SEGURIDAD C.T.A.</h2>
            <h3>Sistema de Gestión Documental · Solicitud de Préstamo</h3>
            <p>Radica tu solicitud de préstamo de documentos o expedientes físicos del archivo central.</p>
          </div>
        </header>

        @if (successId()) {
          <div class="success-box">
            <div class="check-circle" aria-hidden="true">OK</div>
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
                <span class="label-text">¿Qué expediente necesita? *</span>
                <select [(ngModel)]="model.tipo" name="tipo" required>
                  <option value="">-- Seleccione el tipo (obligatorio) --</option>
                  <option value="PERSONAL_RETIRADO">Personal retirado / hoja de vida</option>
                  <option value="CONTRATO">Contrato</option>
                  <option value="MINUTA">Minuta de puesto</option>
                  <option value="OTRO">Otro documento del archivo</option>
                </select>
                <span class="hint">No escriba un texto suelto. El tipo define los datos que debe completar para localizar el expediente.</span>
              </label>

              <label class="form-group span-2">
                <span class="label-text">Nombre completo del solicitante *</span>
                <input type="text" [(ngModel)]="model.nombre" name="nombre" required placeholder="Nombres y apellidos de quien pide el préstamo" />
              </label>

              <label class="form-group">
                <span class="label-text">Cédula del solicitante *</span>
                <input type="text" [(ngModel)]="model.cedula" name="cedula" required placeholder="Solo números" />
              </label>

              <label class="form-group">
                <span class="label-text">Departamento / Área *</span>
                <select [(ngModel)]="model.departamento" name="departamento" required>
                  <option value="">-- Seleccionar Área --</option>
                  @for (d of areas; track d.code) {
                    <option [value]="d.name">{{ d.name }}</option>
                  }
                </select>
              </label>

              @if (model.tipo === 'PERSONAL_RETIRADO') {
                <p class="block-title span-2">Datos del expediente de personal retirado</p>
                <label class="form-group">
                  <span class="label-text">Nombres del retirado *</span>
                  <input type="text" [(ngModel)]="model.nombresRetirado" name="nombresRetirado" required placeholder="Nombres completos" />
                </label>
                <label class="form-group">
                  <span class="label-text">Apellidos del retirado *</span>
                  <input type="text" [(ngModel)]="model.apellidosRetirado" name="apellidosRetirado" required placeholder="Apellidos completos" />
                </label>
                <label class="form-group">
                  <span class="label-text">Cédula del retirado *</span>
                  <input type="text" [(ngModel)]="model.cedulaRetirado" name="cedulaRetirado" required placeholder="Cédula de la carpeta" />
                </label>
                <label class="form-group">
                  <span class="label-text">Número de carpeta (opcional)</span>
                  <input type="text" [(ngModel)]="model.carpeta" name="carpeta" placeholder="Si lo conoce" />
                </label>
              }

              @if (model.tipo === 'CONTRATO') {
                <p class="block-title span-2">Datos del contrato (para localizarlo en archivo)</p>
                <label class="form-group">
                  <span class="label-text">Tipo de contrato</span>
                  <select [(ngModel)]="model.tipoContrato" name="tipoContrato">
                    <option value="">-- Si lo conoce --</option>
                    <option value="VIGILANCIA FIJA">Vigilancia fija / control de acceso</option>
                    <option value="VIGILANCIA MOVIL">Vigilancia móvil</option>
                    <option value="ESCOLTA">Escolta</option>
                    <option value="SEGURIDAD ELECTRONICA">Seguridad electrónica / CCTV</option>
                    <option value="CONSULTORIA">Consultoría</option>
                    <option value="CONVENIO CTA">Convenio CTA</option>
                    <option value="ARRENDAMIENTO">Arrendamiento</option>
                    <option value="PROVEEDOR">Proveedor / suministros</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </label>
                <label class="form-group">
                  <span class="label-text">N° de contrato (si lo conoce)</span>
                  <input type="text" [(ngModel)]="model.numeroContrato" name="numeroContrato" placeholder="Ej: CTR-120-2026" />
                </label>
                <label class="form-group span-2">
                  <span class="label-text">Cliente / Parte B *</span>
                  <input type="text" [(ngModel)]="model.clienteContrato" name="clienteContrato" required placeholder="Razón social del cliente o proveedor" />
                </label>
                <label class="form-group span-2">
                  <span class="label-text">NIT / cédula del cliente *</span>
                  <input type="text" [(ngModel)]="model.nitContrato" name="nitContrato" required placeholder="Ej: 900.123.456-7" />
                </label>
              }

              @if (model.tipo === 'MINUTA') {
                <p class="block-title span-2">Datos de la minuta</p>
                <label class="form-group">
                  <span class="label-text">Tipo de minuta *</span>
                  <select [(ngModel)]="model.tipoMinuta" name="tipoMinuta" required>
                    <option value="">-- Seleccionar --</option>
                    <option value="SERVICIO">Servicio — puesto de vigilancia</option>
                    <option value="VISITANTES">Visitantes — control de ingreso</option>
                    <option value="CORRESPONDENCIA">Correspondencia — paquetería</option>
                  </select>
                </label>
                <label class="form-group">
                  <span class="label-text">Nombre del puesto *</span>
                  <input type="text" [(ngModel)]="model.puestoMinuta" name="puestoMinuta" required placeholder="Ej: Shangrila, Torre Norte..." />
                </label>
                <label class="form-group">
                  <span class="label-text">Fecha de la minuta *</span>
                  <input type="date" [(ngModel)]="model.fechaMinuta" name="fechaMinuta" required />
                </label>
                <label class="form-group">
                  <span class="label-text">Código (si lo conoce)</span>
                  <input type="text" [(ngModel)]="model.codigoMinuta" name="codigoMinuta" placeholder="Ej: MIN-VIS-004" />
                </label>
              }

              @if (model.tipo === 'OTRO') {
                <label class="form-group span-2">
                  <span class="label-text">Describa el documento con datos precisos *</span>
                  <textarea [(ngModel)]="model.documento" name="documento" rows="2" required placeholder="Nombre del documento, código, fechas, carpeta o persona. No escriba solo 'el archivo' o 'un contrato'."></textarea>
                </label>
              }

              <label class="form-group span-2">
                <span class="label-text">Motivo o justificación del préstamo *</span>
                <textarea [(ngModel)]="model.motivo" name="motivo" rows="3" required placeholder="Trámite, consulta o auditoría. Mínimo una frase clara."></textarea>
              </label>

              <label class="form-group span-2">
                <span class="label-text">Correo para notificaciones *</span>
                <input
                  type="email"
                  [(ngModel)]="model.email"
                  name="email"
                  required
                  placeholder="Ej: funcionario@corazaseguridadcta.com"
                  [class.invalid]="!!emailError()"
                  [class.valid]="emailOk()"
                  (ngModelChange)="onEmailChange()"
                  (blur)="verifyEmailField()"
                />
                @if (emailChecking()) {
                  <span class="hint">Comprobando que el correo exista...</span>
                } @else if (emailError()) {
                  <span class="field-error">{{ emailError() }}</span>
                } @else if (emailOk()) {
                  <span class="field-ok">Correo válido: el dominio sí recibe mensajes.</span>
                } @else {
                  <span class="hint">Si el correo no existe o está mal escrito, no podrá radicar. Le llegará confirmación desde Documental&#64;corazaseguridadcta.com</span>
                }
              </label>

              <label class="form-group span-2">
                <span class="label-text">Fecha estimada de devolución *</span>
                <input type="date" [(ngModel)]="model.fechaDevolucion" name="fechaDevolucion" required />
              </label>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-submit" [disabled]="submitting() || emailChecking()">
                {{ submitting() || emailChecking() ? 'Verificando...' : ' Radicar Solicitud de Préstamo' }}
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
      background: linear-gradient(135deg, #0f172a 0%, #0c4a6e 55%, #0369a1 100%);
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
      background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%);
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
    .hint { font-size: 0.72rem; color: #64748b; }
    .block-title {
      margin: 0.25rem 0 0;
      font-size: 0.8rem;
      font-weight: 800;
      color: #0c4a6e;
      letter-spacing: 0.02em;
      border-top: 1px solid #e2e8f0;
      padding-top: 0.85rem;
    }
    input, select, textarea {
      font: inherit;
      border: 1px solid #cbd5e1;
      border-radius: 0.6rem;
      padding: 0.65rem 0.85rem;
      color: #0f172a;
      background: #f8fafc;
      transition: all 0.2s;
    }
    input.invalid {
      border-color: #dc2626;
      background: #fef2f2;
    }
    input.valid {
      border-color: #16a34a;
      background: #f0fdf4;
    }
    .field-error { font-size: 0.78rem; color: #b91c1c; font-weight: 700; }
    .field-ok { font-size: 0.78rem; color: #15803d; font-weight: 700; }

    .form-actions { margin-top: 1.25rem; }
    .btn-submit {
      width: 100%;
      background: #0c4a6e;
      color: #ffffff;
      border: none;
      border-radius: 0.65rem;
      padding: 0.9rem;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-submit:hover { background: #075985; }
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
    .radicado { margin: 0.5rem 0; font-size: 1.1rem; color: #0369a1; }
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
      background: #0c4a6e;
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
  readonly areas = DEPARTAMENTOS_CORAZA;

  model = emptyModel();

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly successId = signal<string | null>(null);
  readonly emailError = signal<string | null>(null);
  readonly emailOk = signal(false);
  readonly emailChecking = signal(false);
  private verifiedEmail = '';

  onEmailChange(): void {
    this.emailOk.set(false);
    this.emailError.set(null);
    this.verifiedEmail = '';
  }

  verifyEmailField(thenSubmit = false): void {
    const email = this.model.email.trim();
    if (!email) {
      this.emailError.set('Escriba un correo electrónico.');
      this.emailOk.set(false);
      return;
    }
    if (this.verifiedEmail === email && this.emailOk()) {
      if (thenSubmit) this.sendRequest();
      return;
    }
    this.emailChecking.set(true);
    this.emailError.set(null);
    this.api.verifyPublicEmail(email).subscribe({
      next: () => {
        this.emailChecking.set(false);
        this.emailOk.set(true);
        this.emailError.set(null);
        this.verifiedEmail = email;
        if (thenSubmit) this.sendRequest();
      },
      error: (err) => {
        this.emailChecking.set(false);
        this.emailOk.set(false);
        this.verifiedEmail = '';
        const apiMsg = err?.error?.message;
        this.emailError.set(
          Array.isArray(apiMsg) ? apiMsg.join(' ') : apiMsg || 'Ese correo no es válido. Corríjalo para continuar.',
        );
        if (thenSubmit) this.submitting.set(false);
      },
    });
  }

  submit(): void {
    const msg = validatePublicLoan(this.model);
    if (msg) {
      this.error.set(msg);
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.verifyEmailField(true);
  }

  private sendRequest(): void {
    this.api.publicLoanRequest(this.model).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.successId.set(res.id);
      },
      error: (err) => {
        this.submitting.set(false);
        const apiMsg = err?.error?.message;
        this.error.set(
          Array.isArray(apiMsg) ? apiMsg.join(' ') : apiMsg || 'No se pudo radicar la solicitud. Complete los campos del tipo de expediente.',
        );
      },
    });
  }

  resetForm(): void {
    this.successId.set(null);
    this.model = emptyModel();
    this.emailError.set(null);
    this.emailOk.set(false);
    this.verifiedEmail = '';
  }
}

function emptyModel() {
  return {
    tipo: '',
    nombre: '',
    cedula: '',
    departamento: '',
    email: '',
    fechaDevolucion: '',
    motivo: '',
    nombresRetirado: '',
    apellidosRetirado: '',
    cedulaRetirado: '',
    carpeta: '',
    clienteContrato: '',
    nitContrato: '',
    numeroContrato: '',
    tipoContrato: '',
    tipoMinuta: '',
    puestoMinuta: '',
    fechaMinuta: '',
    codigoMinuta: '',
    documento: '',
  };
}

function validatePublicLoan(m: ReturnType<typeof emptyModel>): string | null {
  if (!m.tipo) return 'Seleccione qué tipo de expediente necesita.';
  if (!m.nombre.trim() || !m.cedula.trim() || !m.departamento || !m.email || !m.fechaDevolucion) {
    return 'Complete solicitante, cédula, área, correo y fecha de devolución.';
  }
  if (m.motivo.trim().length < 12) return 'El motivo debe explicar para qué necesita el documento.';
  if (m.tipo === 'PERSONAL_RETIRADO') {
    if (!m.nombresRetirado.trim() || !m.apellidosRetirado.trim() || !m.cedulaRetirado.trim()) {
      return 'En personal retirado son obligatorios nombres, apellidos y cédula del expediente.';
    }
  }
  if (m.tipo === 'CONTRATO') {
    if (!m.clienteContrato.trim() || !m.nitContrato.trim()) {
      return 'En contratos son obligatorios el cliente y el NIT. El número de contrato si lo conoce.';
    }
  }
  if (m.tipo === 'MINUTA') {
    if (!m.tipoMinuta || !m.puestoMinuta.trim() || !m.fechaMinuta) {
      return 'En minutas son obligatorios tipo, puesto y fecha.';
    }
  }
  if (m.tipo === 'OTRO' && m.documento.trim().length < 12) {
    return 'Describa el documento con nombre, fechas o código. No escriba un texto genérico.';
  }
  return null;
}
