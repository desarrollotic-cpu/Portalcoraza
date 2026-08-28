import * as nodemailer from 'nodemailer';

async function testPooledMail() {
  console.log('Testing pooled transport...');
  const t = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    pool: true,
    auth: {
      user: 'documental@corazaseguridadcta.com',
      pass: 'vqwxqapwrwkbuhjn',
    },
  });

  const start = Date.now();
  try {
    const info = await t.sendMail({
      from: '"Gestión Documental Coraza" <documental@corazaseguridadcta.com>',
      to: 'documental@corazaseguridadcta.com',
      subject: 'Prueba Pooled',
      text: 'Hola prueba pooled',
    });
    console.log(`✅ Mail sent in ${Date.now() - start}ms:`, info.messageId);
  } catch (e) {
    console.error(`❌ Error in ${Date.now() - start}ms:`, e);
  }
}

testPooledMail();
