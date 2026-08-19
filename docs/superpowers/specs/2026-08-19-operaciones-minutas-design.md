# Diseño — Operaciones: consulta de Minutas Virtuales

**Fecha:** 2026-08-19  
**Estado:** Aprobado (JHON) · En implementación

## Decisiones

| Tema | Decisión |
|------|----------|
| Ubicación | `/operaciones/minutas` dentro del módulo Operaciones |
| Rol | Usuario Operaciones con `posts.view` |
| Modo | Solo lectura + descarga PDF |
| Filtros | **Puesto** y **Mes** (`YYYY-MM`), ambos obligatorios |
| Fuente | Tablas `minuta_*` (misma Minuta Virtual de cuentas de puesto) |
| PDF | `pdfkit` (mismo patrón que recepción) |

## API

- `GET /api/v1/minuta/operaciones/historial?postId=&month=YYYY-MM` → JSON lista unificada
- `GET /api/v1/minuta/operaciones/pdf?postId=&month=YYYY-MM` → `application/pdf`
- Permiso: `posts.view`
- Sin create/update/salida en este submódulo

## UI

- Nav Operaciones: Panel | Puestos | Minutas
- Select puestos activos + input mes + Consultar + Descargar PDF
- Lista: tipo, fecha, estado, resumen corto

## Fuera de alcance

- Alta/edición desde Operaciones
- PDF multi-puesto
- Cambios al menú global `/minutas`
