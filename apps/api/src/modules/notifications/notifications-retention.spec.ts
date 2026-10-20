import {
  NOTIFICATIONS_RETENTION_DAYS,
  NOTIFICATIONS_UNREAD_RETENTION_DAYS,
  NotificationsService,
} from './notifications.service';

/** Captura lo que la purga le pide a la base, sin tocar Postgres. */
function setup(afectadas: { leidas: number; sinLeer: number }) {
  const llamadas: Array<{ where: string[]; params: Record<string, unknown> }> = [];
  let i = 0;

  const qb = () => {
    const estado = { where: [] as string[], params: {} as Record<string, unknown> };
    const api = {
      delete: () => api,
      where: (w: string) => {
        estado.where.push(w);
        return api;
      },
      andWhere: (w: string, p?: Record<string, unknown>) => {
        estado.where.push(w);
        Object.assign(estado.params, p ?? {});
        return api;
      },
      execute: async () => {
        llamadas.push(estado);
        const n = i === 0 ? afectadas.leidas : afectadas.sinLeer;
        i += 1;
        return { affected: n };
      },
    };
    return api;
  };

  const service = Object.create(NotificationsService.prototype) as NotificationsService;
  (service as unknown as { notificationsRepo: { createQueryBuilder: () => unknown } }).notificationsRepo =
    { createQueryBuilder: qb };

  return { service, llamadas };
}

describe('NotificationsService.purgeOld', () => {
  it('borra por separado las leidas y las sin leer', async () => {
    const { service, llamadas } = setup({ leidas: 120, sinLeer: 7 });

    const out = await service.purgeOld();

    expect(out).toEqual({ leidas: 120, sinLeer: 7 });
    expect(llamadas).toHaveLength(2);

    // Las leidas caducan por read_at.
    expect(llamadas[0].where[0]).toContain('read_at IS NOT NULL');
    expect(llamadas[0].params['readDays']).toBe(NOTIFICATIONS_RETENTION_DAYS);

    // Las sin leer, por created_at: no tienen read_at con el que contar.
    expect(llamadas[1].where[0]).toContain('read_at IS NULL');
    expect(llamadas[1].params['unreadDays']).toBe(NOTIFICATIONS_UNREAD_RETENTION_DAYS);
  });

  it('las sin leer duran mas que las leidas', async () => {
    // Si alguien vuelve de vacaciones, lo que no alcanzo a ver sigue ahi.
    expect(NOTIFICATIONS_UNREAD_RETENTION_DAYS).toBeGreaterThan(NOTIFICATIONS_RETENTION_DAYS);
  });

  it('los dias se pueden ajustar al llamar', async () => {
    const { service, llamadas } = setup({ leidas: 0, sinLeer: 0 });
    await service.purgeOld(3, 15);
    expect(llamadas[0].params['readDays']).toBe(3);
    expect(llamadas[1].params['unreadDays']).toBe(15);
  });

  it('sin nada que borrar devuelve ceros, no undefined', async () => {
    const { service } = setup({ leidas: 0, sinLeer: 0 });
    await expect(service.purgeOld()).resolves.toEqual({ leidas: 0, sinLeer: 0 });
  });
});
