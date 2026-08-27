const nodemailer = require('nodemailer');

async function testRealSmtp() {
  console.log('Testing SMTP connection with Google Workspace App Password...');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'documental@corazaseguridadcta.com',
      pass: 'vqwxqapwrwkbuhjn',
    },
  });

  await transporter.verify();
  console.log('✓✓✓ CONEXIÓN SMTP EXITOSA CON GOOGLE WORKSPACE!');

  // Send a test email to documental@corazaseguridadcta.com to confirm delivery
  const info = await transporter.sendMail({
    from: '"Gestión Documental Coraza" <documental@corazaseguridadcta.com>',
    to: 'documental@corazaseguridadcta.com',
    subject: '✅ Prueba de Conexión Exitosa — Portal Coraza',
    html: '<h2>¡Sistema de Notificaciones Coraza Activo!</h2><p>Este correo confirma que el servidor de correo saliente está 100% conectado y operativo.</p>',
  });

  console.log('✓ Correo de prueba entregado con ID:', info.messageId);
}

testRealSmtp().catch(console.error);
