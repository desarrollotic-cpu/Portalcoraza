import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { assertSemaforoEngine } from './sig-semaforo';

@Injectable()
export class SigSchemaBootstrap implements OnModuleInit {
  private readonly log = new Logger(SigSchemaBootstrap.name);

  constructor(private readonly ds: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      assertSemaforoEngine();
      const sqlPath = path.join(__dirname, 'ensure-sig.sql');
      if (!fs.existsSync(sqlPath)) {
        this.log.error(`No se encontró ${sqlPath}`);
        return;
      }
      await this.ds.query(fs.readFileSync(sqlPath, 'utf8'));
      this.log.log('Esquema SIG-KPI aplicado (ensure-sig.sql)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(`Bootstrap SIG falló: ${msg}`);
    }
  }
}
