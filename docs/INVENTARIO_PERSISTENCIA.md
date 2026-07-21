# Inventario Dotación — Persistencia en base de datos

> Actualizado: 2026-07-14  
> Objetivo: que **todos los campos capturados en pantalla prevalezcan** en tablas PostgreSQL.

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

### `inventory_variants`
| Campo | Uso |
|-------|-----|
| `sku` | Identificador de variante |
| `talla`, `color`, `genero` | **Columnas propias** (persisten) |
| `attributes` | JSON de respaldo |
| `stock_current` | Stock actual |

### `inventory_movements`
| Campo | Uso |
|-------|-----|
| `movement_type` | `IN` / `OUT` / `ADJ` |
| `quantity` | Cantidad |
| `entry_reason` | Motivo estructurado: Compra, Devolución, Donación, Ajuste, Otro (**obligatorio en IN**) |
| `observations` | Notas opcionales |
| `reason` | Resumen legado (motivo + observaciones) |
| `performed_by` | Usuario que registró |

## Migraciones
- `013_inventory_categories_seed.sql` — categorías Uniforme / Accesorio  
- `014_inventory_persist_fields.sql` — columnas `entry_reason`, `observations`, `talla`, `color`, `genero`

Aplicar en otro entorno:

```powershell
npm run db:apply-inventory -w @coraza/api
npm run seed:inventory-categories -w @coraza/api
```
