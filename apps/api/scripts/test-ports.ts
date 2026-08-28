import * as nodemailer from 'nodemailer';

async function testPorts() {
  console.log('--- TEST 1: Port 587 (secure: false, STARTTLS) ---');
  try {
    const t587 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'documental@corazaseguridadcta.com',
        pass: 'vqwxqapwrwkbuhjn',
      },
    });
    await t587.verify();
    console.log('✅ Port 587 verified instantly!');
  } catch (e) {
    console.error('❌ Port 587 error:', e);
  }

  console.log('\n--- TEST 2: Port 465 (secure: true, SSL) ---');
  try {
    const t465 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'documental@corazaseguridadcta.com',
        pass: 'vqwxqapwrwkbuhjn',
      },
    });
    await t465.verify();
    console.log('✅ Port 465 verified!');
  } catch (e) {
    console.error('❌ Port 465 error:', e);
  }
}

testPorts();
