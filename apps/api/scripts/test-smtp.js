const nodemailer = require('nodemailer');

async function testGmailSmtp() {
  console.log('Testing SMTP connection for Google Workspace (smtp.gmail.com)...');
  
  // Try port 465 (SSL)
  const transporterSsl = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'documental@corazaseguridadcta.com',
      pass: 'Freider2027*',
    },
  });

  try {
    await transporterSsl.verify();
    console.log('✓ SUCCESS: Connected to smtp.gmail.com on port 465!');
    return;
  } catch (err) {
    console.log('Port 465 failed:', err.message);
  }

  // Try port 587 (TLS)
  const transporterTls = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'documental@corazaseguridadcta.com',
      pass: 'Freider2027*',
    },
  });

  try {
    await transporterTls.verify();
    console.log('✓ SUCCESS: Connected to smtp.gmail.com on port 587!');
  } catch (err) {
    console.log('Port 587 failed:', err.message);
  }
}

testGmailSmtp().catch(console.error);
