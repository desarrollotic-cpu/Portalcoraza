import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

/**
 * Fila que el wizard de importación confirma para ejecutar. Cada campo llega
 * como texto crudo del Excel y el servicio lo mapea contra catálogos y FKs.
 */
export class ExcelImportRowDto {
  [key: string]: unknown;
}

export class ExecuteImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExcelImportRowDto)
  rows!: ExcelImportRowDto[];
}
