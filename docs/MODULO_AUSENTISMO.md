# Módulo Ausentismo — Documentación de cambios

> **Fecha:** 2026-07-14  
> **Objetivo:** Paridad funcional con la app de referencia GESTION-HUMANA (requisitos RRHH), sin tocar esa app en producción.  
> **Estado:** Funcional (BD + API NestJS + frontend Angular). Listo para revisión en otro equipo.

---

## 1. Resumen

Se implementó el **módulo de Ausentismo** dentro de Gestión Humana del Portal Coraza:

- Registro de **incapacidades médicas** y **ausencias administrativas**
- Catálogo **CIE-10** (seed mínimo + importación Excel del catálogo completo)
- Panel con filtros, KPIs y CRUD
- Pestaña **Ausencias** en la ficha del asociado
- Importación Excel alineada a las hojas de la app de referencia
- Permisos RBAC (`absences.*`) para roles GERENCIA, RRHH, SST y COORDINADOR_OPERATIVO

---

## 2. Base de datos

**Migración:** `supabase/migrations/012_hr_absenteeism.sql`

| Objeto | Descripción |
|--------|-------------|
| `diagnosticos_cie10` | Catálogo CIE-10 (`codigo` único, `descripcion`) |
| `associate_absences` | Registros de ausencia ligados a `associates` |
| Enum `absenteeism_kind` | `MEDICO` \| `OTRO` |
| Enum `absenteeism_event_type` | `D.A.` \| `S.P.` \| `L.R.` \| `L.N.R.` \| `ACT` |
| Permisos | `absences.view`, `create`, `edit`, `delete`, `import` |
| Roles | GERENCIA/RRHH: todos; SST/COORDINADOR_OPERATIVO: solo `view` |

**Aplicar en otro entorno:**

```powershell
npm run db:apply-absences -w @coraza/api
npm run seed:rrhh -w @coraza/api
```

Scripts:

- `apps/api/scripts/apply-hr-absenteeism.ts` — ejecuta la migración 012 contra `DATABASE_URL`
- `apps/api/scripts/seed-rrhh.ts` — usuario RRHH + permisos (incluye `absences.*`)

---

## 3. Backend (NestJS)

**Módulo:** `apps/api/src/modules/hr-absenteeism/`

| Archivo | Rol |
|---------|-----|
| `hr-absenteeism.module.ts` | Registro Nest + TypeORM + AuditModule |
| `hr-absenteeism.controller.ts` | Rutas HTTP bajo `/api/v1/hr/absences` |
| `hr-absenteeism.service.ts` | CRUD, stats, CIE-10, import Excel |
| `entities/*` | TypeORM |
| `dto/absence.dto.ts` | Validación create/update |

Registrado en `apps/api/src/app.module.ts`.

### Endpoints

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/hr/absences` | `absences.view` — filtros: `kind`, `associateId`, `search`, `from`, `to` |
| GET | `/hr/absences/stats` | `absences.view` |
| GET | `/hr/absences/diagnoses?q=&limit=` | `absences.view` |
| POST | `/hr/absences/import/excel` | `absences.import` — multipart `file` |
| GET | `/hr/absences/:id` | `absences.view` |
| POST | `/hr/absences` | `absences.create` |
| PATCH | `/hr/absences/:id` | `absences.edit` |
| DELETE | `/hr/absences/:id` | `absences.delete` |

### Import Excel (paridad GESTION-HUMANA)

Hojas reconocidas:

- `REG AUSENTISMO MED` → ausencias médicas
- `OTRO AUSENTISMO` → administrativas
- `Código del Diagnóstico` / variantes → upsert CIE-10

Empareja asociados por **cédula** (`documentNumber`).

---

## 4. Frontend (Angular)

| Pieza | Ruta / archivo |
|-------|----------------|
| Panel | `/rrhh/ausentismo` → `absenteeism-panel/absenteeism-panel.ts` |
| Nav | Ítem **Ausentismo** en `rrhh-layout.ts` |
| Ruta | `app.routes.ts` con `permission: absences.view` |
| API client | métodos en `hr-api.service.ts` |
| Tipos | `hr.types.ts` (`AssociateAbsence`, `DiagnosisCie10`, etc.) |
| Ficha asociado | pestaña **Ausencias** en `associate-detail.ts` |

Funciones del panel: listado filtrable, KPIs (barras CSS), alta/edición, import Excel, búsqueda asociada y CIE-10.

---

## 5. Cómo probar en otro equipo

1. `git pull` de `main`
2. `npm install` (si hace falta)
3. Verificar `apps/api/.env` con `DATABASE_URL` (mismo Supabase o el de la máquina)
4. Aplicar migración + seed RRHH (comandos de la sección 2)
5. Levantar API y web:
   ```powershell
   npm run api:dev
   npm run web:dev
   ```
6. **Cerrar sesión y volver a entrar** (los permisos nuevos van en el JWT)
7. Usuario de prueba:
   - Email: `rrhh@coraza.local`
   - Password: `Rrhh2026!`
8. Ir a **Gestión Humana → Ausentismo**

También útil:

- Admin: `admin@coraza.local` / `Coraza2026!`
- Almacén: `almacen@coraza.local` / `Almacen2026!`

---

## 6. Archivos tocados en este cambio

### Nuevos

- `supabase/migrations/012_hr_absenteeism.sql`
- `apps/api/scripts/apply-hr-absenteeism.ts`
- `apps/api/scripts/seed-rrhh.ts`
- `apps/api/src/modules/hr-absenteeism/**`
- `apps/web/src/app/features/rrhh/absenteeism-panel/**`
- `docs/MODULO_AUSENTISMO.md` (este archivo)

### Modificados

- `apps/api/package.json` — script `db:apply-absences`
- `apps/api/src/app.module.ts`
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/features/rrhh/rrhh-layout/rrhh-layout.ts`
- `apps/web/src/app/features/rrhh/associate-detail/associate-detail.ts`
- `apps/web/src/app/features/rrhh/services/hr-api.service.ts`
- `apps/web/src/app/features/rrhh/services/hr.types.ts`
- `docs/ESTADO_PROYECTO.md`
- `docs/EXPOSICION_GESTION_HUMANA_2026-07-16.md`

### No incluido a propósito

- `.tmp/` (scripts locales de validación)
- `apps/api/dist/` (artefactos de build)

---

## 7. Notas para revisión / validación RRHH

- La app GESTION-HUMANA que ya opera **sigue siendo la referencia de negocio**; Portal Coraza replica el alcance aquí documentado.
- El catálogo CIE-10 completo se espera vía **import Excel**, no vía seed (solo hay ejemplos mínimos).
- Sin asociados en BD no se pueden crear ausencias; hay que cargar personal primero (formulario o import Excel de asociados).
- Tras pull en otro equipo: **obligatorio** correr migración 012 si esa BD aún no la tiene.

---

## 8. Próximo paso sugerido

Con Ausentismo alineado a la guía RRHH, el siguiente módulo a pulir según plan del portal es **Programación** (salvo que RRHH pida ajustes de este módulo).
