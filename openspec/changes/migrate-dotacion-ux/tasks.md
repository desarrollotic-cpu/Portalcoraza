## 1. Base de datos

- [x] 1.1 Crear migración `008_delivery_ux.sql`: `post_id` nullable en `deliveries`, `observations`, estado `REVERTED`, `reverted_at`, `reverted_by`, `revert_reason`
- [x] 1.2 Constraint: al menos uno de `associate_id` o `post_id` debe estar presente
- [x] 1.3 Índices: `deliveries(post_id)`, `deliveries(associate_id, status)`

## 2. Backend — Inventario (validación tallas)

- [x] 2.1 Endpoint `GET /inventory/variants/available-stock` (query: `category`, `talla?`, `genero?`)
- [x] 2.2 Endpoint `POST /inventory/validate-stock` (body: array `{ category, talla?, genero?, quantity }`)
- [x] 2.3 Mapear búsqueda a `inventory_variants.attributes` + join con `inventory_items`/`inventory_categories`

## 3. Backend — Entregas (reversión y puesto)

- [x] 3.1 Extender `CreateDeliveryDto`: `postId?`, `observations?`; validar associate XOR post
- [x] 3.2 `POST /deliveries/:id/revert` — motivo ≥10 chars, ventana 5 días, devolver stock, estado `REVERTED`
- [x] 3.3 `GET /deliveries?postId=` — historial por puesto
- [x] 3.4 `POST /deliveries` con `postId` — entrega a puesto (mismo flujo PENDING → sign)
- [x] 3.5 Audit logs: `delivery.revert`, `delivery.post.create`
- [x] 3.6 Tests unitarios servicio: revert fuera de ventana, stock insuficiente al firmar

## 4. Frontend — Config y componentes base

- [x] 4.1 Portar `tallas.config.ts` a `features/dotacion/config/tallas.config.ts`
- [x] 4.2 Crear `signature-pad.ts` (canvas touch, clear, export base64) estilo portal
- [x] 4.3 Crear `modal-shell.ts` o utilidad overlay reutilizable (sin Material)
- [x] 4.4 Extender `inventory-api.service.ts` con `availableStock` y `validateStock`

## 5. Frontend — Modal entrega con tallas

- [x] 5.1 Crear `delivery-dialog.ts` — multi-línea: categoría, talla, género, cantidad, chips stock
- [x] 5.2 Integrar signature pad en el mismo flujo (crear PENDING → firmar en modal o paso 2)
- [x] 5.3 Validación bloqueante si stock insuficiente (llamada `validate-stock`)
- [x] 5.4 Soporte modo `associateId` y modo `postId` pre-cargados

## 6. Frontend — RRHH integración

- [x] 6.1 Botón "Entregar dotación" en `associates-list` (permiso `deliveries.create`)
- [x] 6.2 Botón "Entregar dotación" en `associate-detail`
- [x] 6.3 Sección historial de entregas en `associate-detail` con firma y estado

## 7. Frontend — Historial y reversión

- [x] 7.1 Crear `delivery-history.ts` — tabla entregas por asociado/puesto
- [x] 7.2 Crear `revert-delivery-dialog.ts` — motivo + confirmación
- [x] 7.3 Deshabilitar revert si >5 días; badge `REVERTED` en filas revertidas
- [x] 7.4 Visor de firma (`signature-viewer.ts`) desde `signature_url`

## 8. Frontend — Entrega a puesto

- [x] 8.1 Identificar o crear listado de puestos (`posts`) con acción "Entregar dotación"
- [x] 8.2 Historial de entregas por puesto (reutilizar `delivery-history` con `postId`)
- [x] 8.3 Reversión de entregas a puesto (mismo endpoint revert)

## 9. Refactor formulario existente

- [x] 9.1 Reemplazar o delegar `delivery-form.ts` al nuevo `delivery-dialog` donde aplique
- [x] 9.2 Mantener rutas `/dotacion/entregas/*` funcionando (listado + nueva entrega genérica)

## 10. Verificación

- [x] 10.1 Flujo E2E manual: asociado → entregar → firmar → ver historial → revertir (<5 días) — checklist en `VERIFICATION.md`
- [x] 10.2 Flujo E2E manual: puesto → entregar → firmar → historial → revertir — checklist en `VERIFICATION.md`
- [x] 10.3 Verificar permisos `deliveries.create`, `deliveries.sign`, `deliveries.view` — verificación estática en `VERIFICATION.md`
