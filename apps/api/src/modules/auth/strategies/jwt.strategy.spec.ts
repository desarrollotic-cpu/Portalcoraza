import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

const config = { getOrThrow: () => 'secreto-de-prueba' } as unknown as ConfigService;

function strategy(usuario?: { isActive: boolean; tenantId?: string }) {
  const users = {
    findById: jest.fn().mockResolvedValue(usuario ?? null),
  };
  return {
    s: new JwtStrategy(config, users as never),
    users,
  };
}

const campo = (extra: Partial<JwtPayload> = {}): JwtPayload => ({
  sub: 'ruta-1',
  email: 'rondas:ruta-1',
  roleCode: 'RONDAS_CAMPO',
  permissions: ['rondas.marcar'],
  tenantId: 'tenant-1',
  rutaId: 'ruta-1',
  postId: 'post-1',
  ...extra,
});

describe('JwtStrategy — sesión de ronda', () => {
  it('acepta el token de campo sin buscarlo en usuarios', async () => {
    // La sesión de ronda no es un usuario del Portal: no hay a quién buscar.
    const { s, users } = strategy();
    await expect(s.validate(campo())).resolves.toEqual(campo());
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('exige la ronda, el puesto y el tenant', async () => {
    const { s } = strategy();
    for (const falta of ['rutaId', 'postId', 'tenantId'] as const) {
      await expect(s.validate(campo({ [falta]: undefined }))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    }
  });

  it('no le sirve un token viejo que solo traiga associateId', async () => {
    // Desde que el celular entra como la ronda, `associateId` no identifica
    // la sesión. Un token emitido antes del cambio debe volver a emitirse.
    const { s } = strategy();
    const viejo = { ...campo(), rutaId: undefined, associateId: 'asociado-1' };
    await expect(s.validate(viejo)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('JwtStrategy — usuario del Portal', () => {
  it('rechaza al usuario inactivo', async () => {
    const { s } = strategy({ isActive: false });
    await expect(
      s.validate({ ...campo(), roleCode: 'GERENCIA' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('toma el tenant del usuario, no el del token', async () => {
    const { s } = strategy({ isActive: true, tenantId: 'tenant-real' });
    const out = await s.validate({ ...campo(), roleCode: 'GERENCIA' });
    expect(out.tenantId).toBe('tenant-real');
  });
});
