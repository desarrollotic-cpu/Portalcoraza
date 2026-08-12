import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

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
      if (has_table) return;

      const sqlPath = path.join(__dirname, 'ensure-vigia.sql');
      if (!fs.existsSync(sqlPath)) {
        this.log.error(`No se encontró ${sqlPath}`);
        return;
      }
      await this.ds.query(fs.readFileSync(sqlPath, 'utf8'));
      this.log.log('Esquema Vigía aplicado (ensure-vigia.sql)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(`Bootstrap Vigía falló: ${msg}`);
    }
  }
}
