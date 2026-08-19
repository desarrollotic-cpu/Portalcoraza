import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MinutaSchemaBootstrap implements OnModuleInit {
  private readonly log = new Logger(MinutaSchemaBootstrap.name);

  constructor(private readonly ds: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      const [{ has_table }] = await this.ds.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'minuta_visitantes'
        ) AS has_table
      `);
      const [{ has_perm }] = await this.ds.query(`
        SELECT EXISTS (
          SELECT 1 FROM permissions WHERE code = 'minuta.view'
        ) AS has_perm
      `);
      if (has_table && has_perm) {
        await this.ds.query(`
          INSERT INTO permissions (code, name, module) VALUES
            ('minuta.create', 'Crear registros en minuta virtual', 'minuta')
          ON CONFLICT (code) DO NOTHING
        `);
        await this.ds.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT r.id, p.id FROM roles r, permissions p
          WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN')
            AND p.code IN ('minuta.view', 'minuta.create')
          ON CONFLICT DO NOTHING
        `);
        return;
      }
      const sqlPath = path.join(__dirname, 'ensure-minuta.sql');
      if (!fs.existsSync(sqlPath)) {
        this.log.error(`No se encontró ${sqlPath}`);
        return;
      }
      await this.ds.query(fs.readFileSync(sqlPath, 'utf8'));
      this.log.log('Esquema Minuta Virtual aplicado (ensure-minuta.sql)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(`Bootstrap Minuta falló: ${msg}`);
    }
  }
}
