## Context

PortalCoraza es un monolito modular NestJS + Angular 20 + Supabase PostgreSQL en producción parcial. El núcleo (auth JWT, RBAC, usuarios, roles, permisos, asociados, puestos, auditoría) está implementado y funciona. Este change no redefine la arquitectura; consolida decisiones de negocio finales para ejecutar la fase 1 con alcance cerrado y sin cambios estructurales en el repositorio.

**Stack actual:**
- Backend: NestJS + TypeORM + PostgreSQL (Supabase)
- Frontend: Angular 20 + signals + Angular Material
- DB: Supabase PostgreSQL (`synchronize: false`, migrations manuales)
- Auth: JWT propio (access + refresh), bcrypt-12, sin Supabase Auth
- Storage: Supabase Storage (bucket pendiente)
- Realtime: Supabase Realtime (tabla `notifications` existe, sin subscripciones)

**Estado del codebase:**
- `synchronize: false` en TypeORM — correcto, no se toca
- `AuditService.log()` genérico — sólido, se conserva
- `PermissionsGuard` existente — se refactoriza (ver Decisión 1)
- Entidades Angular usan signals — patrón correcto, se mantiene

---

## Goals / Non-Goals

**Goals:**
- Corregir el guard de permisos para que no haga DB queries por request
- Implementar aislamiento de datos para ADMINISTRADOR_UNIDAD vía `user_posts` multi-unidad
- Diseñar e implementar los 5 dominios de negocio faltantes sin reorganización estructural de módulos
- Conectar Supabase Realtime para notificaciones sin migrar a Supabase Auth
- Entregar directiva Angular `*hasPermission` para control de UI
- Mantener compatibilidad total con el código existente (sin rewrites estructurales del core)

**Non-Goals:**
- Migrar a Supabase Auth (el JWT propio se mantiene)
- Implementar microservicios (monolito modular, preparado para extracción futura)
- Implementar tests automatizados (fuera del alcance de este change)
- Internacionalización (i18n) del frontend
- PWA / mobile

---

## Decisions

### Decisión 1 — Permisos en JWT payload + vigencias operativas cerradas

**Problema**: `PermissionsGuard` ejecuta `users → role → role_permissions → permissions` (3 JOINs) en cada request autenticado.

**Decisión**: Embeber `permissions: string[]` en el access token al momento del login y fijar vigencias de sesión para fase 1:
- Access Token: 2 horas
- Refresh Token: 7 días

```
JWT payload actual:   { sub, email, roleCode }
JWT payload nuevo:    { sub, email, roleCode, permissions: ['associates.view', 'inventory.create', ...] }
```

**Guard resultante**: `required.every(p => payload.permissions.includes(p))` — O(1), sin DB.

**Tradeoff**: Si un rol cambia sus permisos, el usuario mantiene permisos del token actual hasta su expiración. Aceptable con vigencia de 2 horas y renovación por refresh token.

**Archivos afectados:**
- `apps/api/src/modules/auth/auth.service.ts` — incluir permissions en `signAccess()`
- `apps/api/src/modules/permissions/permissions.service.ts` — proveer método `getPermissionCodes(userId)`
- `apps/api/src/common/guards/permissions.guard.ts` — leer desde `request.user.permissions`
- `apps/api/src/modules/auth/interfaces/jwt-payload.interface.ts` — agregar campo `permissions`
- `apps/web/src/app/core/models/auth.model.ts` — agregar `permissions: string[]` a `AuthUser`

---

### Decisión 2 — Aislamiento residencial multi-unidad vía `user_posts` (N:N, no RLS)

**Problema**: ADMINISTRADOR_UNIDAD debe ver solo datos de su unidad residencial, pero no hay vínculo entre usuario y puesto en el modelo actual.

**Decisión**: Tabla de unión `user_posts` + filtrado a nivel de aplicación en NestJS.

```sql
CREATE TABLE user_posts (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
```

En cada query del módulo residencial:
- Para ADMINISTRADOR_UNIDAD: `WHERE unit.post_id IN (:...userAssignedPostIds)`
- Para GERENCIA: sin filtro de aislamiento por puesto

**Alternativa descartada**: Supabase RLS con `auth.uid()` — requeriría migrar a Supabase Auth, rompiendo el JWT propio. Coste desproporcionado al beneficio.

---

### Decisión 3 — Realtime vía Supabase sin RLS (canal por `user_id`)

