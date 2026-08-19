# Continuar desarrollo — System Coraza v2

Guía para que **cualquier compañero** retome el proyecto sin contexto previo, pidiéndole al agente de Cursor que revise el estado y continúe.

---

## Mensaje para copiar y pegar al agente

Copia esto tal cual en el chat de Cursor:

```
Estoy retomando PortalCoraza (system-coraza-v2). Antes de codear:

1. Lee docs/CONTINUAR-DESARROLLO.md (este archivo)
2. Lee openspec/changes/system-coraza-v2/tasks.md — fuente de verdad de tareas
3. Lee openspec/changes/system-coraza-v2/progress.md — bitácora y contexto reciente
4. Lee openspec/changes/system-coraza-v2/design.md — decisiones cerradas (no reabrir)

Resume qué está hecho, qué falta y cuál es el siguiente bloque recomendado.
Luego continúa con ese bloque. Al terminar, actualiza tasks.md y progress.md.
```

Variante corta:

```
Revisa qué se ha hecho y qué falta en system-coraza-v2 (tasks.md + progress.md) y continúa con el siguiente bloque pendiente.
```

---

## Fuentes de verdad (orden de lectura)

| Prioridad | Archivo | Para qué |
|-----------|---------|----------|
| 1 | `openspec/changes/system-coraza-v2/tasks.md` | Checklist de implementación — **única fuente de estado** |
| 2 | `openspec/changes/system-coraza-v2/progress.md` | Bitácora, commits, incidentes, contexto del último día |
| 3 | `openspec/changes/system-coraza-v2/design.md` | Decisiones técnicas cerradas |
| 4 | `openspec/changes/system-coraza-v2/proposal.md` | Alcance y objetivo del change |
| 5 | `docs/GUIA-CIERRE-100.md` | **Setup post-clone + checklist al 100%** |
| 6 | `docs/DEPLOY-RENDER.md` | Producción, URLs, video login, troubleshooting |
| 7 | `docs/HANDOFF-IA.md` | Handoff técnico ampliado |
| 8 | `docs/REGLAS-NEGOCIO-Y-PROCEDIMIENTOS.md` | **Reglas de negocio y procedimientos por módulo** |
| 9 | `docs/GESTION-HUMANA-NATIVA.md` | **RRHH nativo en portal** (ya no puente a Render) |
| 10 | `docs/RENDIMIENTO.md` | Auditoría de rendimiento (corte 2026-08-18) |
| 11 | `docs/INVENTARIO_PERSISTENCIA.md` | Stock por almacén, `TRANSFER`, `stock_current` = suma |

**No reabrir decisiones** ya documentadas en `design.md` (JWT propio, permisos en payload, Realtime por `user_id`, matriz Excel para programación, documental metadata-only, etc.).

---

## Después de `git clone` (obligatorio)

El repo **no incluye** secretos ni `.env`. Tras clonar:

```powershell
cd Portalcoraza
git pull origin main          # asegurar última versión
npm install

copy apps\api\.env.example apps\api\.env
# Editar apps\api\.env con contraseña Supabase, service_role, JWT secrets

npm run db:setup              # migraciones + seeds + admin (requiere .env)
npm run db:ensure-hr -w @coraza/api   # esquema Gestión Humana (010+012) si falta
npm run db:check-hr -w @coraza/api    # verificar tablas/permisos HR
npm run api:dev               # http://localhost:3000/api/v1
npm run web:dev               # http://localhost:4200
```

> **Gestión Humana** es módulo **nativo** (`/rrhh`). No usar el puente a Render. Ver [`docs/GESTION-HUMANA-NATIVA.md`](GESTION-HUMANA-NATIVA.md).

**Guía completa paso a paso:** [`docs/GUIA-CIERRE-100.md`](GUIA-CIERRE-100.md) (Partes 2 y 3).

### Qué NO viene en el clone

