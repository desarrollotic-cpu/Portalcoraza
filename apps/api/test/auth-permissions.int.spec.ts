import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
// `import * as` y no default: este tsconfig no activa esModuleInterop.
import * as request from 'supertest';
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { TenantInterceptor } from '../src/common/tenant/tenant.interceptor';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtPayload } from '../src/modules/auth/interfaces/jwt-payload.interface';
import { UsersService } from '../src/modules/users/users.service';

const SECRET = 'secreto-solo-de-pruebas-con-mas-de-32-caracteres';
const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

/** Controlador mínimo que reproduce cómo se protegen los endpoints reales. */
@Controller('demo')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class DemoController {
  @Get('listar')
  @RequirePermissions('associates.view')
  listar() {
    return { ok: true };
  }

  @Get('crear')
  @RequirePermissions('associates.create', 'associates.view')
  crear() {
    return { ok: true };
  }

  @Get('cualquiera')
  @RequireAnyPermissions('absences.create', 'associates.view')
  cualquiera() {
    return { ok: true };
  }

  @Get('sin-permiso')
  libre() {
    return { ok: true };
  }
}

/**
 * QueryRunner de mentira: TenantInterceptor abre transacción por petición y
 * aquí solo interesa su control de acceso, no el SQL.
 */
function fakeDataSource(): DataSource {
  return {
    createQueryRunner: () => ({
      connect: async () => undefined,
      startTransaction: async () => undefined,
      query: async () => [],
      commitTransaction: async () => undefined,
      rollbackTransaction: async () => undefined,
      release: async () => undefined,
      isTransactionActive: true,
      isReleased: false,
      manager: undefined,
    }),
  } as unknown as DataSource;
}

describe('autenticación y permisos (integración HTTP)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const tokenDe = (payload: Partial<JwtPayload>) =>
    jwt.sign({
      sub: 'user-1',
      email: 'alguien@corazaseguridadcta.com',
      roleCode: 'RRHH',
      permissions: [],
      tenantId: TENANT_A,
      ...payload,
    });

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = SECRET;

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PassportModule,
        JwtModule.register({ secret: SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [DemoController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        PermissionsGuard,
        TenantInterceptor,
        { provide: DataSource, useFactory: fakeDataSource },
        {
          // El usuario existe y está activo; lo que se prueba es el permiso.
          provide: UsersService,
          useValue: {
            findById: async () => ({ isActive: true, tenantId: TENANT_A }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(app.get(TenantInterceptor));
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('sin token devuelve 401', async () => {
    await request(app.getHttpServer()).get('/demo/listar').expect(401);
  });

  it('con un token firmado con otra clave devuelve 401', async () => {
    const ajeno = new JwtService({ secret: 'otra-clave-distinta-cualquiera' })
      .sign({ sub: 'user-1', permissions: ['associates.view'] });
    await request(app.getHttpServer())
      .get('/demo/listar')
      .set('Authorization', `Bearer ${ajeno}`)
      .expect(401);
  });

  it('con token válido pero sin el permiso devuelve 403', async () => {
    await request(app.getHttpServer())
      .get('/demo/listar')
      .set('Authorization', `Bearer ${tokenDe({ permissions: ['posts.view'] })}`)
      .expect(403);
  });

  it('con el permiso exacto pasa', async () => {
    await request(app.getHttpServer())
      .get('/demo/listar')
      .set(
        'Authorization',
        `Bearer ${tokenDe({ permissions: ['associates.view'] })}`,
      )
      .expect(200);
  });

  it('cuando se exigen varios permisos no basta con uno', async () => {
    await request(app.getHttpServer())
      .get('/demo/crear')
      .set(
        'Authorization',
        `Bearer ${tokenDe({ permissions: ['associates.view'] })}`,
      )
      .expect(403);

    await request(app.getHttpServer())
      .get('/demo/crear')
      .set(
        'Authorization',
        `Bearer ${tokenDe({
          permissions: ['associates.view', 'associates.create'],
        })}`,
      )
      .expect(200);
  });

  it('con "cualquiera de" basta uno de los permisos', async () => {
    await request(app.getHttpServer())
      .get('/demo/cualquiera')
      .set(
        'Authorization',
        `Bearer ${tokenDe({ permissions: ['absences.create'] })}`,
      )
      .expect(200);
  });

  it('el rol maestro entra aunque no tenga permisos listados', async () => {
    await request(app.getHttpServer())
      .get('/demo/crear')
      .set(
        'Authorization',
        `Bearer ${tokenDe({ roleCode: 'SUPERADMIN', permissions: [] })}`,
      )
      .expect(200);
  });

  it('un endpoint sin permisos declarados sigue exigiendo sesión', async () => {
    await request(app.getHttpServer()).get('/demo/sin-permiso').expect(401);

    await request(app.getHttpServer())
      .get('/demo/sin-permiso')
      .set('Authorization', `Bearer ${tokenDe({})}`)
      .expect(200);
  });

  it('rechaza una cabecera X-Tenant-ID que no coincide con el token', async () => {
    await request(app.getHttpServer())
      .get('/demo/listar')
      .set(
        'Authorization',
        `Bearer ${tokenDe({ permissions: ['associates.view'] })}`,
      )
      .set('X-Tenant-ID', TENANT_B)
      .expect(403);
  });

  it('acepta la cabecera X-Tenant-ID cuando sí coincide', async () => {
    await request(app.getHttpServer())
      .get('/demo/listar')
      .set(
        'Authorization',
        `Bearer ${tokenDe({ permissions: ['associates.view'] })}`,
      )
      .set('X-Tenant-ID', TENANT_A)
      .expect(200);
  });
});
