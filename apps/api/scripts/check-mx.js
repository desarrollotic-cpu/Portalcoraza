const dns = require('dns');

dns.resolveMx('corazaseguridadcta.com', (err, addresses) => {
  if (err) {
    console.error('Error resolving MX:', err);
    return;
  }
  console.log('MX records for corazaseguridadcta.com:', addresses);
});
