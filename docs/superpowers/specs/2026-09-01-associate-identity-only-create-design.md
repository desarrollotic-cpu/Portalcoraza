# Asociado: alta solo con identidad + ficha completa/incompleta

**Aprobado por JHON — 2026-09-01**

## Crear / editar
- Obligatorios: tipo y número de documento, primer nombre, primer apellido, fecha de nacimiento.
- Opcionales: segundo nombre/apellido, contacto, laboral, sociodemográfico.
- Celular y fecha de ingreso dejan de ser obligatorios (nullable en BD).

## Ficha completa
Completa si tiene celular + fecha de ingreso + cargo (`jobPositionId`).
Sociodemográfico no cuenta.
Incompleta en caso contrario.

## UI listado
Columna **Ficha**: badge Completa (verde) / Incompleta (ámbar).
