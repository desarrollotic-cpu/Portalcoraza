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
| 5 | `docs/DEPLOY-RENDER.md` | Producción, URLs, video login, troubleshooting |
| 6 | `docs/HANDOFF-IA.md` | Handoff técnico ampliado |

**No reabrir decisiones** ya documentadas en `design.md` (JWT propio, permisos en payload, Realtime por `user_id`, matriz Excel para programación, documental metadata-only, etc.).

---

## Estado resumido (corte 2026-06-23)

### Producción

| Servicio | URL |
|----------|-----|
| API | https://portalcoraza.onrender.com |
| Web | https://portalcoraza-web.onrender.com |
| Login | https://portalcoraza-web.onrender.com/auth/login |

Credenciales seed: `admin@coraza.local` / `Coraza2026!` (rol GERENCIA)

### Completado

| Bloque | Qué |
|--------|-----|
| 0.x | JWT con permisos, guards, migraciones base |
| 1.x | RRHH frontend + backend |
| 2.x | Migraciones SQL 003–007 (faltan 2.7 y 2.8 manuales en Supabase) |
| 3.x–8.x | Backend: inventario, entregas, programación, documental, residencial, notificaciones |
| 9.x | Frontend dotación |
| 10.x | Frontend programación (matriz Excel + calendario + turnos) |
| 11.x | Frontend documental |
| 15.x | Login rediseñado + video `coraza-logo.mp4` |

### Pendiente (orden recomendado)

1. **12.x** — Frontend residencial (unidades, visitantes, paquetes, reservas) ← **siguiente**
2. **13.x** — Notificaciones Realtime + admin + widgets dashboard
3. **14.x** — Verificación final E2E
4. **2.7** — Bucket `delivery-signatures` en Supabase (manual)
5. **2.8** — Realtime en tabla `notifications` (manual)
6. **4.3** — SDK oficial Supabase Storage para firmas de entregas
7. **15.7** — PNG opcional `apps/web/public/images/coraza-logo.png`

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
├── dashboard/           ✅ básico
├── rrhh/                ✅
├── dotacion/            ✅
├── programacion/        ✅
├── documental/          ✅
└── residential/         ❌ pendiente 12.x
```

Backend residencial ya existe en `apps/api/src/modules/residential/` — el frontend es lo que falta.

---

## Contacto / dudas de negocio

Si el agente encuentra requisitos ambiguos no cubiertos en `design.md` o `tasks.md`, que pregunte al equipo antes de inventar comportamiento nuevo.
