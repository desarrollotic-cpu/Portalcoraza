const nodemailer = require('nodemailer');

async function sendTestNotification() {
  console.log('Enviando notificación oficial de prueba para Geraldine...');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'documental@corazaseguridadcta.com',
      pass: 'vqwxqapwrwkbuhjn',
    },
  });

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
        .header p { margin: 4px 0 0; font-size: 13px; color: #93c5fd; }
        .content { padding: 28px 24px; }
        .alert-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 999px; font-weight: 800; font-size: 12px; margin-bottom: 16px; border: 1px solid #86efac; }
        .greeting { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
        .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
        .details-card { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
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
          <div class="alert-badge">📋 NOTIFICACIÓN DE PRÉSTAMO DE EXPEDIENTE</div>
          <div class="greeting">Estimado(a) Geraldine Johana Osorio Sanchez,</div>
          <div class="message">
            Le informamos que se encuentra registrado en el sistema el préstamo del siguiente expediente en custodia temporal:
          </div>

          <div class="details-card">
            <div class="detail-row">
              <span class="detail-label">📄 Documento / Carpeta:</span>
              <span class="detail-value">3631</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">👤 Solicitante:</span>
              <span class="detail-value">Geraldine Johana Osorio Sanchez (CC: 1017238882)</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🏢 Dependencia:</span>
              <span class="detail-value">GESTIÓN HUMANA</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📅 Fecha Límite de Devolución:</span>
              <span class="detail-value" style="color:#1d4ed8;">2026-09-26</span>
            </div>
          </div>

          <div class="instructions">
            <strong>📌 Instrucciones:</strong><br>
            Al finalizar su consulta, recuerde realizar la entrega física en la ventanilla de Gestión Documental para el cierre formal de la custodia.
          </div>
        </div>
        <div class="footer">
          Mensaje automático generado por el Sistema de Gestión Documental de Coraza Seguridad C.T.A.<br>
          Remitente oficial: <strong>Documental@corazaseguridadcta.com</strong>
        </div>
      </div>
    </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from: '"Gestión Documental Coraza" <Documental@corazaseguridadcta.com>',
    to: 'BIENESTAR@CORAZASEGURIDADCTA.COM',
    subject: '📋 Notificación de Préstamo de Expediente #3631 — Coraza Seguridad C.T.A.',
    html: htmlBody,
  });

  console.log('✓✓ NOTIFICACIÓN ENTREGADA EXITOSAMENTE a BIENESTAR@CORAZASEGURIDADCTA.COM con ID:', info.messageId);
}

sendTestNotification().catch(console.error);
