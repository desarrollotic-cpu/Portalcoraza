# Módulo Operaciones

**Fecha:** 2026-08-19

## Alcance inicial

Operaciones gestiona el **catálogo de puestos de trabajo** (`posts`) que consumen:

- **Programación** (matriz / cuadro mensual)
- **Dotación** (entrega de elementos a puestos)
- Otros módulos que listan `GET /posts`

## Rutas

| Ruta | Permiso | Descripción |
|------|---------|-------------|
| `/operaciones` | `posts.view` | Panel resumen |
| `/operaciones/puestos` | `posts.view` | CRUD de puestos |

Crear / editar requieren `posts.create` / `posts.edit`.

## API

Reutiliza `PostsModule` existente:

- `GET /posts`
- `POST /posts` (`posts.create`)
- `PATCH /posts/:id` (`posts.edit`)

## Relación con RRHH

Los **centros de trabajo** en RRHH (`/rrhh/admin/centros`) siguen sincronizando a `posts` vía `syncFromWorkCenter`.  
El catálogo operativo principal para Programación vive en **Operaciones → Puestos**.

**Cargado (2026-08-19):** 226 puestos operativos en `posts` (códigos `MED-####`, UUID de la app de programación). No se modificaron usuarios/roles. No hay cruce de código con los 33 centros de trabajo RRHH; el vínculo `work_center_id` quedó vacío.

El formulario de puesto incluye, además de código/nombre/tipo/estado/cliente/dirección/notas: **zona, contacto, teléfono, prioridad, n.º contrato, tipo de servicio, armamento, requisitos e instrucciones**.

**Programación:** cargada desde la app antigua en **borrador** — abr–nov 2026 (agosto verificado 1:1). Mes inválido `2027-0` omitido. Algunos vigilantes no cruzan por cédula con asociados RRHH.

## UI

- Layout: `apps/web/src/app/features/operaciones/`
- Menú lateral: grupo Operación → **Operaciones**
