import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Aplica ensure-sst.sql si faltan tablas o permisos sst.*.
 * Necesario en prod cuando se desplegó código sin correr la migración en Supabase.
 */
@Injectable()
export class SstSchemaBootstrap implements OnModuleInit {
  private readonly log = new Logger(SstSchemaBootstrap.name);

  constructor(private readonly ds: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      const [{ has_table }] = await this.ds.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'sst_inspections'
        ) AS has_table
      `);
      const [{ has_perm }] = await this.ds.query(`
        SELECT EXISTS (
          SELECT 1 FROM permissions WHERE code = 'sst.view'
        ) AS has_perm
      `);

      if (!(has_table && has_perm)) {
        const sqlPath = path.join(__dirname, 'ensure-sst.sql');
        if (!fs.existsSync(sqlPath)) {
          this.log.error(`No se encontró ${sqlPath}`);
          return;
        }
        await this.ds.query(fs.readFileSync(sqlPath, 'utf8'));
        this.log.log('Esquema y permisos SST aplicados (ensure-sst.sql)');
      } else {
        await this.ensureGerenciaGrants();
      }

      await this.ensureDemoSites();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(`Bootstrap SST falló: ${msg}`);
    }
  }

  private async ensureGerenciaGrants(): Promise<void> {
    await this.ds.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN')
        AND p.code IN ('sst.view', 'sst.inspect', 'sst.manage', 'sst.alerts')
      ON CONFLICT DO NOTHING
    `);
  }

  /** Primer uso: cliente Coraza + 2 puestos si la tabla está vacía. */
  private async ensureDemoSites(): Promise<void> {
    const [{ n }] = await this.ds.query(
      `SELECT COUNT(*)::int AS n FROM sst_clients`,
    );
    if (n > 0) return;

    const [{ id: clientId }] = await this.ds.query(
      `
      INSERT INTO sst_clients (nombre, nit, contacto)
      VALUES ('Coraza Seguridad C.T.A.', 'N/A', 'SST')
      RETURNING id
      `,
    );
    await this.ds.query(
      `
      INSERT INTO sst_workplaces (client_id, nombre, ciudad, tipo_puesto, direccion)
      VALUES
        ($1, 'Sede principal — Portería', 'Medellín', 'PORTERIA', 'Sede administrativa'),
        ($1, 'Sede principal — Recepción', 'Medellín', 'RECEPCION', NULL)
      `,
      [clientId],
    );
    this.log.log('Sitios sede Coraza creados (cliente + 2 puestos)');
  }
}
