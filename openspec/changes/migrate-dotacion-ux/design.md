## Context

coraza-system usa Express + PostgreSQL con tablas planas (`entrega_dotacion`, `entrega_dotacion_puesto`, `supply_inventory` con columnas `talla`/`genero`). Portal Coraza usa NestJS + TypeORM con `deliveries` (cabecera) + `delivery_details` (líneas) e `inventory_variants.attributes` JSONB.

El flujo operativo deseado replica coraza-system; la arquitectura de datos del portal se conserva.

## Goals

1. Misma UX de negocio: categoría → talla → género → cantidad → firma → guardar.
2. Dos puntos de entrada: menú Dotación y acción en RRHH (asociados).
3. Reversión con ventana de 5 días y devolución de stock.
4. Entrega a puesto con historial y reversión.
5. UI nativa del portal (modales/paneles con CSS Coraza, sin Material).

## Non-Goals

- Cambiar el momento del descuento de stock (se mantiene al **firmar**, no al crear — más seguro que coraza-system).
- Exponer Supabase service role en el frontend.

## Decisions

### D1 — Modelo de datos: extender `deliveries`, no tabla plana

- `associate_id` nullable cuando `post_id` está presente (entrega a puesto).
- Nuevo estado `REVERTED` además de `PENDING` / `DELIVERED`.
- Campos: `observations`, `reverted_at`, `reverted_by`, `revert_reason`.
- Líneas siguen en `delivery_details` con `variant_id` + `quantity`.

**Alternativa descartada:** tabla `entrega_dotacion` plana — rompe el modelo ya migrado y el audit trail unificado.

### D2 — Tallas y género vía `attributes` JSONB

Portar `tallas.config.ts` al frontend. Resolver variante con:

```json
{ "talla": "40", "genero": "M" }
```

Backend expone `GET /inventory/variants/available-stock` y `POST /inventory/validate-stock` filtrando por `item.category` + attributes.

### D3 — Firma: pad mejorado + upload vía API

El signature pad se porta visualmente desde coraza-system. Al confirmar:

1. Usuario firma en canvas.
2. `POST /deliveries/:id/sign` con base64 (flujo actual).
3. API sube a bucket `delivery-signatures`.

### D4 — UI sin Material

- Modal entrega: componente standalone con overlay CSS (`position: fixed`, backdrop).
- Tablas historial: reutilizar estilos de `associates-list` / `deliveries-list`.
- Chips de stock: badges CSS existentes (`badge`, variables `--coraza-*`).

### D5 — Reversión

- Solo entregas `DELIVERED` dentro de 120 horas (5 días).
- Motivo mínimo 10 caracteres.
- Transacción: restaurar `stock_current` por línea, marcar `REVERTED`, audit log `delivery.revert`.
- Entregas revertidas visibles en historial con estilo atenuado (como coraza-system).

### D6 — Entrada desde RRHH

- Botón "Entregar dotación" en `associates-list` y `associate-detail` (permiso `deliveries.create`).
- Abre modal con `associateId` preseleccionado.
- Historial en pestaña/sección del detalle de asociado.

## Data flow

```
Asociado/Puesto
      │
      ▼
┌─────────────────┐     GET variants + stock
│ Modal entrega   │◀──────────────────────── Inventory API
│ (tallas/género) │
└────────┬────────┘
         │ POST /deliveries (PENDING)
         ▼
┌─────────────────┐
│ Signature pad   │
└────────┬────────┘
         │ POST /deliveries/:id/sign
         ▼
   DELIVERED + stock ↓

Historial ──▶ POST /deliveries/:id/revert (≤5 días) ──▶ REVERTED + stock ↑
```

## Risks

| Riesgo | Mitigación |
|--------|------------|
| Variantes sin `attributes` consistentes | Seed/migración de datos + validación en formulario |
| Divergencia spec vs implementación (stock al crear) | Actualizar spec `delivery-management` en este change |
| Puestos sin módulo UI listo | Reutilizar API `posts` existente; botón en listado de puestos si existe |

## Migration plan

1. SQL migration (campos reversión + post_id).
2. API endpoints (revert, post delivery, stock validation).
3. Frontend config tallas + modal + signature pad.
4. Hook RRHH + historial + revert dialog.
5. Entrega a puesto (posts UI + API).
