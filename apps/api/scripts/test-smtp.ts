import * as nodemailer from 'nodemailer';

async function testMail() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpUser = process.env.SMTP_USER || 'documental@corazaseguridadcta.com';
  const smtpPass = process.env.SMTP_PASS || 'vqwxqapwrwkbuhjn';
  const smtpSecure = process.env.SMTP_SECURE !== 'false';

  console.log(`Testing SMTP with user: ${smtpUser} via ${smtpHost}:${smtpPort}...`);

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP transporter verified successfully!');

    const info = await transporter.sendMail({
      from: `"Gestión Documental Coraza" <${smtpUser}>`,
      to: smtpUser, // Send to itself as a test
      subject: '🧪 [TEST] Prueba de Envío Gestión Documental Coraza',
      html: '<h1>Prueba de Envío Exitosa</h1><p>Este es un correo de prueba del sistema.</p>',
    });

    console.log('✅ Mail sent successfully:', info.messageId);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('❌ SMTP Error:', err);
  }
}

testMail();
