# Módulo Operaciones

**Fecha:** 2026-09-11 (antes 2026-08-19)

## Alcance

Operaciones gestiona el **catálogo de puestos** (`posts`) y la **supervisión de minutas** del campo. Lo consumen:

- **Programación** (matriz / cuadro mensual)
- **Dotación** (entrega de elementos a puestos)
- **Minuta Virtual** (cuenta `PUESTO` en app separada; ops solo consulta/PDF)
- Otros módulos vía `GET /posts`

## Rutas (Portal web)

| Ruta | Permiso | Descripción |
|------|---------|-------------|
| `/operaciones` | `posts.view` | Panel resumen |
| `/operaciones/puestos` | `posts.view` | CRUD de puestos |
| `/operaciones/puestos/fichas` | `posts.view` | Fichas de puestos (mismo componente que recepción) |
| `/operaciones/minutas` | `posts.view` | Historial / PDF por puesto + mes; buscador; enlace Minuta Web; cuentas PUESTO |

Crear / editar puestos: `posts.create` / `posts.edit`.

**Nota:** Minuta Virtual **no** aparece en el menú principal del Portal. Los vigilantes usan https://portalcoraza-minuta.onrender.com (`apps/minuta-web`). Detalle: [`MINUTA-VIRTUAL.md`](MINUTA-VIRTUAL.md).

## API

Reutiliza `PostsModule`:

- `GET /posts`
- `POST /posts` (`posts.create`)
- `PATCH /posts/:id` (`posts.edit`)

Minutas ops (módulo `minuta`):

- Historial / PDF mensual por puesto (ver `minuta.controller` / `operacionesHistorial` / `operacionesPdf`)

## Relación con RRHH

Los **centros de trabajo** en RRHH (`/rrhh/admin/centros`) siguen sincronizando a `posts` vía `syncFromWorkCenter`.  
El catálogo operativo principal para Programación vive en **Operaciones → Puestos**.

**Cargado (2026-08-19):** 226 puestos operativos en `posts` (códigos `MED-####`, UUID de la app de programación). No se modificaron usuarios/roles. No hay cruce de código con los 33 centros de trabajo RRHH; el vínculo `work_center_id` quedó vacío.

El formulario de puesto incluye, además de código/nombre/tipo/estado/cliente/dirección/notas: **zona, contacto, teléfono, prioridad, n.º contrato, tipo de servicio, armamento, requisitos e instrucciones**.

**Programación:** cargada desde la app antigua en **borrador** — abr–nov 2026 (agosto verificado 1:1). Mes inválido `2027-0` omitido. Algunos vigilantes no cruzan por cédula con asociados RRHH.

## UI

- Layout: `apps/web/src/app/features/operaciones/`
- Menú lateral: grupo Operación → **Operaciones**
- Minutas list: `features/operaciones/minutas-list/minutas-list.ts` (combobox con búsqueda; URL Minuta desde `environment.minutaWebUrl`)
