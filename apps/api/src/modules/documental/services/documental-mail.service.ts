import { Injectable, Logger } from '@nestjs/common';
import * as tls from 'tls';
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

  constructor() {
    // No abrir pool SMTP al arrancar: en Render el puerto 465/587 hace timeout y bloquea los correos.
  }

  /** En Render el SMTP de Gmail suele estar bloqueado; Resend (HTTPS) va primero. */
  private mailProvider(): 'smtp' | 'resend' {
    const explicit = (process.env.MAIL_PROVIDER || '').trim().toLowerCase();
    if (explicit === 'smtp' || explicit === 'resend') return explicit;
    if (process.env.RENDER) return 'resend';
    return 'smtp';
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

    if (provider === 'resend') {
      const resend = await this.sendViaResend(cleanTo, subject, htmlBody);
      if (resend.ok) {
        await this.copyToGmailSent(cleanTo, subject, htmlBody);
        return { ok: true, via: 'resend', error: null, subject, to: cleanTo };
      }
      if (resend.error) errors.push(resend.error);
      if (!process.env.RENDER) {
        const smtp = await this.sendViaSmtp(cleanTo, subject, htmlBody);
        if (smtp.ok) return { ok: true, via: 'smtp', error: null, subject, to: cleanTo };
        if (smtp.error) errors.push(smtp.error);
      }
      return { ok: false, via: null, error: errors.join(' | ') || 'No se pudo enviar', subject, to: cleanTo };
    }

    const smtp = await this.sendViaSmtp(cleanTo, subject, htmlBody);
    if (smtp.ok) return { ok: true, via: 'smtp', error: null, subject, to: cleanTo };
    errors.push(smtp.error || 'SMTP falló');
    const resend = await this.sendViaResend(cleanTo, subject, htmlBody);
    if (resend.ok) {
      await this.copyToGmailSent(cleanTo, subject, htmlBody);
      return { ok: true, via: 'resend', error: null, subject, to: cleanTo };
    }
    if (resend.error) errors.push(resend.error);
    return { ok: false, via: null, error: errors.join(' | ') || 'No se pudo enviar', subject, to: cleanTo };
  }

  private async sendViaSmtp(to: string, subject: string, htmlBody: string): Promise<{ ok: boolean; error: string | null }> {
    const cfg = this.smtpConfig();
    const attempts = [
      { port: 587, secure: false },
      { port: cfg.port, secure: cfg.secure },
    ];
    const errors: string[] = [];
    for (const attempt of attempts) {
      try {
        const transporter = nodemailer.createTransport({
          host: cfg.host,
          port: attempt.port,
          secure: attempt.secure,
          requireTLS: !attempt.secure,
          connectionTimeout: 6000,
          greetingTimeout: 6000,
          socketTimeout: 8000,
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
        this.logger.log(`✅ [SMTP ${attempt.port}] Para: ${to} | ID: ${info.messageId}`);
        return { ok: true, error: null };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`SMTP ${attempt.port}: ${errorMsg}`);
      }
    }
    this.logger.error(`❌ SMTP a ${to}: ${errors.join(' | ')}`);
    return { ok: false, error: errors.join(' | ') };
  }

  /** Gmail solo muestra Enviados si el mensaje queda en esa carpeta de la cuenta documental@. */
  private async copyToGmailSent(to: string, subject: string, htmlBody: string): Promise<void> {
    const cfg = this.smtpConfig();
    const subj = /^[\x20-\x7E]*$/.test(subject)
      ? subject
      : `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
    const raw =
      `From: "Gestión Documental Coraza" <${cfg.user}>\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subj}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=UTF-8\r\n` +
      `Content-Transfer-Encoding: 8bit\r\n` +
      `\r\n` +
      htmlBody.replace(/\r?\n/g, '\r\n');
    try {
      await this.imapAppendSent(cfg.user, cfg.pass, raw);
      this.logger.log(`✅ Copia en Gmail Enviados → ${to}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`⚠️ No se pudo dejar copia en Enviados: ${msg}`);
    }
  }

  private imapAppendSent(user: string, pass: string, raw: string): Promise<void> {
    const size = Buffer.byteLength(raw, 'utf8');
    const folders = ['[Gmail]/Sent Mail', '[Gmail]/Enviados'];
    return new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: 'imap.gmail.com',
        port: 993,
        servername: 'imap.gmail.com',
        timeout: 7000,
      });
      let buf = '';
      let step: 'greet' | 'login' | 'wait-plus' | 'wait-ok' = 'greet';
      let folderIdx = 0;
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('IMAP timeout'));
      }, 8000);
      const sendLine = (s: string) => socket.write(s + '\r\n');
      const finish = (err?: Error) => {
        clearTimeout(timer);
        socket.end();
        if (err) reject(err);
        else resolve();
      };
      socket.on('data', (chunk) => {
        buf += chunk.toString('utf8');
        if (step === 'greet' && /\n.*OK /i.test(buf)) {
          buf = '';
          step = 'login';
          sendLine(`a LOGIN "${user}" "${pass}"`);
        } else if (step === 'login' && /^a (OK|NO|BAD)/im.test(buf)) {
          if (!/^a OK/im.test(buf)) {
            finish(new Error('IMAP login rechazado'));
            return;
          }
          buf = '';
          step = 'wait-plus';
          sendLine(`b APPEND "${folders[folderIdx]}" (\\Seen) {${size}}`);
        } else if (step === 'wait-plus' && buf.includes('+')) {
          buf = '';
          step = 'wait-ok';
          socket.write(raw + '\r\n');
        } else if (step === 'wait-ok' && /^b (OK|NO|BAD)/im.test(buf)) {
          if (/^b OK/im.test(buf)) {
            sendLine('c LOGOUT');
            finish();
            return;
          }
          if (folderIdx === 0) {
            folderIdx = 1;
            buf = '';
            step = 'wait-plus';
            sendLine(`d APPEND "${folders[1]}" (\\Seen) {${size}}`);
            return;
          }
          finish(new Error(buf.replace(/\s+/g, ' ').slice(0, 160)));
        } else if (step === 'wait-ok' && /^d (OK|NO|BAD)/im.test(buf)) {
          if (/^d OK/im.test(buf)) {
            sendLine('c LOGOUT');
            finish();
            return;
          }
          finish(new Error(buf.replace(/\s+/g, ' ').slice(0, 160)));
        }
      });
      socket.on('error', (e) => finish(e));
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('IMAP socket timeout'));
      });
    });
  }

  private async postResend(
    resendKey: string,
    payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; status: number; body: string }> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  }

  private async sendViaResend(to: string, subject: string, htmlBody: string): Promise<{ ok: boolean; error: string | null }> {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (!resendKey) return { ok: false, error: null };

    const fromOnboarding = 'Gestión Documental Coraza <onboarding@resend.dev>';
    const fromCustom = process.env.MAIL_FROM || `Gestión Documental Coraza <${this.senderEmail}>`;

    try {
      const tries = [
        { from: fromOnboarding, to: [to] },
        { from: fromCustom, to: [to] },
        { from: fromOnboarding, to: [to], bcc: [this.senderEmail] },
      ];
      let lastErr = '';
      for (const t of tries) {
        const res = await this.postResend(resendKey, {
          from: t.from,
          to: t.to,
          bcc: t.bcc,
          reply_to: this.senderEmail,
          subject,
          html: htmlBody,
        });
        if (res.ok) {
          this.logger.log(`✅ [RESEND] Para: ${to} | ${res.body}`);
          return { ok: true, error: null };
        }
        lastErr = `Resend ${res.status}: ${res.body.slice(0, 220)}`;
      }

      // Cuenta Resend en modo prueba: solo entrega al dueño. Deja copia en documental@.
      if (to !== this.senderEmail) {
        const copy = await this.postResend(resendKey, {
          from: fromOnboarding,
          to: [this.senderEmail],
          reply_to: to,
          subject: `${subject} (para: ${to})`,
          html: `<p><strong>Destinatario original:</strong> ${to}</p>${htmlBody}`,
        });
        if (copy.ok) {
          this.logger.warn(`⚠️ Resend no entrega a ${to}; copia en ${this.senderEmail}`);
          return {
            ok: false,
            error: `${lastErr} | Copia interna dejada en ${this.senderEmail}`,
          };
        }
      }

      this.logger.warn(`⚠️ ${lastErr}`);
      return { ok: false, error: lastErr || 'Resend falló' };
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
