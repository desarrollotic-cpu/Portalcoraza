## ADDED Requirements

### Requirement: Registro de entrega de dotación
El sistema SHALL permitir registrar entregas de ítems de inventario a asociados. Una entrega tiene estado `PENDING → DELIVERED`. Los registros de entrega MUST ser inmutables después de pasar a estado `DELIVERED`.

#### Scenario: Crear entrega pendiente
- **WHEN** ALMACENISTA ejecuta POST `/deliveries` con `associateId` y lista de `items`
- **THEN** se crea la entrega en estado `PENDING` y se reservan las cantidades del stock

#### Scenario: Confirmar entrega con firma
- **WHEN** ALMACENISTA ejecuta POST `/deliveries/:id/sign` con firma manuscrita capturada mediante Signature Pad
- **THEN** la firma se sube a Supabase Storage, `signature_url` se almacena, el estado pasa a `DELIVERED` y el stock se descuenta definitivamente

### Requirement: Evidencia manuscrita obligatoria para confirmación
La confirmación de entrega SHALL requerir firma manuscrita como evidencia de recepción.

#### Scenario: Rechazo de confirmación sin firma
- **WHEN** se intenta confirmar una entrega sin adjuntar firma manuscrita
- **THEN** el sistema retorna 422 indicando que la firma es obligatoria para confirmar la entrega

#### Scenario: No se puede modificar entrega confirmada
- **WHEN** se intenta editar o eliminar una entrega con estado `DELIVERED`
- **THEN** el sistema retorna 422 "La entrega ya fue confirmada y es inmutable"

### Requirement: Historial de entregas por asociado
El sistema SHALL permitir consultar todas las entregas de un asociado específico, ordenadas por fecha descendente.

#### Scenario: Consulta de historial
- **WHEN** se ejecuta GET `/deliveries?associateId=<id>`
- **THEN** se retorna la lista de entregas del asociado con sus detalles e ítems

### Requirement: Auditoría de entregas
Toda entrega confirmada SHALL generar un registro en `audit_logs` con el estado anterior y nuevo.

#### Scenario: Audit al confirmar
- **WHEN** una entrega pasa a estado `DELIVERED`
- **THEN** `audit_logs` registra la acción `delivery.confirmed` con `oldValue: {status: PENDING}` y `newValue: {status: DELIVERED, signature_url}`