| Falta | Qué hacer |
|-------|-----------|
| `apps/api/.env` | Copiar de `.env.example` y completar credenciales |
| Dependencias | `npm install` en la raíz |
| Tablas en Supabase | Ejecutar migraciones SQL 001–008 + seeds (ver GUIA) |
| Bucket firmas | Crear `delivery-signatures` en Supabase Storage (manual) |
| Realtime | Activar en tabla `notifications` (manual) |
| Usuario admin | `npm run seed:admin -w @coraza/api` tras migraciones |

### Errores comunes

- **Clonar dentro de otra carpeta del repo** → aparece `Portalcoraza/Portalcoraza/` duplicado. Usa **una sola** carpeta clonada; borra el clone anidado.
- **`git pull` falla por `package-lock.json`** → `git stash` y vuelve a hacer pull.
- **Login falla en local** → falta `.env`, Supabase pausado o migraciones no ejecutadas.

---

## Estado resumido (corte 2026-08-19)

### Producción

| Servicio | URL |
|----------|-----|
| API | https://portalcoraza.onrender.com |
| Web | https://portalcoraza-web.onrender.com |
| Login | https://portalcoraza-web.onrender.com/auth/login |

Credenciales seed: `admin@coraza.local` / `Coraza2026!` (rol GERENCIA). Tras cambios de permisos o almacén: **volver a iniciar sesión**.

### Hecho en `main` (relevante)

| Tema | Estado |
|------|--------|
| Residencial | **Retirado** (migración `028`). No reabrir. |
| Recepción | Nativo en `/recepcion` (visitantes de sede) |
| RRHH | Migración GH (~4 590 asociados). Directorio: filtro y columna **nivel educativo** |
| Dotación | Almacenes Medellín/Rionegro, stock por sede, traslados, Gerencia **solo consulta** |
| Documental | SGD nativo (sin puente a Apps Script) |
| Rendimiento | Revisión en [`docs/RENDIMIENTO.md`](RENDIMIENTO.md) — aceptable; techo = pooler Supabase |
| Puestos | **226** cargados (2026-08-19) desde la app de programación. Usuarios/roles intactos |

### Pendiente inmediato

1. Optimizaciones de rendimiento **solo si duele en producción** (ver `docs/RENDIMIENTO.md`): serializar overview de Dotación; filtro de antigüedad en SQL.

Turnos/asignaciones de la app de programación: **agosto 2026 en borrador** (8 puestos). Meses siguientes: uno a uno, sin pisar.

No hay migraciones 035 pendientes en el destino ya aplicado. Otros entornos: `npm run db:apply-warehouses -w @coraza/api`.

---

## Desarrollo local

```bash
# Raíz del monorepo
npm install

# Base de datos (requiere apps/api/.env con DATABASE_URL)
npm run db:setup

# API → http://localhost:3000/api/v1
npm run api:dev

# Web → http://localhost:4200
npm run web:dev

# Build frontend (validar antes de push)
npm run web:build
```

Variables: ver `apps/api/.env.example` y `docs/DEPLOY-RENDER.md`. **No commitear `.env`.**

---

## Convenciones al cerrar un bloque

El agente (o desarrollador) debe:

1. Marcar checkboxes en `tasks.md`
2. Añadir notas en `progress.md` (fecha, archivos, decisiones)
3. Ejecutar `npm run web:build` si tocó frontend
4. Commit descriptivo; push solo si se acuerda desplegar en Render

---

## Estructura del frontend (features)

```
apps/web/src/app/features/
├── auth/login/          ✅
├── dashboard/           ✅ widgets por rol
├── rrhh/                ✅ directorio + filtro nivel educativo
├── dotacion/            ✅ almacenes + traslados + firma
├── programacion/        ✅
├── documental/          ✅ SGD nativo
├── recepcion/           ✅ visitantes sede
├── operaciones/         ✅ 226 puestos cargados (2026-08-19)
└── admin/               ✅ usuarios + roles/permisos + almacén del usuario
```

Notificaciones: campana en layout + `notification.service.ts` (requiere Realtime activo en Supabase).

---

## Contacto / dudas de negocio

Si el agente encuentra requisitos ambiguos no cubiertos en `design.md` o `tasks.md`, que pregunte al equipo antes de inventar comportamiento nuevo.
