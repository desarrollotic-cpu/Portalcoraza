import {
  ArgumentsHost,
  BadRequestException,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  PayloadTooLargeException,
  Post,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ConversionAdmonService } from './conversion-admon.service';
import { ConversionError, PayrollConversionService } from './conversion.service';
import { GenerarConversionAdmonDto } from './dto/generar-conversion-admon.dto';

const MAX_BYTES = 10 * 1024 * 1024;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function validarArchivo(file: Express.Multer.File | undefined): Buffer {
  if (!file) {
    throw new BadRequestException('Adjunta la compensación administrativa (.xlsx) en el campo "file".');
  }
  if (!/\.xlsx$/i.test(file.originalname)) {
    throw new BadRequestException('El archivo debe ser un Excel .xlsx.');
  }
  if (file.size > MAX_BYTES) {
    throw new BadRequestException('El archivo supera el tamaño máximo de 10 MB.');
  }
  // .xlsx es un zip: debe empezar por "PK"
  if (file.buffer.length < 4 || file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b) {
    throw new BadRequestException('El archivo no es un Excel (.xlsx) válido.');
  }
  return file.buffer;
}

/** Las reasignaciones llegan como texto JSON porque la petición es multipart. */
function parsearAjustes(crudo?: string): Array<{ cedula: string; de: string; a: string }> {
  if (!crudo?.trim()) return [];
  let datos: unknown;
  try {
    datos = JSON.parse(crudo);
  } catch {
    throw new BadRequestException('Las reasignaciones de código no son un JSON válido.');
  }
  if (!Array.isArray(datos)) {
    throw new BadRequestException('Las reasignaciones de código deben ser una lista.');
  }
  return datos.map((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const campo = (k: string) => {
      const v = String(o[k] ?? '');
      if (!/^\d+$/.test(v)) {
        throw new BadRequestException(`Reasignación inválida: «${k}» debe ser numérico.`);
      }
      return v;
    };
    return { cedula: campo('cedula'), de: campo('de'), a: campo('a') };
  });
}

async function conErrores<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ConversionError) throw new BadRequestException(e.message);
    throw e;
  }
}

@Catch(PayloadTooLargeException)
class ArchivoGrandeFilter implements ExceptionFilter {
  catch(_e: PayloadTooLargeException, host: ArgumentsHost) {
    host.switchToHttp().getResponse<Response>().status(413).json({
      statusCode: 413,
      message: 'El archivo supera el tamaño máximo de 10 MB.',
    });
  }
}

/**
 * Conversión de nómina de administrativos.
 *
 * Se sube «Compensación admon» y sale el mismo plano que se armaba a mano. El
 * formato de salida lo escribe `PayrollConversionService.generarBase`, el mismo
 * que usa la conversión operativa: un solo sitio que conoce el formato que traga
 * el programa de nómina.
 */
@Controller('payroll/conversion-admon')
@UseFilters(ArchivoGrandeFilter)
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConversionAdmonController {
  constructor(
    private readonly admon: ConversionAdmonService,
    private readonly base: PayrollConversionService,
  ) {}

  /** Qué saldría, para cuadrar contra el GRAN TOTAL de la hoja antes de descargar. */
  @Post('previsualizar')
  @RequirePermissions('payroll.convert')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  previsualizar(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GenerarConversionAdmonDto,
  ) {
    const buffer = validarArchivo(file);
    return conErrores(async () => {
      const a = await this.admon.analizar(buffer, dto.hoja, dto.modoCodigoDoble);
      const { filas, ...resto } = a;
      return { ...resto, totalFilas: filas.length };
    });
  }

  @Post('generar/base')
  @RequirePermissions('payroll.convert')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  async generarBase(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GenerarConversionAdmonDto,
    @Res() res: Response,
  ) {
    const buffer = validarArchivo(file);
    const { nombre, datos } = await conErrores(async () => {
      const leido = await this.admon.analizar(buffer, dto.hoja, dto.modoCodigoDoble);
      const a = this.admon.aplicarAjustes(leido, parsearAjustes(dto.ajustes));
      const p = this.base.resolverPeriodo(a, dto);
      return {
        nombre: `${p.quincena}_${p.mesNombre}_${p.anio}.xlsx`,
        datos: await this.base.generarBase(a, p),
      };
    });
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(datos);
  }
}
