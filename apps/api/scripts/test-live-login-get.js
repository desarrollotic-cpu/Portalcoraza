const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

async function testLoginAndGet() {
  const loginUrl = 'https://portalcoraza.onrender.com/api/v1/auth/login';
  console.log('Logging in to Render API...');
  const loginRes = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@corazaseguridadcta.com', password: 'Coraza2026!' })
  });

  console.log('Login Status:', loginRes.status);
  const loginData = await loginRes.json();
  const token = loginData.accessToken || loginData.token;
  console.log('Token obtained:', Boolean(token));

  if (!token) {
    console.log('Login response:', loginData);
    return;
  }

  const pId = 'a0ec33a3-2607-416b-b0bf-9be1e4aab1c7'; // COOPIDROGAS
  const url = `https://portalcoraza.onrender.com/api/v1/scheduling/monthly?postId=${pId}&year=2026&month=8`;

  console.log('Testing GET:', url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Response Status:', res.status);
  const text = await res.text();
  console.log('Response Body:', text.slice(0, 500));
}

testLoginAndGet().catch(console.error);
