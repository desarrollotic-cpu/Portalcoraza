import { Injectable, Logger } from '@nestjs/common';
import * as tls from 'tls';
import * as nodemailer from 'nodemailer';
import {
  approvalLoanHtml,
  htmlToPlain,
  newLoanRequestHtml,
  overdueLoanHtml,
  rejectionLoanHtml,
  returnLoanHtml,
} from './loan-mail-layout';

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
    return this.dispatchMail(targetEmail, subject, overdueLoanHtml(notice));
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
    return this.dispatchMail(targetEmail, subject, approvalLoanHtml(notice));
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
    return this.dispatchMail(targetEmail, subject, rejectionLoanHtml(notice));
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
    return this.dispatchMail(targetEmail, subject, returnLoanHtml(notice));
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
    return this.dispatchMail(this.senderEmail, subject, newLoanRequestHtml(notice));
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
          text: htmlToPlain(htmlBody),
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
    const b64 = Buffer.from(htmlBody, 'utf8')
      .toString('base64')
      .replace(/(.{76})/g, '$1\r\n');
    const raw =
      `From: "Gestion Documental Coraza" <${cfg.user}>\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subj}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=UTF-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n` +
      `\r\n` +
      b64 +
      `\r\n`;
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
          text: htmlToPlain(htmlBody),
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
}
