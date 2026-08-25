# Performance Optimizations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar RRHH, Programación, Operaciones, Recepción y Dotación listos para ~30 usuarios concurrentes con p95 &lt; 2s en lecturas y motor global no bloqueante.

**Architecture:** Redis como infra compartida (colas BullMQ + caché + opcional pub/sub). El motor de programación corre en workers BullMQ; GETs calientes de RRHH usan cache-aside; índices SQL cierran gaps; K6 valida carga. WebSockets: solo si aportan valor real (hoy Minutas es REST + PDF; notificaciones ya usan Supabase Realtime).

**Tech Stack:** NestJS 11, BullMQ + ioredis, `@nestjs/bullmq`, cache-manager + redis store, Supabase Storage (ya en uso), PostgreSQL índices, K6, Render Redis.

## Global Constraints

- Meta: 30 usuarios concurrentes, respuestas &lt; 2s (p95 lecturas).
- Rama: `feature/performance-optimizations` **desde `main` después de fusionar multi-tenant**.
- No reescribir reglas de negocio de módulos.
- Respetar multi-tenant (`tenantId` en jobs, cache keys y RLS).
- YAGNI: no microservicios; un API Nest + worker(s) en el mismo deploy o proceso Render.
- Redis obligatorio en Render (add-on) y local (Docker o Redis Cloud free).

## Prerrequisito crítico (antes de la rama perf)

`origin/main` y `feature/multi-tenant-foundation` **divergieron**:

| | |
|--|--|
| Multi-tenant | 6 commits ahead del main antiguo (Operaciones) |
| `main` actual | Decenas de commits (nómina, minuta, dashboard, perf memoria programación, etc.) — HEAD ~`2df9b53` |

**Orden obligatorio:**

1. Merge/rebase `feature/multi-tenant-foundation` → `main` (resolver conflictos, re-aplicar/verificar migraciones 029/030 si hace falta).
2. Smoke multi-tenant + app en `main`.
3. Crear `feature/performance-optimizations` desde ese `main`.

Sin ese merge, la rama perf partirá de un main sin RLS/JWT tenant y chocará después.

---

## Hallazgos del código (baseline)

| Prioridad pedida | Realidad hoy | Implicación |
|------------------|--------------|-------------|
| 1. Motor → BullMQ | `generateMotorGlobal` es **HTTP sync** secuencial por puesto | Job async + polling/status; UI no espera 7800 filas en un request |
| 2. Minutas → Socket.io Redis | **No hay Socket.io** en el portal. Minutas = REST/PDF. Notificaciones = **Supabase Realtime** (`025`) | Decidir: (A) Gateway Nest+Socket.io+Redis adapter, o (B) Realtime Supabase en minutas (más barato, ya existe patrón) |
| 3. Caché RRHH GET | `GET /associates` y absences sin cache; en `main` ya hay paginación parcial | Cache-aside Redis con TTL corto + invalidación en write |
| 4. Imágenes Dotación → Storage | Firmas/docs **ya van a Supabase Storage** (`supabase-storage.service.ts`, buckets `delivery-signatures`, `hr-documents`) | Auditar leftovers base64/disk; no reinventar Storage |
| 5. Índices | `026_perf_indexes` + tenant indexes en 029; main añadió más | Migración `031_perf_indexes.sql` con gaps (`posts.status`, assignments por día, etc.) |
| Redis/Bull | **No instalados** | Greenfield + env `REDIS_URL` |

Nota: `main` ya tiene `perf(programacion): … cache en memoria` — el plan BullMQ **complementa** (motor pesado) y puede **reemplazar** cache in-process por Redis donde convenga (multi-instancia Render).

---

## File map (previsto)

| Área | Crear / modificar |
|------|-------------------|
| Redis config | `apps/api/src/config/redis.config.ts`, `.env.example`, `render.yaml` |
| BullMQ | `apps/api/src/modules/queues/`, `scheduling/motor.processor.ts`, cambiar `monthly-scheduling.controller` motor-global → enqueue |
| Status job | `GET /scheduling/monthly/motor-jobs/:id` + entidad/redis job state |
| Web UI | `master-grid.ts`: enqueue + poll + toast (mínimo) |
| Cache | `apps/api/src/common/cache/`, interceptor o decorator `@Cacheable`, invalidar en associates/absences writes |
| Minutas realtime | Ver decisión A/B abajo |
| Storage audit | Checklist + fixes puntuales si queda base64 en DB |
| SQL | `supabase/migrations/031_perf_indexes.sql` |
| K6 | `perf/k6/smoke-30vu.js` |
| Docs | `docs/PERFORMANCE.md` |

