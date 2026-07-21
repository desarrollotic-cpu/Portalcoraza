/** Dominio corporativo obligatorio para usuarios del sistema. */
export const USER_EMAIL_DOMAIN = 'corazaseguridadcta.com';

export const USER_EMAIL_DOMAIN_PATTERN = new RegExp(
  `@${USER_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`,
  'i',
);

export const USER_EMAIL_DOMAIN_MESSAGE = `El correo debe usar el dominio @${USER_EMAIL_DOMAIN}`;
