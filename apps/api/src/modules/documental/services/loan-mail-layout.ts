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

function mailtoCta(subject: string): { label: string; href: string } {
  return {
    href: `mailto:${SENDER}?subject=${encodeURIComponent(subject)}`,
    label: 'Responder a Gestión Documental',
  };
}

function fact(label: string, value: string): string {
  const v = (value || '').trim() || 'No indicado';
  return `<tr>
    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;width:38%;font-family:${FONT};font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:${MUTED};font-weight:700;">${esc(label)}</td>
    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-family:${FONT};font-size:14px;color:${INK};font-weight:700;">${esc(v)}</td>
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
}): string {
  const bar =
    opts.tone === 'ok' ? '#15803d' : opts.tone === 'alert' ? '#b91c1c' : opts.tone === 'reject' ? '#9f1239' : NAVY;
  const name = displayName(opts.requester) || 'señora / señor';
  const cta = opts.ctaHref
    ? `<tr><td align="center" style="padding:8px 24px 22px;font-family:${FONT};">
        <a href="${opts.ctaHref}" style="background:${NAVY};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;display:inline-block;border-radius:4px;">${esc(opts.ctaLabel || 'Contactar archivo')}</a>
        <p style="margin:10px 0 0;font-size:12px;color:${MUTED};">O responda este correo: llega directo a archivo.</p>
      </td></tr>`
    : '';
  const pre = esc(opts.preheader || `${opts.badge} — Archivo Central Coraza`);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.badge)} — Coraza Seguridad C.T.A.</title>
</head>
<body style="margin:0;padding:0;background:#e8eef3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e8eef3;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #d0d7de;font-family:${FONT};">
  <tr>
    <td style="background:#ffffff;padding:20px 24px 16px;border-bottom:1px solid #e2e8f0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="64" valign="middle">
            <img src="${LOGO_URL}" width="56" height="56" alt="Coraza Seguridad C.T.A." style="display:block;border:0;">
          </td>
          <td valign="middle" style="padding-left:14px;">
            <p style="margin:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${NAVY};font-weight:700;">Coraza Seguridad C.T.A.</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${INK};">Gestión Documental</p>
            <p style="margin:2px 0 0;font-size:12px;color:${MUTED};">Archivo Central · Medellín</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="height:4px;background:${bar};font-size:0;line-height:0;">&nbsp;</td>
  </tr>
  <tr>
    <td style="padding:22px 24px 6px;">
      <p style="margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${bar};font-weight:700;">${esc(opts.badge)}</p>
      <p style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:700;color:${INK};">${esc(opts.title)}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 24px 8px;color:${INK};">
      <p style="margin:0 0 10px;font-size:15px;font-weight:700;">Estimado(a) ${esc(name)}:</p>
      <p style="margin:0;font-size:14px;line-height:1.65;color:#334155;">${opts.message}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 24px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-left:4px solid ${NAVY};">
        <tr><td style="padding:8px 14px;background:#f8fafc;font-family:${FONT};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${NAVY};font-weight:700;">Acta de archivo</td></tr>
        ${opts.facts.map((f) => fact(f.label, f.value)).join('')}
      </table>
    </td>
  </tr>
  <tr><td style="padding:8px 24px;">${opts.extraHtml || ''}</td></tr>
  ${cta}
  <tr>
    <td style="padding:4px 24px 20px;">
      <p style="margin:0;font-size:13px;line-height:1.55;color:#334155;">
        Cordialmente,<br>
        <strong>Gestión Documental</strong><br>
        Archivo Central — Coraza Seguridad C.T.A.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 24px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#334155;line-height:1.5;">
        Ventanilla de archivo · Medellín<br>
        PBX (604) 444 7929 · ${esc(SENDER)}
      </p>
      <p style="margin:8px 0 0;font-size:11px;color:${MUTED};">Comunicación oficial de control documental. Si este mensaje no le corresponde, reenvíelo a Gestión Documental.</p>
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
    title: 'El archivo ya puede entregarle el expediente',
    requester: notice.requester,
    preheader: `Préstamo autorizado: ${notice.document}. Retiro en Archivo Central.`,
    message:
      'Gestión Documental <strong>revisó y autorizó</strong> su solicitud. Puede acercarse al Archivo Central para el retiro. Conserve la fecha límite de devolución: el expediente sigue bajo control de archivo.',
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
    title: 'En esta oportunidad no fue posible el préstamo',
    requester: notice.requester,
    preheader: `Respuesta de archivo sobre ${notice.document}.`,
    message:
      'El Archivo Central no pudo entregar el expediente. Si regulariza lo indicado abajo, puede radicar de nuevo. Quedamos atentos en ventanilla.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Área', value: notice.department || '' },
      { label: 'Estado', value: 'No autorizado' },
    ],
    extraHtml: `<p style="margin:0 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9f1239;font-weight:700;font-family:${FONT};">Motivo de archivo</p>
        <p style="margin:0;padding:12px 14px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:13px;line-height:1.55;font-family:${FONT};">${esc(notice.motivoRechazo)}</p>`,
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
    title: 'El expediente volvió al Archivo Central',
    requester: notice.requester,
    preheader: `Devolución registrada: ${notice.document}.`,
    message:
      'Confirmamos la recepción física en ventanilla. <strong>El préstamo queda cerrado</strong> en el sistema. Gracias por cumplir el control de archivo.',
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
    title: 'El plazo de custodia ya venció',
    requester: notice.requester,
    preheader: `Devolución pendiente: ${notice.document}. Fecha límite ${formatMailDate(notice.returnDate)}.`,
    message:
      'Según el acta de préstamo, la fecha límite de custodia <strong>ya venció</strong>. Entregue el expediente físico en la ventanilla de Gestión Documental para cerrar el trámite. Si ya lo devolvió, responda este correo y lo verificamos.',
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
    title: 'Hay un préstamo pendiente de aprobación',
    requester: 'Gestión Documental',
    preheader: `Nueva solicitud: ${notice.document}.`,
    message: `El solicitante <strong>${esc(displayName(notice.requester))}</strong> radicó un préstamo. Revise disponibilidad y apruebe o rechace en el Portal.`,
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Área', value: notice.department || '' },
      { label: 'Devolución estimada', value: formatMailDate(notice.returnDate) },
    ],
    extraHtml: `<p style="margin:0 0 8px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};font-weight:700;font-family:${FONT};">Ficha de la solicitud</p>
        <p style="margin:0;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:${INK};white-space:pre-wrap;font-family:${FONT};">${esc(notice.observations)}</p>
        <p style="font-size:12px;color:${MUTED};font-family:${FONT};">Correo: ${esc(notice.email || 'No indicado')} · Radicado ${esc(notice.id)}</p>`,
  });
}
