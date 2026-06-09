## ADDED Requirements

### Requirement: Asignación de usuario a puesto
El sistema SHALL permitir asignar uno o más puestos a un usuario mediante la tabla `user_posts`. Un ADMINISTRADOR_UNIDAD MUST tener al menos un puesto asignado para acceder al módulo residencial.

#### Scenario: Asignar usuario a puesto
- **WHEN** GERENCIA ejecuta POST `/users/:id/posts` con un `post_id` válido
- **THEN** se crea el vínculo en `user_posts` y el usuario puede acceder a los datos de ese puesto

#### Scenario: Consulta de puestos asignados
- **WHEN** se consulta GET `/users/:id/posts`
- **THEN** se retorna la lista de puestos asignados a ese usuario

#### Scenario: Acceso bloqueado sin asignación
- **WHEN** un ADMINISTRADOR_UNIDAD sin puestos asignados accede al módulo residencial
- **THEN** el sistema retorna 403 con mensaje "Sin puesto asignado"

### Requirement: Aislamiento de datos residencial por puesto
Todas las queries del módulo residencial SHALL filtrar automáticamente por todos los `post_id` asignados al usuario autenticado. Ningún endpoint residencial MUST exponer datos de puestos no asignados al usuario.

#### Scenario: Query aislada por puesto
- **WHEN** un ADMINISTRADOR_UNIDAD consulta residentes
- **THEN** solo se retornan residentes de las unidades pertenecientes al conjunto de puestos asignados

#### Scenario: Usuario con múltiples puestos asignados
- **WHEN** un ADMINISTRADOR_UNIDAD tiene asignados dos o más `post_id` y consulta `/residential/*`
- **THEN** recibe datos agregados de todas sus unidades autorizadas en una sola consulta

#### Scenario: GERENCIA ve todos los datos
- **WHEN** un usuario con rol GERENCIA consulta cualquier endpoint residencial
- **THEN** se retornan datos de todos los puestos (sin filtro de aislamiento)
