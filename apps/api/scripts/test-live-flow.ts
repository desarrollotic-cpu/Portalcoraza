async function testLiveFlow() {
  const apiBase = 'https://portalcoraza.onrender.com/api/v1';

  console.log('1. Creando solicitud publica de prestamo...');
  const reqRes = await fetch(`${apiBase}/public/documental/loan-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: 'Jhon Fredy Coraza (Prueba Live)',
      cedula: '123456789',
      email: 'documental@corazaseguridadcta.com',
      departamento: 'Gestion Documental',
      documento: 'Expediente Prueba Live #999',
      motivo: 'Verificacion de notificaciones automaticas',
      fechaDevolucion: '2026-08-30',
    }),
  });
  const reqText = await reqRes.text();
  console.log('Respuesta Solicitud:', reqText);
  const reqData = JSON.parse(reqText);
  const loanId = reqData.id || reqData.data?.id;

  console.log('2. Iniciando sesion como admin...');
  const loginRes = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@corazaseguridadcta.com',
      password: 'Coraza2026!',
    }),
  });
  const loginText = await loginRes.text();
  const loginData = JSON.parse(loginText);
  const token = loginData.accessToken || loginData.data?.accessToken;

  console.log(`3. Aprobando prestamo ${loanId}...`);
  const approveRes = await fetch(`${apiBase}/documental/loans/${loanId}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Aprobado Response:', await approveRes.text());

  console.log(`4. Rechazando prestamo ${loanId} con motivo...`);
  const rejectRes = await fetch(`${apiBase}/documental/loans/${loanId}/reject`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      motivoRechazo: 'Expediente en auditoria fisica temporal',
    }),
  });
  console.log('Rechazado Response:', await rejectRes.text());

  console.log(`5. Reconsiderando y Aprobando prestamo ${loanId}...`);
  const reApproveRes = await fetch(`${apiBase}/documental/loans/${loanId}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Reconsiderado Response:', await reApproveRes.text());
}

testLiveFlow().catch(console.error);
