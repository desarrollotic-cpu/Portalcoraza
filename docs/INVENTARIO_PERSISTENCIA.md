# Inventario Dotación — Persistencia en base de datos

> Actualizado: 2026-08-18  
> Objetivo: que **todos los campos capturados en pantalla prevalezcan** en tablas PostgreSQL.

**Regla de negocio:** dos almacenes (Medellín, Rionegro), catálogo compartido, stock por `(variante, almacén)`. Ver `docs/REGLAS-NEGOCIO-Y-PROCEDIMIENTOS.md` §4.

## Tablas y columnas relevantes

### `inventory_categories`
| Campo | Uso |
|-------|-----|
| `code`, `name` | Uniforme (`UNI`), Accesorio (`ACC`) |

### `inventory_items`
| Campo | Uso |
|-------|-----|
| `code` | Código automático (ej. CAM001) |
| `name` | Nombre del elemento |
| `category_id` | Uniforme / Accesorio |
| `unit` | Unidad (default `und`) |
| `low_stock_threshold` | Stock mínimo |
| `created_by`, `updated_by` | Quién creó / editó el elemento (035) |

### `inventory_warehouses`
| Campo | Uso |
|-------|-----|
| `code` | `MEDELLIN` / `RIONEGRO` |
| `name` | Etiqueta en UI |

### `inventory_stock`
| Campo | Uso |
|-------|-----|
| `variant_id`, `warehouse_id` | UNIQUE — una fila de cantidad por sede |
| `quantity` | Stock real de esa variante en ese almacén |

### `inventory_variants`
| Campo | Uso |
|-------|-----|
| `sku` | Identificador de variante |
| `talla`, `color`, `genero` | **Columnas propias** (persisten) |
| `attributes` | JSON de respaldo |
| `stock_current` | **Suma** de `inventory_stock.quantity` (no es el stock de una sola sede) |

### `inventory_movements`
| Campo | Uso |
|-------|-----|
| `movement_type` | `IN` / `OUT` / `ADJ` / `TRANSFER` (`VARCHAR(12)` desde 035) |
| `quantity` | Cantidad |
| `warehouse_id` | Sede origen (IN/OUT/ADJ/TRANSFER) |
| `dest_warehouse_id` | Sede destino (solo `TRANSFER`) |
| `entry_reason` | Motivo estructurado: Compra, Devolución, Donación, Ajuste, Otro (**obligatorio en IN**) |
| `observations` | Notas opcionales |
| `reason` | Resumen legado (motivo + observaciones) |
| `performed_by` | Usuario que registró |

### `users` / `deliveries` (035)
| Campo | Uso |
|-------|-----|
| `users.warehouse_id` | Almacén del almacenista; sin él no escribe stock ni entrega |
| `deliveries.warehouse_id` | Almacén del que salió la entrega |

## Migraciones
- `013_inventory_categories_seed.sql` — categorías Uniforme / Accesorio  
- `014_inventory_persist_fields.sql` — columnas `entry_reason`, `observations`, `talla`, `color`, `genero`
- `035_inventory_warehouses.sql` — almacenes, stock por sede, `TRANSFER`, Gerencia solo consulta

Aplicar en otro entorno:

```powershell
npm run db:apply-inventory -w @coraza/api
npm run seed:inventory-categories -w @coraza/api
npm run db:apply-warehouses -w @coraza/api
```
