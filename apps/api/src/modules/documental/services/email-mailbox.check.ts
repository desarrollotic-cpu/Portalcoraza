import { promises as dns } from 'node:dns';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'corazaseguridadcta.co': 'corazaseguridadcta.com',
  'corazaseguridad.com': 'corazaseguridadcta.com',
};

const DISPOSABLE = new Set([
  'mailinator.com',
  'yopmail.com',
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'trashmail.com',
  'sharklasers.com',
]);

export function normalizeEmail(raw: string): string {
  return String(raw ?? '').trim().toLowerCase();
}

/** Errores de formato / typo / desechable. Sin red. */
export function emailFieldError(raw: string): string | null {
  const email = normalizeEmail(raw);
  if (!email) return 'Escriba un correo electrónico.';
  if (!EMAIL_RE.test(email)) return 'Ese no es un correo válido. Ejemplo: nombre@gmail.com';
  const domain = email.split('@')[1] ?? '';
  if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
    return 'Ese dominio de correo está mal escrito.';
  }
  const suggest = TYPOS[domain];
  if (suggest) return `El dominio está mal escrito. ¿Quiso decir ${suggest}?`;
  if (DISPOSABLE.has(domain)) return 'Use un correo real (institucional o personal), no uno temporal.';
  return null;
}

/** Confirma que el dominio tiene servidores de correo (MX). */
export async function emailDomainReceivesMail(raw: string): Promise<string | null> {
  const sync = emailFieldError(raw);
  if (sync) return sync;
  const domain = normalizeEmail(raw).split('@')[1];
  try {
    const mx = await dns.resolveMx(domain);
    if (!mx.length) return 'Ese dominio no recibe correo. Corrija el correo para continuar.';
    return null;
  } catch {
    return 'Ese dominio de correo no existe. Corrija el correo para continuar.';
  }
}
