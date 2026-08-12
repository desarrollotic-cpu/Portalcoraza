# Diseño — Minuta Virtual CORAZA (MVP)

**Fecha:** 2026-08-12  
**Estado:** Aprobado por decisión (opción A + MVP operativo)

## Decisiones

| Tema | Decisión |
|------|----------|
| Ubicación | `/minuta` (campo) + hub Portal `/minutas` |
| Auth | Misma sesión Vigía (JWT `aud=vigia`, cédula+PIN) |
| Alcance MVP | Visitantes, Correspondencia, Contratistas, Domiciliarios, Incidentes, Servicio, Entrega de puesto + dashboard + historial + salida/entrega |
| Fuera de MVP | Mapa/Ubicaciones, biblioteca Archivos, usuarios demo Apps Script |
| Persistencia | Tablas `minuta_*` en Postgres + bootstrap SQL en API |
| Recepción | Sigue existiendo; Minuta es bitácora de puesto/vigilante |

## Eficiencia (dashboard)

`E = max(70, min(100, round(100 - ((I/max(V,1))*100)*0.5)))` con V/I del día (America/Bogota).

## APIs

Prefijo `/api/v1/minuta/*` protegido con `VigiaAuthGuard`.
