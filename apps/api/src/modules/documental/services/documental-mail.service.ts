import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface OverdueLoanNotice {
  id: string;
  requester: string;
  email: string;
  document: string;
  returnDate: string;
  department?: string;
}

@Injectable()
export class DocumentalMailService {
  private readonly logger = new Logger(DocumentalMailService.name);
  readonly senderEmail = 'documental@corazaseguridadcta.com';
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER || 'documental@corazaseguridadcta.com';
    const smtpPass = process.env.SMTP_PASS || 'vqwxqapwrwkbuhjn';
    const isExplicitSsl = process.env.SMTP_SECURE === 'true' && smtpPort === 465;

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: isExplicitSsl,
        requireTLS: !isExplicitSsl,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        auth: {
          user: smtpUser.trim(),
          pass: smtpPass.trim(),
        },
      });

      this.logger.log(`📧 [SMTP INICIADO] Conectado a ${smtpUser} vía ${smtpHost}:${smtpPort} (TLS: ${!isExplicitSsl})`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`❌ Error inicializando pool SMTP: ${errorMsg}`);
    }
  }

  /**
   * Envía correo de notificación de vencimiento al solicitante desde Documental@corazaseguridadcta.com.
   */
  async sendOverdueReminder(notice: OverdueLoanNotice): Promise<boolean> {
    const targetEmail = notice.email?.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      this.logger.warn(`Préstamo ${notice.id} no tiene un correo válido (${notice.email}).`);
      return false;
    }

    const subject = `⚠️ [URGENTE] Recordatorio de Devolución de Expediente — Coraza Seguridad C.T.A.`;
    const htmlBody = this.buildOverdueEmailTemplate(notice);

    return this.dispatchMail(targetEmail, subject, htmlBody);
  }

  /**
   * Envía correo de confirmación de APROBACIÓN de préstamo.
   */
  async sendLoanApprovalEmail(notice: {
    id: string;
    requester: string;
    email: string;
    document: string;
    loanDate: string;
    returnDate?: string;
    department?: string;
  }): Promise<boolean> {
    const targetEmail = notice.email?.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      this.logger.warn(`Préstamo ${notice.id} no tiene correo para notificación de aprobación.`);
      return false;
    }

    const subject = `✅ [APROBADO] Solicitud de Préstamo de Expediente — Coraza Seguridad C.T.A.`;
    const htmlBody = this.buildApprovalEmailTemplate(notice);

    return this.dispatchMail(targetEmail, subject, htmlBody);
  }

  /**
   * Envía correo de notificación de RECHAZO / NEGATIVA de préstamo con el motivo.
   */
  async sendLoanRejectionEmail(notice: {
    id: string;
    requester: string;
    email: string;
    document: string;
    motivoRechazo: string;
    department?: string;
  }): Promise<boolean> {
    const targetEmail = notice.email?.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      this.logger.warn(`Préstamo ${notice.id} no tiene correo para notificación de rechazo.`);
      return false;
    }

    const subject = `❌ [NOTIFICACIÓN] Respuesta a Solicitud de Préstamo — Coraza Seguridad C.T.A.`;
    const htmlBody = this.buildRejectionEmailTemplate(notice);

    return this.dispatchMail(targetEmail, subject, htmlBody);
  }

  private async dispatchMail(to: string, subject: string, htmlBody: string): Promise<boolean> {
    const cleanTo = to.trim().toLowerCase();

    // 1. Despacho prioritario vía HTTPS REST API (Puerto 443 - Inmune a bloqueos de red en Render Cloud)
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (resendKey) {
      try {
        const fromEmail = process.env.MAIL_FROM || 'Gestión Documental Coraza <onboarding@resend.dev>';
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [cleanTo],
            subject,
            html: htmlBody,
          }),
        });

        if (res.ok) {
          const resData = (await res.json()) as any;
          this.logger.log(`✅ [HTTPS RESEND ENTREGADO] Para: ${cleanTo} | ID: ${resData?.id} | Asunto: ${subject}`);
          return true;
        }
        const errText = await res.text();
        this.logger.warn(`⚠️ Respuesta Resend HTTP (${res.status}): ${errText}`);
      } catch (httpErr: any) {
        this.logger.warn(`⚠️ Error en despacho HTTPS Resend: ${httpErr.message}`);
      }
    }

    // 2. Fallback secundario a transporte SMTP tradicional
    try {
      const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
      const smtpPort = Number(process.env.SMTP_PORT) || 465;
      const smtpUser = (process.env.SMTP_USER || 'documental@corazaseguridadcta.com').trim();
      const smtpPass = (process.env.SMTP_PASS || 'vqwxqapwrwkbuhjn').trim();
      const smtpSecure = process.env.SMTP_SECURE !== 'false';

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"Gestión Documental Coraza" <${this.senderEmail}>`,
        to: cleanTo,
        subject,
        html: htmlBody,
      });

      this.logger.log(`✅ [SMTP ENTREGADO] Para: ${cleanTo} | ID: ${info.messageId} | Asunto: ${subject}`);
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`❌ Error enviando correo a ${cleanTo}: ${errorMsg}`);
      return false;
    }
  }

  private buildApprovalEmailTemplate(notice: {
    id: string;
    requester: string;
    document: string;
    loanDate: string;
    returnDate?: string;
    department?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
          .header p { margin: 4px 0 0; font-size: 13px; color: #93c5fd; }
          .content { padding: 28px 24px; }
          .badge-ok { display: inline-block; background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 999px; font-weight: 800; font-size: 12px; margin-bottom: 16px; border: 1px solid #86efac; }
          .greeting { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
          .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
          .details-card { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
          .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; font-weight: 600; }
          .detail-value { color: #0f172a; font-weight: 700; text-align: right; }
          .instructions { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; font-size: 13px; color: #166534; line-height: 1.5; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CORAZA SEGURIDAD C.T.A.</h1>
            <p>Sistema de Gestión Documental · Archivo Central & Custodia</p>
          </div>
          <div class="content">
            <div class="badge-ok">✅ SOLICITUD APROBADA</div>
            <div class="greeting">Estimado(a) ${notice.requester},</div>
            <div class="message">
              Nos complace informarle que su solicitud de préstamo del expediente/documento ha sido <strong>APROBADA Y CONFIRMADA</strong> por el área de Gestión Documental.
            </div>
            <div class="details-card">
              <div class="detail-row">
                <span class="detail-label">📄 Expediente / Documento:</span>
                <span class="detail-value">${notice.document}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📅 Fecha de Aprobación:</span>
                <span class="detail-value">${notice.loanDate}</span>
              </div>
              ${notice.returnDate ? `
              <div class="detail-row">
                <span class="detail-label">📅 Fecha Límite de Devolución:</span>
                <span class="detail-value" style="color:#1e40af;">${notice.returnDate}</span>
              </div>` : ''}
              ${notice.department ? `
              <div class="detail-row">
                <span class="detail-label">🏢 Área / Dependencia:</span>
                <span class="detail-value">${notice.department}</span>
              </div>` : ''}
            </div>
            <div class="instructions">
              <strong>📌 Instrucciones de Entrega:</strong><br>
              Puede acercarse a la oficina de Gestión Documental para retirar el expediente físico. Recuerde conservar el documento en óptimas condiciones y efectuar la devolución oportuna.
            </div>
          </div>
          <div class="footer">
            Coraza Seguridad C.T.A. · PBX: (604) 4447929 · Medellín - Colombia<br>
            Remitente: <strong>${this.senderEmail}</strong>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildRejectionEmailTemplate(notice: {
    id: string;
    requester: string;
    document: string;
    motivoRechazo: string;
    department?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
          .header p { margin: 4px 0 0; font-size: 13px; color: #93c5fd; }
          .content { padding: 28px 24px; }
          .badge-reject { display: inline-block; background: #fee2e2; color: #991b1b; padding: 6px 12px; border-radius: 999px; font-weight: 800; font-size: 12px; margin-bottom: 16px; border: 1px solid #fca5a5; }
          .greeting { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
          .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
          .details-card { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
          .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; font-weight: 600; }
          .detail-value { color: #0f172a; font-weight: 700; text-align: right; }
          .motivo-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; font-size: 13px; color: #991b1b; line-height: 1.5; margin-bottom: 20px; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CORAZA SEGURIDAD C.T.A.</h1>
            <p>Sistema de Gestión Documental · Archivo Central & Custodia</p>
          </div>
          <div class="content">
            <div class="badge-reject">❌ SOLICITUD NO APROBADA</div>
            <div class="greeting">Estimado(a) ${notice.requester},</div>
            <div class="message">
              Le informamos que su solicitud de préstamo de expediente/documento no pudo ser aprobada en esta oportunidad.
            </div>
            <div class="details-card">
              <div class="detail-row">
                <span class="detail-label">📄 Expediente Solicitado:</span>
                <span class="detail-value">${notice.document}</span>
              </div>
              ${notice.department ? `
              <div class="detail-row">
                <span class="detail-label">🏢 Dependencia:</span>
                <span class="detail-value">${notice.department}</span>
              </div>` : ''}
            </div>
            <div class="motivo-box">
              <strong>Motivo / Observaciones del Rechazo:</strong><br>
              ${notice.motivoRechazo}
            </div>
            <div style="font-size:13px; color:#475569; line-height:1.5;">
              Si requiere más información o desea subsanar las observaciones para reconsiderar su solicitud, comuníquese con el departamento de Gestión Documental.
            </div>
          </div>
          <div class="footer">
            Coraza Seguridad C.T.A. · PBX: (604) 4447929 · Medellín - Colombia<br>
            Remitente: <strong>${this.senderEmail}</strong>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildOverdueEmailTemplate(notice: OverdueLoanNotice): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
          .header p { margin: 4px 0 0; font-size: 13px; color: #93c5fd; }
          .content { padding: 28px 24px; }
          .alert-badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 6px 12px; border-radius: 999px; font-weight: 800; font-size: 12px; margin-bottom: 16px; border: 1px solid #fca5a5; }
          .greeting { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
          .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
          .details-card { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
          .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; font-weight: 600; }
          .detail-value { color: #0f172a; font-weight: 700; text-align: right; }
          .instructions { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; font-size: 13px; color: #1e40af; line-height: 1.5; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CORAZA SEGURIDAD C.T.A.</h1>
            <p>Sistema de Gestión Documental · Archivo Central & Custodia</p>
          </div>
          <div class="content">
            <div class="alert-badge">⚠️ RECORDATORIO DE VENCIMIENTO</div>
            <div class="greeting">Estimado(a) ${notice.requester},</div>
            <div class="message">
              Le informamos que el plazo acordado para la custodia temporal del siguiente documento o expediente ha <strong>vencido</strong>. Le solicitamos amablemente realizar la devolución física en el área de archivo para mantener el control y custodia institucional.
            </div>

            <div class="details-card">
              <div class="detail-row">
                <span class="detail-label">📄 Documento / Carpeta:</span>
                <span class="detail-value">${notice.document}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">👤 Solicitante:</span>
                <span class="detail-value">${notice.requester}</span>
              </div>
              ${notice.department ? `
              <div class="detail-row">
                <span class="detail-label">🏢 Dependencia:</span>
                <span class="detail-value">${notice.department}</span>
              </div>` : ''}
              <div class="detail-row">
                <span class="detail-label">📅 Fecha Límite de Devolución:</span>
                <span class="detail-value" style="color:#b91c1c;">${notice.returnDate}</span>
              </div>
            </div>

            <div class="instructions">
              <strong>📌 Instrucciones de Devolución:</strong><br>
              Por favor acérquese a la ventanilla de Gestión Documental para entregar el expediente físico. El funcionario responsable registrará la recepción en el sistema para cerrar su solicitud.
            </div>
          </div>
          <div class="footer">
            Mensaje automático generado por el Sistema de Gestión Documental de Coraza Seguridad C.T.A.<br>
            Remitente oficial: <strong>${this.senderEmail}</strong>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
