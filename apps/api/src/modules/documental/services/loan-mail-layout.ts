const LOGO_URL = 'https://portalcoraza-web.onrender.com/brand/logo-coraza-cta.png';
const SENDER = 'documental@corazaseguridadcta.com';

function esc(v: string | undefined): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mailtoCta(subject: string): { label: string; href: string } {
  return {
    href: `mailto:${SENDER}?subject=${encodeURIComponent(subject)}`,
    label: 'Escribir a Gestion Documental',
  };
}

function fact(label: string, value: string): string {
  const v = (value || '').trim() || 'No indicado';
  return `<tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;">
    <span style="display:block;font-size:11px;color:#64748b;font-weight:700;">${esc(label)}</span>
    <span style="display:block;font-size:15px;color:#0f172a;font-weight:700;padding-top:4px;">${esc(v)}</span>
  </td></tr>`;
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
}): string {
  const bar =
    opts.tone === 'ok' ? '#15803d' : opts.tone === 'alert' ? '#b91c1c' : opts.tone === 'reject' ? '#9f1239' : '#0c4a6e';
  const cta = opts.ctaHref
    ? `<tr><td align="center" style="padding:18px 16px;font-family:Arial,Helvetica,sans-serif;">
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
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #cbd5e1;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center" style="padding:20px 16px 12px;background:#ffffff;">
      <img src="${LOGO_URL}" width="72" alt="Coraza Seguridad C.T.A." style="display:block;border:0;">
      <p style="margin:10px 0 0;font-size:18px;font-weight:700;color:#0c4a6e;">CORAZA SEGURIDAD C.T.A.</p>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Gestion Documental - Archivo Central</p>
    </td>
  </tr>
  <tr>
    <td align="center" bgcolor="${bar}" style="padding:16px;background:${bar};">
      <p style="margin:0;font-size:12px;font-weight:700;color:#ffffff;">${esc(opts.badge)}</p>
      <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#ffffff;">${esc(opts.title)}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 16px 8px;color:#0f172a;">
      <p style="margin:0 0 8px;font-size:16px;font-weight:700;">Estimado(a) ${esc(opts.requester)},</p>
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
        Ventanilla de Gestion Documental - PBX (604) 4447929 - Medellin
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
    badge: 'PRESTAMO APROBADO',
    title: 'Su solicitud fue autorizada',
    requester: notice.requester,
    message:
      'Gestion Documental <strong>aprobo y confirmo</strong> el prestamo del expediente. Acerquese al archivo central para retirarlo y devuelvalo en la fecha limite.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Fecha de prestamo', value: notice.loanDate },
      { label: 'Devolver antes de', value: notice.returnDate || 'Por coordinar' },
      { label: 'Area', value: notice.department || '' },
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
  const cta = mailtoCta(`Reconsideracion de prestamo: ${notice.document}`);
  return wrapLoanMail({
    tone: 'reject',
    badge: 'SOLICITUD NO APROBADA',
    title: 'No fue posible autorizar el prestamo',
    requester: notice.requester,
    message:
      'En esta oportunidad el expediente no pudo entregarse. Si subsana las observaciones, puede volver a solicitarlo.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Area', value: notice.department || '' },
      { label: 'Estado', value: 'Rechazado' },
    ],
    extraHtml: `<p style="margin:0 0 6px;font-size:12px;color:#9f1239;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Motivo</p>
        <p style="margin:0;padding:12px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:13px;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">${esc(notice.motivoRechazo)}</p>`,
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
    badge: 'DEVOLUCION REGISTRADA',
    title: 'El expediente volvio al archivo',
    requester: notice.requester,
    message:
      'Confirmamos la recepcion fisica del documento. <strong>Gracias por devolverlo a tiempo.</strong> El prestamo queda cerrado en el sistema.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Fecha de devolucion', value: notice.returnDate || 'Hoy' },
      { label: 'Area', value: notice.department || '' },
    ],
  });
}

export function overdueLoanHtml(notice: {
  requester: string;
  document: string;
  returnDate: string;
  department?: string;
}): string {
  const cta = mailtoCta(`Devolucion vencida: ${notice.document}`);
  return wrapLoanMail({
    tone: 'alert',
    badge: 'PRESTAMO VENCIDO',
    title: 'Debe devolver el expediente',
    requester: notice.requester,
    message:
      'La fecha limite de custodia <strong>ya vencio</strong>. Entregue el expediente fisico en la ventanilla de Gestion Documental para cerrar el acta de prestamo.',
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Fecha limite', value: notice.returnDate },
      { label: 'Area', value: notice.department || '' },
    ],
    ctaLabel: 'Avisar devolucion',
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
    badge: 'NUEVA SOLICITUD',
    title: 'Hay una solicitud pendiente de aprobacion',
    requester: 'Gestion Documental',
    message: `El solicitante <strong>${esc(notice.requester)}</strong> radico un prestamo. Revise disponibilidad y apruebe o rechace en el Portal.`,
    facts: [
      { label: 'Expediente', value: notice.document },
      { label: 'Area', value: notice.department || '' },
      { label: 'Devolucion estimada', value: notice.returnDate || '' },
    ],
    extraHtml: `<p style="margin:0 0 8px;font-size:12px;color:#64748b;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Ficha de la solicitud</p>
        <p style="margin:0;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#0f172a;white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;">${esc(notice.observations)}</p>
        <p style="font-size:12px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">Correo: ${esc(notice.email || 'No indicado')} - Radicado ${esc(notice.id)}</p>`,
  });
}
