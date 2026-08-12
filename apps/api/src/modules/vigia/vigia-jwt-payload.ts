export interface VigiaJwtPayload {
  sub: string; // associateId
  cedula: string;
  nombre: string;
  aud: 'vigia';
}
