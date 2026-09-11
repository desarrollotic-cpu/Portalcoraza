export type MinutaFormKind =
  | 'VISITANTE'
  | 'CORRESPONDENCIA'
  | 'CONTRATISTA'
  | 'DOMICILIARIO'
  | 'INCIDENTE'
  | 'SERVICIO'
  | 'ENTREGA';

export interface MinutaFormModel {
  registradoPor: string;
  nombre: string;
  cedula: string;
  apto: string;
  acompana: string;
  vehiculo: string;
  clase: string;
  destinatario: string;
  remitente: string;
  empresa: string;
  areaTrabajo: string;
  autorizadoPor: string;
  tipoPedido: string;
  nombreDomiciliario: string;
  placaMoto: string;
  tipo: string;
  gravedad: string;
  ubicacion: string;
  descripcion: string;
  anotaciones: string;
  novedades: string;
  turnoSaliente: string;
  turnoEntrante: string;
  vigilanteSaliente: string;
  vigilanteEntrante: string;
  nombreDelPuesto: string;
}

export const MINUTA_MODULOS: Array<{ k: MinutaFormKind; label: string; hint: string }> = [
  { k: 'VISITANTE', label: 'Visitante', hint: 'Quién entra al conjunto' },
  { k: 'CORRESPONDENCIA', label: 'Correspondencia', hint: 'Paquetes y cartas' },
  { k: 'CONTRATISTA', label: 'Contratista', hint: 'Personal de obra o mantenimiento' },
  { k: 'DOMICILIARIO', label: 'Domicilio', hint: 'Rappi, Uber Eats, etc.' },
  { k: 'INCIDENTE', label: 'Incidente', hint: 'Novedad de seguridad o daño' },
  { k: 'SERVICIO', label: 'Servicio', hint: 'Anotaciones del turno' },
  { k: 'ENTREGA', label: 'Entrega de puesto', hint: 'Cambio de turno' },
];

export function labelForMinutaTipo(tipo: unknown): string {
  const k = String(tipo || '').toUpperCase();
  return MINUTA_MODULOS.find((m) => m.k === k)?.label || String(tipo || 'Registro');
}

export function emptyMinutaForm(): MinutaFormModel {
  return {
    registradoPor: '',
    nombre: '',
    cedula: '',
    apto: '',
    acompana: 'No',
    vehiculo: '',
    clase: 'Paquete',
    destinatario: 'Residente',
    remitente: '',
    empresa: 'Rappi',
    areaTrabajo: '',
    autorizadoPor: '',
    tipoPedido: 'Comida',
    nombreDomiciliario: '',
    placaMoto: '',
    tipo: 'Seguridad',
    gravedad: 'BAJA',
    ubicacion: '',
    descripcion: '',
    anotaciones: '',
    novedades: '',
    turnoSaliente: 'DIURNO',
    turnoEntrante: 'NOCTURNO',
    vigilanteSaliente: '',
    vigilanteEntrante: '',
    nombreDelPuesto: 'Portería',
  };
}

export function bodyForMinuta(
  kind: MinutaFormKind,
  f: MinutaFormModel,
): Record<string, unknown> {
  const registradoPor = f.registradoPor.trim();
  switch (kind) {
    case 'VISITANTE':
      return {
        registradoPor,
        nombre: f.nombre,
        cedula: f.cedula,
        apto: f.apto,
        acompana: f.acompana,
        vehiculo: f.vehiculo,
      };
    case 'CORRESPONDENCIA':
      return {
        registradoPor,
        clase: f.clase,
        apto: f.apto,
        destinatario: f.destinatario || 'Residente',
        remitente: f.remitente,
      };
    case 'CONTRATISTA':
      return {
        registradoPor,
        nombre: f.nombre,
        cedula: f.cedula,
        empresa: f.empresa,
        areaTrabajo: f.areaTrabajo,
        autorizadoPor: f.autorizadoPor,
      };
    case 'DOMICILIARIO':
      return {
        registradoPor,
        empresa: f.empresa,
        tipoPedido: f.tipoPedido,
        apto: f.apto,
        nombreDomiciliario: f.nombreDomiciliario,
        placaMoto: f.placaMoto,
      };
    case 'INCIDENTE':
      return {
        registradoPor,
        tipo: f.tipo,
        gravedad: f.gravedad,
        ubicacion: f.ubicacion,
        descripcion: f.descripcion,
      };
    case 'SERVICIO':
      return {
        registradoPor,
        anotaciones: f.anotaciones,
        novedades: f.novedades,
      };
    case 'ENTREGA':
      return {
        registradoPor,
        turnoSaliente: f.turnoSaliente,
        turnoEntrante: f.turnoEntrante,
        vigilanteSaliente: f.vigilanteSaliente,
        vigilanteEntrante: f.vigilanteEntrante,
        nombreDelPuesto: f.nombreDelPuesto,
      };
  }
}

