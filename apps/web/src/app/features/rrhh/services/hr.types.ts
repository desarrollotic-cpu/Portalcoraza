// ============================================================================
// Portal Coraza — Tipos compartidos del módulo Gestión Humana (HRM)
// ============================================================================
// Reflejan las entities del backend (`apps/api/src/modules/**`) y sirven como
// contrato entre frontend y API. Cualquier cambio de columna debe reflejarse
// aquí antes de tocar componentes.
// ============================================================================

export type AssociateStatus =
  | 'ACTIVO'
  | 'INACTIVO'
  | 'SUSPENDIDO'
  | 'VACACIONES'
  | 'RETIRADO';

export type AssociateDocumentType = 'CC' | 'CE' | 'PA' | 'PEP';
export type AssociateSexAtBirth = 'MASCULINO' | 'FEMENINO' | 'OTRO';
export type AssociateMaritalStatus =
  | 'SOLTERO'
  | 'CASADO'
  | 'UNION_LIBRE'
  | 'DIVORCIADO'
  | 'VIUDO';

export type CatalogKind =
  | 'EPS'
  | 'FONDO_PENSION'
  | 'RH'
  | 'GENERO'
  | 'ORIENTACION_SEXUAL'
  | 'RELIGION'
  | 'RAZA'
  | 'MOTIVO_RETIRO'
  | 'RAZON_RETIRO'
  | 'MEDIO_TRANSPORTE'
  | 'TIEMPO_TRASLADO'
  | 'TIPO_VIVIENDA'
  | 'NIVEL_ESTUDIO'
  | 'RANGO_INGRESOS';

export type AssociateDocumentKind =
  | 'CEDULA'
  | 'CERTIFICADO_CURSO'
  | 'EXAMEN_PSICOFISICO'
  | 'EXAMEN_PSICOSENSOMETRICO'
  | 'POLIZA_SURA'
  | 'CONTRATO'
  | 'ACTA'
  | 'OTRO';

export type HrAlertType =
  | 'VENCIMIENTO_CURSO'
  | 'VENCIMIENTO_PSICOFISICO'
  | 'VENCIMIENTO_PSICOSENSOMETRICO'
  | 'VENCIMIENTO_POLIZA'
  | 'DOCUMENTO_FALTANTE';

export type HrAlertStatus = 'PENDIENTE' | 'RESUELTA';

export type RetirementLiquidationStatus = 'PENDIENTE' | 'OK' | 'EN_PROCESO' | 'RECHAZADA';
export type RetirementWouldReturn = 'SI' | 'NO' | 'N-A';

