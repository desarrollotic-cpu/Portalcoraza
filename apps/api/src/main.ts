import * as dns from 'dns';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Render y otros hosts IPv4-only: priorizar IPv4 al resolver Supabase direct/pooler
dns.setDefaultResultOrder('ipv4first');
// restart: 2026-08-20T16:41

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200,http://127.0.0.1:4200')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  });

  // Health check endpoint (sin prefijo para Render)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: unknown, res: { json: (b: unknown) => void }) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`System Coraza API: http://localhost:${port}/api/v1`);
}

bootstrap();
