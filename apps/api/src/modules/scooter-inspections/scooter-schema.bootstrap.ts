import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ScooterSchemaBootstrap implements OnModuleInit {
  private readonly log = new Logger(ScooterSchemaBootstrap.name);

  constructor(private readonly ds: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      const [{ has_table }] = await this.ds.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'scooter_inspections'
        ) AS has_table
      `);
      if (!has_table) {
        const sqlPath = path.join(__dirname, 'ensure-scooter-inspections.sql');
        if (!fs.existsSync(sqlPath)) {
          this.log.error(`No se encontró ${sqlPath}`);
          return;
        }
        await this.ds.query(fs.readFileSync(sqlPath, 'utf8'));
        this.log.log('Esquema scooter_inspections aplicado');
      } else {
        await this.ds.query(
          `ALTER TABLE posts ADD COLUMN IF NOT EXISTS tiene_patineta_electrica BOOLEAN NOT NULL DEFAULT false`,
        );
      }
    } catch (e) {
      this.log.warn(`Bootstrap scooter: ${(e as Error).message}`);
    }
  }
}
