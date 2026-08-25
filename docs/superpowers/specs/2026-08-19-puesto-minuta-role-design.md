# Design: rol PUESTO para Minuta Virtual (cascarón)

**Fecha:** 2026-08-19  
**Estado:** aprobado  
**Alcance:** B — rol + permisos + usuario Amisi + filtro API por `user_posts`

## Objetivo

Cuentas de puesto (ej. `amisi@corazaseguridadcta.com`) entran solo a Minuta Virtual de **su** puesto: ver historial/dashboard y crear registros, sin editar. La lógica de negocio de novedades/reportes la completa otro desarrollador.

## Decisiones

| Tema | Decisión |
|------|----------|
| Rol | `PUESTO` |
| Permisos | `minuta.view`, `minuta.create` (sin edit) |
| Amarras | Tabla existente `user_posts` |
| Filtro | Si `roleCode === 'PUESTO'`, limitar por `postId` asignados |
| Auth | JWT Portal actual (`roleCode` + permissions) |
| Ejemplo | Usuario Amisi + vínculo al post Amisi |

## Fuera de alcance

- UI de reporte de novedad / PDF
- Restringir menú lateral solo a Minuta (opcional post)
- Múltiples puestos por cuenta (soportado en datos; MVP asume 1)

## Éxito

- Login Amisi → `minuta.view` + `minuta.create`
- Historial/dashboard solo de su `postId`
- Crear fuerza su puesto; sin asignación → 403
