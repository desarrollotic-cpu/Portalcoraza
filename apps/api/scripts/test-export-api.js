const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testApiEndpoint() {
  const JWT_SECRET = process.env.JWT_SECRET || 'coraza-secret-key-2026';
  // generate admin token
  const token = jwt.sign(
    { sub: 'a0000000-0000-0000-0000-000000000001', email: 'admin@portalcoraza.com', role: 'ADMIN', permissions: ['scheduling.view', 'scheduling.edit'] },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('Testing export-excel endpoint on https://portalcoraza.onrender.com...');
  try {
    const res = await fetch('https://portalcoraza.onrender.com/api/v1/scheduling/monthly/payroll-recargos/export-excel?year=2026&month=8', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Status Code:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    const buffer = await res.arrayBuffer();
    console.log('Downloaded Excel file size in bytes:', buffer.byteLength);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testApiEndpoint().catch(console.error);