export interface CatalogValue {
  id: string;
  kind: CatalogKind;
  value: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface JobPosition {
  id: string;
  name: string;
  isCritical: boolean;
  refreshFrequencyYears: 1 | 2;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkCenter {
  id: string;
  code: string;
  clientName: string;
  address: string | null;
  zone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Associate {
  id: string;
  folderNumber: number | null;
  actReference: string | null;
  documentType: AssociateDocumentType;
  documentNumber: string;
  documentExpeditionDate: string | null;
  firstName: string;
  secondName: string | null;
  firstLastName: string;
  secondLastName: string | null;
  birthDate: string;
  sexAtBirth: AssociateSexAtBirth | null;
  maritalStatus: AssociateMaritalStatus | null;

  email: string | null;
  address: string | null;
  landline: string | null;
  mobile: string;

  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;

  hireDate: string;
  jobPositionId: string | null;
  jobPosition: JobPosition | null;
  workCenterId: string | null;
  workCenter: WorkCenter | null;
  ordinaryCompensation: number;
  averageMonthlySalary: number;
  bankAccount: string | null;

  psychophysicalValid: boolean;
  psychosensometricValid: boolean;
  courseCode: string | null;
  schoolNit: string | null;
  courseCertificateNumber: string | null;
  hasSuraPolicy: boolean;
  funeralService: string | null;

  childrenCount: number;
  dependentsCount: number;
  estrato: number | null;
  lifePlan: string | null;

  epsId: string | null;
  eps: CatalogValue | null;
  pensionFundId: string | null;
  pensionFund: CatalogValue | null;
  bloodTypeId: string | null;
  bloodType: CatalogValue | null;
  genderId: string | null;
  gender: CatalogValue | null;
  sexualOrientationId: string | null;
  sexualOrientation: CatalogValue | null;
  religionId: string | null;
  religion: CatalogValue | null;
  raceId: string | null;
  race: CatalogValue | null;
  housingTypeId: string | null;
  housingType: CatalogValue | null;
  educationLevelId: string | null;
  educationLevel: CatalogValue | null;
  incomeRangeId: string | null;
  incomeRange: CatalogValue | null;
  transportMeanId: string | null;
  transportMean: CatalogValue | null;
  commuteTimeId: string | null;
  commuteTime: CatalogValue | null;

  status: AssociateStatus;
  createdAt: string;
  updatedAt: string;

  // Derivados (calculados en API)
  fullName: string;
  ageAtHire: number;
  currentAge: number;
  tenureYears: number;
}

export interface AssociatesQuery {
  search?: string;
  status?: AssociateStatus;
  workCenterId?: string;
  jobPositionId?: string;
  isCritical?: 'true' | 'false';
  tenureMinYears?: string;
  tenureMaxYears?: string;
}

export interface AssociateHistoryEntry {
  id: string;
  associateId: string;
  associate?: Pick<
    Associate,
    'id' | 'documentNumber' | 'firstName' | 'firstLastName' | 'fullName' | 'jobPosition'
  >;
  changedBy: string | null;
  action: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface PositionHistoryEntry {
  id: string;
  associateId: string;
  jobPositionId: string;
  jobPosition: JobPosition;
  workCenterId: string | null;
  workCenter: WorkCenter | null;
  changeReason: string | null;
  changedBy: string | null;
  changedAt: string;
}

export interface AssociateDocumentItem {
  id: string;
  associateId: string;
  documentKind: AssociateDocumentKind;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  expirationDate: string | null;
  notes: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
}

export interface HrAlert {
  id: string;
  associateId: string;
  associate?: Associate;
  alertType: HrAlertType;
  expirationDate: string;
  status: HrAlertStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  notes: string | null;
  generatedAt: string;
}

export interface Retirement {
  id: string;
  associateId: string;
  associate?: Associate;
  retirementDate: string;
  lastPosition: string;
  ageAtRetirement: number;
  liquidationStatus: RetirementLiquidationStatus;
  reasonId: string;
  reason?: CatalogValue;
  causeId: string;
  cause?: CatalogValue;
  observations: string | null;
  leastLiked: string | null;
  wouldReturn: RetirementWouldReturn;
  surveyPhysicalEnv: number;
  surveyInduction: number;
  surveyReinduction: number;
  surveyTraining: number;
  surveyGroupMotivation: number;
  surveyRecognition: number;
  surveyCompensation: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardOverview {
  counts: Record<AssociateStatus, number>;
  rotation: { key: string; retirements: number; activeAtEnd: number; rate: number }[];
  demographics: {
    byEps: { label: string; total: number }[];
    byGender: { label: string; total: number }[];
    byEducation: { label: string; total: number }[];
    byAgeBucket: { label: string; total: number }[];
  };
  retirementReasons: { label: string; total: number }[];
  positions: { label: string; total: number; isCritical: boolean }[];
  workCenters: { label: string; code: string; total: number }[];
}

export interface ComplianceMatrixRow {
  associateId: string;
  documentNumber: string;
  fullName: string;
  positionName: string | null;
  workCenterCode: string | null;
  isCritical: boolean;
  courseValid: boolean;
  psychophysicalValid: boolean;
  psychosensometricValid: boolean;
  hasSuraPolicy: boolean;
  isComplete: boolean;
}

export interface ExcelImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newRows: number;
  updateRows: number;
  rows: {
    rowIndex: number;
    ok: boolean;
    errors: string[];
    importAction: 'CREATE' | 'UPDATE' | null;
    parsed: Record<string, unknown>;
  }[];
}

export type AbsenteeismKind = 'MEDICO' | 'OTRO';
export type AbsenteeismEventType = 'D.A.' | 'S.P.' | 'L.R.' | 'L.N.R.' | 'ACT';

export interface DiagnosisCie10 {
  id: string;
  codigo: string;
  descripcion: string;
}

export interface AssociateAbsence {
  id: string;
  associateId: string;
  associate?: Associate;
  kind: AbsenteeismKind;
  eventType: AbsenteeismEventType;
  startDate: string;
  endDate: string;
  absenceDays: number;
  daysInMonth: number | null;
  isExtension: boolean;
  postIncapacityExam: boolean;
  incapacityOrigin: string | null;
  diagnosisId: string | null;
  diagnosis?: DiagnosisCie10 | null;
  cause: string | null;
  observations: string | null;
  baseSalary: number | null;
  atCosts: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AbsenceStats {
  total: number;
  totalDays: number;
  medical: number;
  admin: number;
  byEvent: Record<string, number>;
  byOrigin: Record<string, number>;
}

export interface CreateAbsencePayload {
  associateId: string;
  kind: AbsenteeismKind;
  eventType: AbsenteeismEventType;
  startDate: string;
  endDate: string;
  absenceDays?: number;
  daysInMonth?: number;
  isExtension?: boolean;
  postIncapacityExam?: boolean;
  incapacityOrigin?: string;
  diagnosisId?: string;
  cause?: string;
  observations?: string;
  baseSalary?: number;
  atCosts?: number;
}

export interface AbsencesImportReport {
  diagnosesUpserted: number;
  medicalCreated: number;
  otherCreated: number;
  errors: string[];
}
