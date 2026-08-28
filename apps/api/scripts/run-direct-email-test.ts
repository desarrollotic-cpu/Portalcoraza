async function runDirectEmailTest() {
  const apiBase = 'https://portalcoraza.onrender.com/api/v1';

  console.log('Logging in as admin...');
  const loginRes = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@corazaseguridadcta.com',
      password: 'Coraza2026!',
    }),
  });
  const loginData = await loginRes.json() as any;
  const token = loginData.accessToken;

  console.log('Calling test-email-direct on live server...');
  const testRes = await fetch(`${apiBase}/documental/loans/test-email-direct`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await testRes.text();
  console.log('Result from live server:', text);
}

runDirectEmailTest().catch(console.error);
