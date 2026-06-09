## ADDED Requirements

### Requirement: Notificaciones en tiempo real vía Supabase Realtime
El sistema SHALL entregar notificaciones al usuario activo en el frontend sin necesidad de polling. El canal de Supabase Realtime se filtra por `user_id` para que cada usuario solo reciba sus notificaciones.

#### Scenario: Notificación recibida en tiempo real
- **WHEN** NestJS inserta un registro en la tabla `notifications` con `user_id = X`
- **THEN** el cliente Angular del usuario X recibe el evento en menos de 2 segundos sin recargar la página

#### Scenario: Indicador de notificaciones no leídas
- **WHEN** el usuario tiene notificaciones con `read_at = null`
- **THEN** el layout principal muestra un badge con el conteo de no leídas

#### Scenario: Marcar notificación como leída
- **WHEN** el usuario hace click en una notificación
- **THEN** se ejecuta PATCH `/notifications/:id/read` y el badge se actualiza

### Requirement: Tipos de notificaciones de negocio
El sistema SHALL generar notificaciones automáticas para los siguientes eventos:
- `rrhh.associate_updated` — cuando se registra un cambio relevante de asociado
- `inventory.low_stock` — cuando stock cae bajo umbral
- `deliveries.delivery_confirmed` — cuando se confirma entrega de dotación firmada
- `scheduling.shift_assigned` — cuando se asigna un turno al asociado
- `residential.visitor_arrival` — cuando se registra ingreso de visitante
- `residential.package_received` — cuando se recibe un paquete
- `residential.incident_created` — cuando se registra una novedad residencial
- `documental.document_expiring` — cuando un documento está próximo a vencer
- `residential.reservation_status_changed` — cuando una reserva es aprobada o rechazada

#### Scenario: Notificación de turno asignado
- **WHEN** se crea un turno para un asociado
- **THEN** si el asociado tiene usuario asociado en el sistema, se genera notificación con `title: "Nuevo turno asignado"` y detalle del turno

#### Scenario: Notificación de paquete recibido
- **WHEN** se registra un paquete para una unidad residencial
- **THEN** se genera notificación para el ADMINISTRADOR_UNIDAD del puesto correspondiente

### Requirement: Historial de notificaciones
El sistema SHALL permitir consultar las últimas 50 notificaciones del usuario autenticado ordenadas por `created_at` descendente.

#### Scenario: Consultar historial
- **WHEN** usuario autenticado ejecuta GET `/notifications`
- **THEN** se retornan máximo 50 notificaciones del usuario con estado de lectura
