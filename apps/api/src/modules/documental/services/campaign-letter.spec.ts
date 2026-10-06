import { campaignLetterHtml } from './loan-mail-layout';

describe('campaignLetterHtml', () => {
  it('saluda con el nombre y no deja pasar HTML del mensaje', () => {
    const html = campaignLetterHtml({
      name: 'Ana Ruiz',
      title: 'Actualice su carpeta',
      body: 'Traiga la cédula.\n\n<script>alert(1)</script>',
      imageUrl: 'https://portalcoraza-web.onrender.com/brand/minuta-marcacion.png',
    });
    expect(html).toContain('Ana Ruiz');
    expect(html).toContain('Actualice su carpeta');
    expect(html).toContain('Traiga la cédula.');
    expect(html).toContain('Campaña');
    expect(html).toContain('Gestión Documental');
    expect(html).toContain('No responda a este correo');
    expect(html).toContain('documental@corazaseguridadcta.com');
    expect(html).toContain('NIT 811.026.837-1');
    expect(html).toContain('Carrera 81 No. 49-24');
    expect(html).toContain('El nombre');
    expect(html).not.toContain('brand/campana/');
    expect(html).toContain('campana/recibido.html?q=1&amp;a=b');
    expect(html).toContain('Falta la hora exacta');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
