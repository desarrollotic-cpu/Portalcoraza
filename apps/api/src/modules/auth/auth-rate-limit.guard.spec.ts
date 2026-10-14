import { ExecutionContext, HttpException } from '@nestjs/common';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

/**
 * Es lo único que frena un ataque de fuerza bruta contra el login, así que
 * conviene tener fijado su comportamiento: cuántos intentos deja pasar, que
 * cuente por IP real detrás del proxy de Render, y que no acumule memoria.
 */
function contexto(ip: string, path = '/api/v1/auth/login'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip, path, headers: { 'x-forwarded-for': ip } }),
    }),
  } as unknown as ExecutionContext;
}

function contextoSinProxy(ip: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip, path: '/api/v1/auth/login', headers: {} }),
    }),
  } as unknown as ExecutionContext;
}

describe('AuthRateLimitGuard', () => {
  let guard: AuthRateLimitGuard;

  beforeEach(() => {
    AuthRateLimitGuard.reset();
    guard = new AuthRateLimitGuard();
  });

  afterEach(() => {
    jest.useRealTimers();
    AuthRateLimitGuard.reset();
  });

  it('deja pasar diez intentos y bloquea el undécimo', () => {
    for (let i = 0; i < 10; i++) {
      expect(guard.canActivate(contexto('1.1.1.1'))).toBe(true);
    }
    expect(() => guard.canActivate(contexto('1.1.1.1'))).toThrow(HttpException);
  });

  it('el bloqueo responde 429, no 401', () => {
    for (let i = 0; i < 10; i++) guard.canActivate(contexto('2.2.2.2'));
    try {
      guard.canActivate(contexto('2.2.2.2'));
      fail('debería haber bloqueado');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(429);
    }
  });

  it('una IP agotada no bloquea a las demás', () => {
    for (let i = 0; i < 11; i++) {
      try {
        guard.canActivate(contexto('3.3.3.3'));
      } catch {
        /* esperado en el último */
      }
    }
    expect(guard.canActivate(contexto('4.4.4.4'))).toBe(true);
  });

  it('cuenta por IP real detrás del proxy, no por la del proxy', () => {
    // En Render todas las peticiones llegan por un proxy: si se contara req.ip
    // todos los usuarios compartirían el mismo cupo y se bloquearían entre sí.
    const proxy = '10.0.0.1';
    const peticion = (real: string): ExecutionContext =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({
            ip: proxy,
            path: '/api/v1/auth/login',
            headers: { 'x-forwarded-for': `${real}, ${proxy}` },
          }),
        }),
      }) as unknown as ExecutionContext;

    for (let i = 0; i < 10; i++) guard.canActivate(peticion('200.1.1.1'));
    expect(() => guard.canActivate(peticion('200.1.1.1'))).toThrow();
    // Otro usuario detrás del mismo proxy sigue pudiendo entrar.
    expect(guard.canActivate(peticion('200.2.2.2'))).toBe(true);
  });

  it('sin cabecera de proxy cae en la IP de la conexión', () => {
    for (let i = 0; i < 10; i++) guard.canActivate(contextoSinProxy('5.5.5.5'));
    expect(() => guard.canActivate(contextoSinProxy('5.5.5.5'))).toThrow();
  });

  it('separa el cupo por ruta', () => {
    for (let i = 0; i < 10; i++) guard.canActivate(contexto('6.6.6.6', '/login'));
    expect(guard.canActivate(contexto('6.6.6.6', '/refresh'))).toBe(true);
  });

  it('pasado un minuto vuelve a permitir', () => {
    jest.useFakeTimers();
    for (let i = 0; i < 10; i++) guard.canActivate(contexto('7.7.7.7'));
    expect(() => guard.canActivate(contexto('7.7.7.7'))).toThrow();

    jest.advanceTimersByTime(60_001);
    expect(guard.canActivate(contexto('7.7.7.7'))).toBe(true);
  });

  it('no acumula memoria con muchas IPs distintas', () => {
    jest.useFakeTimers();
    // Más IPs que el tope, todas con su ventana ya vencida.
    for (let i = 0; i < 5_200; i++) {
      guard.canActivate(contexto(`10.0.${Math.floor(i / 256)}.${i % 256}`));
    }
    jest.advanceTimersByTime(60_001);
    guard.canActivate(contexto('8.8.8.8'));

    // El barrido dejó solo lo vigente; sin él seguirían las 5.200.
    expect(AuthRateLimitGuard.size()).toBeLessThan(100);
  });
});
