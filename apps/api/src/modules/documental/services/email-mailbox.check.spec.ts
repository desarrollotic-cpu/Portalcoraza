import { emailFieldError } from './email-mailbox.check';

describe('emailFieldError', () => {
  it('rechaza vacío y formato inválido', () => {
    expect(emailFieldError('')).toMatch(/correo/i);
    expect(emailFieldError('sinarroba')).toMatch(/válido/i);
  });

  it('corrige typos comunes y bloquea temporales', () => {
    expect(emailFieldError('ana@gmial.com')).toMatch(/gmail.com/);
    expect(emailFieldError('ana@mailinator.com')).toMatch(/temporal/i);
  });

  it('acepta un correo bien escrito', () => {
    expect(emailFieldError('documental@corazaseguridadcta.com')).toBeNull();
  });
});
