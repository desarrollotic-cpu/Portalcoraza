import { renderInformePDF } from './rondas-informe-pdf';
import { RondaInforme } from './rondas-informe';

const base: RondaInforme = {
  postId: 'p1',
  puestoNombre: 'Puesto Demo',
  rondaNombre: 'Perimetral',
  fecha: '2026-10-23',
  numeroDia: 1,
  inicio: '2026-10-23T18:00:00.000Z',
  fin: '2026-10-23T18:12:00.000Z',
  abierta: false,
  completa: true,
  esperados: 2,
  puntos: [
    { puntoId: 'q1', puntoNombre: 'Puerta 1', puntoOrden: 1, fechaHora: '2026-10-23T18:02:00.000Z' },
    { puntoId: 'q2', puntoNombre: 'Patio', puntoOrden: 2, fechaHora: '2026-10-23T18:08:00.000Z' },
  ],
};

describe('renderInformePDF (humo)', () => {
  it('genera un PDF válido con contenido', async () => {
    const buf = await renderInformePDF({
      puesto: 'Puesto Demo',
      mesLabel: '2026-10',
      generado: '2026-10-23 15:00:00',
      rondas: [base, { ...base, numeroDia: 2, completa: false, puntos: [base.puntos[0]] }],
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('también genera PDF cuando el puesto no tiene recorridos en el mes', async () => {
    const buf = await renderInformePDF({
      puesto: 'Puesto Vacío',
      mesLabel: '2026-10',
      generado: '2026-10-23 15:00:00',
      rondas: [],
    });
    expect(buf.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
