import { campaignLetterHtml } from './loan-mail-layout';

describe('campaignLetterHtml', () => {
  it('saluda con el nombre y no deja pasar HTML del mensaje', () => {
    const html = campaignLetterHtml({
      name: 'Ana Ruiz',
      title: 'Actualice su carpeta',
      body: 'Traiga la cédula.\n\n<script>alert(1)</script>',
    });
    expect(html).toContain('Ana Ruiz');
    expect(html).toContain('Actualice su carpeta');
    expect(html).toContain('Traiga la cédula.');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
