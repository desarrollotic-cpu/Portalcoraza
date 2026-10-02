import { documentalFromHeader, isUntrustedFrom, DOCUMENTAL_FROM } from './documental-mail.policy';

describe('documental-mail.policy', () => {
  it('nunca usa resend.dev como remitente', () => {
    expect(documentalFromHeader('Gestión Documental Coraza <onboarding@resend.dev>')).toBe(DOCUMENTAL_FROM);
    expect(isUntrustedFrom('Gestión Documental Coraza <onboarding@resend.dev>')).toBe(true);
  });

  it('acepta documental@ del dominio Coraza', () => {
    expect(documentalFromHeader()).toContain('documental@corazaseguridadcta.com');
    expect(documentalFromHeader('Archivo <archivo@corazaseguridadcta.com>')).toContain('archivo@');
  });
});
