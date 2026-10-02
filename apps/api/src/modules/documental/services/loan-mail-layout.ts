const LOGO_URL = 'https://portalcoraza-web.onrender.com/brand/logo-coraza-cta.png';
const SENDER = 'documental@corazaseguridadcta.com';
const NAVY = '#075985';
const ORANGE = '#ea580c';
const GREEN = '#166534';
const INK = '#0f172a';
const MUTED = '#78716c';
const FONT = 'Arial,Helvetica,sans-serif';

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
    label: 'Responder a Gestión Documental',
  };
}

function fact(label: string, value: string): string {
  const v = (value || '').trim() || 'No indicado';
  return `<tr>
    <td valign="top" style="padding:11px 4px;border-bottom:1px solid #fed7aa;width:36%;font-family:${FONT};font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:${MUTED};">${esc(label)}</td>
    <td valign="top" style="padding:11px 4px;border-bottom:1px solid #fed7aa;font-family:${FONT};font-size:14px;color:${INK};font-weight:600;">${esc(v)}</td>
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
  const accent =
    opts.tone === 'ok' ? GREEN : opts.tone === 'alert' ? '#b91c1c' : opts.tone === 'reject' ? '#9f1239' : NAVY;
  const btnColor = opts.tone === 'alert' || opts.tone === 'reject' ? accent : ORANGE;
  const name = displayName(opts.requester) || 'señora / señor';
  const btn = opts.ctaHref
    ? `<tr><td align="center" style="padding:22px 40px 4px;font-family:${FONT};">
        <a href="${opts.ctaHref}" style="background:${btnColor};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:17px 44px;display:inline-block;border-radius:999px;">${esc(opts.ctaLabel || 'Contactar archivo')}</a>
      </td></tr>
      <tr><td align="center" style="padding:12px 40px 0;font-family:${FONT};font-size:12px;color:${MUTED};">
        Si no solicitó este trámite, ignore este mensaje.
      </td></tr>`
    : '';
  const pre = esc(opts.preheader || `${opts.badge} — Gestión Documental Coraza`);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.badge)} — Coraza Seguridad C.T.A.</title>
</head>
<body style="margin:0;padding:0;background:#fff4e8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff4e8;">
<tr><td align="center" style="padding:36px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;font-family:${FONT};">
  <tr><td style="height:6px;background:${ORANGE};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr>
    <td align="center" style="padding:36px 32px 8px;">
      <img src="${LOGO_URL}" width="120" height="120" alt="Coraza Seguridad C.T.A." style="display:block;border:0;margin:0 auto;">
      <p style="margin:20px 0 0;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${ORANGE};font-weight:700;">Cooperativa de vigilancia</p>
      <p style="margin:8px 0 0;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${INK};font-weight:700;">Gestión Documental</p>
      <p style="margin:6px 0 0;font-size:13px;color:${MUTED};">Archivo Central · Coraza Seguridad C.T.A.</p>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:8px 80px 4px;">
      <div style="height:1px;background:#fed7aa;font-size:0;line-height:0;">&nbsp;</div>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:24px 40px 0;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${accent};">${esc(opts.badge)}</p>
      <p style="margin:14px 0 0;font-size:30px;line-height:1.22;font-weight:700;color:${INK};">${esc(opts.title)}</p>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:16px 44px 8px;">
      <p style="margin:0;font-size:16px;line-height:1.7;color:#57534e;">
        Apreciado(a) ${esc(name)}.<br><br>
        ${opts.message}
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 40px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff7ed;border-radius:14px;">
        <tr><td style="padding:8px 20px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${opts.facts.map((f) => fact(f.label, f.value)).join('')}
          </table>
        </td></tr>
      </table>
    </td>
  </tr>
  <tr><td style="padding:8px 40px;">${opts.extraHtml || ''}</td></tr>
  ${btn}
  <tr>
    <td align="center" style="padding:28px 36px 32px;">
      <p style="margin:0;font-size:11px;line-height:1.65;color:${MUTED};">
        ${esc(SENDER)} · PBX (604) 444 7929<br>
        ${esc(formatCityDate())} · NIT 811.026.837-1<br>
        www.corazaseguridadcta.com
      </p>
    </td>
  </tr>
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
    title: 'Su solicitud fue autorizada',
    requester: notice.requester,
    reference: notice.document,
    preheader: `Su préstamo de ${notice.document} fue autorizado.`,
    message:
      'Gestión Documental autorizó el préstamo. Acérquese al Archivo Central para el retiro. Conserve la fecha límite de devolución.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Fecha de préstamo', value: formatMailDate(notice.loanDate) },
      { label: 'Devolver antes de', value: formatMailDate(notice.returnDate) || 'Por coordinar' },
      { label: 'Área', value: notice.department || '' },
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
    title: 'Respuesta a su solicitud de préstamo',
    requester: notice.requester,
    reference: notice.document,
    preheader: `Respuesta de Gestión Documental sobre ${notice.document}.`,
    message:
      'Le informamos que, en esta oportunidad, no fue posible autorizar el préstamo. Si se atienden las observaciones, puede presentar una nueva solicitud.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Área', value: notice.department || '' },
      { label: 'Estado', value: 'No autorizado' },
    ],
    extraHtml: `<p style="margin:16px 0 6px;font-size:12px;color:${MUTED};font-family:${FONT};">Observación</p>
        <p style="margin:0;padding:12px 14px;background:#fff7ed;border-left:3px solid #9f1239;color:${INK};font-size:14px;line-height:1.6;font-family:${FONT};">${esc(notice.motivoRechazo)}</p>`,
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
  const cta = mailtoCta(`Devolución registrada: ${notice.document}`);
  return wrapLoanMail({
    tone: 'ok',
    badge: 'Devolución registrada',
    title: 'Confirmamos la recepción del expediente',
    requester: notice.requester,
    reference: notice.document,
    preheader: `Devolución registrada: ${notice.document}.`,
    message:
      'Confirmamos que el expediente fue recibido en el Archivo Central. El préstamo queda cerrado. Agradecemos su gestión.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Fecha de devolución', value: formatMailDate(notice.returnDate) || 'Hoy' },
      { label: 'Área', value: notice.department || '' },
    ],
    ctaLabel: cta.label,
    ctaHref: cta.href,
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
    title: 'El plazo de devolución venció',
    requester: notice.requester,
    reference: notice.document,
    preheader: `El plazo de ${notice.document} venció el ${formatMailDate(notice.returnDate)}.`,
    message:
      'Le recordamos que la fecha límite de custodia del expediente ya venció. Solicitamos devolverlo en la ventanilla de Gestión Documental para cerrar el trámite. Si ya lo entregó, responda este correo para verificarlo.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Fecha límite', value: formatMailDate(notice.returnDate) },
      { label: 'Área', value: notice.department || '' },
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
    title: 'Solicitud pendiente de aprobación',
    requester: 'Gestión Documental',
    reference: notice.id,
    preheader: `Nueva solicitud: ${notice.document}.`,
    message: `El solicitante <strong>${esc(displayName(notice.requester))}</strong> radicó un préstamo. Corresponde revisar disponibilidad y resolver en el Portal.`,
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Área', value: notice.department || '' },
      { label: 'Devolución estimada', value: formatMailDate(notice.returnDate) },
    ],
    extraHtml: `<p style="margin:16px 0 6px;font-size:12px;color:${MUTED};font-family:${FONT};">Ficha de la solicitud</p>
        <p style="margin:0;padding:12px 14px;background:#f8fafc;border-left:3px solid ${NAVY};font-size:13px;color:${INK};white-space:pre-wrap;font-family:${FONT};">${esc(notice.observations)}</p>
        <p style="margin:10px 0 0;font-size:12px;color:${MUTED};font-family:${FONT};">Correo: ${esc(notice.email || 'No indicado')}</p>`,
  });
}
