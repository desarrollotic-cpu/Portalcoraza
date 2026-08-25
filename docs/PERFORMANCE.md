# Performance notes

## Motor global → BullMQ

- `POST /api/v1/scheduling/monthly/motor-global` responde **202** `{ jobId, status: "queued" }` (no espera el cálculo).
- Worker **in-process** Nest (`MotorProcessor`, concurrency 1).
- Progreso: `GET /api/v1/scheduling/monthly/motor-jobs/:jobId`.
- Requiere `REDIS_URL` (sin ella → 503 al encolar). Local: Redis Windows / `docker compose up -d redis`.
- Smoke: `cd apps/api && npm run smoke:motor-bullmq`

Payload del job: `tenantId`, `year`, `month`, `tipoCiclo`, `createMissing`, `userId`, `requestedAt`.

## Caché Redis (RRHH)

Cache-aside multi-tenant sobre GETs pesados de RRHH. Reduce carga a Supabase pooler
(que satura fácil con listados repetidos).

### Endpoints cacheados

| Endpoint                    | TTL  | Prefijo         | Invalidación                                                  |
| --------------------------- | ---- | --------------- | ------------------------------------------------------------- |
| `GET /associates`           | 60 s | `associates:`   | `POST/PATCH /associates`, `/:id/readmit`, `/:id/retire`       |
| `GET /hr/absences`          | 60 s | `hr-absences:`  | `POST/PATCH/DELETE /hr/absences`, `POST /import/excel`        |
| `GET /hr/absences/stats`    | 60 s | `hr-absences:`  | (mismos writes de arriba)                                     |

### Aislamiento tenant

Todas las llaves son `t:{tenantId}:{prefix}...`. El `tenantId` se toma de
`TenantContext` (async local storage), por lo que un mismo endpoint sirve
respuestas distintas a distintos tenants sin contaminación cruzada.

### Enmascaramiento sensible (Ley 1581)

`AssociatesService.list()` cachea la lista **sin enmascarar** (`enrichBase`) y
aplica `sensitive.maskAssociate(row, user)` por request. Un ADMIN y un
supervisor comparten el mismo bloque cacheado; cada uno ve su vista.

### Configuración

```env
REDIS_URL=redis://127.0.0.1:6379
```

Sin `REDIS_URL` el módulo entra en **pass-through**: no cachea nada y no falla
(el loader se ejecuta siempre). Log al arrancar:
`TenantCacheService en modo pass-through (sin cache)`.

Local con Docker: `docker compose up -d redis` (reutiliza el servicio del motor).

### Invalidación

`TenantCacheService.invalidatePrefix('associates:')` usa `SCAN` + `UNLINK`,
sólo borra llaves del tenant actual. No bloquea Redis (a diferencia de `KEYS`).

### Smoke test

```bash
cd apps/api
npm run smoke:cache
```

Arranca un Redis en memoria, un Nest local contra la DB configurada, y mide:

1. `GET /associates` frío (miss)
2. `GET /associates` (hit → ~3× más rápido)
3. Igual para `/hr/absences`
4. `PATCH /associates/:id` (invalidación)
5. `GET /associates` posterior (miss otra vez, valida que se limpió)

Salida de referencia (dev Windows contra Supabase pooler):

```
--- /associates ---
miss  200 in 2015ms
hit   200 in 638ms
OK cache hit 638ms < miss 2015ms
--- /hr/absences ---
miss  200 in 1789ms
hit   200 in 684ms
--- invalidación asociados ---
after-write 200 in 1209ms
OK invalidación: after-write 1209ms > hit 638ms
```

En prod (Render + Supabase misma región) los tiempos absolutos son mucho
menores, pero la relación miss/hit se mantiene: el cache elimina el round-trip
a Postgres para consultas repetidas dentro de la ventana de 60 s.

### Test unitario

`apps/api/src/common/cache/tenant-cache.service.spec.ts` cubre:

- aislamiento por tenant (mismas keys sirven a cachés distintas)
- `invalidatePrefix` borra sólo el tenant actual
- pass-through cuando no hay Redis

```bash
cd apps/api && npx jest src/common/cache/tenant-cache.service.spec.ts
```
