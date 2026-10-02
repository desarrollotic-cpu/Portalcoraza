import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RondasSchemaBootstrap implements OnModuleInit {
  private readonly log = new Logger(RondasSchemaBootstrap.name);

  constructor(private readonly ds: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      const [{ has_table }] = await this.ds.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'rondas_puntos'
        ) AS has_table
      `);
      if (!has_table) {
        const sqlPath = path.join(__dirname, 'ensure-rondas.sql');
        if (!fs.existsSync(sqlPath)) {
          this.log.error(`No se encontró ${sqlPath}`);
          return;
        }
        await this.ds.query(fs.readFileSync(sqlPath, 'utf8'));
        this.log.log('Esquema rondas GPS aplicado');
      }
      await this.ds.query(
        `ALTER TABLE rondas_puntos ADD COLUMN IF NOT EXISTS altitud DOUBLE PRECISION`,
      );
      await this.ds.query(
        `ALTER TABLE rondas_marcaciones ADD COLUMN IF NOT EXISTS altitud DOUBLE PRECISION`,
      );
      await this.ds.query(`
        CREATE TABLE IF NOT EXISTS rondas_alertas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          uuid_cliente UUID NOT NULL,
          post_id UUID NOT NULL REFERENCES posts(id),
          associate_id UUID NOT NULL REFERENCES associates(id),
          tipo VARCHAR(20) NOT NULL,
          mensaje VARCHAR(400) NOT NULL DEFAULT '',
          latitud DOUBLE PRECISION,
          longitud DOUBLE PRECISION,
          fecha_hora TIMESTAMPTZ NOT NULL,
          dispositivo_id VARCHAR(100),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (uuid_cliente)
        )
      `);
      await this.ds.query(
        `CREATE INDEX IF NOT EXISTS idx_rondas_alertas_fecha ON rondas_alertas(tenant_id, fecha_hora DESC)`,
      );
      await this.ds.query(`
        INSERT INTO permissions (code, name, module) VALUES
          ('rondas.view', 'Ver cumplimiento de rondas GPS', 'rondas'),
          ('rondas.setup', 'Crear y ajustar puntos de ronda', 'rondas'),
          ('rondas.marcar', 'Marcar puntos de ronda en campo', 'rondas')
        ON CONFLICT (code) DO NOTHING
      `);
      await this.ds.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r
        CROSS JOIN permissions p
        WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN')
          AND p.code IN ('rondas.view', 'rondas.setup')
        ON CONFLICT DO NOTHING
      `);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(`Bootstrap rondas falló: ${msg}`);
    }
  }
}
