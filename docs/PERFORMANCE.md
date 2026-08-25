# Performance notes (BullMQ motor)

## Motor global → BullMQ

- `POST /api/v1/scheduling/monthly/motor-global` responde **202** `{ jobId, status: "queued" }` (no espera el cálculo).
- Worker **in-process** Nest (`MotorProcessor`, concurrency 1).
- Progreso: `GET /api/v1/scheduling/monthly/motor-jobs/:jobId`.
- Requiere `REDIS_URL` (sin ella → 503 al encolar). Local: Redis Windows / `docker compose up -d redis`.
- Smoke: `cd apps/api && npm run smoke:motor-bullmq`

Payload del job: `tenantId`, `year`, `month`, `tipoCiclo`, `createMissing`, `userId`, `requestedAt`.
