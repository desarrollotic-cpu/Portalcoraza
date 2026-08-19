import { ForbiddenException } from '@nestjs/common';
import { MinutaService } from './minuta.service';

describe('MinutaService post scope (PUESTO)', () => {
  function makeService(postIds: string[]) {
    const service = Object.create(MinutaService.prototype) as MinutaService;
    (service as unknown as { userPosts: { find: jest.Mock } }).userPosts = {
      find: jest.fn().mockResolvedValue(postIds.map((postId) => ({ postId }))),
    };
    return service;
  }

  it('does not restrict GERENCIA', async () => {
    const service = makeService([]);
    const scope = await service.resolvePostScope({
      sub: 'u1',
      email: 'admin@x.com',
      roleCode: 'GERENCIA',
      permissions: ['minuta.view'],
    });
    expect(scope).toEqual({ restricted: false });
  });

  it('restricts PUESTO to assigned posts', async () => {
    const service = makeService(['post-a']);
    const scope = await service.resolvePostScope({
      sub: 'u2',
      email: 'amisi@corazaseguridadcta.com',
      roleCode: 'PUESTO',
      permissions: ['minuta.view', 'minuta.create'],
    });
    expect(scope).toEqual({ restricted: true, postIds: ['post-a'] });
  });

  it('forbids PUESTO without assigned post', async () => {
    const service = makeService([]);
    await expect(
      service.resolvePostScope({
        sub: 'u3',
        email: 'x@corazaseguridadcta.com',
        roleCode: 'PUESTO',
        permissions: ['minuta.view'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forces create postId for PUESTO', async () => {
    const service = makeService(['post-a']);
    const id = await service.resolveCreatePostId(
      {
        sub: 'u2',
        email: 'amisi@corazaseguridadcta.com',
        roleCode: 'PUESTO',
        permissions: ['minuta.create'],
      },
      null,
    );
    expect(id).toBe('post-a');
  });

  it('rejects create on another post for PUESTO', async () => {
    const service = makeService(['post-a']);
    await expect(
      service.resolveCreatePostId(
        {
          sub: 'u2',
          email: 'amisi@corazaseguridadcta.com',
          roleCode: 'PUESTO',
          permissions: ['minuta.create'],
        },
        'post-other',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
