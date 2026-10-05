# Inspección preoperacional — Patineta eléctrica (PESV)

**Fecha:** 2026-10-05  
**Estado:** aprobado en conversación (Jhon) — pendiente revisión de este archivo  
**Contexto:** Plan Estratégico de Seguridad Vial (PESV); evidencia de inspección del equipo de movilidad en puestos con patineta eléctrica (piloto: Clínica San Juan de Dios, La Ceja).

## Objetivo

Formulario digital de inspección preoperacional de patineta eléctrica:

1. **Minuta Virtual:** el vigilante diligencia el formulario (respuestas cerradas).
2. **Operaciones:** el director / encargado consulta listado y detalle de lo diligenciado (solo lectura).

## Decisiones de producto

| Tema | Decisión |
|------|----------|
| Alcance de puestos | Solo puestos con flag `tiene_patineta_electrica` (Operaciones lo habilita). |
| Quién diligencia | Usuario logueado en Minuta (nombre automático; no lista desplegable). |
| Frecuencia | Libre: puede diligenciar las veces que quiera. |
| Si “No recibe” patineta | Puede continuar con la inspección. |
| Novedad / no apta | Solo guardar; Operaciones ve después. Sin notificación en MVP. |
| Operaciones | Solo lectura: listado + detalle. Sin “validado”, sin Excel/PDF en MVP. |
| Fotos | No. |
| Texto libre | No. |
| Nombre menú Operaciones | Inspección patineta eléctrica |
| Enfoque técnico | Módulo propio (tabla + API), no reusar entradas genéricas de Minuta. |

## Preguntas del formulario (fijas)

Todas cerradas. Fecha y hora automáticas (zona Bogotá). Nombre del vigilante = sesión.

### Información general

- Fecha de inspección — automática  
- Hora de inspección — automática  
- Nombre del vigilante — automático (sesión)  
- ¿Está recibiendo formalmente la patineta para iniciar su turno? — Sí / No  

### Estado estructural

- ¿La estructura de la patineta se encuentra en buen estado, sin daños visibles ni piezas sueltas? — Sí / No  
- ¿La plataforma de apoyo para los pies se encuentra en buenas condiciones? — Sí / No  

### Dirección y maniobrabilidad

- ¿El manubrio se encuentra firme y sin holguras? — Sí / No  
- ¿La dirección responde adecuadamente durante la verificación funcional? — Sí / No  

### Sistema de frenos

- ¿El sistema de frenos funciona correctamente? — Sí / No  

### Ruedas

- ¿Las ruedas se encuentran en buen estado y sin desgaste excesivo? — Sí / No  
- ¿Las ruedas están correctamente aseguradas? — Sí / No  

### Sistema eléctrico

- ¿La batería cuenta con carga suficiente para iniciar el servicio? — Sí / No  
- ¿No se observan cables sueltos, pelados o conexiones deterioradas? — Sí / No  
- ¿El indicador de carga y encendido funciona correctamente? — Sí / No  

### Visibilidad

- ¿Las luces de la patineta funcionan correctamente? — Sí / No / No aplica  
- ¿Los elementos reflectivos de la patineta se encuentran visibles y en buen estado? — Sí / No / No aplica  

### Elementos de protección y visibilidad del operador

- ¿Dispone y porta correctamente el chaleco reflectivo o prenda de alta visibilidad definida por la empresa? — Sí / No  
- ¿El chaleco reflectivo se encuentra limpio y en adecuado estado de conservación? — Sí / No  
- ¿Dispone de los demás elementos de protección definidos por la empresa para la operación? — Sí / No  

### Verificación operativa

- ¿La patineta responde adecuadamente durante una prueba corta de desplazamiento? — Sí / No  
- ¿Durante la prueba funcional no se evidencian ruidos, vibraciones o fallas anormales? — Sí / No  

### Concepto de aptitud operacional

- ¿La patineta es apta para iniciar operación? — Sí / No  

### Registro de novedad (solo si alguna respuesta anterior es “No”; “No aplica” no cuenta)

- Seleccione la novedad identificada — enum fijo:  
  Daño estructural · Falla de dirección · Falla de frenos · Rueda deteriorada · Batería insuficiente · Falla eléctrica · Luces defectuosas · Elementos reflectivos defectuosos · Falta de chaleco reflectivo · Chaleco en mal estado · Falta de elementos de protección · Otra novedad  
- ¿La novedad fue reportada al supervisor? — Sí / No  
- ¿La patineta fue retirada de operación? — Sí / No  

