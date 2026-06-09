## ADDED Requirements

### Requirement: Gestión de unidades residenciales
El sistema SHALL permitir gestionar unidades residenciales asociadas a un puesto de tipo `UNIDAD_RESIDENCIAL`. Cada unidad tiene `block`, `number` y `area_m2`.

#### Scenario: Crear unidad residencial
- **WHEN** ADMINISTRADOR_UNIDAD ejecuta POST `/residential/units` con `postId`, `block` y `number`
- **THEN** se crea la unidad vinculada al puesto asignado al usuario

#### Scenario: No crear unidad en puesto no asignado
- **WHEN** ADMINISTRADOR_UNIDAD intenta crear unidad en un `postId` que no tiene asignado
- **THEN** el sistema retorna 403 "Acceso denegado a ese puesto"

### Requirement: Gestión de residentes
Cada unidad SHALL tener residentes registrados. Un residente tiene `name`, `documentNumber`, `phone`, `email`, y un indicador de si es el responsable principal.

#### Scenario: Registrar residente
- **WHEN** ADMINISTRADOR_UNIDAD ejecuta POST `/residential/units/:id/residents` con datos del residente
- **THEN** se crea el residente vinculado a la unidad

### Requirement: Gestión de propietarios y arrendatarios
El sistema SHALL permitir registrar propietarios y arrendatarios por unidad residencial.

#### Scenario: Registrar propietario
- **WHEN** ADMINISTRADOR_UNIDAD ejecuta POST `/residential/units/:id/owners` con datos válidos
- **THEN** se crea el propietario vinculado a la unidad

#### Scenario: Registrar arrendatario
- **WHEN** ADMINISTRADOR_UNIDAD ejecuta POST `/residential/units/:id/tenants` con datos válidos
- **THEN** se crea el arrendatario vinculado a la unidad

### Requirement: Registro de visitantes y libro virtual
El sistema SHALL registrar el ingreso y salida de visitantes. Cada visita genera una entrada en el `virtual_log` como evento inmutable.

#### Scenario: Registrar ingreso de visitante
- **WHEN** ADMINISTRADOR_UNIDAD ejecuta POST `/residential/visitors` con `unitId`, datos del visitante y `host_resident_id`
- **THEN** se crea el visitante con `entry_time` = now y se genera entrada en `virtual_log` con `entry_type: VISITOR_ENTRY`

#### Scenario: Registrar salida de visitante
- **WHEN** ADMINISTRADOR_UNIDAD ejecuta PATCH `/residential/visitors/:id/exit`
- **THEN** se registra `exit_time` y se genera entrada en `virtual_log` con `entry_type: VISITOR_EXIT`

#### Scenario: El virtual log es inmutable
- **WHEN** se intenta eliminar o editar una entrada del `virtual_log`
- **THEN** el sistema retorna 405 "El libro virtual es inmutable"

### Requirement: Gestión de paquetes
El sistema SHALL registrar la recepción y entrega de paquetes a residentes. Un paquete genera notificación al ser recibido.

#### Scenario: Registrar recepción de paquete
- **WHEN** ADMINISTRADOR_UNIDAD ejecuta POST `/residential/packages` con `unitId`, `sender` y datos del paquete
- **THEN** se crea el paquete con estado `RECEIVED`, se genera entrada en `virtual_log` y se emite notificación al residente

#### Scenario: Registrar entrega de paquete
- **WHEN** ADMINISTRADOR_UNIDAD ejecuta PATCH `/residential/packages/:id/deliver`
- **THEN** el paquete pasa a estado `DELIVERED` con `delivered_at` = now

### Requirement: Gestión de vehículos registrados
Cada unidad SHALL poder tener vehículos registrados con `plate`, `brand`, `model` y `color`.

#### Scenario: Registrar vehículo
- **WHEN** ADMINISTRADOR_UNIDAD ejecuta POST `/residential/units/:id/vehicles` con datos del vehículo
- **THEN** se crea el vehículo vinculado a la unidad

### Requirement: Parqueaderos de visitantes con cupos
Cada unidad residencial SHALL gestionar parqueaderos de visitantes con cupos y disponibilidad en tiempo real.

#### Scenario: Configurar cupos de parqueadero visitante
- **WHEN** ADMINISTRADOR_UNIDAD define `total_slots` para su puesto o unidad
- **THEN** el sistema mantiene `available_slots` y `occupied_slots` consistentes

#### Scenario: Ocupar cupo con ingreso de vehículo visitante
- **WHEN** se registra ingreso de visitante con vehículo a parqueadero
- **THEN** se incrementa `occupied_slots`, se reduce `available_slots` y se registra en historial

#### Scenario: Liberar cupo con salida de vehículo visitante
- **WHEN** se registra salida del visitante con vehículo
- **THEN** se reduce `occupied_slots`, se incrementa `available_slots` y se registra en historial

### Requirement: Correspondencia y paquetería
El sistema SHALL gestionar correspondencia y paquetería como registros separados de operación residencial.

#### Scenario: Registrar correspondencia
- **WHEN** ADMINISTRADOR_UNIDAD ejecuta POST `/residential/mail`
- **THEN** se crea el registro de correspondencia con estado trazable

### Requirement: Reservas configurables por recurso
El sistema SHALL permitir reservar recursos comunes configurables con fecha, hora de inicio y fin. Cada unidad define si la reserva requiere aprobación manual o aprobación automática.

#### Scenario: Solicitar reserva
- **WHEN** ADMINISTRADOR_UNIDAD ejecuta POST `/residential/reservations` con recurso, fecha y horario
- **THEN** se crea la reserva en estado `PENDING`

#### Scenario: Reserva con aprobación automática
- **WHEN** la unidad tiene configuración `auto_approval` para el recurso y no hay conflicto
- **THEN** la reserva se crea en estado `APPROVED`

#### Scenario: Reserva con aprobación manual
- **WHEN** la unidad tiene configuración `manual_approval` para el recurso
- **THEN** la reserva permanece en estado `PENDING` hasta decisión administrativa

#### Scenario: Conflicto de horario
- **WHEN** se solicita reservar un recurso que ya tiene reserva `APPROVED` en el mismo horario
- **THEN** el sistema retorna 409 "Recurso no disponible en ese horario"

#### Scenario: Estados mínimos de reserva
- **WHEN** se consulta una reserva durante su ciclo de vida
- **THEN** su estado pertenece a `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` o `COMPLETED`

### Requirement: Gestión de novedades residenciales
El sistema SHALL permitir gestionar novedades residenciales con seguimiento completo.

#### Scenario: Crear novedad residencial
- **WHEN** ADMINISTRADOR_UNIDAD ejecuta POST `/residential/incidents` con prioridad y descripción
- **THEN** se crea la novedad en estado `ABIERTA`, se asigna responsable y se genera notificación

#### Scenario: Flujo de estados de novedad
- **WHEN** una novedad avanza en gestión
- **THEN** su estado evoluciona usando `ABIERTA`, `EN_PROCESO`, `RESUELTA`, `CERRADA`

#### Scenario: Prioridades de novedad
- **WHEN** se clasifica una novedad
- **THEN** su prioridad pertenece a `BAJA`, `MEDIA`, `ALTA` o `CRITICA`