**Problema**: Supabase Realtime con RLS usa `auth.uid()` de Supabase Auth. Nuestro JWT propio no es compatible.

**Decisión**: Usar Supabase Realtime con `anon key` en Angular, canal filtrado por `user_id` en el payload del evento. La seguridad real permanece en la API NestJS.

```
Angular se suscribe a:  channel('notifications').on('INSERT', filter: 'user_id=eq.<userId>')
NestJS inserta en:       tabla notifications → Supabase pub/sub lo emite automáticamente
```

**Por qué es seguro**: El `anon key` expuesto en Angular solo puede leer eventos de realtime. No tiene acceso a ninguna tabla directamente (RLS sin autenticación = sin acceso). El frontend no puede leer ni escribir datos via Supabase JS directamente.

**Alternativa descartada**: WebSockets en NestJS — funciona pero añade complejidad de deploy en Render (sticky sessions, etc.) sin ventaja real sobre Supabase Realtime para el caso de uso.

---

### Decisión 4 — Consolidación sin cambios estructurales

**Decisión**: Se conserva la estructura actual del monolito modular en backend y frontend. No se introduce reorganización de carpetas ni migración de estilo arquitectónico como objetivo del change.

**Razón**: La prioridad del negocio es cerrar funcionalidades y reglas operativas. Cambios estructurales elevan riesgo y no agregan valor directo a la fase 1.

---

### Decisión 5 — Programación operativa: matriz mensual tipo Excel

**Decisión**: La interfaz principal de programación es una matriz mensual tipo Excel para la operación de vigilancia. Debe soportar asignación de:
- Turno diurno
- Turno nocturno
- Descanso

Con jornadas de:
- 8 horas
- 12 horas

La vista calendario se mantiene como funcionalidad complementaria. Drag-and-drop queda fuera de alcance inicial.

### Decisión 6 — Constraint de no solapamiento de turnos a nivel DB

**Problema**: Un asociado no puede tener dos turnos que se solapen en el mismo día. El check a nivel de aplicación tiene race condition.

**Decisión**: Constraint de exclusión en PostgreSQL usando `daterange`.

```sql
-- Requiere extensión btree_gist (disponible en Supabase)
ALTER TABLE shift_schedules
  ADD CONSTRAINT no_overlap_associate
  EXCLUDE USING gist (
    associate_id WITH =,
    daterange(shift_date, shift_date, '[]') WITH &&
  );
```

TypeORM no genera esto; se incluye en la migración SQL raw. La aplicación captura el error `23P01` (exclusion_violation) y devuelve un 409 claro al usuario.

---

### Decisión 7 — Inventario con variantes vía `attributes JSONB`

**Decisión**: Las variantes de inventario (talla, color, etc.) se almacenan como `attributes JSONB` en `inventory_variants`.

```sql
inventory_variants.attributes:  {"talla": "L", "color": "negro"}
```

**Razón**: Las categorías de dotación de seguridad tienen atributos heterogéneos. Un esquema fijo de columnas (talla, color, etc.) no cubre todos los casos. JSONB permite filtrado indexado (`attributes->>'talla' = 'L'`).

---

### Decisión 8 — Firmas manuscritas de entrega en Supabase Storage

**Decisión**: Al confirmar una entrega, el frontend captura firma manuscrita con Signature Pad (canvas → base64/blob), el backend la sube al bucket `delivery-signatures` y almacena la URL en `deliveries.signature_url`.

```
Angular Canvas → base64 → POST /deliveries/:id/sign
  NestJS: → Supabase Storage SDK → url
         → UPDATE deliveries SET signature_url = url, status = 'DELIVERED'
         → audit log
```

Los registros de entrega son inmutables después de la firma (`is_immutable = true`).

### Decisión 9 — Residencial ampliado para operación real

**Decisión**: El módulo residencial incluye en fase 1:
- Residentes
- Propietarios
- Arrendatarios
- Vehículos
- Visitantes
- Parqueaderos de visitantes con cupos y disponibilidad en tiempo real
- Correspondencia
- Paquetería
- Reservas por recurso configurable
- Libro virtual
- Gestión de novedades