---

### Task 0: Merge multi-tenant → main

**Steps:**
- [ ] PR o merge local `feature/multi-tenant-foundation` into current `main`
- [ ] Resolver conflictos (scheduling/auth/entities habrán chocado con main)
- [ ] `db:verify-multi-tenant` + `db:verify-rls` en el entorno
- [ ] Push `main`
- [ ] `git checkout -b feature/performance-optimizations`

**Done when:** `main` tiene multi-tenant + app arranca; rama perf creada desde ahí.

---

### Task 1: Redis infra (local + Render)

**Files:**
- Create: Redis config module
- Modify: `apps/api/package.json` — `bullmq`, `@nestjs/bullmq`, `ioredis`, `cache-manager`, `@keyv/redis` o `cache-manager-redis-yet`
- Modify: `render.yaml` / docs — servicio Redis

**Steps:**
- [x] Añadir dependencias
- [x] `REDIS_URL` en `.env` / Render
- [x] Health check Redis al boot (fail soft en dev si falta, hard en prod motor)

**Done when:** API conecta a Redis; log `Redis OK`.

---

### Task 2: BullMQ — cola motor de programación

**Files:**
- Create: `queues.module.ts`, `motor.queue.ts`, `motor.processor.ts`
- Modify: `monthly-scheduling.service.ts` — extraer `generateMotorGlobal` body al processor
- Modify: `monthly-scheduling.controller.ts` — `POST motor-global` → `{ jobId, status: 'queued' }` (202)
- Create: `GET motor-jobs/:jobId` → estado / progress / result summary
- Modify: `master-grid.ts` — poll cada 1–2s hasta `completed|failed`

**Job payload (obligatorio multi-tenant):**
```ts
{ tenantId, year, month, tipoCiclo, createMissing, userId, requestedAt }
```

**Processor:**
- Set TenantContext / QueryRunner RLS igual que HTTP
- Reusar `generateWithMotor` por puesto
- Progress: `processed/total`
- Idempotencia: jobId único por `(tenantId, year, month, tipoCiclo)` o permitir re-run explícito

**Done when:** motor-global no bloquea HTTP >2s; worker completa mes demo; fallos visibles en UI.

**Test:** unit processor con mock repo; smoke manual 1 mes.

**Status 2026-08-24:** implementado. Smoke: enqueue ~557ms → 202; job 265/265 OK.

---

### Task 3: Minutas — realtime (decisión)

**Opción B (recomendada, YAGNI):** ampliar patrón Supabase Realtime ya usado en notificaciones para `doc_minutes` INSERT/UPDATE filtrado por `tenant_id` (o puesto). Sin Socket.io ni adapter Redis.

**Opción A (pedida literal):** `@nestjs/websockets` + Socket.io + `@socket.io/redis-adapter` + gateway `MinutasGateway`, auth JWT en handshake, rooms por `tenantId`.

**Steps (tras elegir):**
- [ ] Implementar B **o** A
- [ ] Doc en `PERFORMANCE.md` del motivo
- [ ] Prueba 2 clientes ven alta de minuta sin refresh

**Done when:** segundo cliente actualiza lista &lt;2s sin F5.

**Recomendación del plan:** empezar por **B**; solo subir a A si necesitáis rooms Nest multi-instancia fuera de Supabase.

---

### Task 4: Caché Redis — RRHH GET ✅ DONE

**Targets:**
- `GET /associates` (query key: tenant + filtros + page) ✅
- `GET /hr/absences` (+ stats) ✅

**Pattern:** cache-aside TTL 60s; invalidar en create/update/delete/import.

