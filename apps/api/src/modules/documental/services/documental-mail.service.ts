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

export type MailDispatchResult = {
  ok: boolean;
  via: string | null;
  error: string | null;
  subject: string;
  to: string;
};

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

  private smtpConfig(): { host: string; port: number; user: string; pass: string; secure: boolean } {
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465);
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      user: (process.env.SMTP_USER || this.senderEmail).trim(),
      // SMTP_PASS en Render; si falta, usa la clave de aplicación de documental@ (ya usada en el módulo).
      pass: (process.env.SMTP_PASS || 'vqwxqapwrwkbuhjn').trim(),
      secure,
    };
  }

  /**
   * Envía correo de notificación de vencimiento al solicitante desde Documental@corazaseguridadcta.com.
   */
  async sendOverdueReminder(notice: OverdueLoanNotice): Promise<MailDispatchResult> {
    const targetEmail = notice.email?.trim().toLowerCase();
    const subject = `Recordatorio de Devolución de Expediente: ${notice.document} — Coraza Seguridad C.T.A.`;
    if (!targetEmail || !targetEmail.includes('@')) {
      return { ok: false, via: null, error: 'Sin correo válido', subject, to: notice.email || '' };
    }
    return this.dispatchMail(targetEmail, subject, this.buildOverdueEmailTemplate(notice));
  }

  async sendLoanApprovalEmail(notice: {
    id: string;
    requester: string;
    email: string;
    document: string;
    loanDate: string;
    returnDate?: string;
    department?: string;
  }): Promise<MailDispatchResult> {
    const targetEmail = notice.email?.trim().toLowerCase();
    const subject = `Aprobación de Solicitud de Préstamo: ${notice.document} — Coraza Seguridad C.T.A.`;
    if (!targetEmail || !targetEmail.includes('@')) {
      return { ok: false, via: null, error: 'Sin correo válido', subject, to: notice.email || '' };
    }
    return this.dispatchMail(targetEmail, subject, this.buildApprovalEmailTemplate(notice));
  }

  async sendLoanRejectionEmail(notice: {
    id: string;
    requester: string;
    email: string;
    document: string;
    motivoRechazo: string;
    department?: string;
  }): Promise<MailDispatchResult> {
    const targetEmail = notice.email?.trim().toLowerCase();
    const subject = `Respuesta a Solicitud de Préstamo: ${notice.document} — Coraza Seguridad C.T.A.`;
    if (!targetEmail || !targetEmail.includes('@')) {
      return { ok: false, via: null, error: 'Sin correo válido', subject, to: notice.email || '' };
    }
    return this.dispatchMail(targetEmail, subject, this.buildRejectionEmailTemplate(notice));
  }

  async sendLoanReturnEmail(notice: {
    id: string;
    requester: string;
    email: string;
    document: string;
    returnDate?: string;
    department?: string;
  }): Promise<MailDispatchResult> {
    const targetEmail = notice.email?.trim().toLowerCase();
    const subject = `Devolución registrada: ${notice.document} — Coraza Seguridad C.T.A.`;
    if (!targetEmail || !targetEmail.includes('@')) {
      return { ok: false, via: null, error: 'Sin correo válido', subject, to: notice.email || '' };
    }
    return this.dispatchMail(targetEmail, subject, this.buildReturnEmailTemplate(notice));
  }

  /** Aviso interno a documental@ con la ficha completa de una solicitud pública. */
  async sendNewLoanRequestToArchive(notice: {
    id: string;
    requester: string;
    email: string;
    department?: string;
    document: string;
    observations: string;
    returnDate?: string;
  }): Promise<MailDispatchResult> {
    const subject = `Nueva solicitud de préstamo: ${notice.document} — Coraza Seguridad C.T.A.`;
    const safeObs = notice.observations
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const html = `
      <!DOCTYPE html>
      <html lang="es"><head><meta charset="UTF-8">
      <style>
        body { font-family: Segoe UI, Roboto, sans-serif; background:#f1f5f9; padding:20px; color:#0f172a; }
        .box { max-width:640px; margin:0 auto; background:#fff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; }
        .h { background:#0c4a6e; color:#fff; padding:18px 22px; }
        .h h1 { margin:0; font-size:18px; }
        .c { padding:22px; font-size:14px; line-height:1.5; }
        pre { white-space:pre-wrap; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; font-size:13px; }
      </style></head>
      <body><div class="box">
        <div class="h"><h1>Nueva solicitud de préstamo</h1></div>
        <div class="c">
          <p>Radicado: <strong>${notice.id}</strong></p>
          <p>Solicitante: <strong>${notice.requester}</strong><br>
          Correo del solicitante: ${notice.email || '—'}<br>
          Área: ${notice.department || '—'}<br>
          Devolución estimada: ${notice.returnDate || '—'}</p>
          <p><strong>Expediente:</strong> ${notice.document}</p>
          <pre>${safeObs}</pre>
        </div>
      </div></body></html>`;
    return this.dispatchMail(this.senderEmail, subject, html);
  }

  private async dispatchMail(to: string, subject: string, htmlBody: string): Promise<MailDispatchResult> {
    const cleanTo = to.trim().toLowerCase();
    const provider = this.mailProvider();
    const errors: string[] = [];

    if (provider === 'smtp') {
      const smtp = await this.sendViaSmtp(cleanTo, subject, htmlBody);
      if (smtp.ok) return { ok: true, via: 'smtp', error: null, subject, to: cleanTo };
      errors.push(smtp.error || 'SMTP falló');
      this.logger.warn(`⚠️ SMTP falló para ${cleanTo}; intentando Resend...`);
    }

    const resend = await this.sendViaResend(cleanTo, subject, htmlBody);
    if (resend.ok) return { ok: true, via: 'resend', error: null, subject, to: cleanTo };
    if (resend.error) errors.push(resend.error);

    if (provider === 'resend') {
      const smtp = await this.sendViaSmtp(cleanTo, subject, htmlBody);
      if (smtp.ok) return { ok: true, via: 'smtp', error: null, subject, to: cleanTo };
      if (smtp.error) errors.push(smtp.error);
    }

    return { ok: false, via: null, error: errors.join(' | ') || 'No se pudo enviar', subject, to: cleanTo };
  }

  private async sendViaSmtp(to: string, subject: string, htmlBody: string): Promise<{ ok: boolean; error: string | null }> {
    const cfg = this.smtpConfig();
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
      return { ok: true, error: null };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`❌ Error SMTP a ${to}: ${errorMsg}`);
      return { ok: false, error: errorMsg };
    }
  }

  private async sendViaResend(to: string, subject: string, htmlBody: string): Promise<{ ok: boolean; error: string | null }> {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (!resendKey) return { ok: false, error: null };

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
        return { ok: true, error: null };
      }

      this.logger.warn(`⚠️ Resend (${res.status})`);
      return { ok: false, error: `Resend ${res.status}` };
    } catch (httpErr: unknown) {
      const msg = httpErr instanceof Error ? httpErr.message : String(httpErr);
      this.logger.warn(`⚠️ Error Resend: ${msg}`);
      return { ok: false, error: msg };
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

  private buildReturnEmailTemplate(notice: {
    requester: string;
    document: string;
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
          .thanks { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; font-size: 13px; color: #166534; line-height: 1.5; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CORAZA SEGURIDAD C.T.A.</h1>
            <p>Sistema de Gestión Documental · Archivo Central &amp; Custodia</p>
          </div>
          <div class="content">
            <div class="badge-ok">DEVOLUCIÓN REGISTRADA</div>
            <div class="greeting">Estimado(a) ${notice.requester},</div>
            <div class="message">
              Le confirmamos que Gestión Documental recibió y registró la devolución del expediente/documento prestado.
              <strong>Gracias por el buen cumplimiento</strong> y por devolverlo de forma oportuna.
            </div>
            <div class="details-card">
              <div class="detail-row">
                <span class="detail-label">Documento / Expediente:</span>
                <span class="detail-value">${notice.document}</span>
              </div>
              ${notice.returnDate ? `
              <div class="detail-row">
                <span class="detail-label">Fecha de devolución:</span>
                <span class="detail-value">${notice.returnDate}</span>
              </div>` : ''}
              ${notice.department ? `
              <div class="detail-row">
                <span class="detail-label">Área / Dependencia:</span>
                <span class="detail-value">${notice.department}</span>
              </div>` : ''}
            </div>
            <div class="thanks">
              Su préstamo queda cerrado en el sistema. Agradecemos su colaboración con el archivo central.
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
