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
    const cfg = this.smtpConfig();
    if (!cfg) {
      this.logger.warn('📧 SMTP no configurado (falta SMTP_PASS). Correos irán por Resend si existe RESEND_API_KEY.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        requireTLS: !cfg.secure,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        auth: { user: cfg.user, pass: cfg.pass },
      });
      this.logger.log(`📧 [SMTP] ${cfg.user} vía ${cfg.host}:${cfg.port} (provider=${this.mailProvider()})`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`❌ Error inicializando SMTP: ${errorMsg}`);
    }
  }

  /** smtp = bandeja Enviados de documental@; resend = API externa (no aparece en Gmail). */
  private mailProvider(): 'smtp' | 'resend' {
    const p = (process.env.MAIL_PROVIDER || 'smtp').trim().toLowerCase();
    return p === 'resend' ? 'resend' : 'smtp';
  }

  private smtpConfig(): { host: string; port: number; user: string; pass: string; secure: boolean } | null {
    const pass = process.env.SMTP_PASS?.trim();
    if (!pass) return null;
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465);
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      user: (process.env.SMTP_USER || this.senderEmail).trim(),
      pass,
      secure,
    };
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

    const subject = `Recordatorio de Devolución de Expediente: ${notice.document} — Coraza Seguridad C.T.A.`;
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

    const subject = `Aprobación de Solicitud de Préstamo: ${notice.document} — Coraza Seguridad C.T.A.`;
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

    const subject = `Respuesta a Solicitud de Préstamo: ${notice.document} — Coraza Seguridad C.T.A.`;
    const htmlBody = this.buildRejectionEmailTemplate(notice);

    return this.dispatchMail(targetEmail, subject, htmlBody);
  }

  private async dispatchMail(to: string, subject: string, htmlBody: string): Promise<boolean> {
    const cleanTo = to.trim().toLowerCase();
    const provider = this.mailProvider();

    if (provider === 'smtp') {
      const smtpOk = await this.sendViaSmtp(cleanTo, subject, htmlBody);
      if (smtpOk) return true;
      this.logger.warn(`⚠️ SMTP falló para ${cleanTo}; intentando Resend como respaldo...`);
    }

    const resendOk = await this.sendViaResend(cleanTo, subject, htmlBody);
    if (resendOk) return true;

    if (provider === 'resend') {
      return this.sendViaSmtp(cleanTo, subject, htmlBody);
    }

    return false;
  }

  private async sendViaSmtp(to: string, subject: string, htmlBody: string): Promise<boolean> {
    const cfg = this.smtpConfig();
    if (!cfg) {
      this.logger.error('❌ SMTP_PASS no configurado en el servidor.');
      return false;
    }

    try {
      const transporter =
        this.transporter ??
        nodemailer.createTransport({
          host: cfg.host,
          port: cfg.port,
          secure: cfg.secure,
          auth: { user: cfg.user, pass: cfg.pass },
        });

      const info = await transporter.sendMail({
        from: `"Gestión Documental Coraza" <${cfg.user}>`,
        to,
        bcc: this.senderEmail,
        replyTo: this.senderEmail,
        subject,
        html: htmlBody,
      });

      this.logger.log(`✅ [SMTP] Para: ${to} | CCO: ${this.senderEmail} | ID: ${info.messageId}`);
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`❌ Error SMTP a ${to}: ${errorMsg}`);
      return false;
    }
  }

  private async sendViaResend(to: string, subject: string, htmlBody: string): Promise<boolean> {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (!resendKey) return false;

    try {
      const fromEmail = process.env.MAIL_FROM || `Gestión Documental Coraza <${this.senderEmail}>`;
      let res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          bcc: [this.senderEmail],
          reply_to: this.senderEmail,
          subject,
          html: htmlBody,
        }),
      });

      if (!res.ok) {
        res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Gestión Documental Coraza <onboarding@resend.dev>',
            to: [to],
            bcc: [this.senderEmail],
            reply_to: this.senderEmail,
            subject,
            html: htmlBody,
          }),
        });
      }

      if (res.ok) {
        const resData = (await res.json()) as { id?: string };
        this.logger.log(`✅ [RESEND] Para: ${to} | ID: ${resData?.id ?? 'ok'}`);
        return true;
      }

      const errText = await res.text();
      this.logger.warn(`⚠️ Resend (${res.status}): ${errText}`);
    } catch (httpErr: unknown) {
      const msg = httpErr instanceof Error ? httpErr.message : String(httpErr);
      this.logger.warn(`⚠️ Error Resend: ${msg}`);
    }

    return false;
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
