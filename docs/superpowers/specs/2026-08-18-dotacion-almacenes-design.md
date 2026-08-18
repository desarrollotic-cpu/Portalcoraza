# Dotación — dos almacenes (Medellín / Rionegro)

**Date:** 2026-08-18  
**Status:** approved — implementation in progress  
**Scope:** Same catalog, stock per warehouse, transfers, history with actor.

## Goals

- Two physical warehouses: **Medellín** and **Rionegro**.
- Shared catalog (items + tallas). Each garment exists for **Hombre** and **Mujer**.
- Stock is per `(variant, warehouse)`. Both warehouses start at **0**.
- Almacenista writes only on their warehouse (IN / OUT / ADJ / delivery / transfer-from).
- Everyone with `inventory.view` sees stock and history of both warehouses.
- History shows who created an item, who moved stock, who transferred, who delivered.
- **Gerencia** views only (no catalog write, no movements, no deliveries).
- Supervisor de vigilantes is out of scope.

## Seed

- Warehouses `MEDELLIN` / `RIONEGRO`.
- Existing `almacen@corazaseguridadcta.com` → Medellín.
- New user `almacen.rionegro@corazaseguridadcta.com` → Rionegro.
- Items: Camisa, Pantalón, Botas — each with variants Hombre (`M`) and Mujer (`F`), stock 0.

## Data

- `inventory_warehouses (code, name)`
- `inventory_stock (variant_id, warehouse_id, quantity)` unique pair
- `users.warehouse_id` nullable (Gerencia = null)
- `inventory_items.created_by` / `updated_by`
- `inventory_movements.warehouse_id`, `dest_warehouse_id` (transfers), type `TRANSFER`
- `deliveries.warehouse_id`

`inventory_variants.stock_current` remains the **sum** of warehouse quantities (compat / overview).

## Writes

- Actor must have `warehouse_id`. API ignores any client-supplied warehouse on IN/OUT.
- Transfer: from actor warehouse → the other warehouse. Requires stock at origin.
- Delivery create/sign/revert uses the actor’s warehouse (and the delivery’s stored warehouse).

## Gerencia

Revoke: `inventory.create`, `inventory.edit`, `inventory.move`, `deliveries.create`, `deliveries.sign`, `deliveries.revert`.  
Keep view/alerts.

## Non-goals

- Third warehouse UI (model allows it later).
- Two-step receive confirmation on transfer.
- Supervisor role in Dotación.
