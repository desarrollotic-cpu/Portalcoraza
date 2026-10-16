import { BadRequestException, ValidationError } from '@nestjs/common';

/** Etiquetas en español de los campos más editados; el resto muestra el nombre técnico. */
const CAMPOS: Record<string, string> = {
  documentNumber: 'El documento',
  documentType: 'El tipo de documento',
  documentExpeditionDate: 'La fecha de expedición',
  firstName: 'El primer nombre',
  secondName: 'El segundo nombre',
  firstLastName: 'El primer apellido',
  secondLastName: 'El segundo apellido',
  birthDate: 'La fecha de nacimiento',
  hireDate: 'La fecha de ingreso',
  email: 'El correo',
  mobile: 'El celular',
  landline: 'El teléfono fijo',
  address: 'La dirección',
  jobPositionId: 'El cargo',
  workCenterId: 'El centro de trabajo',
  password: 'La contraseña',
  name: 'El nombre',
  code: 'El código',
};

/** Plantillas por regla de class-validator; `{n}` toma el número del mensaje original. */
const REGLAS: Record<string, string> = {
  isNotEmpty: 'es obligatorio',
  isDefined: 'es obligatorio',
  isString: 'debe ser texto',
  isEmail: 'debe ser un correo válido',
  isUUID: 'no es un identificador válido',
  isDateString: 'debe ser una fecha válida (AAAA-MM-DD)',
  isDate: 'debe ser una fecha válida',
  isInt: 'debe ser un número entero',
  isNumber: 'debe ser un número',
  isNumberString: 'debe contener solo números',
  isPositive: 'debe ser un número positivo',
  isBoolean: 'debe ser verdadero o falso',
  isArray: 'debe ser una lista',
  isObject: 'debe ser un objeto',
  isUrl: 'debe ser una dirección web válida',
  min: 'no puede ser menor que {n}',
  max: 'no puede ser mayor que {n}',
  minLength: 'debe tener al menos {n} caracteres',
  maxLength: 'no puede tener más de {n} caracteres',
  arrayMinSize: 'debe tener al menos {n} elementos',
  arrayMaxSize: 'no puede tener más de {n} elementos',
  matches: 'tiene un formato no válido',
  whitelistValidation: 'no es un campo permitido',
};

function traducir(campo: string, regla: string, original: string): string {
  const etiqueta = CAMPOS[campo] ?? `El campo ${campo}`;
  if (regla === 'isEnum' || regla === 'isIn') {
    const valores = original.split(':')[1]?.trim();
    return `${etiqueta} debe ser uno de: ${valores ?? 'los valores permitidos'}.`;
  }
  const plantilla = REGLAS[regla];
  if (!plantilla) return `${etiqueta} no es válido.`;
  const n = original.match(/-?\d+(\.\d+)?/)?.[0] ?? '';
  return `${etiqueta} ${plantilla.replace('{n}', n)}.`;
}

function aplanar(errores: ValidationError[], prefijo = ''): string[] {
  return errores.flatMap((e) => {
    const ruta = prefijo ? `${prefijo}.${e.property}` : e.property;
    const propios = Object.entries(e.constraints ?? {}).map(([regla, msg]) => traducir(ruta, regla, msg));
    return [...propios, ...aplanar(e.children ?? [], ruta)];
  });
}

/** `exceptionFactory` del ValidationPipe: mismo 400 de siempre, mensajes en español. */
export const validationErrorsEs = (errores: ValidationError[]) =>
  new BadRequestException(aplanar(errores));
