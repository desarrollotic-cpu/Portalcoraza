# Verificación migrate-dotacion-ux

## 10.3 Permisos (estático ✓)

| Permiso | Seed | API | Rutas web | UI |
|---------|------|-----|-----------|-----|
| `deliveries.view` | `001_roles_permissions.sql`, `003_business_permissions.sql` | `GET /deliveries` | `/dotacion/entregas` | `delivery-history`, `associate-detail` |
| `deliveries.create` | idem | `POST /deliveries`, `POST /deliveries/:id/revert` | `/dotacion/entregas/nueva` | botones RRHH, programación, listado |
| `deliveries.sign` | idem | `POST /deliveries/:id/sign` | `/dotacion/entregas/:id/firmar` | flujo modal + `delivery-sign` |

Roles con dotación completa: **ALMACENISTA**, **SUPERVISOR** (según seeds).

## 10.1 Flujo asociado (manual en entorno)

1. Ejecutar migración `008_delivery_ux.sql` en Supabase.
2. Login con usuario ALMACENISTA o SUPERVISOR.
3. RRHH → Asociados → **Entregar dotación**.
4. Agregar ítems con talla/género, firmar, confirmar.
5. Detalle asociado → historial → **Revertir** (motivo ≥10 chars, &lt;5 días).

## 10.2 Flujo puesto (manual en entorno)

1. Programación → seleccionar puesto → **Entregar dotación al puesto**.
2. Completar modal y firmar.
3. Historial del puesto → revertir si aplica.

## Prerrequisitos datos

- Variantes con `attributes` JSONB: `{ "talla": "40", "genero": "M" }`.
- Categorías de ítem alineadas con `tallas.config.ts` (`botas`, `camisa`, etc.).
- Bucket `delivery-signatures` en Supabase (tarea 2.7 de `system-coraza-v2`).
