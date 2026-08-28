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

export const MINUTA_MODULOS: Array<{ k: MinutaFormKind; label: string }> = [
  { k: 'VISITANTE', label: 'Visitantes' },
  { k: 'CORRESPONDENCIA', label: 'Correspondencia' },
  { k: 'CONTRATISTA', label: 'Contratistas' },
  { k: 'DOMICILIARIO', label: 'Domiciliarios' },
  { k: 'INCIDENTE', label: 'Incidentes' },
  { k: 'SERVICIO', label: 'Servicio' },
  { k: 'ENTREGA', label: 'Entrega de puesto' },
];

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
  .page { display: grid; gap: 1rem; }
  .page h2 { margin: 0; font-size: 1.15rem; }
  .hint { margin: 0; color: var(--text-muted, #64748b); font-size: 0.9rem; }
  .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.55rem; }
  .stats article {
    background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
    border-radius: 12px; padding: 0.75rem;
  }
  .stats small { color: var(--text-muted, #64748b); }
  .stats b { display: block; font-size: 1.25rem; color: #0c4a6e; }
  .quick, .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem; }
  .quick button, .tile {
    border: 0; border-radius: 12px; padding: 0.9rem; background: #f0f9ff;
    color: #0c4a6e; font-weight: 700; text-align: left; cursor: pointer;
  }
  .card {
    background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
    border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.2rem;
  }
  .card.row { flex-direction: row; justify-content: space-between; align-items: center; gap: 0.75rem; }
  .muted { color: var(--text-muted, #64748b); font-size: 0.82rem; }
  .toast { background: #d1fae5; color: #065f46; border-radius: 10px; padding: 0.55rem 0.75rem; margin: 0; }
  .error { background: #fee2e2; color: #991b1b; border-radius: 10px; padding: 0.55rem 0.75rem; margin: 0; }
  .filt { display: flex; flex-direction: column; gap: 0.25rem; max-width: 16rem; font-weight: 600; font-size: 0.85rem; }
  select, input, textarea {
    font: inherit; border: 1px solid var(--border, #cbd5e1); border-radius: 8px;
    padding: 0.55rem; color: inherit; background: transparent;
  }
  .actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .mini {
    border: 1px solid var(--border, #cbd5e1); background: transparent; border-radius: 8px;
    padding: 0.35rem 0.55rem; cursor: pointer; color: #0c4a6e; font-weight: 700;
  }
  .btn {
    border: 0; border-radius: 8px; padding: 0.7rem 1rem; background: #0c4a6e; color: #fff;
    font-weight: 800; cursor: pointer;
  }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .modal {
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55);
    display: grid; place-items: center; padding: 1rem; z-index: 20;
  }
  .modal-card {
    width: min(100%, 420px); max-height: 90dvh; overflow: auto;
    background: var(--surface, #fff); border-radius: 12px; padding: 1rem;
    display: flex; flex-direction: column; gap: 0.55rem;
  }
  label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.82rem; color: var(--text-muted, #64748b); font-weight: 600; }
  h3 { margin: 0.25rem 0; color: #0c4a6e; }
  @media (max-width: 800px) {
    .stats { grid-template-columns: 1fr 1fr; }
    .quick, .grid { grid-template-columns: 1fr; }
    .card.row { flex-direction: column; align-items: stretch; }
    .filt { max-width: none; width: 100%; }
    .modal {
      place-items: end center;
      padding: 0;
    }
    .modal-card {
      width: 100%;
      max-height: 92dvh;
      border-radius: 16px 16px 0 0;
      padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
    }
    .btn { width: 100%; }
    .tile, .quick button { min-height: 3rem; font-size: 0.95rem; }
    input, select, textarea { font-size: 16px; } /* evita zoom iOS */
  }
  @media (max-width: 420px) {
    .stats { grid-template-columns: 1fr; }
  }
`;
