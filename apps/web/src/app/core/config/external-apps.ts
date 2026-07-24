import { environment } from '../../../environments/environment';

/** Apps externas del ecosistema: Portal Coraza es la puerta de entrada. */
export const EXTERNAL_APPS = {
  gestionHumana: environment.externalApps.gestionHumana,
  programacion: environment.externalApps.programacion,
  documental: environment.externalApps.documental,
} as const;
