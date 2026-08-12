# Diseño — Minuta Virtual CORAZA (MVP)

**Fecha:** 2026-08-12  
**Estado:** Módulo independiente Portal Coraza (no parte de Vigía)

## Decisiones

| Tema | Decisión |
|------|----------|
| Ubicación | Solo Portal `/minutas` (MainLayout). **No** en la app de vigilantes (`/vigia`) |
| Auth | JWT Portal (`JwtAuthGuard` + `minuta.view`) |
| Alcance MVP | Visitantes, Correspondencia, Contratistas, Domiciliarios, Incidentes, Servicio, Entrega de puesto + dashboard + historial + salida/entrega |
| Fuera de MVP | Mapa/Ubicaciones, biblioteca Archivos, usuarios demo Apps Script |
| Persistencia | Tablas `minuta_*` en Postgres + bootstrap SQL en API |
| Relación con Vigía | Independiente. Vigía = app de campo del vigilante; Minuta = bitácora operativa en Portal |

## Eficiencia (dashboard)

`E = max(70, min(100, round(100 - ((I/max(V,1))*100)*0.5)))` con V/I del día (America/Bogota).

## APIs

Prefijo `/api/v1/minuta/*` protegido con `JwtAuthGuard` + `PermissionsGuard` + permiso `minuta.view`.
