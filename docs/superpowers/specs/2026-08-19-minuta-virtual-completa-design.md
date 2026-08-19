# Diseño — Minuta Virtual completa (puesto + operaciones)

**Fecha:** 2026-08-19  
**Estado:** Aprobado (JHON) · En implementación

## Roles

| Actor | Acceso |
|-------|--------|
| Cuenta **PUESTO** (compartida) | Ver/crear solo su minuta; historial propio; **sin** PDF |
| **Operaciones** (`posts.view`) | Ver todas; validar; PDF mes+puesto |

## Reglas

- **Vigilante que registra** (`registradoPor`) obligatorio en cada alta (texto libre)
- Fecha/hora solo servidor (America/Bogota); no editable el contenido del reporte
- Acciones de estado permitidas: salida, entregar correspondencia
- Operaciones no crea novedades

## UI

- `/minutas` layout: Inicio · Nuevo · Historial (`minuta.view` / `minuta.create`)
- `/operaciones/minutas`: consulta + PDF (ya existe)

## Datos / API

- Columna `registrado_por` en tablas `minuta_*`
- DTOs: `registradoPor` required
- Ops listado/PDF muestran registradoPor
