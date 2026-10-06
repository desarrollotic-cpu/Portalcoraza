const LOGO_URL = 'https://portalcoraza-web.onrender.com/brand/logo-coraza-cta.png';
const SENDER = 'documental@corazaseguridadcta.com';
export const CAMPAIGN_IMAGE = 'https://portalcoraza-web.onrender.com/brand/minuta-marcacion.png';
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
    label: 'Escribir a Gestión Documental',
  };
}

function fact(label: string, value: string): string {
  const v = (value || '').trim() || 'No indicado';
  return `<tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-family:${FONT};">
    <span style="display:block;font-size:11px;color:#64748b;font-weight:700;">${esc(label)}</span>
    <span style="display:block;font-size:15px;color:#0f172a;font-weight:700;padding-top:4px;">${esc(v)}</span>
  </td></tr>`;
}

export function campaignLetterHtml(opts: {
  name: string;
  title: string;
  body: string;
  imageUrl?: string;
}): string {
  const name = displayName(opts.name) || 'señora / señor';
  const head = `Georgia,"Times New Roman",serif`;
  const body = `Arial,Helvetica,sans-serif`;
  const paragraphs = opts.body
    .split(/\n{2,}/)
    .map((block) => esc(block).replace(/\n/g, '<br>'))
    .filter((block) => block.trim())
    .map(
      (block) =>
        `<p style="margin:0 0 16px;font-family:${body};font-size:16px;line-height:1.7;color:#3a3d4a;">${block}</p>`,
    )
    .join('');
  const image = opts.imageUrl
    ? `<tr><td align="center" bgcolor="#f7f6f2" style="padding:8px 48px 8px;background:#f7f6f2;">
        <img src="${esc(opts.imageUrl)}" width="220" alt="" style="display:block;width:220px;max-width:70%;height:auto;border:0;margin:0 auto;">
      </td></tr>`
    : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Campaña · Gestión Documental</title>
</head>
<body style="margin:0;padding:0;background:#e7e4dc;">
<div style="display:none;max-height:0;overflow:hidden;">Campaña · Gestión Documental. ${esc(opts.title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e7e4dc;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#f7f6f2;">
  <tr>
    <td align="center" bgcolor="#f7f6f2" style="padding:36px 40px 0;background:#f7f6f2;">
      <img src="${LOGO_URL}" width="64" alt="Coraza Seguridad C.T.A." style="display:block;border:0;margin:0 auto;">
      <p style="margin:14px 0 0;font-family:${head};font-size:13px;letter-spacing:.22em;color:#14162c;">CORAZA</p>
      <p style="margin:4px 0 0;font-family:${body};font-size:12px;letter-spacing:.08em;color:#6b6e7a;">Gestión Documental</p>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:18px 40px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
        <tr><td width="48" height="2" bgcolor="#c8102e" style="width:48px;height:2px;background:#c8102e;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td bgcolor="#f7f6f2" style="padding:22px 48px 0;background:#f7f6f2;">
      <p style="margin:0;font-family:${body};font-size:12px;color:#6b6e7a;">${esc(formatCityDate())}</p>
      <p style="margin:12px 0 0;font-family:${head};font-size:26px;line-height:1.3;color:#14162c;">${esc(opts.title)}</p>
    </td>
  </tr>
  ${image}
  <tr>
    <td bgcolor="#f7f6f2" style="padding:22px 48px 8px;background:#f7f6f2;">
      <p style="margin:0 0 16px;font-family:${body};font-size:16px;line-height:1.7;color:#14162c;">Estimado(a) ${esc(name)},</p>
      ${paragraphs}
    </td>
  </tr>
  <tr>
    <td bgcolor="#f7f6f2" style="padding:8px 48px 36px;background:#f7f6f2;">
      <p style="margin:0;padding-top:16px;border-top:1px solid #ddd9d0;font-family:${body};font-size:14px;font-weight:700;color:#14162c;">Gestión Documental</p>
      <p style="margin:4px 0 0;font-family:${body};font-size:13px;line-height:1.5;color:#6b6e7a;">Archivo Central · Medellín · PBX (604) 444 7929</p>
      <p style="margin:12px 0 0;font-family:${body};font-size:12px;line-height:1.5;color:#8a8d98;">Mensaje informativo. No responda a este correo.</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
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
    opts.tone === 'ok' ? '#15803d' : opts.tone === 'alert' ? '#b91c1c' : opts.tone === 'reject' ? '#9f1239' : '#0c4a6e';
  const name = displayName(opts.requester) || 'señora / señor';
  const cta = opts.ctaHref
    ? `<tr><td align="center" style="padding:18px 16px;font-family:${FONT};">
        <a href="${opts.ctaHref}" style="background:${bar};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;display:inline-block;">${esc(opts.ctaLabel || 'Contactar archivo')}</a>
      </td></tr>`
    : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.badge)}</title>
</head>
<body style="margin:0;padding:0;background:#e2e8f0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e2e8f0;">
<tr><td align="center" style="padding:16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #cbd5e1;font-family:${FONT};">
  <tr>
    <td align="center" style="padding:20px 16px 12px;background:#ffffff;">
      <img src="${LOGO_URL}" width="72" alt="Coraza Seguridad C.T.A." style="display:block;border:0;">
      <p style="margin:10px 0 0;font-size:18px;font-weight:700;color:#0c4a6e;">CORAZA SEGURIDAD C.T.A.</p>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Gestión Documental - Archivo Central</p>
    </td>
  </tr>
  <tr>
    <td align="center" bgcolor="${bar}" style="padding:16px;background:${bar};">
      <p style="margin:0;font-size:12px;font-weight:700;color:#ffffff;letter-spacing:.08em;text-transform:uppercase;">${esc(opts.badge)}</p>
      <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#ffffff;">${esc(opts.title)}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 16px 8px;color:#0f172a;">
      <p style="margin:0 0 8px;font-size:16px;font-weight:700;">Estimado(a) ${esc(name)},</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">${opts.message}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:8px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${opts.facts.map((f) => fact(f.label, f.value)).join('')}</table>
    </td>
  </tr>
  <tr><td style="padding:8px 16px;">${opts.extraHtml || ''}</td></tr>
  ${cta}
  <tr>
    <td style="padding:8px 16px 20px;">
      <p style="margin:0;padding:12px;background:#f1f5f9;font-size:13px;color:#334155;">
        Ventanilla de Gestión Documental · PBX (604) 444 7929 · Medellín
      </p>
    </td>
  </tr>
  <tr>
    <td align="center" bgcolor="#0f172a" style="padding:14px;background:#0f172a;">
      <p style="margin:0;font-size:11px;color:#cbd5e1;">Remitente: ${esc(SENDER)}</p>
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
    badge: 'Préstamo aprobado',
    title: 'Su solicitud fue autorizada',
    requester: notice.requester,
    reference: notice.document,
    preheader: `Su préstamo de ${notice.document} fue autorizado.`,
    message:
      'Gestión Documental <strong>aprobó y confirmó</strong> el préstamo del expediente. Acérquese al archivo central para retirarlo y devuélvalo en la fecha límite.',
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
    badge: 'Solicitud no aprobada',
    title: 'No fue posible autorizar el préstamo',
    requester: notice.requester,
    reference: notice.document,
    preheader: `Respuesta de Gestión Documental sobre ${notice.document}.`,
    message:
      'En esta oportunidad el expediente no pudo entregarse. Si subsana las observaciones, puede volver a solicitarlo.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Área', value: notice.department || '' },
      { label: 'Estado', value: 'Rechazado' },
    ],
    extraHtml: `<p style="margin:0 0 6px;font-size:12px;color:#9f1239;font-weight:700;font-family:${FONT};">Motivo</p>
        <p style="margin:0;padding:12px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:13px;line-height:1.5;font-family:${FONT};">${esc(notice.motivoRechazo)}</p>`,
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
    title: 'El expediente volvió al archivo',
    requester: notice.requester,
    reference: notice.document,
    preheader: `Devolución registrada: ${notice.document}.`,
    message:
      'Confirmamos la recepción física del documento. <strong>Gracias por devolverlo a tiempo.</strong> El préstamo queda cerrado en el sistema.',
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
    badge: 'Préstamo vencido',
    title: 'Debe devolver el expediente',
    requester: notice.requester,
    reference: notice.document,
    preheader: `El plazo de ${notice.document} venció el ${formatMailDate(notice.returnDate)}.`,
    message:
      'La fecha límite de custodia <strong>ya venció</strong>. Entregue el expediente físico en la ventanilla de Gestión Documental para cerrar el acta de préstamo.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Fecha límite', value: formatMailDate(notice.returnDate) },
      { label: 'Área', value: notice.department || '' },
    ],
    ctaLabel: 'Avisar devolución',
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
    title: 'Hay una solicitud pendiente de aprobación',
    requester: 'Gestión Documental',
    reference: notice.id,
    preheader: `Nueva solicitud: ${notice.document}.`,
    message: `El solicitante <strong>${esc(displayName(notice.requester))}</strong> radicó un préstamo. Revise disponibilidad y apruebe o rechace en el Portal.`,
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Área', value: notice.department || '' },
      { label: 'Devolución estimada', value: formatMailDate(notice.returnDate) },
    ],
    extraHtml: `<p style="margin:0 0 8px;font-size:12px;color:#64748b;font-weight:700;font-family:${FONT};">Ficha de la solicitud</p>
        <p style="margin:0;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#0f172a;white-space:pre-wrap;font-family:${FONT};">${esc(notice.observations)}</p>
        <p style="font-size:12px;color:#64748b;font-family:${FONT};">Correo: ${esc(notice.email || 'No indicado')} - Radicado ${esc(notice.id)}</p>`,
  });
}
