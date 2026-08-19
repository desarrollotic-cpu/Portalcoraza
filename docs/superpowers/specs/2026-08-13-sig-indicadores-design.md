# Diseño — CORAZA SIG-KPI (MVP)

**Fecha:** 2026-08-13  
**Estado:** Aprobado (opción A) — módulo nativo Portal

## Decisiones

| Tema | Decisión |
|------|----------|
| Ubicación | Portal `/sig` (MainLayout). Independiente de Vigía y SST |
| Auth | JWT Portal + permiso `sig.view` (GERENCIA / ADMIN / SUPERADMIN) |
| Alcance MVP | Catálogo CMI, captura por periodo, semáforo, dashboard por área, mapa simple (4 perspectivas) |
| Catálogo | Seed SQL ~40 códigos (E/H/S/C/P/I/O + T representativos) |
| Fuera de MVP | Excel histórico, export PDF/Excel, mails/cron, fichas SST/PESV, acciones de mejora, roles por área, cierre solo-Auditor |

## Semáforo

Umbrales configurables en código (`1.1` / `1.0` / `0.9`):

- **ASCENDENTE:** ≥110% Azul · ≥100% Verde · ≥90% Amarillo · resto Rojo
- **DESCENDENTE:** invertido (menor es mejor)

## Datos

`sig_sistemas` → `sig_objetivos` → `sig_indicadores` → `sig_resultados`  
Único: `(indicador_id, anio, periodo)`. Meta se captura junto al resultado (`meta_snapshot`).

## API

`/api/v1/sig/*` con `JwtAuthGuard` + `PermissionsGuard`.
