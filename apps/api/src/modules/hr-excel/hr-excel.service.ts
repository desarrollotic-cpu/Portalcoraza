import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import {
  Associate,
  AssociateDocumentType,
  AssociateStatus,
} from '../associates/entities/associate.entity';
import { AuditService } from '../audit/audit.service';
import {
  CatalogKind,
  CatalogValue,
} from '../hr-catalogs/entities/catalog-value.entity';
import { JobPosition } from '../hr-positions/entities/job-position.entity';
import { WorkCenter } from '../hr-work-centers/entities/work-center.entity';

/** Nombres de columnas esperadas (case-insensitive) mapeadas al campo interno. */
const COLUMN_MAP: Record<string, keyof Associate | 'jobPositionName' | 'workCenterCode' | 'epsName'> = {
  'numero carpeta': 'folderNumber',
  'documento': 'documentNumber',
  'nombres': 'firstName',
  'apellidos': 'firstLastName',
  'fecha nacimiento': 'birthDate',
  'fecha ingreso': 'hireDate',
  'celular': 'mobile',
  'email': 'email',
  'direccion': 'address',
  'cargo': 'jobPositionName',
  'centro trabajo': 'workCenterCode',
  'eps': 'epsName',
  'salario ordinario': 'ordinaryCompensation',
  'salario promedio': 'averageMonthlySalary',
  'cuenta banco': 'bankAccount',
};

export interface ImportRowError {
  rowIndex: number;
  errors: string[];
  data: Record<string, unknown>;
}

export interface ImportPreview {
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
    parsed: Partial<Associate> & { jobPositionName?: string; workCenterCode?: string };
  }[];
}

/**
 * Import/Export Excel del módulo HRM.
 *
 * Import:
 *   1) Analiza el archivo con `xlsx`, aplana filas y mapea columnas.
 *   2) Genera un preview con validación campo a campo (documento, fechas,
 *      cargo existente, centro existente, EPS existente).
 *   3) El wizard del frontend confirma y llama a `executeImport` con las
 *      filas limpias; se hace upsert por `documentNumber`.
 *
 * Export:
 *   • Directorio de asociados (todos los campos).
 *   • Matriz de cumplimiento SST (vista `v_hr_compliance_matrix`).
 */
@Injectable()
export class HrExcelService {
  constructor(
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    @InjectRepository(JobPosition)
    private readonly positionsRepo: Repository<JobPosition>,
    @InjectRepository(WorkCenter)
    private readonly workCentersRepo: Repository<WorkCenter>,
    @InjectRepository(CatalogValue)
    private readonly catalogsRepo: Repository<CatalogValue>,
    private readonly audit: AuditService,
  ) {}

  async parsePreview(buffer: Buffer): Promise<ImportPreview> {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) throw new BadRequestException('El archivo Excel está vacío.');

    const sheet = workbook.Sheets[firstSheet];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    const [positions, workCenters, epsList, existingAssociates] = await Promise.all([
      this.positionsRepo.find(),
      this.workCentersRepo.find(),
      this.catalogsRepo.find({ where: { kind: CatalogKind.EPS } }),
      this.associatesRepo.find({ select: ['documentNumber'] }),
    ]);

    const positionByName = new Map(positions.map((p) => [p.name.toUpperCase(), p]));
    const workCenterByCode = new Map(workCenters.map((wc) => [wc.code.toUpperCase(), wc]));
    const epsByName = new Map(epsList.map((e) => [e.value.toUpperCase(), e]));
    const existingDocs = new Set(
      existingAssociates.map((a) => String(a.documentNumber).trim()),
    );

    const rows = rawRows.map((raw, idx) => {
      const parsed: Record<string, unknown> = {};
      const errors: string[] = [];

      // Mapeo de columnas (case-insensitive, se aceptan tildes y guiones)
      for (const [rawKey, value] of Object.entries(raw)) {
        const norm = rawKey.trim().toLowerCase();
        const target = COLUMN_MAP[norm];
        if (!target) continue;
        parsed[target] = value;
      }

      // Validaciones mínimas
      if (!parsed.documentNumber) errors.push('Falta documento');
      if (!parsed.firstName) errors.push('Falta nombres');
      if (!parsed.firstLastName) errors.push('Falta apellidos');
      if (!parsed.birthDate) errors.push('Falta fecha nacimiento');
      if (!parsed.hireDate) errors.push('Falta fecha ingreso');
      if (!parsed.mobile) errors.push('Falta celular');

      parsed.birthDate = this.normalizeDate(parsed.birthDate);
      parsed.hireDate = this.normalizeDate(parsed.hireDate);

      // Resolución de FKs
      if (parsed.jobPositionName) {
        const key = String(parsed.jobPositionName).trim().toUpperCase();
        const pos = positionByName.get(key);
        if (pos) {
          parsed.jobPositionId = pos.id;
        } else {
          errors.push(`Cargo "${parsed.jobPositionName}" no existe en el catálogo`);
        }
      }
      if (parsed.workCenterCode) {
        const key = String(parsed.workCenterCode).trim().toUpperCase();
        const wc = workCenterByCode.get(key);
        if (wc) {
          parsed.workCenterId = wc.id;
        } else {
          errors.push(`Centro "${parsed.workCenterCode}" no existe`);
        }
      }
      if (parsed.epsName) {
        const key = String(parsed.epsName).trim().toUpperCase();
        const eps = epsByName.get(key);
        if (eps) {
          parsed.epsId = eps.id;
        } else {
          errors.push(`EPS "${parsed.epsName}" no existe`);
        }
      }

      parsed.documentType = parsed.documentType ?? AssociateDocumentType.CC;
      parsed.status = AssociateStatus.ACTIVO;

      const doc = parsed.documentNumber ? String(parsed.documentNumber).trim() : '';
      const importAction: 'CREATE' | 'UPDATE' | null = doc
        ? existingDocs.has(doc)
          ? 'UPDATE'
          : 'CREATE'
        : null;

      return {
        rowIndex: idx + 2, // +2 porque Excel es 1-indexed y hay header
        ok: errors.length === 0,
        errors,
        importAction,
        parsed: parsed as unknown as Partial<Associate>,
      };
    });

