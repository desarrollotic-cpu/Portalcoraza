# Multi-tenant foundation — Design Spec

**Date:** 2026-08-24  
**Status:** Approved (opción A)  
**Branch:** `feature/multi-tenant-foundation`  
**Horizon:** 4 semanas

## Goal

Preparar Portal Coraza para multi-tenancy sin reescribir módulos actuales, de modo que el futuro módulo de **copropiedades** (visitantes / paquetería / reservas) se pueda añadir sin refactor grande.

## Decisiones aprobadas

| Tema | Decisión |
|------|----------|
| Raíz de tenant | Tabla `organizations` |
| Cooperativa actual | Organization fija `11111111-1111-1111-1111-111111111111` (“Cooperativa Central”) |
| Copropiedades | Tabla de negocio `copropiedades` con `organization_id` (sin CRUD aún) |
| Módulos futuros | Solo tablas vacías `cp_visitors`, `cp_packages`, `cp_reservations` |
| Fuente de verdad tenant | **JWT `tenantId`** (nunca confiar solo en `X-Tenant-ID`) |
| Header frontend | `X-Tenant-ID` para trazabilidad; backend valida vs JWT |

## Out of scope (4 semanas)

- UI/API de visitantes, paquetería, reservas de copropiedad
- Cambiar reglas de negocio RRHH / Programación / etc.
- Onboarding multi-org en UI
- Superadmin cross-tenant (solo dejar gancho)

## Modelo de datos

```
organizations (tenant)
  ├── users.tenant_id
  ├── posts, associates, inventory, scheduling, documental, reception, …
  └── copropiedades.organization_id   (futuro negocio residencial)
        └── (más adelante) residentes, etc.
cp_visitors / cp_packages / cp_reservations  (tenant_id → organizations)
```

### Tablas globales (sin `tenant_id`)

- `roles`, `permissions`, `role_permissions`
- `diagnosticos_cie10`

### Tablas con `tenant_id` (negocio)

Core: `users`, `refresh_tokens`, `posts`, `associates`, `associate_history`, `audit_logs`, `notifications`, `user_posts`, `user_permissions`  
Inventario/dotación: `inventory_*`, `deliveries`, `delivery_details`, `post_equipment_*`  
Programación: `shift_schedules`, `monthly_schedules`, `schedule_assignments`, `schedule_templates`  
RRHH: `job_positions`, `work_centers`, `catalog_values`, `position_history`, `associate_retirements`, `associate_documents`, `hr_alerts`, `associate_absences`  
Documental: `document_types`, `document_records`, `doc_*`  
Recepción sede: `reception_visitors`

### Uniques compuestos (preparación multi-tenant)

Ejemplos: `(tenant_id, email)` en users, `(tenant_id, code)` en posts / inventory / work_centers, etc.

## Seguridad

1. Migración: ADD nullable → backfill → NOT NULL → FK → índices.
2. Backup Supabase antes de aplicar en producción.
3. Semana 2–3: JWT + filtros en servicios.
4. Semana 4: RLS Postgres + tests de aislamiento.
5. Si `X-Tenant-ID` ≠ JWT.tenantId → 403.

## Timeline

| Semana | Entregable |
|--------|------------|
| 1 | SQL: organizations, tenant_id, seed, cp_*, uniques |
| 2 | Nest: JWT tenantId, entidad Organization, filtros servicios |
| 3 | Angular: login guarda tenantId + interceptor HTTP |
| 4 | RLS, tests, docs `MULTI-TENANT.md` |

## Success criteria

- [ ] Todo registro de negocio tiene `tenant_id` NOT NULL apuntando a Cooperativa Central (hoy).
- [ ] Login emite JWT con `tenantId`.
- [ ] Ningún find/create de negocio omite filtro tenant (checklist módulos).
- [ ] Frontend envía `X-Tenant-ID` sin cambios de UI.
- [ ] Tablas `cp_*` y `copropiedades` existen vacías.
- [ ] Tests prueban que tenant A no lee datos de tenant B.
