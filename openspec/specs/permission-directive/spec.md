## ADDED Requirements

### Requirement: Directiva de visibilidad por permiso
El sistema SHALL proveer una directiva Angular estructural `*hasPermission="'permiso.code'"` que muestra u oculta elementos del DOM según los permisos del usuario autenticado. La directiva lee del `AuthService.currentUser` signal sin realizar llamadas HTTP.

#### Scenario: Elemento visible con permiso
- **WHEN** el usuario tiene `inventory.create` en su array de permisos
- **THEN** un elemento con `*hasPermission="'inventory.create'"` es visible en el DOM

#### Scenario: Elemento oculto sin permiso
- **WHEN** el usuario NO tiene `inventory.delete` en su array de permisos
- **THEN** un elemento con `*hasPermission="'inventory.delete'"` es removido del DOM (no solo hidden)

#### Scenario: Elemento oculto sin sesión
- **WHEN** no hay usuario autenticado
- **THEN** todos los elementos con `*hasPermission` son removidos del DOM

### Requirement: Helper hasPermission en AuthService
El `AuthService` Angular SHALL exponer un método `hasPermission(code: string): boolean` para consultas programáticas de permisos fuera de templates.

#### Scenario: Consulta programática de permiso
- **WHEN** un guard de ruta o servicio llama `authService.hasPermission('schedule.create')`
- **THEN** retorna `true` si el usuario actual tiene ese permiso, `false` en caso contrario

### Requirement: Guard de rutas por permiso
El sistema SHALL proveer un `permissionGuard` Angular que protege rutas por permiso específico. Rutas sin el permiso requerido redirigen a `/dashboard` con un mensaje de "Acceso no autorizado".

#### Scenario: Acceso a ruta protegida con permiso
- **WHEN** usuario con permiso `residential.view` navega a `/residential`
- **THEN** la ruta carga normalmente

#### Scenario: Redirección por falta de permiso
- **WHEN** usuario sin permiso `residential.view` intenta navegar a `/residential`
- **THEN** es redirigido a `/dashboard`
