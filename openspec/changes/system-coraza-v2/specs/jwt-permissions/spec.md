## ADDED Requirements

### Requirement: Permisos embebidos en access token
El sistema SHALL incluir el array `permissions: string[]` en el payload del JWT access token al momento del login. Los permisos corresponden a los `permission.code` del rol del usuario en ese instante.

#### Scenario: Login incluye permisos en token
- **WHEN** un usuario realiza login con credenciales válidas
- **THEN** el access token decodificado contiene `permissions: string[]` con todos los códigos de permiso del rol del usuario

#### Scenario: Guard sin DB query
- **WHEN** un request autenticado llega a un endpoint protegido con `@Permissions('x.y')`
- **THEN** el guard lee `permissions[]` del payload JWT sin ejecutar ninguna query a la base de datos

#### Scenario: Permisos stale hasta expiración
- **WHEN** GERENCIA revoca un permiso del rol de un usuario activo
- **THEN** el usuario sigue con el permiso en su token actual hasta que expire; al reloginear el token refleja el cambio

### Requirement: Response de login incluye permisos en el frontend
El sistema SHALL incluir `permissions: string[]` en el objeto `user` del response de login para que el frontend no necesite decodificar el JWT.

#### Scenario: AuthUser con permisos
- **WHEN** el frontend recibe el response de login exitoso
- **THEN** `response.user.permissions` contiene el array de códigos de permiso del usuario

### Requirement: Vigencia de tokens y renovación de sesión
El sistema SHALL operar con `access token` de 2 horas y `refresh token` de 7 días.

#### Scenario: Access token con vigencia de 2 horas
- **WHEN** se emite un access token durante login o refresh
- **THEN** su tiempo de expiración se configura en 2 horas

#### Scenario: Renovación de sesión con refresh token
- **WHEN** el access token expira y el refresh token sigue vigente
- **THEN** el sistema emite un nuevo access token sin requerir nuevo login de credenciales
