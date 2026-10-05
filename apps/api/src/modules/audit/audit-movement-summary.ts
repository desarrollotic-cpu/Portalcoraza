/** Resumen legible de audit_logs para Gerencia / historial de movimientos. */

export type AuditSummaryCtx = {
  associateById: Map<string, { name: string; documentNumber: string }>;
  postById: Map<string, { code: string; name: string }>;
};

type AuditLike = {
  module: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  newValue: Record<string, unknown> | null;
  oldValue: Record<string, unknown> | null;
};

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

function pick(obj: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!obj) return null;
  for (const k of keys) {
    const s = str(obj[k]);
    if (s) return s;
  }
  return null;
}

function personName(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const full = pick(data, ['fullName', 'nombre', 'visitorName', 'associateName']);
  if (full) return full;
  const parts = [
    data['firstName'],
    data['secondName'],
    data['firstLastName'] ?? data['firstSurname'],
    data['secondLastName'] ?? data['secondSurname'],
  ]
    .filter((x) => typeof x === 'string' && x.trim())
    .map((x) => String(x).trim());
  return parts.length ? parts.join(' ') : null;
}

function associateLabel(
  data: Record<string, unknown> | null,
  entityType: string | null,
  entityId: string | null,
  ctx: AuditSummaryCtx,
): string | null {
  const fromPayload = personName(data);
  const doc = pick(data, ['documentNumber', 'documento', 'document']);
  if (fromPayload && doc) return `${fromPayload} · CC ${doc}`;
  if (fromPayload) return fromPayload;

  const id =
    pick(data, ['associateId']) ||
    (entityType === 'associate' ? entityId : null);
  if (id && ctx.associateById.has(id)) {
    const a = ctx.associateById.get(id)!;
    return a.documentNumber ? `${a.name} · CC ${a.documentNumber}` : a.name;
  }
  return doc ? `CC ${doc}` : null;
}

function postLabel(
  data: Record<string, unknown> | null,
  entityType: string | null,
  entityId: string | null,
  ctx: AuditSummaryCtx,
): string | null {
  const code = pick(data, ['code', 'postCode']);
  const name = pick(data, ['name', 'postName', 'nombre']);
  if (code && name) return `${code} — ${name}`;
  if (name) return name;
  if (code) return code;
  const id = pick(data, ['postId']) || (entityType === 'post' ? entityId : null);
  if (id && ctx.postById.has(id)) {
    const p = ctx.postById.get(id)!;
    return `${p.code} — ${p.name}`;
  }
  return null;
}

const KIND_LABELS: Record<string, string> = {
  INCAPACIDAD: 'Incapacidad',
  LICENCIA: 'Licencia',
  PERMISO: 'Permiso',
  VACACIONES: 'Vacaciones',
  SUSPENSION: 'Suspensión',
  OTRO: 'Otro',
};

/** Recolecta IDs a resolver en batch. */
export function collectSummaryIds(rows: AuditLike[]): {
  associateIds: string[];
  postIds: string[];
} {
  const associateIds = new Set<string>();
  const postIds = new Set<string>();
  for (const r of rows) {
    const v = r.newValue ?? r.oldValue;
    if (r.entityType === 'associate' && r.entityId) associateIds.add(r.entityId);
    if (r.entityType === 'post' && r.entityId) postIds.add(r.entityId);
    if (v) {
      if (typeof v['associateId'] === 'string') associateIds.add(v['associateId']);
      if (typeof v['postId'] === 'string') postIds.add(v['postId']);
    }
  }
  return { associateIds: [...associateIds], postIds: [...postIds] };
}

