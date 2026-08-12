import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Aplica ensure-vigia.sql si faltan tablas o permiso vigia.view.
 */
@Injectable()
export class VigiaSchemaBootstrap implements OnModuleInit {
  private readonly log = new Logger(VigiaSchemaBootstrap.name);

  constructor(private readonly ds: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      const [{ has_table }] = await this.ds.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'vigia_turnos'
        ) AS has_table
      `);
      const [{ has_perm }] = await this.ds.query(`
        SELECT EXISTS (
          SELECT 1 FROM permissions WHERE code = 'vigia.view'
        ) AS has_perm
      `);

      const [{ has_pins }] = await this.ds.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'vigia_pins'
        ) AS has_pins
      `);

      if (!(has_table && has_perm) || !has_pins) {
        const sqlPath = path.join(__dirname, 'ensure-vigia.sql');
        if (!fs.existsSync(sqlPath)) {
          this.log.error(`No se encontró ${sqlPath}`);
          return;
        }
        await this.ds.query(fs.readFileSync(sqlPath, 'utf8'));
        this.log.log('Esquema y permisos Vigía aplicados (ensure-vigia.sql)');
      } else {
        await this.ensureGerenciaGrants();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(`Bootstrap Vigía falló: ${msg}`);
    }
  }

  private async ensureGerenciaGrants(): Promise<void> {
    await this.ds.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN')
        AND p.code IN ('vigia.view', 'vigia.manage')
      ON CONFLICT DO NOTHING
    `);
  }
}
