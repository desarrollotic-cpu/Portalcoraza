async function test() {
  const loginRes = await fetch('https://portalcoraza.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@portalcoraza.com', password: 'AdminCoraza2026*' })
  });
  
  console.log('Login status:', loginRes.status);
  const data = await loginRes.json();
  if (!data.accessToken) {
    console.log('Login failed:', data);
    return;
  }
  
  console.log('Login OK! Testing export-excel with real token...');
  const expRes = await fetch('https://portalcoraza.onrender.com/api/v1/scheduling/monthly/payroll-recargos/export-excel?year=2026&month=8', {
    headers: {
      'Authorization': `Bearer ${data.accessToken}`
    }
  });

  console.log('Export Status:', expRes.status);
  console.log('Headers:', expRes.headers.get('content-type'));
  const buf = await expRes.arrayBuffer();
  console.log('Buffer size in bytes:', buf.byteLength);
}

test().catch(console.error);