export function buildMovementSummary(row: AuditLike, ctx: AuditSummaryCtx): string {
  const data = row.newValue ?? row.oldValue;
  const action = row.action || '';

  if (action === 'login' || action === 'logout') {
    const account = personName(data) || pick(data, ['email']);
    return account ? `Cuenta: ${account}` : 'Sesión en el portal';
  }

  // —— Gestión humana / ausencias ——
  if (row.module === 'hr' || row.module === 'associates') {
    const who = associateLabel(data, row.entityType, row.entityId, ctx);
    if (action.startsWith('absence.') || row.entityType === 'associate_absence') {
      const kindRaw = pick(data, ['kind', 'eventType']) || '';
      const kind = KIND_LABELS[kindRaw] || kindRaw || 'Ausencia';
      const start = pick(data, ['startDate']);
      const end = pick(data, ['endDate']);
      const days = pick(data, ['absenceDays']);
      const cause = pick(data, ['cause', 'observations']);
      return [
        who,
        kind,
        start && end ? `${start} → ${end}` : start || end,
        days ? `${days} día(s)` : null,
        cause ? `Obs.: ${cause.slice(0, 80)}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Ausencia de personal';
    }
    const status = pick(data, ['status', 'estado']);
    const field = pick(data, ['fieldName']);
    return (
      [who, status ? `Estado: ${status}` : null, field ? `Campo: ${field}` : null]
        .filter(Boolean)
        .join(' · ') || 'Movimiento de personal'
    );
  }

  // —— Recepción ——
  if (row.module === 'reception') {
    const visitor = personName(data);
    const doc = pick(data, ['documentNumber', 'documento']);
    const reason = pick(data, ['visitReason', 'motivo', 'reason']);
    const company = pick(data, ['company', 'empresa', 'visitedPerson']);
    return (
      [visitor, doc ? `Doc. ${doc}` : null, reason ? `Motivo: ${reason}` : null, company]
        .filter(Boolean)
        .join(' · ') || 'Visitante / recepción'
    );
  }

  // —— Puestos ——
  if (row.module === 'posts') {
    const post = postLabel(data, row.entityType, row.entityId, ctx);
    const status = pick(data, ['status', 'estado']);
    return [post, status ? `Estado: ${status}` : null].filter(Boolean).join(' · ') || 'Puesto';
  }

  // —— Programación ——
  if (row.module === 'scheduling') {
    const post = postLabel(data, row.entityType, row.entityId, ctx);
    const year = pick(data, ['year']);
    const month = pick(data, ['month']);
    const period =
      year && month
        ? `${String(month).padStart(2, '0')}/${year}`
        : year || month;
    const status = pick(data, ['status', 'estado']);
    return (
      [post, period ? `Periodo ${period}` : null, status ? `Estado: ${status}` : null]
        .filter(Boolean)
        .join(' · ') || 'Programación de turnos'
    );
  }

  // —— Dotación ——
  if (row.module === 'deliveries') {
    const who =
      associateLabel(data, row.entityType, row.entityId, ctx) ||
      pick(data, ['associateName', 'fullName']);
    const post = postLabel(data, row.entityType, row.entityId, ctx);
    const items = data && Array.isArray(data['items']) ? data['items'].length : null;
    const status = pick(data, ['status', 'estado']);
    return (
      [
        who,
        post,
        items != null ? `${items} ítem(s)` : null,
        status ? `Estado: ${status}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Entrega de dotación'
    );
  }

  if (row.module === 'inventory' || row.module === 'post_equipment') {
    const name = pick(data, ['name', 'sku', 'code', 'description', 'label']);
    const qty = pick(data, ['quantity', 'qty', 'amount']);
    const warehouse = pick(data, ['warehouseName', 'warehouse', 'bodega']);
    return (
      [name, qty ? `Cant.: ${qty}` : null, warehouse]
        .filter(Boolean)
        .join(' · ') || 'Movimiento de inventario'
    );
  }

  // —— Documental ——
  if (row.module === 'documental') {
    const code = pick(data, ['code', 'radicado', 'number', 'folio']);
    const title = pick(data, ['title', 'asunto', 'subject', 'name']);
    const borrower = pick(data, ['borrowerName', 'solicitante', 'fullName']);
    return (
      [code, title, borrower].filter(Boolean).join(' · ') || 'Gestión documental'
    );
  }

  // —— SST / Minuta / SIG / Users ——
  if (row.module === 'sst') {
    const client = pick(data, ['clientName', 'workplaceName', 'name']);
    const status = pick(data, ['status', 'estado']);
    return [client, status ? `Estado: ${status}` : null].filter(Boolean).join(' · ') || 'SST';
  }

  if (row.module === 'minuta') {
    const tipo = pick(data, ['tipo', 'type', 'grupo']);
    const resumen = pick(data, ['resumen', 'nombre', 'name', 'registradoPor']);
    return [tipo, resumen].filter(Boolean).join(' · ') || 'Minuta virtual';
  }

  if (row.module === 'users' || row.module === 'auth') {
    const account = personName(data) || pick(data, ['email', 'fullName']);
    const role = pick(data, ['roleName', 'roleCode', 'role']);
    return [account, role ? `Rol: ${role}` : null].filter(Boolean).join(' · ') || 'Usuario del sistema';
  }

  if (row.module === 'scooter' || action.includes('scooter')) {
    const post = postLabel(data, row.entityType, row.entityId, ctx);
    const inspector = pick(data, ['inspectorName']);
    const apt = data && typeof data['aptForOperation'] === 'boolean'
      ? data['aptForOperation']
        ? 'Apta'
        : 'No apta'
      : null;
    return [post, inspector, apt].filter(Boolean).join(' · ') || 'Inspección patineta';
  }

  // Genérico: lo más útil del payload
  const generic =
    associateLabel(data, row.entityType, row.entityId, ctx) ||
    postLabel(data, row.entityType, row.entityId, ctx) ||
    personName(data) ||
    pick(data, ['name', 'title', 'code', 'email', 'sku', 'label']);
  const status = pick(data, ['status', 'estado']);
  return (
    [generic, status ? `Estado: ${status}` : null].filter(Boolean).join(' · ') ||
    'Sin más detalle en el registro'
  );
}
