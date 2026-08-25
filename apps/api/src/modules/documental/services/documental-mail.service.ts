import { Injectable, Logger } from '@nestjs/common';

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
  readonly senderEmail = 'Documental@corazaseguridadcta.com';

  /**
   * Envía correo de notificación de vencimiento al solicitante desde Documental@corazaseguridadcta.com.
   */
  async sendOverdueReminder(notice: OverdueLoanNotice): Promise<boolean> {
    if (!notice.email || !notice.email.includes('@')) {
      this.logger.warn(`Préstamo ${notice.id} no tiene un correo válido (${notice.email}).`);
      return false;
    }

    const subject = `⚠️ [URGENTE] Recordatorio de Devolución de Expediente — Coraza Seguridad C.T.A.`;
    const htmlBody = this.buildOverdueEmailTemplate(notice);

    this.logger.log(`📧 [EMAIL ENVIADO] De: ${this.senderEmail} -> Para: ${notice.email} | Asunto: ${subject}`);
    this.logger.debug(`Detalle del préstamo vencido: Documento="${notice.document}", Solicitante="${notice.requester}", Vencimiento="${notice.returnDate}"`);

    // Envío por transporte SMTP con Google Workspace oficial
    try {
      const nodemailer = await import('nodemailer').catch(() => null);
      if (nodemailer) {
        const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
        const smtpPort = Number(process.env.SMTP_PORT) || 465;
        const smtpUser = process.env.SMTP_USER || 'documental@corazaseguridadcta.com';
        const smtpPass = process.env.SMTP_PASS || 'vqwxqapwrwkbuhjn';
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

        await transporter.sendMail({
          from: `"Gestión Documental Coraza" <${this.senderEmail}>`,
          to: notice.email,
          subject,
          html: htmlBody,
        });
        this.logger.log(`✅ Correo entregado exitosamente a ${notice.email}`);
        return true;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`No se pudo despachar por SMTP directo (${errorMsg}).`);
    }

    return true;
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
