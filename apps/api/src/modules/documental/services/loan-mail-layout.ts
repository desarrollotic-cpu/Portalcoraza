const LOGO_URL = 'https://portalcoraza-web.onrender.com/brand/logo-coraza-cta.png';
const SENDER = 'documental@corazaseguridadcta.com';
const NAVY = '#075985';
const INK = '#0f172a';
const MUTED = '#64748b';
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
    <td valign="top" style="padding:12px 0;border-bottom:1px solid #e2e8f0;width:34%;font-family:${FONT};font-size:12px;color:${MUTED};">${esc(label)}</td>
    <td valign="top" style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-family:${FONT};font-size:14px;color:${INK};font-weight:600;">${esc(v)}</td>
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
    opts.tone === 'ok' ? '#15803d' : opts.tone === 'alert' ? '#b91c1c' : opts.tone === 'reject' ? '#9f1239' : NAVY;
  const name = displayName(opts.requester) || 'señora / señor';
  const btn = opts.ctaHref
    ? `<tr><td align="center" style="padding:8px 36px 6px;font-family:${FONT};">
        <a href="${opts.ctaHref}" style="background:${accent};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.04em;padding:14px 28px;display:inline-block;border-radius:8px;">${esc(opts.ctaLabel || 'Contactar archivo')}</a>
      </td></tr>
      <tr><td align="center" style="padding:10px 36px 0;font-family:${FONT};font-size:12px;color:${MUTED};">
        Si este mensaje no le corresponde, ignórelo o reenvíelo a Gestión Documental.
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
<body style="margin:0;padding:0;background:#e0f2fe;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e0f2fe;">
<tr><td align="center" style="padding:28px 12px;">
  <p style="margin:0 0 16px;font-family:${FONT};">
    <img src="${LOGO_URL}" width="40" height="40" alt="Coraza" style="display:inline-block;border:0;vertical-align:middle;">
    <span style="display:inline-block;padding-left:8px;font-size:13px;font-weight:700;color:${NAVY};vertical-align:middle;">Coraza Seguridad C.T.A.</span>
  </p>
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:${FONT};">
  <tr>
    <td align="center" style="padding:36px 32px 12px;background:#f0f9ff;">
      <img src="${LOGO_URL}" width="88" height="88" alt="Coraza Seguridad C.T.A." style="display:block;border:0;margin:0 auto;">
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:8px 36px 0;">
      <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${accent};">${esc(opts.badge)}</p>
      <p style="margin:12px 0 0;font-size:26px;line-height:1.25;font-weight:700;color:${NAVY};">${esc(opts.title)}</p>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:16px 40px 8px;">
      <p style="margin:0;font-size:15px;line-height:1.65;color:#475569;">
        Apreciado(a) ${esc(name)}.<br><br>
        ${opts.message}
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 40px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:10px;">
        <tr><td style="padding:8px 18px;">
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
    <td align="center" style="padding:28px 36px 12px;">
      <p style="margin:0;font-size:13px;color:${NAVY};font-weight:700;">Gestión Documental</p>
      <p style="margin:4px 0 0;font-size:12px;color:${MUTED};">Archivo Central</p>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:8px 28px 28px;">
      <p style="margin:0;font-size:11px;line-height:1.55;color:${MUTED};">
        ${esc(SENDER)} · PBX (604) 444 7929 · ${esc(formatCityDate())}<br>
        NIT 811.026.837-1 · www.corazaseguridadcta.com
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
        <p style="margin:0;padding:12px 14px;background:#f8fafc;border-left:3px solid #9f1239;color:${INK};font-size:14px;line-height:1.6;font-family:${FONT};">${esc(notice.motivoRechazo)}</p>`,
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
