import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { RondasService } from './rondas.service';

/**
 * Validación de los puntos de ronda GPS.
 *
 * El radio y las coordenadas deciden si al vigilante se le da por válido el
 * paso por un punto. Si el radio se cuela fuera de rango, o una coordenada
 * absurda llega a la base, las rondas dejan de significar nada.
 */
describe('RondasService: validación de puntos', () => {
  const svc = new RondasService({} as DataSource, {} as AuthService);
  const radio = (n?: number) =>
    (svc as unknown as { radio(n?: number): number }).radio(n);
  const assertCoords = (lat: number, lng: number) =>
    (svc as unknown as { assertCoords(a: number, b: number): void }).assertCoords(
      lat,
      lng,
    );

  describe('radio del punto', () => {
    it('sin valor usa el mínimo de 8 metros', () => {
      expect(radio(undefined)).toBe(8);
    });

    it('acepta el rango permitido', () => {
      expect(radio(8)).toBe(8);
      expect(radio(25)).toBe(25);
      expect(radio(15)).toBe(15);
    });

    it('redondea los decimales', () => {
      expect(radio(12.4)).toBe(12);
      expect(radio(12.6)).toBe(13);
    });

    it('rechaza por debajo de 8 y por encima de 25', () => {
      // Un radio demasiado pequeño da falsos negativos con el error del GPS;
      // uno grande permite marcar el punto desde la acera de enfrente.
      expect(() => radio(7)).toThrow(BadRequestException);
      expect(() => radio(26)).toThrow(BadRequestException);
      expect(() => radio(0)).toThrow(BadRequestException);
      expect(() => radio(-10)).toThrow(BadRequestException);
    });

    it('rechaza lo que no es número', () => {
      expect(() => radio(NaN)).toThrow(BadRequestException);
      expect(() => radio(Infinity)).toThrow(BadRequestException);
      expect(() => radio('doce' as unknown as number)).toThrow(BadRequestException);
    });

    it('un radio justo en el borde se acepta tras redondear', () => {
      // 7.6 redondea a 8, que sí es válido: el límite se aplica antes.
      expect(() => radio(7.6)).toThrow(BadRequestException);
    });
  });

  describe('coordenadas', () => {
    it('acepta una ubicación real de Medellín', () => {
      expect(() => assertCoords(6.2442, -75.5812)).not.toThrow();
    });

    it('acepta los extremos del planeta', () => {
      expect(() => assertCoords(90, 180)).not.toThrow();
      expect(() => assertCoords(-90, -180)).not.toThrow();
    });

    it('rechaza fuera de rango', () => {
      expect(() => assertCoords(91, 0)).toThrow(BadRequestException);
      expect(() => assertCoords(-91, 0)).toThrow(BadRequestException);
      expect(() => assertCoords(0, 181)).toThrow(BadRequestException);
      expect(() => assertCoords(0, -181)).toThrow(BadRequestException);
    });

    it('rechaza valores no numéricos', () => {
      expect(() => assertCoords(NaN, -75)).toThrow(BadRequestException);
      expect(() => assertCoords(6.2, Infinity)).toThrow(BadRequestException);
      expect(() =>
        assertCoords('6.2' as unknown as number, -75),
      ).toThrow(BadRequestException);
    });
  });
});
