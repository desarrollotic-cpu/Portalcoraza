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
import { ConversionError, PayrollConversionService } from './conversion.service';
import { GenerarConversionDto } from './dto/generar-conversion.dto';

const MAX_BYTES = 10 * 1024 * 1024;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function validarArchivo(file: Express.Multer.File | undefined): Buffer {
  if (!file) throw new BadRequestException('Adjunta el consolidado (.xlsx) en el campo "file".');
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

/** Los errores de negocio de la conversión salen como 400 con mensaje en español. */
async function conErrores<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ConversionError) throw new BadRequestException(e.message);
    throw e;
  }
}

/** Multer corta el archivo grande con un mensaje en inglés; lo devolvemos en español. */
@Catch(PayloadTooLargeException)
class ArchivoGrandeFilter implements ExceptionFilter {
  catch(_e: PayloadTooLargeException, host: ArgumentsHost) {
    host.switchToHttp().getResponse<Response>().status(413).json({
      statusCode: 413,
      message: 'El archivo supera el tamaño máximo de 10 MB.',
    });
  }
}

@Controller('payroll/conversion')
@UseFilters(ArchivoGrandeFilter)
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollConversionController {
  constructor(private readonly service: PayrollConversionService) {}

  @Post('previsualizar')
  @RequirePermissions('payroll.convert')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  previsualizar(@UploadedFile() file: Express.Multer.File) {
    const buffer = validarArchivo(file);
    return conErrores(async () => {
      const a = await this.service.analizar(buffer);
      const { filas, ...resto } = a;
      return { ...resto, totalFilas: filas.length };
    });
  }

  @Post('generar/base')
  @RequirePermissions('payroll.convert')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  async generarBase(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GenerarConversionDto,
    @Res() res: Response,
  ) {
    const buffer = validarArchivo(file);
    const { nombre, datos } = await conErrores(async () => {
      const a = await this.service.analizar(buffer);
      const p = this.service.resolverPeriodo(a, dto);
      return { nombre: this.service.nombreBase(p), datos: await this.service.generarBase(a, p) };
    });
    this.enviar(res, nombre, datos);
  }

  @Post('generar/resumen')
  @RequirePermissions('payroll.convert')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  async generarResumen(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GenerarConversionDto,
    @Res() res: Response,
  ) {
    const buffer = validarArchivo(file);
    const { nombre, datos } = await conErrores(async () => {
      const a = await this.service.analizar(buffer);
      const p = this.service.resolverPeriodo(a, dto);
      return { nombre: this.service.nombreResumen(p), datos: await this.service.generarResumen(a) };
    });
    this.enviar(res, nombre, datos);
  }

  private enviar(res: Response, nombre: string, datos: Buffer) {
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(datos);
  }
}
