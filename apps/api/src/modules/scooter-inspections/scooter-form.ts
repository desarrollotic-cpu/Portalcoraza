/** Preguntas cerradas PESV — inspección preoperacional patineta eléctrica. */

export type TriBool = 'SI' | 'NO' | 'NA';

export const NOVELTY_TYPES = [
  'DANO_ESTRUCTURAL',
  'FALLA_DIRECCION',
  'FALLA_FRENOS',
  'RUEDA_DETERIORADA',
  'BATERIA_INSUFICIENTE',
  'FALLA_ELECTRICA',
  'LUCES_DEFECTUOSAS',
  'REFLECTIVOS_DEFECTUOSOS',
  'FALTA_CHALECO',
  'CHALECO_MAL_ESTADO',
  'FALTA_EPP',
  'OTRA',
] as const;

export type NoveltyType = (typeof NOVELTY_TYPES)[number];

export const NOVELTY_LABELS: Record<NoveltyType, string> = {
  DANO_ESTRUCTURAL: 'Daño estructural',
  FALLA_DIRECCION: 'Falla de dirección',
  FALLA_FRENOS: 'Falla de frenos',
  RUEDA_DETERIORADA: 'Rueda deteriorada',
  BATERIA_INSUFICIENTE: 'Batería insuficiente',
  FALLA_ELECTRICA: 'Falla eléctrica',
  LUCES_DEFECTUOSAS: 'Luces defectuosas',
  REFLECTIVOS_DEFECTUOSOS: 'Elementos reflectivos defectuosos',
  FALTA_CHALECO: 'Falta de chaleco reflectivo',
  CHALECO_MAL_ESTADO: 'Chaleco en mal estado',
  FALTA_EPP: 'Falta de elementos de protección',
  OTRA: 'Otra novedad',
};

export interface ScooterAnswers {
  structureOk: boolean;
  platformOk: boolean;
  handlebarOk: boolean;
  steeringOk: boolean;
  brakesOk: boolean;
  wheelsOk: boolean;
  wheelsSecured: boolean;
  batteryOk: boolean;
  cablesOk: boolean;
  chargeIndicatorOk: boolean;
  lightsOk: TriBool;
  reflectiveOk: TriBool;
  vestWorn: boolean;
  vestClean: boolean;
  otherPpe: boolean;
  testRideOk: boolean;
  noAbnormalNoise: boolean;
}

const BOOL_KEYS: (keyof ScooterAnswers)[] = [
  'structureOk',
  'platformOk',
  'handlebarOk',
  'steeringOk',
  'brakesOk',
  'wheelsOk',
  'wheelsSecured',
  'batteryOk',
  'cablesOk',
  'chargeIndicatorOk',
  'vestWorn',
  'vestClean',
  'otherPpe',
  'testRideOk',
  'noAbnormalNoise',
];

export function isTriBool(v: unknown): v is TriBool {
  return v === 'SI' || v === 'NO' || v === 'NA';
}

/** Algún “No” (No aplica no cuenta). Incluye recepción y aptitud. */
export function hasNegativeAnswer(
  receivingScooter: boolean,
  answers: ScooterAnswers,
  aptForOperation: boolean,
): boolean {
  if (!receivingScooter || !aptForOperation) return true;
  for (const k of BOOL_KEYS) {
    if (answers[k] === false) return true;
  }
  if (answers.lightsOk === 'NO' || answers.reflectiveOk === 'NO') return true;
  return false;
}

export function parseAnswers(raw: unknown): ScooterAnswers {
  if (!raw || typeof raw !== 'object') {
    throw new Error('answers requerido');
  }
  const o = raw as Record<string, unknown>;
  const out = {} as ScooterAnswers;
  for (const k of BOOL_KEYS) {
    if (typeof o[k] !== 'boolean') throw new Error(`Respuesta inválida: ${k}`);
    out[k] = o[k] as boolean;
  }
  if (!isTriBool(o['lightsOk'])) throw new Error('Respuesta inválida: lightsOk');
  if (!isTriBool(o['reflectiveOk'])) throw new Error('Respuesta inválida: reflectiveOk');
  out.lightsOk = o['lightsOk'];
  out.reflectiveOk = o['reflectiveOk'];
  return out;
}

export function isNoveltyType(v: unknown): v is NoveltyType {
  return typeof v === 'string' && (NOVELTY_TYPES as readonly string[]).includes(v);
}
