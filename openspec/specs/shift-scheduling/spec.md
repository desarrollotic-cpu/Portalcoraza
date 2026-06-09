## ADDED Requirements

### Requirement: Programación de turno a asociado
El sistema SHALL permitir asignar un turno a un asociado en un puesto específico para una fecha. Los tipos operativos de turno son: `DAY`, `NIGHT`, `REST`. Cada asignación de turno MUST incluir jornada (`8H` o `12H`).

#### Scenario: Crear asignación de turno
- **WHEN** PROGRAMADOR ejecuta POST `/scheduling/shifts` con `associateId`, `postId`, `shiftType`, `workdayHours` y `shiftDate`
- **THEN** se crea el turno si no hay solapamiento para el asociado en esa fecha

#### Scenario: Rechazo por solapamiento
- **WHEN** se intenta asignar un turno a un asociado que ya tiene un turno en la misma fecha
- **THEN** el sistema retorna 409 "El asociado ya tiene un turno asignado para esa fecha"

#### Scenario: Un puesto puede tener múltiples asociados simultáneos
- **WHEN** se asigna un turno DAY en el puesto X para el asociado A y luego para el asociado B en la misma fecha
- **THEN** ambas asignaciones se crean sin conflicto

### Requirement: Constraint de no solapamiento a nivel de base de datos
El sistema SHALL garantizar la integridad del constraint de no solapamiento mediante una restricción de exclusión PostgreSQL (`EXCLUDE USING gist`) sobre `(associate_id, daterange(shift_date))`. La validación a nivel de aplicación es complementaria, no sustituta.

#### Scenario: Constraint DB previene race condition
- **WHEN** dos requests concurrentes intentan asignar el mismo asociado a la misma fecha
- **THEN** solo uno tiene éxito; el otro recibe un error que el servicio traduce a 409

### Requirement: Consulta de programación por puesto y rango de fechas
El sistema SHALL permitir consultar los turnos de un puesto en un rango de fechas para generar la vista de calendario.

#### Scenario: Vista de calendario semanal
- **WHEN** se ejecuta GET `/scheduling/shifts?postId=<id>&from=<date>&to=<date>`
- **THEN** se retornan todos los turnos del puesto en el rango con nombre del asociado y tipo de turno

### Requirement: Matriz mensual tipo Excel como vista principal
El sistema SHALL usar una matriz mensual tipo Excel como interfaz principal para programación de vigilancia. La vista calendario es complementaria.

#### Scenario: Programación en matriz mensual
- **WHEN** PROGRAMADOR abre el módulo de programación
- **THEN** la pantalla inicial muestra matriz mensual por asociados/días con edición de celdas para `DAY`, `NIGHT` y `REST`

#### Scenario: Vista calendario complementaria
- **WHEN** el usuario cambia a la vista calendario
- **THEN** puede consultar la programación en formato calendario sin reemplazar la matriz como vista principal

### Requirement: Drag-and-drop fuera de alcance inicial
El sistema SHALL excluir funcionalidades de drag-and-drop para la primera fase.

#### Scenario: Interacción de edición sin drag-and-drop
- **WHEN** PROGRAMADOR ajusta turnos en la matriz mensual
- **THEN** usa acciones de edición explícitas (selección/cambio de celda) y no interacciones de arrastre

### Requirement: Edición y eliminación de turnos
Los turnos MUST poder editarse o eliminarse solo si la `shiftDate` es futura. No se permite modificar turnos pasados.

#### Scenario: Eliminación de turno futuro
- **WHEN** PROGRAMADOR elimina un turno con `shiftDate` posterior a hoy
- **THEN** el turno se elimina y se audita la acción

#### Scenario: Rechazo de modificación de turno pasado
- **WHEN** se intenta editar o eliminar un turno con `shiftDate` anterior o igual a hoy
- **THEN** el sistema retorna 422 "No se pueden modificar turnos pasados"
