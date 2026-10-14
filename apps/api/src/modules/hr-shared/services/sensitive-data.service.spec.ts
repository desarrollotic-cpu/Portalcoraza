import { SensitiveDataService } from './sensitive-data.service';

/**
 * Enmascarado de datos sensibles (Ley 1581 de 2012): raza, religión y
 * orientación sexual. Un fallo aquí no rompe nada visible, simplemente expone
 * datos que no deberían salir, así que conviene que esté fijado por pruebas.
 */
describe('SensitiveDataService', () => {
  const service = new SensitiveDataService();

  const asociado = () => ({
    id: 'a1',
    firstName: 'Ana',
    raceId: 'r1',
    race: { id: 'r1', kind: 'RAZA', value: 'Afrodescendiente' },
    religionId: 'g1',
    religion: { id: 'g1', kind: 'RELIGION', value: 'Católica' },
    sexualOrientationId: 'o1',
    sexualOrientation: { id: 'o1', kind: 'ORIENTACION_SEXUAL', value: 'Heterosexual' },
  });

  const conPermiso = { permissions: ['hr_sensitive.view'] };
  const sinPermiso = { permissions: ['associates.view'] };

  describe('canSeeSensitive', () => {
    it('solo con el permiso explícito', () => {
      expect(service.canSeeSensitive(conPermiso)).toBe(true);
      expect(service.canSeeSensitive(sinPermiso)).toBe(false);
    });

    it('sin usuario, sin permisos o con la lista vacía, no', () => {
      expect(service.canSeeSensitive(null)).toBe(false);
      expect(service.canSeeSensitive(undefined)).toBe(false);
      expect(service.canSeeSensitive({})).toBe(false);
      expect(service.canSeeSensitive({ permissions: [] })).toBe(false);
    });

    it('el rol por sí solo no abre la puerta', () => {
      // Solo cuenta el permiso: un rol con nombre sugerente no basta.
      expect(service.canSeeSensitive({ role: 'GERENCIA' })).toBe(false);
    });
  });

  describe('maskAssociate', () => {
    it('quien tiene permiso recibe el objeto intacto', () => {
      const original = asociado();
      expect(service.maskAssociate(original, conPermiso)).toBe(original);
    });

    it('quien no lo tiene recibe los tres campos ocultos', () => {
      const r = service.maskAssociate(asociado(), sinPermiso);
      expect(r.raceId).toBeNull();
      expect(r.religionId).toBeNull();
      expect(r.sexualOrientationId).toBeNull();
      expect(r.race.value).toBe('*** OCULTO ***');
      expect(r.religion.value).toBe('*** OCULTO ***');
      expect(r.sexualOrientation.value).toBe('*** OCULTO ***');
    });

    it('conserva el tipo de dato en el marcador', () => {
      const r = service.maskAssociate(asociado(), sinPermiso);
      expect(r.race.kind).toBe('RAZA');
      expect(r.religion.kind).toBe('RELIGION');
      expect(r.sexualOrientation.kind).toBe('ORIENTACION_SEXUAL');
    });

    it('no toca el resto de campos', () => {
      const r = service.maskAssociate(asociado(), sinPermiso);
      expect(r.firstName).toBe('Ana');
      expect(r.id).toBe('a1');
    });

    it('no modifica el objeto original', () => {
      const original = asociado();
      service.maskAssociate(original, sinPermiso);
      expect(original.raceId).toBe('r1');
      expect(original.race.value).toBe('Afrodescendiente');
    });

    it('sin usuario también enmascara', () => {
      const r = service.maskAssociate(asociado(), null);
      expect(r.raceId).toBeNull();
    });
  });

  describe('maskMany', () => {
    it('enmascara toda la lista', () => {
      const r = service.maskMany([asociado(), asociado()], sinPermiso);
      expect(r).toHaveLength(2);
      expect(r.every((x) => x.raceId === null)).toBe(true);
    });

    it('con permiso devuelve la lista tal cual', () => {
      const lista = [asociado()];
      expect(service.maskMany(lista, conPermiso)).toBe(lista);
    });

    it('una lista vacía no falla', () => {
      expect(service.maskMany([], sinPermiso)).toEqual([]);
    });
  });
});
