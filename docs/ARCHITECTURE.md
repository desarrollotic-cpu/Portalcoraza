# System Coraza — Arquitectura

Documento fuente: especificación empresarial v1.0 entregada al inicio del proyecto.

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

## Núcleo (CORE)

Usuarios, roles, permisos, asociados, puestos, auditoría, notificaciones.

## Roles iniciales

`GERENCIA` · `RRHH` · `PROGRAMADOR` · `ALMACENISTA` · `VIGILANTE` · `ADMINISTRADOR_UNIDAD`
