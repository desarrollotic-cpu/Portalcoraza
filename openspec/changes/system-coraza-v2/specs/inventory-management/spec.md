## ADDED Requirements

### Requirement: Gestión de categorías de inventario
El sistema SHALL permitir crear, editar y listar categorías de inventario. Cada categoría tiene `code` único, `name` y `description`.

#### Scenario: Crear categoría
- **WHEN** ALMACENISTA ejecuta POST `/inventory/categories` con datos válidos
- **THEN** se crea la categoría y se retorna con su `id`

### Requirement: Gestión de ítems de inventario
El sistema SHALL permitir gestionar ítems de inventario. Cada ítem pertenece a una categoría y tiene `code` único, `name`, `unit` (unidad de medida).

#### Scenario: Crear ítem
- **WHEN** ALMACENISTA ejecuta POST `/inventory/items` con `categoryId`, `code`, `name` y `unit`
- **THEN** se crea el ítem vinculado a la categoría

#### Scenario: Ítem con categoría inválida
- **WHEN** se intenta crear un ítem con `categoryId` inexistente
- **THEN** el sistema retorna 404 "Categoría no encontrada"

### Requirement: Gestión de variantes de inventario
Cada ítem SHALL tener una o más variantes. Las variantes diferencian talla, color u otros atributos via `attributes JSONB`. Cada variante tiene `sku` único y `stock_current`.

#### Scenario: Crear variante
- **WHEN** ALMACENISTA ejecuta POST `/inventory/items/:id/variants` con `sku` y `attributes`
- **THEN** se crea la variante con `stock_current = 0`

#### Scenario: SKU duplicado
- **WHEN** se intenta crear una variante con un `sku` ya existente
- **THEN** el sistema retorna 409 "SKU ya registrado"

### Requirement: Control de stock via movimientos
El stock SHALL actualizarse exclusivamente mediante registros en `inventory_movements`. No se permite actualización directa de `stock_current`. Los tipos de movimiento son: `IN` (entrada), `OUT` (salida), `ADJ` (ajuste con razón justificada).

#### Scenario: Movimiento de entrada
- **WHEN** ALMACENISTA registra un movimiento tipo `IN` para una variante
- **THEN** `stock_current` de la variante aumenta en la cantidad del movimiento y se registra el movimiento

#### Scenario: Movimiento de salida con stock insuficiente
- **WHEN** se intenta registrar un movimiento tipo `OUT` mayor al `stock_current`
- **THEN** el sistema retorna 409 "Stock insuficiente"

### Requirement: Alerta de stock bajo
El sistema SHALL emitir una notificación cuando el `stock_current` de una variante caiga por debajo de un umbral configurable por ítem.

#### Scenario: Notificación de stock bajo
- **WHEN** un movimiento `OUT` deja el stock por debajo del umbral del ítem
- **THEN** se crea una notificación para los usuarios con permiso `inventory.alerts`
