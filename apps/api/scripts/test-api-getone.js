const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'coraza_dev_secret_key_2026_change_in_production_min32chars';
const token = jwt.sign({ sub: 'd45d0ba1-282e-415a-9d66-815914ba9985', email: 'admin@corazaseguridadcta.com', role: 'GERENCIA' }, JWT_SECRET, { expiresIn: '1h' });

async function testEndpoint() {
  const pId = 'a0ec33a3-2607-416b-b0bf-9be1e4aab1c7'; // COOPIDROGAS
  const url = `https://portalcoraza.onrender.com/api/v1/scheduling/monthly?postId=${pId}&year=2026&month=8`;

  console.log('Testing GET:', url);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Response Status:', res.status);
    const text = await res.text();
    console.log('Response Body Preview:', text.slice(0, 300));
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

testEndpoint().catch(console.error);
