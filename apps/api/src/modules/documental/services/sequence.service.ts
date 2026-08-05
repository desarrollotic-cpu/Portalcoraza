import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Consecutivos documentales. Reemplaza el patrón MAX()+forEach del SGD original
 * (que releía toda la tabla en cada alta) por un contador con bloqueo de fila.
 * `scope` acota el ámbito: 'contract', 'minute:SERVICIO', 'correspondence:400', etc.
 */
@Injectable()
export class SequenceService {
  constructor(private readonly dataSource: DataSource) {}

  /** Previsualiza el próximo valor SIN consumir el contador (para placeholders de UI). */
  async peek(scope: string): Promise<number> {
    const rows: Array<{ last_value: number }> = await this.dataSource.query(
      `SELECT last_value FROM doc_counters WHERE scope = $1`,
      [scope],
    );
    return rows[0] ? Number(rows[0].last_value) + 1 : 1;
  }

  /** Devuelve el siguiente consecutivo para `scope`, incrementando atómicamente. */
  async next(scope: string): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const rows: Array<{ last_value: number }> = await manager.query(
        `INSERT INTO doc_counters (scope, last_value)
         VALUES ($1, 1)
         ON CONFLICT (scope)
         DO UPDATE SET last_value = doc_counters.last_value + 1, updated_at = NOW()
         RETURNING last_value`,
        [scope],
      );
      return Number(rows[0].last_value);
    });
  }
}
