import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { VigiaJwtPayload } from './vigia-jwt-payload';

export const CurrentVigia = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): VigiaJwtPayload => {
    const req = ctx.switchToHttp().getRequest();
    return req.vigia;
  },
);
