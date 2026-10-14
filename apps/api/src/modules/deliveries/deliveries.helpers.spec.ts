import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  Associate,
  AssociateStatus,
} from '../associates/entities/associate.entity';
import { DeliveriesService } from './deliveries.service';

/**
 * Entrega de dotación: la firma que queda como soporte y la regla de a quién
 * se le puede entregar. Ambas tienen consecuencias fuera del sistema —un
 * soporte ilegible o una entrega a alguien que ya no trabaja— y no estaban
 * cubiertas.
 */
describe('DeliveriesService: firma y elegibilidad', () => {
  function montar(asociado?: Partial<Associate> | null) {
    const associatesRepo = {
      findOne: () => Promise.resolve(asociado ?? null),
    } as unknown as Repository<Associate>;
    const noop = {} as never;
    return new DeliveriesService(
      noop,
      noop,
      noop,
      noop,
      associatesRepo,
      noop,
      noop,
      noop,
      noop,
    );
  }

  const svc = montar();
  const priv = svc as unknown as {
    parseSignaturePayload(s: string): {
      base64: string;
      contentType: string;
      extension: string;
    };
    formatAssociateName(a: Partial<Associate>): string;
  };

  describe('firma recibida del pad', () => {
    it('reconoce un PNG y conserva solo los datos', () => {
      const r = priv.parseSignaturePayload('data:image/png;base64,AAAB');
      expect(r.contentType).toBe('image/png');
      expect(r.extension).toBe('png');
      expect(r.base64).toBe('AAAB');
    });

    it('reconoce JPEG y WEBP', () => {
      expect(priv.parseSignaturePayload('data:image/jpeg;base64,XX').extension).toBe(
        'jpg',
      );
      expect(priv.parseSignaturePayload('data:image/webp;base64,XX').extension).toBe(
        'webp',
      );
    });

    it('normaliza image/jpg, que no es un tipo válido, a image/jpeg', () => {
      const r = priv.parseSignaturePayload('data:image/jpg;base64,XX');
      expect(r.contentType).toBe('image/jpeg');
      expect(r.extension).toBe('jpg');
    });

    it('no distingue mayúsculas en la cabecera', () => {
      const r = priv.parseSignaturePayload('DATA:IMAGE/PNG;BASE64,ZZZ');
      expect(r.contentType).toBe('image/png');
      expect(r.base64).toBe('ZZZ');
    });

    it('tolera espacios alrededor', () => {
      expect(priv.parseSignaturePayload('  data:image/png;base64,QQ  ').base64).toBe(
        'QQ',
      );
    });

    it('acepta firmas antiguas sin prefijo, como JPEG', () => {
      // Compatibilidad con lo ya guardado: el pad anterior mandaba el base64 solo.
      const r = priv.parseSignaturePayload('iVBORw0KGgoAAAA');
      expect(r.contentType).toBe('image/jpeg');
      expect(r.base64).toBe('iVBORw0KGgoAAAA');
    });

    it('un tipo que no es imagen no se guarda como tal', () => {
      // Un SVG podría llevar script dentro; cae al camino heredado y queda
      // como JPEG, que el navegador no ejecuta.
      const r = priv.parseSignaturePayload('data:image/svg+xml;base64,PHN2Zz4=');
      expect(r.contentType).toBe('image/jpeg');
      expect(r.extension).toBe('jpg');
    });
  });

  describe('nombre del asociado en el soporte', () => {
    it('une los cuatro componentes', () => {
      expect(
        priv.formatAssociateName({
          firstName: 'Ana',
          secondName: 'María',
          firstLastName: 'Pérez',
          secondLastName: 'Gómez',
        } as Associate),
      ).toBe('Ana María Pérez Gómez');
    });

    it('se salta los que falten sin dejar huecos dobles', () => {
      expect(
        priv.formatAssociateName({
          firstName: 'Ana',
          secondName: null,
          firstLastName: 'Pérez',
          secondLastName: null,
        } as Associate),
      ).toBe('Ana Pérez');
    });

    it('limpia espacios sobrantes de los propios datos', () => {
      expect(
        priv.formatAssociateName({
          firstName: 'Ana  ',
          firstLastName: '  Pérez',
        } as Associate),
      ).toBe('Ana Pérez');
    });
  });

  describe('a quién se le puede entregar dotación', () => {
    const assertEligible = (s: DeliveriesService, id = 'a1') =>
      (
        s as unknown as {
          assertDeliverableAssociate(id: string): Promise<Associate>;
        }
      ).assertDeliverableAssociate(id);

    it('a un asociado activo, sí', async () => {
      const s = montar({ id: 'a1', status: AssociateStatus.ACTIVO });
      await expect(assertEligible(s)).resolves.toMatchObject({ id: 'a1' });
    });

    it('a uno en vacaciones, también', async () => {
      const s = montar({ id: 'a1', status: AssociateStatus.VACACIONES });
      await expect(assertEligible(s)).resolves.toBeTruthy();
    });

    it('a un retirado, no', async () => {
      const s = montar({ id: 'a1', status: AssociateStatus.RETIRADO });
      await expect(assertEligible(s)).rejects.toThrow(BadRequestException);
    });

    it('a un inactivo, no', async () => {
      const s = montar({ id: 'a1', status: AssociateStatus.INACTIVO });
      await expect(assertEligible(s)).rejects.toThrow(BadRequestException);
    });

    it('el mensaje dice en qué estado está y cuáles valen', async () => {
      const s = montar({ id: 'a1', status: AssociateStatus.RETIRADO });
      await expect(assertEligible(s)).rejects.toThrow(/RETIRADO/);
      await expect(assertEligible(s)).rejects.toThrow(/ACTIVO o VACACIONES/);
    });

    it('si el asociado no existe, 404 y no 400', async () => {
      await expect(assertEligible(montar(null))).rejects.toThrow(NotFoundException);
    });
  });
});
