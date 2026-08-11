# Módulo Operaciones

**Fecha:** 2026-08-11

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

## UI

- Layout: `apps/web/src/app/features/operaciones/`
- Menú lateral: grupo Operación → **Operaciones**
