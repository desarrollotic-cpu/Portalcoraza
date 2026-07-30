# Gestión Humana nativa en Portal Coraza

**Fecha:** 2026-07-30  
**Rama:** `feature/rrhh-nativo-integrado`

## Cambio

El botón / ruta `/rrhh` **ya no abre** la app externa en Render (`gestion-humana-2qop.onrender.com`).  
Gestión Humana corre **dentro del portal**: Angular + NestJS + Supabase.

Programación y Documental siguen como puente externo.

## Ruta completa

| Capa | Ubicación |
|------|-----------|
| UI | `apps/web/src/app/features/rrhh/` |
| Rutas | `apps/web/src/app/app.routes.ts` → `RrhhLayout` + hijos |
| API | `apps/api/src/modules/{associates,hr-*}/` |
| SQL | `010_hr_module.sql`, `012_hr_absenteeism.sql`, seed `004_hr_module.sql` |

Subrutas: Panel, Asociados, Matriz SST, Alertas, Retiros, Ausentismo, Cargos, Centros, Catálogos, Importar, Bitácora.

## Setup de esquema (sin migrar datos de Render)

```powershell
copy apps\api\.env.example apps\api\.env
# configurar DATABASE_URL

npm run db:setup -w @coraza/api
npm run db:ensure-hr -w @coraza/api
npm run db:check-hr -w @coraza/api
npm run seed:rrhh -w @coraza/api   # opcional
```

## Paridad de lógica (ajustes 2026-07-30)

- Antigüedad congelada al retiro (usa `retirementDate` en derivados)
- Auditoría `view_record` al abrir ficha
- Subir documento resuelve alertas PENDIENTES del mismo tipo
- Motor alertas: faltantes = psicofísico/psicosensométrico (+7 días); apaga flags al vencer
- Import asociados: modos `IGNORE_DUPLICATES` / `UPDATE_DUPLICATES` + reingreso
- Import ausentismo: reemplazo total + CIE-10 on-the-fly

## Smoke test manual

1. `npm run api:dev` y `npm run web:dev`
2. Login → Dashboard → **Ir a Gestión Humana** (misma pestaña, `/rrhh`)
3. Recorrer nav del módulo; no debe abrirse Render
