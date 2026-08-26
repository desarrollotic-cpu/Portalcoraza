import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    console.log('1. Actualizando Check Constraint de Áreas en sig_indicadores...');
    await client.query(`
      ALTER TABLE sig_indicadores DROP CONSTRAINT IF EXISTS sig_indicadores_area_check;
      ALTER TABLE sig_indicadores ADD CONSTRAINT sig_indicadores_area_check 
        CHECK (area IN ('GH', 'SST', 'COMERCIAL', 'OPERACIONES', 'ADMIN', 'DOTACION', 'DOCUMENTAL', 'RECEPCION', 'CALIDAD'));
    `);

    console.log('2. Insertando objetivos de todas las áreas...');
    await client.query(`
      INSERT INTO sig_objetivos (id, sistema_id, perspectiva, objetivo_texto, estrategia) VALUES
        ('b2000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000001', 'PROCESOS', 'Eficiencia en Suministro de Dotación y Logística', 'Tiempos de entrega y control de inventarios'),
        ('b2000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-000000000001', 'PROCESOS', 'Custodia y Oportunidad en Gestión Documental', 'Radicación, digitalización y archivo'),
        ('b2000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000001', 'CLIENTES', 'Calidad en Recepción y Atención al Usuario', 'Control de visitantes y correspondencia')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('3. Insertando indicadores para todas las áreas...');
    await client.query(`
      INSERT INTO sig_indicadores (id, codigo, nombre, objetivo_id, subsistema, proposito, formula, frecuencia, sentido, area, responsable) VALUES
        ('c3000000-0000-4000-8000-000000000021', 'D1', 'OPORTUNIDAD ENTREGA DOTACION', 'b2000000-0000-4000-8000-000000000008', 'SIG', 'Entregas a tiempo según periodo legal', '(Entregas a tiempo / Total programadas) * 100', 'TRIMESTRAL', 'ASCENDENTE', 'DOTACION', 'Almacén y Dotación'),
        ('c3000000-0000-4000-8000-000000000022', 'D2', 'DISPONIBILIDAD DE INVENTARIO', 'b2000000-0000-4000-8000-000000000008', 'SIG', 'Nivel de stock disponible de prendas clave', '(Ítems con stock / Total catálogo) * 100', 'MENSUAL', 'ASCENDENTE', 'DOTACION', 'Almacén y Dotación'),
        ('c3000000-0000-4000-8000-000000000023', 'G1', 'OPORTUNIDAD RADICACION SGD', 'b2000000-0000-4000-8000-000000000009', 'SIG', 'Radicación y respuesta en tiempos fijados', '(Comunicaciones tramitadas a tiempo / Total) * 100', 'MENSUAL', 'ASCENDENTE', 'DOCUMENTAL', 'Gestión Documental'),
        ('c3000000-0000-4000-8000-000000000024', 'G2', 'DEVOLUCION PRESTAMOS ARCHIVO', 'b2000000-0000-4000-8000-000000000009', 'SIG', 'Control de expedientes y préstamos devueltos', '(Carpetas devueltas a tiempo / Total prestadas) * 100', 'MENSUAL', 'ASCENDENTE', 'DOCUMENTAL', 'Gestión Documental'),
        ('c3000000-0000-4000-8000-000000000025', 'R1', 'CONTROL ACCESO VISITANTES', 'b2000000-0000-4000-8000-000000000010', 'SIG', 'Registro digital completo de ingresos/salidas', '(Visitantes registrados con salida / Total) * 100', 'MENSUAL', 'ASCENDENTE', 'RECEPCION', 'Recepción Sede Central'),
        ('c3000000-0000-4000-8000-000000000026', 'B1', 'CUMPLIMIENTO ESTANDARES BASC', 'b2000000-0000-4000-8000-000000000007', 'BASC', 'Auditorías y controles de seguridad en cadena', '(Controles aprobados / Total evaluados) * 100', 'SEMESTRAL', 'ASCENDENTE', 'CALIDAD', 'Líder SIG / Calidad')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('4. Insertando resultados 2026 para los nuevos indicadores...');
    await client.query(`
      INSERT INTO sig_resultados (indicador_id, anio, periodo, meta_snapshot, valor_resultado, observaciones, color_semaforo, seguimiento, capturado_por) VALUES
        ('c3000000-0000-4000-8000-000000000021', 2026, '07', 95, 96.5, 'Dotación entregada en los plazos previstos', 'VERDE', 'CERRADO', 'admin@corazaseguridadcta.com'),
        ('c3000000-0000-4000-8000-000000000022', 2026, '07', 90, 92.0, 'Inventario de uniformes completo en sedes', 'VERDE', 'CERRADO', 'admin@corazaseguridadcta.com'),
        ('c3000000-0000-4000-8000-000000000023', 2026, '07', 98, 99.0, '100% de radicados procesados dentro de los 3 días hábiles', 'VERDE', 'CERRADO', 'admin@corazaseguridadcta.com'),
        ('c3000000-0000-4000-8000-000000000024', 2026, '07', 95, 96.0, 'Control riguroso de archivo físico', 'VERDE', 'CERRADO', 'admin@corazaseguridadcta.com'),
        ('c3000000-0000-4000-8000-000000000025', 2026, '07', 98, 98.5, 'Minuta de recepción y registro digital de visitantes al día', 'VERDE', 'CERRADO', 'admin@corazaseguridadcta.com'),
        ('c3000000-0000-4000-8000-000000000026', 2026, '07', 90, 93.0, 'Estándares internacionales de seguridad cumplidos', 'VERDE', 'CERRADO', 'admin@corazaseguridadcta.com')
      ON CONFLICT (indicador_id, anio, periodo) DO NOTHING;
    `);

    // Resumen por área
    const res = await client.query(`
      SELECT area, COUNT(*) as total_indicadores
      FROM sig_indicadores
      GROUP BY area
      ORDER BY area;
    `);
    console.log('Resumen de Indicadores por Área en SIG:');
    console.table(res.rows);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
