export interface DepartmentOption {
  code: string;
  name: string;
  trdPrefix: string;
}

/** Mismas áreas de Correspondencia documental (TRD). */
export const DEPARTAMENTOS_CORAZA: DepartmentOption[] = [
  { code: 'GE', name: 'GE — Gerencia General', trdPrefix: '100' },
  { code: 'GH', name: 'GH — Gestión Humana / RRHH', trdPrefix: '200' },
  { code: 'AF', name: 'AF — Administrativo y Financiero', trdPrefix: '300' },
  { code: 'CP', name: 'CP — Compras y Suministros', trdPrefix: '310' },
  { code: 'CM', name: 'CM — Comercial y Mercadeo', trdPrefix: '320' },
  { code: 'OP', name: 'OP — Operaciones / Vigilancia', trdPrefix: '400' },
  { code: 'SE', name: 'SE — Seguridad Electrónica', trdPrefix: '410' },
  { code: 'SP', name: 'SP — Supervisión y Control', trdPrefix: '420' },
  { code: 'DJ', name: 'DJ — Jurídico y Legal', trdPrefix: '500' },
  { code: 'CE', name: 'CE — Cliente Externo', trdPrefix: '900' },
  { code: 'AS', name: 'AS — Asociados CTA', trdPrefix: '910' },
];