    const validRows = rows.filter((r) => r.ok).length;
    const validOnly = rows.filter((r) => r.ok);
    return {
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      newRows: validOnly.filter((r) => r.importAction === 'CREATE').length,
      updateRows: validOnly.filter((r) => r.importAction === 'UPDATE').length,
      rows,
    };
  }

  async executeImport(
    rows: (Partial<Associate> & { jobPositionName?: string; workCenterCode?: string })[],
    userId: string,
  ) {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      if (!row.documentNumber) {
        skipped++;
        continue;
      }
      const existing = await this.associatesRepo.findOne({
        where: { documentNumber: row.documentNumber as string },
      });
      const { jobPositionName, workCenterCode, ...clean } = row;
      if (existing) {
        await this.associatesRepo.update({ id: existing.id }, {
          ...clean,
          updatedBy: userId,
        } as Partial<Associate>);
        updated++;
      } else {
        await this.associatesRepo.save(
          this.associatesRepo.create({
            ...clean,
            createdBy: userId,
            updatedBy: userId,
          } as Partial<Associate>),
        );
        created++;
      }
    }

    await this.audit.log({
      userId,
      module: 'hr',
      action: 'excel_import',
      entityType: 'associate',
      entityId: 'batch',
      newValue: { created, updated, skipped, total: rows.length },
    });

    return { created, updated, skipped, total: rows.length };
  }

  /**
   * Genera una plantilla Excel vacía con los headers correctos y una fila de
   * ejemplo para que el operador entienda cómo llenarla. Se usa desde el
   * wizard de importación para descargar la plantilla base.
   */
  async exportTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Portal Coraza';
    const sheet = workbook.addWorksheet('Asociados');

    sheet.columns = [
      { header: 'documento', key: 'documento', width: 15 },
      { header: 'nombres', key: 'nombres', width: 20 },
      { header: 'apellidos', key: 'apellidos', width: 20 },
      { header: 'fecha nacimiento', key: 'nac', width: 15 },
      { header: 'fecha ingreso', key: 'ingreso', width: 15 },
      { header: 'celular', key: 'celular', width: 15 },
      { header: 'email', key: 'email', width: 25 },
      { header: 'direccion', key: 'dir', width: 30 },
      { header: 'cargo', key: 'cargo', width: 25 },
      { header: 'centro trabajo', key: 'centro', width: 15 },
      { header: 'eps', key: 'eps', width: 20 },
      { header: 'salario ordinario', key: 'sal_ord', width: 15 },
      { header: 'salario promedio', key: 'sal_prom', width: 15 },
      { header: 'cuenta banco', key: 'cta', width: 20 },
      { header: 'numero carpeta', key: 'carpeta', width: 12 },
    ];

    // Header con estilo primario
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E1B4B' },
    };
    sheet.getRow(1).height = 22;

    // Fila de ejemplo (guía visual)
    sheet.addRow({
      documento: '1234567890',
      nombres: 'JUAN CARLOS',
      apellidos: 'GOMEZ TORRES',
      nac: '1990-05-14',
      ingreso: '2024-02-01',
      celular: '3001234567',
      email: 'jcgomez@example.com',
      dir: 'Cll 45 # 12-34',
      cargo: 'VIGILANTE',
      centro: '02',
      eps: 'SURA',
      sal_ord: 1300000,
      sal_prom: 1450000,
      cta: '0011234567',
      carpeta: 15,
    });
    sheet.getRow(2).font = { italic: true, color: { argb: 'FF6B7280' } };

    // Nota debajo
    sheet.mergeCells('A4:O4');
    const note = sheet.getCell('A4');
    note.value =
      'Elimina la fila de ejemplo y pega los datos reales. Los valores de "cargo", "centro trabajo" y "eps" deben existir en los catálogos del sistema.';
    note.font = { italic: true, color: { argb: 'FF92400E' } };
    note.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEF3C7' },
    };
    sheet.getRow(4).height = 32;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportAssociates(): Promise<Buffer> {
    const rows = await this.associatesRepo.find({
      relations: ['jobPosition', 'workCenter', 'eps'],
      order: { firstLastName: 'ASC' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Portal Coraza';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Asociados');
    sheet.columns = [
      { header: 'Documento', key: 'documentNumber', width: 15 },
      { header: 'Nombre completo', key: 'fullName', width: 40 },
      { header: 'Cargo', key: 'jobPosition', width: 25 },
      { header: 'Centro de trabajo', key: 'workCenter', width: 30 },
      { header: 'EPS', key: 'eps', width: 20 },
      { header: 'Fecha ingreso', key: 'hireDate', width: 15 },
      { header: 'Estado', key: 'status', width: 12 },
      { header: 'Celular', key: 'mobile', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Salario ordinario', key: 'ordinaryCompensation', width: 18 },
      { header: 'Salario promedio', key: 'averageMonthlySalary', width: 18 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E1B4B' },
    };

    for (const a of rows) {
      sheet.addRow({
        documentNumber: a.documentNumber,
        fullName: [a.firstName, a.secondName, a.firstLastName, a.secondLastName]
          .filter(Boolean)
          .join(' '),
        jobPosition: a.jobPosition?.name ?? '',
        workCenter: a.workCenter?.clientName ?? '',
        eps: a.eps?.value ?? '',
        hireDate: a.hireDate,
        status: a.status,
        mobile: a.mobile,
        email: a.email ?? '',
        ordinaryCompensation: a.ordinaryCompensation,
        averageMonthlySalary: a.averageMonthlySalary,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportComplianceMatrix(): Promise<Buffer> {
    const data = await this.associatesRepo.query<
      {
        document_number: string;
        full_name: string;
        position_name: string | null;
        work_center_code: string | null;
        psychophysical_valid: boolean;
        psychosensometric_valid: boolean;
        has_sura_policy: boolean;
        psychophysical_expires_at: string | null;
        psychosensometric_expires_at: string | null;
        course_expires_at: string | null;
        sura_policy_expires_at: string | null;
      }[]
    >(
      `SELECT
         v.document_number,
         v.full_name,
         v.position_name,
         wc.code AS work_center_code,
         v.psychophysical_valid,
         v.psychosensometric_valid,
         v.has_sura_policy,
         v.psychophysical_expires_at,
         v.psychosensometric_expires_at,
         v.course_expires_at,
         v.sura_policy_expires_at
       FROM v_hr_compliance_matrix v
       LEFT JOIN associates a ON a.id = v.associate_id
       LEFT JOIN work_centers wc ON wc.id = a.work_center_id
       WHERE v.is_critical = true
       ORDER BY v.position_name NULLS LAST, v.full_name`,
    );

    const today = new Date().toISOString().slice(0, 10);
    const isFuture = (d: string | null) => !!d && d.slice(0, 10) >= today;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Matriz SST');
    sheet.columns = [
      { header: 'Documento', key: 'documentNumber', width: 15 },
      { header: 'Nombre', key: 'fullName', width: 40 },
      { header: 'Cargo', key: 'position', width: 25 },
      { header: 'Centro', key: 'workCenter', width: 10 },
      { header: 'Curso vigente', key: 'course', width: 14 },
      { header: 'Psicofísico vigente', key: 'psychophysical', width: 18 },
      { header: 'Psicosensométrico vigente', key: 'psychosensometric', width: 24 },
      { header: 'Póliza SURA', key: 'sura', width: 15 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const a of data) {
      const courseValid = isFuture(a.course_expires_at);
      const psychophysicalValid =
        a.psychophysical_valid || isFuture(a.psychophysical_expires_at);
      const psychosensometricValid =
        a.psychosensometric_valid || isFuture(a.psychosensometric_expires_at);
      const hasSura = a.has_sura_policy || isFuture(a.sura_policy_expires_at);
      const complete = courseValid && psychophysicalValid && psychosensometricValid && hasSura;

      const row = sheet.addRow({
        documentNumber: a.document_number,
        fullName: a.full_name,
        position: a.position_name ?? '',
        workCenter: a.work_center_code ?? '',
        course: courseValid ? '✓' : '✗',
        psychophysical: psychophysicalValid ? '✓' : '✗',
        psychosensometric: psychosensometricValid ? '✓' : '✗',
        sura: hasSura ? '✓' : '✗',
      });
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: complete ? 'FFDCFCE7' : 'FFFEE2E2' },
        };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private normalizeDate(v: unknown): string | null {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'string') {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return null;
  }
}