## UX

### Minuta Virtual

- Tile / entrada visible solo si el puesto del usuario tiene `tiene_patineta_electrica = true`.
- Formulario por secciones, botones grandes, lenguaje cotidiano (mismo tono Minuta).
- Validación: todas las preguntas visibles son obligatorias; bloque novedad obligatorio solo cuando aplica.
- Tras guardar: confirmación y posibilidad de volver a inicio / historial del módulo.

### Operaciones (portal)

- Submódulo **Inspección patineta eléctrica** bajo Operaciones.
- Listado con filtros: puesto, rango de fechas, vigilante (texto), apta Sí/No, con novedad Sí/No.
- Detalle: todas las respuestas en el mismo orden del formulario.
- En ficha/edición de puesto: checkbox “Tiene patineta eléctrica” (quien ya edita puestos en Operaciones / Recepción según permisos actuales de `posts.edit`).

## Modelo de datos

### `posts`

- `tiene_patineta_electrica boolean not null default false`

### `scooter_inspections` (nombre tentativo)

- `id` uuid PK  
- `tenant_id` uuid  
- `post_id` uuid → posts  
- `inspected_at` timestamptz (fecha+hora Bogotá al guardar)  
- `inspector_user_id` uuid → users  
- `inspector_name` text (snapshot del nombre al momento)  
- `receiving_scooter` boolean  
- Respuestas: columnas boolean / enum cortas por pregunta (o JSONB `answers` con keys estables)  
- `apt_for_operation` boolean  
- `has_novelty` boolean generado o derivado  
- `novelty_type` varchar nullable  
- `novelty_reported_to_supervisor` boolean nullable  
- `novelty_withdrawn_from_service` boolean nullable  
- `created_at` timestamptz  

**Preferencia de implementación:** columnas tipadas por pregunta (reportes SQL simples) **o** un JSONB `answers` + columnas índice (`apt_for_operation`, `has_novelty`, `inspected_at`). Elegir en plan: JSONB + índices es más corto y suficiente para MVP.

RLS por `tenant_id` (mismo patrón rondas / scheduling).

## API (Nest)

Base sugerida: `/api/v1/scooter-inspections` (o `/ops/scooter-inspections`).

| Método | Ruta | Quién | Uso |
|--------|------|-------|-----|
| POST | `/` | Minuta / rol PUESTO con permiso crear | Crear inspección del `post_id` de sesión |
| GET | `/` | Operaciones `view` | Listar con filtros |
| GET | `/:id` | Operaciones `view` | Detalle |
| GET | `/meta/form` | Minuta | Schema de preguntas (opcional; puede ir hardcodeado en front si YAGNI) |

Permisos:

- Crear: reutilizar permiso Minuta / `minuta.create` o `posts.view` + rol PUESTO (seguir patrón de minuta entries).
- Listar/detalle: `posts.view` o permiso Operaciones existente (mismo que minutas/rondas en portal).

No endpoints de update/delete en MVP (trazabilidad: solo alta).

## Apps

| App | Cambio |
|-----|--------|
| `apps/minuta-web` | Ruta + formulario + API client |
| `apps/web` Operaciones | Nav + listado + detalle; checkbox en puesto |
| `apps/api` | Módulo Nest + migración SQL |
| `supabase/migrations` | `079_scooter_inspections.sql` (o siguiente número libre) |

## Fuera de alcance (MVP)

- Notificaciones / correo al supervisor  
- Firma digital  
- Fotos / adjuntos  
- Export Excel/PDF  
- Botón “revisado / validado”  
- Estadísticas avanzadas PESV  
- Forzar una inspección por turno  

## Criterios de aceptación

1. Puesto sin flag: Minuta no muestra el tile.  
2. Puesto con flag: vigilante logueado completa y guarda; fecha/hora/nombre automáticos.  
3. Con algún “No” (no “No aplica”): exige novedad + 2 Sí/No de novedad.  
4. Operaciones ve el registro y todas las respuestas.  
5. Multi-tenant: solo datos del tenant.  
6. Clínica San Juan de Dios se habilita marcando el flag en el puesto (dato, no hardcode de código en UI salvo seed opcional).

## Self-review

- [x] Sin placeholders “TBD” en reglas de negocio  
- [x] Sin contradicción con decisiones (libre frecuencia; sin validar en Ops)  
- [x] Scope MVP acotado  
- [x] Preguntas del director cubiertas 1:1  
