async function diagnoseLiveApi() {
  const apiBase = 'https://portalcoraza.onrender.com/api/v1';

  console.log('--- PASO 1: VERIFICAR LOGIN ADMIN ---');
  let token = '';
  try {
    const loginRes = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@corazaseguridadcta.com',
        password: 'Coraza2026!',
      }),
    });
    console.log('Login Status:', loginRes.status);
    const loginData = await loginRes.json() as any;
    token = loginData.accessToken;
    console.log('Token obtenido:', token ? 'SI (OK)' : 'NO');
  } catch (e) {
    console.error('Error en Login:', e);
    return;
  }

  console.log('\n--- PASO 2: OBTENER LISTA DE PRESTAMOS ---');
  let loans: any[] = [];
  try {
    const listRes = await fetch(`${apiBase}/documental/loans`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('List Status:', listRes.status);
    loans = await listRes.json() as any[];
    console.log(`Préstamos obtenidos: ${loans.length}`);
    if (loans.length > 0) {
      console.log('Primer préstamo:', {
        id: loans[0].id,
        requester: loans[0].requester,
        email: loans[0].email,
        status: loans[0].status,
      });
    }
  } catch (e) {
    console.error('Error en List:', e);
  }

  console.log('\n--- PASO 3: CREAR SOLICITUD DE PRESTAMO DIRECTA CON CORREO ---');
  let newLoanId = '';
  try {
    const reqRes = await fetch(`${apiBase}/public/documental/loan-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Prueba Automatizada Notificacion',
        cedula: '99887766',
        email: 'documental@corazaseguridadcta.com',
        departamento: 'Gestion Documental',
        documento: 'Expediente Prueba Test Directo',
        motivo: 'Verificar despacho inmediato de correo',
        fechaDevolucion: '2026-08-31',
      }),
    });
    console.log('Public Request Status:', reqRes.status);
    const reqData = await reqRes.json() as any;
    console.log('Public Request Body:', reqData);
    newLoanId = reqData.id;
  } catch (e) {
    console.error('Error creando solicitud:', e);
  }

  if (newLoanId) {
    console.log(`\n--- PASO 4: PROBAR APROBACION DE PRESTAMO ${newLoanId} ---`);
    try {
      const approveRes = await fetch(`${apiBase}/documental/loans/${newLoanId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Approve Status:', approveRes.status);
      const approveText = await approveRes.text();
      console.log('Approve Body:', approveText);
    } catch (e) {
      console.error('Error en Approve:', e);
    }

    console.log(`\n--- PASO 5: PROBAR RECHAZO DE PRESTAMO ${newLoanId} ---`);
    try {
      const rejectRes = await fetch(`${apiBase}/documental/loans/${newLoanId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          motivoRechazo: 'Motivo de prueba de rechazo automatico',
        }),
      });
      console.log('Reject Status:', rejectRes.status);
      const rejectText = await rejectRes.text();
      console.log('Reject Body:', rejectText);
    } catch (e) {
      console.error('Error en Reject:', e);
    }
  }
}

diagnoseLiveApi();
