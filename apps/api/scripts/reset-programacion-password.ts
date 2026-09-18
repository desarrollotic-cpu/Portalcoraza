/**
 * reset-programacion-password.ts
 *
 * Restablece la contraseña del usuario a cargo del módulo de Programación
 * (Jairo). Idempotente: solo actualiza el hash. Usar cuando la clave se
 * pierda o cuando haya que rotarla.
 *
 * Uso local: npx ts-node apps/api/scripts/reset-programacion-password.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const EMAIL = 'programacion@corazaseguridadcta.com';
const NEW_PASSWORD = 'Programacion2026*';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL');

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();
  try {
    const hash = await bcrypt.hash(NEW_PASSWORD, 12);
    const res = await client.query(
      `UPDATE users SET password_hash = $1, is_active = TRUE WHERE email = $2`,
      [hash, EMAIL],
    );
    if (res.rowCount === 0) {
      console.error(`✖ No existe usuario ${EMAIL}`);
      process.exit(1);
    }
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(' CREDENCIALES PROGRAMACIÓN (Jairo) — CLAVE RESETEADA');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Email:    ${EMAIL}`);
    console.log(`   Password: ${NEW_PASSWORD}`);
    console.log(`   Rol:      PROGRAMADOR`);
    console.log('═══════════════════════════════════════════════════════\n');
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
