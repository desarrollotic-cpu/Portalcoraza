# Recepción — etiqueta Asociado / Visitante

**Date:** 2026-08-19  
**Status:** approved  
**Scope:** Detectar por documento si el visitante es asociado ACTIVO o VACACIONES y mostrar/guardar la etiqueta.

## Goals

- Al registrar, cruzar `document_number` con RRHH (`associates`).
- Persistir el resultado en la visita.
- Mostrar en formulario (vista previa), **Dentro** e **Historial**: **Asociado** o **Visitante**.

## Non-goals

- Autocompletar nombre/cargo desde RRHH.
- Vincular `associate_id` (fase posterior).
- Recalcular historial antiguo al vuelo.
- Datos sensibles de HR.

## Rules

1. Match solo estados `ACTIVO` y `VACACIONES`.
2. Comparación por documento normalizado (solo dígitos).
3. Sin documento o sin match → `is_associate = false` → “Visitante”.
4. Con match → `is_associate = true` → “Asociado”.
5. El valor lo decide el sistema al registrar; no es editable a mano.

## Data

- Columna `reception_visitors.is_associate BOOLEAN NOT NULL DEFAULT FALSE`.
- Migración `037_reception_visitor_associate.sql`.
- Visitas existentes quedan `false` (Visitante) hasta que no se re-registren.

## API / UI

- `POST /reception/visitors`: calcula y guarda `isAssociate`.
- Opcional: `GET /reception/visitors/lookup-associate?document=` para vista previa al digitar (mismo criterio; permiso `reception.view` o `reception.register`).
- UI: badge en registro, dentro e historial.

## Approach

Bandera guardada al registrar (no lookup en cada listado).
