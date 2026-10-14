import { TenantContext } from '../../common/tenant/tenant.context';
import {
  CommandPeriod,
  DashboardCommandCenterService,
} from './dashboard-command-center.service';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

/**
 * La caché del centro de mando guarda el tablero montado durante 20 segundos.
 *
 * Dos cosas que tenían que estar cubiertas: que la clave distinga la
 * organización —si no, dos gerencias de empresas distintas con los mismos
 * permisos se verían los indicadores la una a la otra— y que las entradas
 * caducadas se suelten, porque cada una guarda un tablero entero.
 */
describe('DashboardCommandCenterService: caché', () => {
  const noop = {} as never;
  const svc = new DashboardCommandCenterService(
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
  );

  const clave = (permisos: string[], periodo: CommandPeriod = '7d') =>
    (
      svc as unknown as {
        cacheKey(p: string[], q: CommandPeriod): string;
      }
    ).cacheKey(permisos, periodo);

  describe('clave de caché', () => {
    it('cambia con la organización aunque los permisos sean idénticos', () => {
      const permisos = ['dashboard.view', 'hr.view'];
      const enA = TenantContext.run(TENANT_A, () => clave(permisos));
      const enB = TenantContext.run(TENANT_B, () => clave(permisos));
      expect(enA).not.toBe(enB);
    });

    it('el mismo usuario en la misma organización reutiliza la entrada', () => {
      const permisos = ['dashboard.view'];
      const una = TenantContext.run(TENANT_A, () => clave(permisos));
      const otra = TenantContext.run(TENANT_A, () => clave(permisos));
      expect(una).toBe(otra);
    });

    it('no depende del orden en que lleguen los permisos', () => {
      const a = TenantContext.run(TENANT_A, () => clave(['b.view', 'a.view']));
      const b = TenantContext.run(TENANT_A, () => clave(['a.view', 'b.view']));
      expect(a).toBe(b);
    });

    it('distingue el periodo consultado', () => {
      const hoy = TenantContext.run(TENANT_A, () => clave(['x'], 'today'));
      const mes = TenantContext.run(TENANT_A, () => clave(['x'], 'month'));
      expect(hoy).not.toBe(mes);
    });

    it('distingue juegos de permisos distintos', () => {
      const pocos = TenantContext.run(TENANT_A, () => clave(['a.view']));
      const muchos = TenantContext.run(TENANT_A, () =>
        clave(['a.view', 'b.view']),
      );
      expect(pocos).not.toBe(muchos);
    });

    it('fuera de una petición cae en la organización central', () => {
      // Procesos internos sin contexto: no deben compartir clave con nadie raro.
      expect(clave(['a.view'])).toContain('11111111-1111-1111-1111-111111111111');
    });
  });

  describe('purga de entradas caducadas', () => {
    const cache = (
      svc as unknown as {
        dashboardCache: Map<string, { data: unknown; expires: number }>;
        purgeCache(now: number): void;
      }
    );

    beforeEach(() => cache.dashboardCache.clear());

    it('suelta lo caducado y conserva lo vigente', () => {
      const ahora = Date.now();
      cache.dashboardCache.set('viejo-1', { data: {}, expires: ahora - 1 });
      cache.dashboardCache.set('viejo-2', { data: {}, expires: ahora - 50_000 });
      cache.dashboardCache.set('vigente', { data: {}, expires: ahora + 20_000 });

      cache.purgeCache(ahora);

      expect(svc.cacheSize()).toBe(1);
      expect(cache.dashboardCache.has('vigente')).toBe(true);
    });

    it('con todo vigente no borra nada', () => {
      const ahora = Date.now();
      cache.dashboardCache.set('a', { data: {}, expires: ahora + 1000 });
      cache.dashboardCache.set('b', { data: {}, expires: ahora + 1000 });

      cache.purgeCache(ahora);

      expect(svc.cacheSize()).toBe(2);
    });
  });
});
