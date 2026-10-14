import type { Response } from 'express';
import { abortarSiFalla } from './abortar-si-falla';

/**
 * Cubre el caso que las descargas en streaming hicieron posible: que la
 * generación falle cuando ya se envió parte del archivo. Si no se corta la
 * conexión, el navegador guarda un archivo truncado como si estuviera
 * completo, y eso no se nota hasta que alguien lo abre.
 */
function respuesta(headersSent: boolean) {
  const destroy = jest.fn();
  return { res: { headersSent, destroy } as unknown as Response, destroy };
}

describe('abortarSiFalla', () => {
  it('si todo va bien no toca la respuesta', async () => {
    const { res, destroy } = respuesta(false);
    await abortarSiFalla(res, async () => undefined);
    expect(destroy).not.toHaveBeenCalled();
  });

  it('si falla antes de enviar nada, deja subir el error', async () => {
    const { res, destroy } = respuesta(false);
    const fallo = new Error('la consulta reventó');

    await expect(abortarSiFalla(res, () => Promise.reject(fallo))).rejects.toThrow(
      'la consulta reventó',
    );
    // Sin cabeceras enviadas, Nest todavía puede responder un 500 en condiciones.
    expect(destroy).not.toHaveBeenCalled();
  });

  it('si falla con el archivo a medias, corta la conexión', async () => {
    const { res, destroy } = respuesta(true);
    const fallo = new Error('se cayó la base a mitad del lote');

    await expect(
      abortarSiFalla(res, () => Promise.reject(fallo)),
    ).resolves.toBeUndefined();
    expect(destroy).toHaveBeenCalledWith(fallo);
  });

  it('envuelve en Error lo que se lance sin serlo', async () => {
    const { res, destroy } = respuesta(true);
    await abortarSiFalla(res, () => Promise.reject('texto suelto'));

    const arg = destroy.mock.calls[0][0] as Error;
    expect(arg).toBeInstanceOf(Error);
    expect(arg.message).toBe('texto suelto');
  });
});
