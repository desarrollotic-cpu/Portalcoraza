# System Coraza — Arquitectura

Documento fuente: especificación empresarial v1.0 entregada al inicio del proyecto.

> **Corte 2026-09-11:** monorepo con **tres** frontends en producción (Portal, Minuta, API). Grafo: `graphify-out/` (local). Minuta: [`MINUTA-VIRTUAL.md`](MINUTA-VIRTUAL.md). Operaciones: [`OPERACIONES.md`](OPERACIONES.md).

Ver `README.md` para instrucciones de desarrollo y estructura del repositorio.

## Principios

1. Arquitectura modular
2. Código desacoplado
3. Base de datos centralizada
4. Entidades compartidas (sin duplicar entre módulos)
5. Escalabilidad hacia microservicios
6. Auditoría en cambios críticos
7. Notificaciones Realtime (Supabase, fases posteriores)
8. RBAC: roles + permisos granulares

## Apps del monorepo

| App | Path | Rol |
|-----|------|-----|
| API | `apps/api` | NestJS — REST JWT TypeORM |
| Portal web | `apps/web` | Angular — ERP (RRHH, ops, recepción, etc.) |
| Minuta web | `apps/minuta-web` | Angular — bitácora de puesto (rol `PUESTO`) |

Producción Render: `portalcoraza` (API), `portalcoraza-web`, `portalcoraza-minuta`.

## Núcleo (CORE)

Usuarios, roles, permisos, asociados, puestos, auditoría, notificaciones.

## Roles iniciales

`GERENCIA` · `RRHH` · `PROGRAMADOR` · `ALMACENISTA` · `VIGILANTE` · `RECEPCIONISTA` · `SUPERVISOR` · `AUDITOR` · `PUESTO`  
(`ADMINISTRADOR_UNIDAD` retirado: módulo residencial fuera de alcance.)

- **`PUESTO`:** solo Minuta Virtual (`minuta.view` / `minuta.create`); redirigido desde el Portal a `minutaWebUrl`.
