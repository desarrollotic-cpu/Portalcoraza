# Recepción: lectura de asociados/puestos + dashboard

## Objetivo

El rol RECEPCIONISTA puede consultar toda la información de asociados (cartas laborales) y de puestos de Operaciones, y ver un dashboard de altas/bajas de puestos de los dos meses calendario anteriores.

## Alcance (v1)

- Permisos solo lectura: `associates.view`, `posts.view` (sin create/edit/retire).
- Dashboard en Recepción (`/recepcion/puestos`).
- Nuevo = `created_at` en el mes. Cerrado = `status = INACTIVO` y `updated_at` en el mes.
- Sin generador de cartas ni fechas formales de servicio.

## Fuera de alcance

- Cartas laborales en portal.
- `service_started_at` / `service_ended_at`.
- Edición de asociados o puestos.
