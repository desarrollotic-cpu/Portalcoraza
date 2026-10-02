const LOGO_URL = 'https://portalcoraza-web.onrender.com/brand/logo-coraza-cta.png';
const SENDER = 'documental@corazaseguridadcta.com';
const NAVY = '#075985';
const INK = '#0b1f33';
const GOLD = '#9a7b4f';
const MUTED = '#5c6b7a';
const FONT = 'Arial,Helvetica,sans-serif';
const SERIF = "Georgia,'Times New Roman',Times,serif";

function esc(v: string | undefined): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Quita la cédula del saludo: "Ana Ruiz (CC: 123)" → "Ana Ruiz". */
export function displayName(raw: string | undefined): string {
  return String(raw || '')
    .replace(/\s*\(CC:\s*[^)]+\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatMailDate(value: string | undefined): string {
  const s = String(value || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function formatCityDate(d = new Date()): string {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `Medellín, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function mailtoCta(subject: string): { label: string; href: string } {
  return {
    href: `mailto:${SENDER}?subject=${encodeURIComponent(subject)}`,
    label: 'Responder al Archivo Central',
  };
}

function fact(label: string, value: string): string {
  const v = (value || '').trim() || 'No indicado';
  return `<tr>
    <td valign="top" style="padding:11px 16px;border-bottom:1px solid #ece7dc;width:36%;font-family:${FONT};font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${GOLD};font-weight:700;">${esc(label)}</td>
    <td valign="top" style="padding:11px 16px;border-bottom:1px solid #ece7dc;font-family:${SERIF};font-size:15px;color:${INK};">${esc(v)}</td>
  </tr>`;
}

export function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|tr|h1|h2|div|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function wrapLoanMail(opts: {
  tone: 'ok' | 'alert' | 'info' | 'reject';
  badge: string;
  title: string;
  requester: string;
  message: string;
  facts: { label: string; value: string }[];
  extraHtml?: string;
  ctaLabel?: string;
  ctaHref?: string;
  preheader?: string;
  reference?: string;
}): string {
  const bar =
    opts.tone === 'ok' ? '#1d4e3a' : opts.tone === 'alert' ? '#b91c1c' : opts.tone === 'reject' ? '#7f1d1d' : NAVY;
  const name = displayName(opts.requester) || 'señora / señor';
  const cta = opts.ctaHref
    ? `<tr><td align="center" style="padding:6px 32px 26px;font-family:${FONT};">
        <a href="${opts.ctaHref}" style="background:${INK};color:#f8f4ea;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:13px 26px;display:inline-block;border:1px solid ${GOLD};">${esc(opts.ctaLabel || 'Contactar archivo')}</a>
        <p style="margin:12px 0 0;font-size:12px;color:${MUTED};font-style:italic;">También puede responder este correo. Llega a ${SENDER}.</p>
      </td></tr>`
    : '';
  const pre = esc(opts.preheader || `${opts.badge} — Archivo Central Coraza`);
  const ref = opts.reference ? esc(opts.reference) : esc(opts.badge);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.badge)} — Coraza Seguridad C.T.A.</title>
</head>
<body style="margin:0;padding:0;background:#d9d2c5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#d9d2c5;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#fbf8f1;border:1px solid #c4b8a1;font-family:${FONT};">
  <tr><td style="height:5px;background:${INK};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="height:2px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr>
    <td style="padding:22px 32px 16px;background:#fbf8f1;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="62" valign="top">
            <img src="${LOGO_URL}" width="54" height="54" alt="Coraza Seguridad C.T.A." style="display:block;border:0;">
          </td>
          <td valign="top" style="padding-left:14px;">
            <p style="margin:0;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${GOLD};font-weight:700;">Cooperativa de vigilancia</p>
            <p style="margin:5px 0 0;font-size:17px;font-weight:700;color:${INK};letter-spacing:.02em;">CORAZA SEGURIDAD C.T.A.</p>
            <p style="margin:3px 0 0;font-size:13px;color:${NAVY};font-weight:700;">Gestión Documental · Archivo Central</p>
          </td>
          <td valign="top" align="right" style="width:42%;">
            <p style="margin:0;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${GOLD};font-weight:700;">Comunicación oficial</p>
            <p style="margin:6px 0 0;font-size:12px;color:${INK};">${esc(formatCityDate())}</p>
            <p style="margin:4px 0 0;font-size:11px;color:${MUTED};">NIT 811.026.837-1</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td style="height:1px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr>
    <td style="padding:8px 32px;background:${INK};">
      <p style="margin:0;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#e8dcc4;font-family:${FONT};">Uso interno · Control de archivo · Confidencial</p>
    </td>
  </tr>
  <tr>
    <td style="height:3px;background:${bar};font-size:0;line-height:0;">&nbsp;</td>
  </tr>
  <tr>
    <td style="padding:26px 32px 8px;">
      <p style="margin:0;font-size:11px;color:${MUTED};font-family:${FONT};">Ref. ${ref}</p>
      <p style="margin:6px 0 0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${bar};font-weight:700;">${esc(opts.badge)}</p>
      <p style="margin:10px 0 0;font-size:24px;line-height:1.28;font-weight:400;color:${INK};font-family:${SERIF};">${esc(opts.title)}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 32px 6px;color:${INK};">
      <p style="margin:0 0 12px;font-size:15px;font-family:${SERIF};">Señor(a) <strong>${esc(name)}</strong>:</p>
      <p style="margin:0;font-size:14.5px;line-height:1.7;color:#243040;font-family:${SERIF};">${opts.message}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:18px 32px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${GOLD};background:#fffdf8;">
        <tr>
          <td style="padding:9px 16px;background:${INK};font-family:${FONT};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#e8dcc4;font-weight:700;">Constancia de archivo</td>
        </tr>
        ${opts.facts.map((f) => fact(f.label, f.value)).join('')}
      </table>
    </td>
  </tr>
  <tr><td style="padding:10px 32px;">${opts.extraHtml || ''}</td></tr>
  ${cta}
  <tr>
    <td style="padding:8px 32px 28px;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:${INK};font-family:${SERIF};">
        Del señor(a) atentamente,
      </p>
      <p style="margin:18px 0 0;font-size:15px;font-weight:700;color:${INK};font-family:${SERIF};">Gestión Documental</p>
      <p style="margin:2px 0 0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${GOLD};">Archivo Central · Coraza Seguridad C.T.A.</p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 32px;background:${INK};">
      <p style="margin:0;font-size:11px;line-height:1.55;color:#e8dcc4;">
        Ventanilla de archivo · Medellín, Colombia<br>
        PBX (604) 444 7929 · ${esc(SENDER)} · www.corazaseguridadcta.com
      </p>
      <p style="margin:10px 0 0;font-size:10px;line-height:1.45;color:#9aa7b5;">
        NIT 811.026.837-1 · Vigilado SuperVigilancia, Resolución 6889 de 2011.<br>
        Comunicación oficial de control documental. Si no es el destinatario, reenvíela a Gestión Documental.
      </p>
    </td>
  </tr>
  <tr><td style="height:5px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function approvalLoanHtml(notice: {
  requester: string;
  document: string;
  loanDate: string;
  returnDate?: string;
  department?: string;
}): string {
  const cta = mailtoCta(`Retiro de expediente: ${notice.document}`);
  return wrapLoanMail({
    tone: 'ok',
    badge: 'Préstamo autorizado',
    title: 'Autorización de préstamo documental',
    requester: notice.requester,
    reference: `GD-AUT / ${notice.document}`,
    preheader: `Comunicación oficial: préstamo autorizado de ${notice.document}.`,
    message:
      'Nos permitimos informar que el Archivo Central <strong>autorizó</strong> el préstamo del expediente. Puede presentarse en ventanilla para el retiro. La custodia queda a su cargo hasta la fecha límite consignada en esta constancia.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Fecha de préstamo', value: formatMailDate(notice.loanDate) },
      { label: 'Devolver antes de', value: formatMailDate(notice.returnDate) || 'Por coordinar' },
      { label: 'Dependencia', value: notice.department || '' },
    ],
    ctaLabel: cta.label,
    ctaHref: cta.href,
  });
}

export function rejectionLoanHtml(notice: {
  requester: string;
  document: string;
  motivoRechazo: string;
  department?: string;
}): string {
  const cta = mailtoCta(`Reconsideración de préstamo: ${notice.document}`);
  return wrapLoanMail({
    tone: 'reject',
    badge: 'Solicitud no autorizada',
    title: 'Decisión sobre solicitud de préstamo',
    requester: notice.requester,
    reference: `GD-NEG / ${notice.document}`,
    preheader: `Comunicación oficial sobre ${notice.document}.`,
    message:
      'Luego de revisar la disponibilidad y las condiciones de archivo, en esta oportunidad <strong>no es posible autorizar</strong> el préstamo. Si se subsana lo indicado, podrá radicar de nuevo en ventanilla.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Dependencia', value: notice.department || '' },
      { label: 'Decisión', value: 'No autorizado' },
    ],
    extraHtml: `<p style="margin:0 0 6px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${GOLD};font-weight:700;font-family:${FONT};">Fundamento de archivo</p>
        <p style="margin:0;padding:14px 16px;background:#fffdf8;border:1px solid ${GOLD};color:${INK};font-size:14px;line-height:1.6;font-family:${SERIF};">${esc(notice.motivoRechazo)}</p>`,
    ctaLabel: cta.label,
    ctaHref: cta.href,
  });
}

export function returnLoanHtml(notice: {
  requester: string;
  document: string;
  returnDate?: string;
  department?: string;
}): string {
  return wrapLoanMail({
    tone: 'ok',
    badge: 'Devolución registrada',
    title: 'Cierre de préstamo documental',
    requester: notice.requester,
    reference: `GD-DEV / ${notice.document}`,
    preheader: `Constancia de devolución: ${notice.document}.`,
    message:
      'El Archivo Central deja constancia de la recepción física del expediente en ventanilla. <strong>El trámite de préstamo queda cerrado.</strong> Agradecemos el cumplimiento del control documental.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Fecha de devolución', value: formatMailDate(notice.returnDate) || 'Hoy' },
      { label: 'Dependencia', value: notice.department || '' },
    ],
  });
}

export function overdueLoanHtml(notice: {
  requester: string;
  document: string;
  returnDate: string;
  department?: string;
}): string {
  const cta = mailtoCta(`Devolución vencida: ${notice.document}`);
  return wrapLoanMail({
    tone: 'alert',
    badge: 'Devolución pendiente',
    title: 'Requerimiento de devolución',
    requester: notice.requester,
    reference: `GD-VEN / ${notice.document}`,
    preheader: `Requerimiento de archivo: ${notice.document}. Fecha límite ${formatMailDate(notice.returnDate)}.`,
    message:
      'El Archivo Central registra <strong>vencida</strong> la fecha de custodia del expediente, conforme al acta de préstamo. Solicitamos su devolución física en ventanilla a la mayor brevedad, a fin de cerrar el trámite. Si ya lo restituyó, sírvase responder esta comunicación.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Fecha límite', value: formatMailDate(notice.returnDate) },
      { label: 'Dependencia', value: notice.department || '' },
    ],
    ctaLabel: 'Informar devolución',
    ctaHref: cta.href,
  });
}

export function newLoanRequestHtml(notice: {
  id: string;
  requester: string;
  email: string;
  department?: string;
  document: string;
  observations: string;
  returnDate?: string;
}): string {
  return wrapLoanMail({
    tone: 'info',
    badge: 'Nueva solicitud',
    title: 'Radicación pendiente de aprobación',
    requester: 'Gestión Documental',
    reference: `GD-SOL / ${notice.id}`,
    preheader: `Nueva solicitud: ${notice.document}.`,
    message: `El solicitante <strong>${esc(displayName(notice.requester))}</strong> radicó un préstamo. Corresponde revisar disponibilidad y resolver en el Portal.`,
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Dependencia', value: notice.department || '' },
      { label: 'Devolución estimada', value: formatMailDate(notice.returnDate) },
    ],
    extraHtml: `<p style="margin:0 0 8px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${GOLD};font-weight:700;font-family:${FONT};">Ficha de radicación</p>
        <p style="margin:0;padding:14px 16px;background:#fffdf8;border:1px solid ${GOLD};font-size:13px;color:${INK};white-space:pre-wrap;font-family:${SERIF};">${esc(notice.observations)}</p>
        <p style="font-size:12px;color:${MUTED};font-family:${FONT};">Correo: ${esc(notice.email || 'No indicado')} · Radicado ${esc(notice.id)}</p>`,
  });
}