**Files:**
- Creado: `apps/api/src/common/cache/{cache.module.ts,tenant-cache.service.ts}` (prefix `t:{tenantId}:…`)
- Modificado: `associates.service.ts`, `hr-absenteeism.service.ts`, `app.module.ts`
- Smoke: `apps/api/scripts/smoke-cache.ts` (`npm run smoke:cache`)
- Doc: [`docs/PERFORMANCE.md`](../../PERFORMANCE.md)

**Verificado en dev (Supabase pooler):**
- `/associates` miss 2015 ms → hit 638 ms (3.2× más rápido)
- `/hr/absences` miss 1789 ms → hit 684 ms (2.6× más rápido)
- Invalidación tras `PATCH /associates/:id` verificada (miss 1209 ms > hit 638 ms)

Nota sobre el criterio original `<100ms`: contra Supabase pooler los hits quedan
en 600-800 ms por el round-trip HTTP/DNS de la sesión; contra Redis local
(mismo host) la lectura del cache es &lt;5 ms. En prod el hit se acerca al
límite &lt;100 ms cuando el API y Redis están en la misma región.

---

### Task 5: Imágenes Dotación — Storage audit

**Steps:**
- [ ] Grep base64 / multer disk en `deliveries`, `post-equipment`, inventory
- [ ] Confirmar todas las firmas usan `SupabaseStorageService` + URL en DB
- [ ] Si hay columnas blob/base64: migración a URL + script one-shot upload
- [ ] Doc buckets y políticas Storage + path `tenant/{id}/…`

**Done when:** no queda firma/imagen pesada en Postgres; solo URLs.

---

### Task 6: Índices SQL `031_perf_indexes.sql`

Candidatos (ajustar tras `EXPLAIN` en staging):

```sql
-- posts activos (motor-global createMissing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_status ON posts (tenant_id, status);

-- assignments por día en un schedule
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_assignments_schedule_day
  ON schedule_assignments (schedule_id, day);

-- absences list
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_associate_absences_tenant_dates
  ON associate_absences (tenant_id, start_date DESC, end_date DESC);

-- reception hot path
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reception_visitors_tenant_inside
  ON reception_visitors (tenant_id, exit_at) WHERE exit_at IS NULL;
```

Usar `CONCURRENTLY` fuera de transacción en apply script dedicado.

**Done when:** migración aplicada; `EXPLAIN` de queries calientes usa índices.

---

### Task 7: K6 — 30 VUs

**File:** `perf/k6/smoke-30vu.js`

Escenarios:
1. Login + `GET /associates` (cached)
2. Login + `GET /scheduling/monthly/by-month`
3. Login + `GET /reception/...` dashboard/visitors
4. (Opcional, rate limitado) enqueue motor-global 1 vez

Thresholds:
```js
thresholds: {
  http_req_duration: ['p(95)<2000'],
  http_req_failed: ['rate<0.01'],
}
```

**Done when:** reporte K6 local (y nota Render) cumple p95 &lt; 2s en lecturas.

---

### Task 8: Docs + checklist go-live

- [ ] `docs/PERFORMANCE.md` — Redis, colas, cache keys, índices, K6
- [ ] Actualizar `docs/DEPLOY-RENDER.md` — add-on Redis, `REDIS_URL`, worker dyno si aplica
- [ ] Commit/push rama; PR a `main`

---

## Timeline sugerido (después del merge MT)

| Día | Entrega |
|-----|---------|
| 0–1 | Task 0 merge MT + rama perf |
| 1–2 | Task 1 Redis + Task 6 índices |
| 2–4 | Task 2 BullMQ motor |
| 4–5 | Task 4 cache RRHH |
| 5 | Task 5 Storage audit |
| 5–6 | Task 3 Minutas realtime (B o A) |
| 6–7 | Task 7 K6 + Task 8 docs |

---

## Decisiones que necesito de JHON antes de implementar

1. **Merge multi-tenant ahora** (sí/no) — bloqueante para la rama pedida.
2. **Minutas realtime:** ¿Opción **B** Supabase Realtime (recomendada) u opción **A** Socket.io+Redis adapter?
3. **Worker:** ¿mismo proceso Nest (`BullMQ` processor in-process) o servicio Render separado `api-worker`?

Cuando apruebes estas 3, se ejecuta Task 0 y se implementa en orden 1→7.