export const MINUTA_PAGE_STYLES = `
  .page { display: grid; gap: 1.25rem; }
  .page h2 { margin: 0; font-size: 1.5rem; letter-spacing: -0.01em; }
  .hint { margin: 0.35rem 0 0; color: var(--text-muted, #64748b); font-size: 1rem; line-height: 1.5; }
  .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
  .stats article {
    background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
    border-radius: 14px; padding: 1rem 1.05rem;
  }
  .stats small { color: var(--text-muted, #64748b); font-size: 0.88rem; font-weight: 600; }
  .stats b { display: block; margin-top: 0.2rem; font-size: 1.65rem; color: #0c4a6e; }
  .quick, .grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
  .quick a.tile-primary {
    background: #0c4a6e;
    color: #fff;
    text-align: center;
    font-size: 1.15rem;
    min-height: 3.5rem;
    justify-content: center;
  }
  .quick a.tile-secondary {
    background: #fff;
    border: 1px solid var(--border, #cbd5e1);
    color: #0c4a6e;
    text-align: center;
    min-height: 3.25rem;
    justify-content: center;
  }
  .quick button, .tile, .quick a.tile, .quick a.tile-primary, .quick a.tile-secondary {
    border: 0; border-radius: 14px; padding: 1.05rem 1.15rem; background: #f0f9ff;
    color: #0c4a6e; font-weight: 700; font-size: 1.05rem; text-align: left; cursor: pointer;
    min-height: 3.5rem; display: flex; flex-direction: column; gap: 0.2rem;
    text-decoration: none;
  }
  .tile .tile-hint { font-size: 0.85rem; font-weight: 500; opacity: 0.8; color: inherit; }
  .card {
    background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
    border-radius: 14px; padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.25rem;
  }
  .card.row { flex-direction: row; justify-content: space-between; align-items: center; gap: 0.75rem; }
  .muted { color: var(--text-muted, #64748b); font-size: 0.9rem; line-height: 1.4; }
  .toast { background: #d1fae5; color: #065f46; border-radius: 12px; padding: 0.7rem 0.9rem; margin: 0; font-weight: 600; }
  .error { background: #fee2e2; color: #991b1b; border-radius: 12px; padding: 0.7rem 0.9rem; margin: 0; font-weight: 600; }
  .filt { display: flex; flex-direction: column; gap: 0.35rem; width: 100%; font-weight: 700; font-size: 0.95rem; color: #0c4a6e; }
  select, input, textarea {
    font: inherit; font-size: 16px; border: 1px solid var(--border, #cbd5e1); border-radius: 12px;
    padding: 0.75rem 0.85rem; color: inherit; background: #fff; min-height: 3rem;
  }
  .actions { display: flex; gap: 0.55rem; flex-wrap: wrap; }
  .mini {
    border: 1px solid var(--border, #cbd5e1); background: #fff; border-radius: 12px;
    padding: 0.55rem 0.85rem; cursor: pointer; color: #0c4a6e; font-weight: 700;
    min-height: 2.75rem; font-size: 0.95rem;
  }
  .btn {
    border: 0; border-radius: 12px; padding: 0.95rem 1.15rem; background: #0c4a6e; color: #fff;
    font-weight: 800; cursor: pointer; min-height: 3.25rem; font-size: 1.05rem;
  }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .modal {
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55);
    display: grid; place-items: center; padding: 1rem; z-index: 20;
  }
  .modal-card {
    width: min(100%, 560px); max-height: 90dvh; overflow: auto;
    background: var(--surface, #fff); border-radius: 16px; padding: 1.25rem;
    display: flex; flex-direction: column; gap: 0.75rem;
  }
  .modal-head {
    display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  }
  label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.95rem; color: #334155; font-weight: 700; }
  h3 { margin: 0.25rem 0; color: #0c4a6e; font-size: 1.2rem; }
  @media (min-width: 900px) {
    .page h2 { font-size: 1.85rem; }
    .stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .quick, .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .quick button, .tile, .quick a.tile, .quick a.tile-primary, .quick a.tile-secondary {
      min-height: 4.5rem; font-size: 1.15rem; padding: 1.25rem;
    }
    .modal-card { width: min(100%, 640px); padding: 1.5rem; }
  }
  @media (max-width: 800px) {
    .card.row { flex-direction: column; align-items: stretch; }
    .actions { width: 100%; }
    .actions .mini, .actions .btn { flex: 1; }
    .modal {
      place-items: end center;
      padding: 0;
    }
    .modal-card {
      width: 100%;
      max-height: 92dvh;
      border-radius: 18px 18px 0 0;
      padding: 1.1rem 1.1rem calc(1.1rem + env(safe-area-inset-bottom, 0px));
    }
    .btn { width: 100%; }
  }
`;
