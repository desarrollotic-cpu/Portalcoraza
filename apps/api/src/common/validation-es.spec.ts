import { ValidationPipe } from '@nestjs/common';
import { IsDateString, IsEmail, IsOptional, Min, IsInt } from 'class-validator';
import { validationErrorsEs } from './validation-es';

class Dto {
  @IsOptional() @IsDateString() hireDate?: string;
  @IsEmail() email!: string;
  @IsInt() @Min(3) edad!: number;
}

describe('validationErrorsEs', () => {
  it('devuelve los mensajes en español', async () => {
    const pipe = new ValidationPipe({ exceptionFactory: validationErrorsEs, whitelist: true, forbidNonWhitelisted: true });
    const body = { hireDate: '', email: 'x', edad: 1, extra: 1 };
    const err: any = await pipe.transform(body, { type: 'body', metatype: Dto }).catch((e) => e);
    const msgs: string[] = err.getResponse().message;
    expect(msgs).toContain('La fecha de ingreso debe ser una fecha válida (AAAA-MM-DD).');
    expect(msgs).toContain('El correo debe ser un correo válido.');
    expect(msgs).toContain('El campo edad no puede ser menor que 3.');
    expect(msgs).toContain('El campo extra no es un campo permitido.');
    expect(msgs.join(' ')).not.toMatch(/must|should/);
  });
});
