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
    expect(html).toContain('brand/campana/archivo.jpg');
    expect(html).not.toContain('brand/campana/minuta.jpg');
    expect(html).toContain('Bien.</strong> Se anota la hora real');
    expect(html).toContain('for="q1b"');
    expect(html).not.toContain('recibido.html');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
