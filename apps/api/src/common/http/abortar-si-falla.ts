import type { Response } from 'express';

/**
 * Ejecuta una descarga en streaming y corta la conexión si falla a mitad.
 *
 * Al escribir por lotes, las cabeceras salen con el primer chunk: a partir de
 * ahí Nest ya no puede devolver un 500 y el navegador guardaría el archivo
 * truncado como si estuviera completo. Destruir la respuesta hace que la
 * descarga se marque como fallida. Si todavía no se envió nada, el error sube
 * y sigue el manejo normal de errores.
 */
export async function abortarSiFalla(
  res: Response,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (res.headersSent) {
      res.destroy(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    throw err;
  }
}
