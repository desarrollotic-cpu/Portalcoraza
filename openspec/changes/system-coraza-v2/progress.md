# Progress Log — system-coraza-v2

## Corte de estado

- Fecha: 2026-06-23
- Fuente de verdad de avance: `tasks.md` (checkboxes)
- Estado global: Backend completo (0.x–8.x); pendiente frontend 9.x+ e infra Supabase manual
- Nota operativa: CLI `openspec` no disponible en este entorno; el avance se mantiene por actualización directa de artefactos OpenSpec.

## Completado

- 0.x Prerequisitos/refactors base: completado
- 1.x RRHH: completado
- 2.x Base de datos: completado excepto 2.7 y 2.8 (acciones manuales en Supabase)
- 3.x Backend inventario: completado
- 4.x Backend entregas: completado parcialmente (4.3 pendiente por SDK oficial)
- 5.x Backend programación: completado
- 6.x Backend documental: completado
- 7.x Backend residencial: completado
- 8.x Backend notificaciones: completado

## Pendiente inmediato

- 2.7 Crear bucket `delivery-signatures` en Supabase Storage con políticas
- 2.8 Activar Realtime en tabla `notifications`
- 4.3 Migrar integración de firma a SDK oficial de Supabase Storage (hoy funciona por API HTTP directa)
- 9.x Frontend Dotación (siguiente bloque de desarrollo)

## Siguiente lote recomendado (orden)

1. Cerrar 4.3 con SDK oficial de Supabase
2. Ejecutar 2.7 y 2.8 en dashboard Supabase
3. Iniciar frontend 9.x (Dotación)
4. Continuar frontend 10.x–13.x y verificación 14.x

## Criterios de continuidad entre IDs de desarrollo

Al retomar el change en otra sesión/agente:

1. Leer `proposal.md` y `design.md` para decisiones cerradas
2. Tomar `tasks.md` como única fuente de estado de implementación
3. Revisar este `progress.md` para contexto del último corte
4. Actualizar `tasks.md` y `progress.md` al finalizar cada bloque (3.x, 4.x, etc.)

## Notas del bloque 8.x (2026-06-23)

- Módulo en `apps/api/src/modules/notifications/` con entidad `Notification`, `NotificationsService.send()` y helpers `sendToRole` / `sendToPostAssignees`.
- Endpoints: `GET /notifications`, `PATCH /notifications/:id/read`.
- Integrado en: associates (retiro), inventory (stock bajo), scheduling (nuevo turno), documental (nuevo registro), residential (paquetes, novedades, reservas pendientes).
- Realtime en frontend pendiente (bloque 13.x); requiere activar Realtime en Supabase (tarea 2.8).
