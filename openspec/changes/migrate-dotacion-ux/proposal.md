## Why

El módulo de entrega de dotación en **coraza-system** está en producción y es la referencia operativa del negocio (tallas, género, validación de stock, firma, historial y reversión). Portal Coraza tiene el núcleo técnico (`deliveries`, inventario por variantes, firma vía API) pero la UX no replica el flujo real que usan almacenistas y supervisores.

## What Changes

- Portar la experiencia de **entrega con tallas** desde coraza-system al frontend Angular 21 del portal, **sin Angular Material**, usando el estilo visual actual (standalone + CSS Coraza).
- Habilitar entrega **desde la lista de asociados** (acción contextual) además del menú Dotación existente.
- Implementar **historial de entregas por asociado** con visualización de firma y **reversión** (límite 5 días, devolución de stock).
- Implementar **entrega a puesto** (`posts`) con historial y reversión equivalente.
- Añadir validación de stock por categoría/talla/género mapeada a `inventory_variants.attributes`.
- Mejorar el **signature pad** (touch, limpiar, trazo fluido) manteniendo upload de firma vía API (no Supabase desde browser).
- Extender API NestJS y migración SQL para soportar reversión, entregas a puesto y campos de observaciones.

## Capabilities

### Modified Capabilities

- `delivery-management`: UX operativa alineada con coraza-system, reversión, entrega a puesto, validación de stock por talla.
- `inventory-management`: endpoints de consulta/validación de stock por atributos de variante.
- `rrhh-complete`: acción "Entregar dotación" en lista y detalle de asociados.

## Impact

**Backend**
- Migración SQL: `post_id` opcional en `deliveries`, estado `REVERTED`, campos de reversión, tabla o vista para entregas a puesto si aplica.
- `DeliveriesService`: revert, create-for-post, list-by-post.
- `InventoryService`: `validate-stock`, `available-stock` por attributes.

**Frontend**
- Nuevos componentes en `features/dotacion/`: dialog/modal entrega con tallas, signature-pad, historial, revert-dialog.
- Cambios en `associates-list` y `associate-detail`.
- Integración con módulo de puestos (`posts`) para entrega a puesto.

**Fuente de referencia**
- `C:\Users\USUARIO\Documents\coraza-system\src\app\components\entrega-con-tallas-dialog\`
- `C:\Users\USUARIO\Documents\coraza-system\routes\delivery.js`

## Out of Scope

- Reescribir backend Express de coraza-system.
- Migrar tabla plana `entrega_dotacion` (se mantiene modelo `deliveries` + `delivery_details`).
- Añadir Angular Material al portal.
- Upload de firma desde el browser con credenciales Supabase.
