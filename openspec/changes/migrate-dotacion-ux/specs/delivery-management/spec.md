## MODIFIED Requirements

### Requirement: Registro de entrega de dotación
El sistema SHALL permitir registrar entregas de ítems de inventario a **asociados** o a **puestos** (`posts`). Una entrega tiene estado `PENDING → DELIVERED` o `DELIVERED → REVERTED`. Los registros en estado `DELIVERED` MUST ser inmutables salvo reversión dentro de la ventana permitida.

#### Scenario: Crear entrega pendiente a asociado
- **WHEN** usuario con permiso `deliveries.create` ejecuta POST `/deliveries` con `associateId` y lista de `items` (variantId + quantity)
- **THEN** se crea la entrega en estado `PENDING` sin descontar stock definitivo

#### Scenario: Crear entrega pendiente a puesto
- **WHEN** usuario ejecuta POST `/deliveries` con `postId` y lista de `items`
- **THEN** se crea la entrega en estado `PENDING` vinculada al puesto

#### Scenario: Confirmar entrega con firma
- **WHEN** usuario ejecuta POST `/deliveries/:id/sign` con firma manuscrita
- **THEN** la firma se sube a Supabase Storage, el estado pasa a `DELIVERED`, el stock se descuenta y el registro queda inmutable

### Requirement: Selección por talla y género
El frontend SHALL permitir seleccionar ítems de dotación por categoría, talla y género cuando aplique, validando stock disponible antes de confirmar.

#### Scenario: Validación de stock por talla
- **WHEN** el usuario agrega un ítem que requiere talla al modal de entrega
- **THEN** el sistema consulta stock disponible para la combinación categoría/talla/género y bloquea la confirmación si no hay stock suficiente

### Requirement: Historial de entregas por asociado
El sistema SHALL permitir consultar todas las entregas de un asociado, ordenadas por fecha descendente, incluyendo estado y URL de firma.

#### Scenario: Consulta de historial
- **WHEN** se ejecuta GET `/deliveries?associateId=<id>`
- **THEN** se retorna la lista con detalles, estado (`PENDING`, `DELIVERED`, `REVERTED`) y `signature_url` cuando exista

### Requirement: Historial de entregas por puesto
El sistema SHALL permitir consultar entregas de dotación realizadas a un puesto.

#### Scenario: Consulta historial puesto
- **WHEN** se ejecuta GET `/deliveries?postId=<id>`
- **THEN** se retorna entregas del puesto con el mismo detalle que entregas a asociado

## ADDED Requirements

### Requirement: Reversión de entrega confirmada
El sistema SHALL permitir revertir una entrega `DELIVERED` dentro de los **5 días** posteriores a la confirmación, devolviendo el stock y registrando motivo y usuario.

#### Scenario: Reversión exitosa
- **WHEN** usuario con permiso adecuado ejecuta POST `/deliveries/:id/revert` con `reason` de al menos 10 caracteres y la entrega tiene menos de 5 días
- **THEN** el estado pasa a `REVERTED`, el stock de cada línea se incrementa y se registra `reverted_at`, `reverted_by`, `revert_reason`

#### Scenario: Reversión rechazada por tiempo
- **WHEN** la entrega fue confirmada hace más de 5 días
- **THEN** el sistema retorna 400 indicando que no se puede revertir

#### Scenario: Reversión rechazada si ya revertida
- **WHEN** la entrega ya está en estado `REVERTED`
- **THEN** el sistema retorna 409

### Requirement: Entrada contextual desde RRHH
El frontend SHALL exponer acción "Entregar dotación" desde la lista y detalle de asociados, abriendo el modal de entrega con el asociado preseleccionado.

#### Scenario: Entrega desde lista de asociados
- **WHEN** el usuario hace clic en "Entregar dotación" en un asociado activo
- **THEN** se abre el modal de entrega con `associateId` fijado y permisos validados

### Requirement: Auditoría de entregas
Toda entrega confirmada o revertida SHALL generar registro en `audit_logs`.

#### Scenario: Audit al revertir
- **WHEN** una entrega pasa a estado `REVERTED`
- **THEN** `audit_logs` registra `delivery.revert` con motivo y stock restaurado
