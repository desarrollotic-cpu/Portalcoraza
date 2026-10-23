export interface LecturaGps {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
}

export class GpsError extends Error {
  constructor(
    message: string,
    readonly motivo: 'sin-gps' | 'impreciso' | 'sin-permiso',
    /** Mejor precisión alcanzada, para decirle al usuario qué tan lejos quedó. */
    readonly mejorPrecision?: number,
  ) {
    super(message);
  }
}

/**
 * Toma la mejor lectura de GPS disponible dentro de un tiempo límite.
 *
 * No se queda con la primera posición: el GPS arranca impreciso y va afinando.
 * Escucha hasta que la precisión sea igual o mejor que el radio del punto —  no
 * tiene sentido plantar un punto de 10 m con una lectura de ±40 m —  y si al
 * cumplirse el tiempo no llegó, falla diciendo qué tan cerca estuvo.
 */
export function leerGpsMejor(
  precisionMinima: number,
  ms = 10000,
  onLectura?: (l: LecturaGps) => void,
): Promise<LecturaGps> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new GpsError('Este dispositivo no tiene GPS.', 'sin-gps'));
      return;
    }

    const snap = (c: GeolocationCoordinates): LecturaGps => ({
      latitude: c.latitude,
      longitude: c.longitude,
      accuracy: c.accuracy,
      altitude: c.altitude,
    });

    let mejor: LecturaGps | null = null;
    let sinPermiso = false;
    let id = 0;
    let t = 0;

    const cerrar = () => {
      if (id) navigator.geolocation.clearWatch(id);
      if (t) clearTimeout(t);
    };

    const terminar = () => {
      cerrar();
      if (mejor && mejor.accuracy <= precisionMinima) {
        resolve(mejor);
        return;
      }
      if (sinPermiso) {
        reject(new GpsError('Sin permiso de ubicación.', 'sin-permiso'));
        return;
      }
      reject(
        new GpsError(
          mejor
            ? `GPS impreciso: lo mejor fueron ±${Math.round(mejor.accuracy)} m y se necesitan ±${precisionMinima} m.`
            : 'No se pudo leer el GPS.',
          'impreciso',
          mejor ? Math.round(mejor.accuracy) : undefined,
        ),
      );
    };

    id = navigator.geolocation.watchPosition(
      (p) => {
        const l = snap(p.coords);
        onLectura?.(l);
        if (!mejor || l.accuracy < mejor.accuracy) mejor = l;
        if (l.accuracy <= precisionMinima) terminar();
      },
      (e) => {
        if (e.code === e.PERMISSION_DENIED) sinPermiso = true;
        terminar();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 },
    );

    t = window.setTimeout(terminar, ms);
  });
}
