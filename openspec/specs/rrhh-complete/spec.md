## ADDED Requirements

### Requirement: Flujo completo RRHH en frontend
El módulo RRHH Angular SHALL implementar: listado de asociados con filtros, formulario de creación, formulario de edición, vista de historial de cambios y acción de retiro.

#### Scenario: Crear asociado desde formulario
- **WHEN** usuario RRHH completa el formulario de creación y confirma
- **THEN** se ejecuta POST `/associates`, el nuevo asociado aparece en el listado y se muestra mensaje de éxito

#### Scenario: Ver historial de asociado
- **WHEN** usuario RRHH hace click en "Ver Historia" de un asociado
- **THEN** se muestra la lista de cambios registrados en `associate_history` con fecha, campo modificado y valores anterior/nuevo

#### Scenario: Retirar asociado con confirmación
- **WHEN** usuario RRHH hace click en "Retirar" y confirma el diálogo
- **THEN** se ejecuta PATCH `/associates/:id/retire` y el asociado aparece con estado `RETIRADO`

### Requirement: Panel de administración en frontend
El módulo admin Angular SHALL permitir a GERENCIA gestionar usuarios (crear, activar/desactivar), ver roles y asignar permisos a roles.

#### Scenario: Crear usuario desde admin
- **WHEN** GERENCIA completa el formulario de nuevo usuario con email, nombre y rol
- **THEN** se ejecuta POST `/users` y el usuario aparece en el listado

#### Scenario: Ver y editar permisos de rol
- **WHEN** GERENCIA navega a la vista de un rol específico
- **THEN** se muestra la lista de todos los permisos del sistema con checkboxes indicando cuáles están asignados al rol, y puede guardar cambios

### Requirement: Dashboard con widgets contextuales por rol
El dashboard SHALL mostrar widgets diferentes según el rol del usuario autenticado. Cada widget resume información relevante del módulo correspondiente.

#### Scenario: Dashboard GERENCIA
- **WHEN** usuario GERENCIA accede al dashboard
- **THEN** ve widgets de: asociados activos, dotaciones pendientes, documentos próximos a vencer, novedades abiertas y reservas pendientes

#### Scenario: Dashboard SUPERVISOR
- **WHEN** usuario SUPERVISOR accede al dashboard
- **THEN** ve widgets de: turnos del día, entregas pendientes y novedades abiertas

#### Scenario: Dashboard ADMINISTRADOR_UNIDAD
- **WHEN** usuario ADMINISTRADOR_UNIDAD accede al dashboard
- **THEN** ve widgets de: visitantes activos, paquetes pendientes, reservas pendientes y novedades abiertas

### Requirement: Interceptor global de errores HTTP
El frontend SHALL manejar globalmente los errores HTTP con mensajes amigables. Los códigos 401 redirigen al login. Los 403 muestran "Sin permisos". Los 5xx muestran "Error del servidor, intente nuevamente".

#### Scenario: Error 401 redirige a login
- **WHEN** cualquier request HTTP retorna 401
- **THEN** el interceptor limpia la sesión y navega a `/auth/login`

#### Scenario: Error 403 muestra mensaje
- **WHEN** un request HTTP retorna 403
- **THEN** se muestra un snackbar con "No tienes permisos para esta acción"
