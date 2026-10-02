export const DOCUMENTAL_MAIL = 'documental@corazaseguridadcta.com';
export const DOCUMENTAL_FROM = `Gestión Documental Coraza <${DOCUMENTAL_MAIL}>`;

/** Solo remitentes del dominio Coraza. onboarding@resend.dev cae en spam. */
export function documentalFromHeader(mailFromEnv?: string): string {
  const raw = (mailFromEnv || '').trim();
  if (raw && /corazaseguridadcta\.com/i.test(raw) && !/resend\.dev/i.test(raw)) {
    return raw.includes('<') ? raw : `Gestión Documental Coraza <${raw}>`;
  }
  return DOCUMENTAL_FROM;
}

export function isUntrustedFrom(from: string): boolean {
  return /resend\.dev/i.test(from);
}
