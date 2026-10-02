const LOGO_URL = 'https://portalcoraza-web.onrender.com/brand/logo-coraza-cta.png';
const SENDER = 'documental@corazaseguridadcta.com';
const NAVY = '#075985';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
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
    <td valign="top" style="padding:12px 0;border-bottom:1px solid ${LINE};width:34%;font-family:${FONT};font-size:12px;color:${MUTED};">${esc(label)}</td>
    <td valign="top" style="padding:12px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:14px;color:${INK};font-weight:600;">${esc(v)}</td>
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
  const cta = opts.ctaHref
    ? `<tr><td style="padding:16px 40px 8px;font-family:${FONT};">
        <a href="${opts.ctaHref}" style="background:${NAVY};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;display:inline-block;">${esc(opts.ctaLabel || 'Contactar archivo')}</a>
      </td></tr>`
    : '';
  const pre = esc(opts.preheader || `${opts.badge} — Gestión Documental Coraza`);
  const ref = opts.reference ? `<p style="margin:0 0 16px;font-size:13px;color:${MUTED};">Asunto: ${esc(opts.badge)}<br>Referencia: ${esc(opts.reference)}</p>` : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.badge)} — Coraza Seguridad C.T.A.</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${LINE};font-family:${FONT};">
  <tr>
    <td style="padding:28px 40px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" width="52">
            <img src="${LOGO_URL}" width="44" height="44" alt="Coraza Seguridad C.T.A." style="display:block;border:0;">
          </td>
          <td valign="middle" style="padding-left:14px;">
            <p style="margin:0;font-size:15px;font-weight:700;color:${INK};">Coraza Seguridad C.T.A.</p>
            <p style="margin:3px 0 0;font-size:13px;color:${NAVY};">Gestión Documental</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td style="padding:0 40px;"><div style="height:2px;background:${NAVY};font-size:0;line-height:0;">&nbsp;</div></td></tr>
  <tr>
    <td style="padding:22px 40px 0;font-size:13px;color:${MUTED};">${esc(formatCityDate())}</td>
  </tr>
  <tr>
    <td style="padding:20px 40px 0;">
      ${ref}
      <p style="margin:0;font-size:12px;font-weight:700;color:${accent};">${esc(opts.badge)}</p>
      <p style="margin:8px 0 0;font-size:20px;line-height:1.35;font-weight:700;color:${INK};">${esc(opts.title)}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 40px 8px;">
      <p style="margin:0 0 14px;font-size:15px;color:${INK};">Apreciado(a) ${esc(name)}:</p>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">${opts.message}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 40px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${opts.facts.map((f) => fact(f.label, f.value)).join('')}
      </table>
    </td>
  </tr>
  <tr><td style="padding:8px 40px;">${opts.extraHtml || ''}</td></tr>
  ${cta}
  <tr>
    <td style="padding:12px 40px 32px;">
      <p style="margin:0;font-size:15px;line-height:1.6;color:${INK};">
        Atentamente,<br><br>
        <strong>Gestión Documental</strong><br>
        <span style="font-size:13px;color:${MUTED};">Archivo Central · Coraza Seguridad C.T.A.</span>
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:18px 40px;background:#f8fafc;border-top:1px solid ${LINE};">
      <p style="margin:0;font-size:12px;line-height:1.55;color:${MUTED};">
        ${esc(SENDER)} · PBX (604) 444 7929 · Medellín<br>
        NIT 811.026.837-1 · www.corazaseguridadcta.com<br>
        Vigilado SuperVigilancia, Resolución 6889 de 2011.
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
      'Le informamos que Gestión Documental autorizó el préstamo del expediente. Puede acercarse al Archivo Central para el retiro. El documento permanece bajo control de archivo hasta la fecha límite de devolución.',
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