Reservas deben soportar configuración por unidad (aprobación manual o automática) y estados mínimos:
- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`
- `COMPLETED`

Novedades residenciales deben incluir estados (`ABIERTA`, `EN_PROCESO`, `RESUELTA`, `CERRADA`), prioridades (`BAJA`, `MEDIA`, `ALTA`, `CRITICA`), responsable, historial y auditoría; además generan notificación al administrador correspondiente.

### Decisión 10 — Documental v1 metadata-only con evolución preparada

**Decisión**: La primera versión documental gestiona solo metadata y no almacena archivos físicos en Supabase Storage.

El modelo queda preparado para evolución futura mediante campos opcionales como:
- `file_url`
- `storage_provider`

Estos campos no se usan operativamente en fase 1.

### Decisión 11 — Notificaciones de negocio consolidadas

**Decisión**: Se generan notificaciones desde:
- RRHH
- Dotación
- Programación
- Residencial
- Documental

---

## Risks / Trade-offs

**[Riesgo] Permisos stale en JWT** → Si GERENCIA cambia permisos de rol, el usuario activo mantiene permisos hasta expiración del access token. **Mitigación**: expiración de 2 horas + renovación controlada por refresh token (7 días).

**[Riesgo] Constraint de exclusión con TypeORM** → TypeORM no conoce el constraint; un error de solapamiento llega como `QueryFailedError`. **Mitigación**: Capturar `error.code === '23P01'` en el servicio de scheduling y lanzar `ConflictException` con mensaje descriptivo.

**[Riesgo] anon key expuesta en Angular** → El cliente puede ver el anon key en el bundle. **Mitigación**: El anon key de Supabase tiene permisos solo para realtime. Sin RLS activo para el `anonymous` role, no puede leer tablas. Se configura explícitamente en Supabase dashboard.

**[Riesgo] Módulo residencial sin RLS real** → El aislamiento depende de que NestJS siempre aplique filtro por conjunto de `post_id`. Si un endpoint nuevo omite el filtro, hay fuga entre unidades. **Mitigación**: centralizar el filtro multi-post y validarlo en checklist de cierre.

**[Riesgo] Migración incremental** → El codebase actual está en producción parcial; las migraciones deben ser aditivas y no-destructivas. **Mitigación**: Todas las migraciones usan `CREATE TABLE IF NOT EXISTS` y `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. El refactor del JWT es backwards-compatible (el guard soporta ambos formatos durante transición).

---

## Migration Plan

### Fase 0 — Refactors de base (prerequisito de todo lo demás)
1. Agregar `permissions: string[]` a `JwtPayload` interface
2. Modificar `AuthService.login()` para incluir permisos en el token
3. Refactorizar `PermissionsGuard` para leer del payload
4. Crear migración `002_user_posts_permissions.sql`
5. Actualizar `AuthUser` en Angular con `permissions[]`
6. Agregar `hasPermission()` a `AuthService` Angular

### Fase 1 — RRHH completo
- Endpoint `/associates/:id/history` en NestJS
- Angular: formularios de create/edit, vista de historia, botón retire

### Fase 2 — Inventario & Dotación
- Migración `003_inventory.sql`
- Módulos NestJS: inventory, deliveries
- Angular feature: dotacion

### Fase 3 — Programación de Turnos
- Migración `004_scheduling.sql` (con exclusion constraint)
- Módulo NestJS: scheduling
- Angular feature: programacion con matriz mensual tipo Excel como vista principal y calendario complementario

### Fase 4 — Documental
- Migración `005_documental.sql`
- Módulo NestJS: documental
- Angular feature: documental

### Fase 5 — Residencial
- Migración `006_residential.sql`
- Módulo NestJS: residential (con multi-post scoped queries)
- Angular feature: residential

### Fase 6 — Notificaciones Realtime
- Activar Supabase Realtime en tabla `notifications`
- `notification.service.ts` en Angular con Supabase JS client
- Toast/badge en layout principal

### Rollback
Todas las fases son aditivas. Rollback = no ejecutar la fase / hacer `DROP TABLE` de tablas nuevas. El core existente no se modifica destructivamente en ningún punto.

---

## Validaciones de cierre de fase 1

1. Renovación automática mediante refresh token funcionando con access token de 2h y refresh de 7d.
2. Seguridad del canal Supabase Realtime validada para entrega por `user_id`.
3. Aislamiento correcto para múltiples `post_id` por usuario en residencial.
4. Flujo completo de firma manuscrita y almacenamiento en Supabase Storage.
5. Restricción efectiva de inmutabilidad para entregas firmadas.
