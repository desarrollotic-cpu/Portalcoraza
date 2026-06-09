## ADDED Requirements

### Requirement: Tipos de documento configurables
El sistema SHALL permitir crear y gestionar tipos de documento (ej. "Contrato", "Memorando", "Acta"). Cada tipo tiene `code` único y `name`.

#### Scenario: Crear tipo de documento
- **WHEN** usuario con permiso `documental.manage` ejecuta POST `/documental/types` con `code` y `name`
- **THEN** se crea el tipo de documento

### Requirement: Registro de documento físico (solo metadata)
El sistema SHALL permitir registrar un documento físico mediante su metadata. El sistema NO debe almacenar el archivo físico en fase 1. La metadata incluye: `code` único, `documentTypeId`, `title`, `physicalLocation` (texto libre), `observations`, `registeredAt`.

#### Scenario: Registrar documento
- **WHEN** usuario con permiso `documental.create` ejecuta POST `/documental/records` con metadata válida
- **THEN** se crea el registro con su `id` y `code` único; no se solicita ni almacena archivo en Storage

### Requirement: Modelo preparado para almacenamiento futuro
El sistema SHALL mantener columnas opcionales de evolución (`file_url`, `storage_provider`) sin uso operativo en la primera fase.

#### Scenario: Persistencia metadata-only en fase 1
- **WHEN** se crea o edita un registro documental en fase 1
- **THEN** los campos `file_url` y `storage_provider` permanecen opcionales y sin obligatoriedad funcional

#### Scenario: Código de documento duplicado
- **WHEN** se intenta crear un documento con un `code` ya existente
- **THEN** el sistema retorna 409 "Código de documento ya registrado"

### Requirement: Búsqueda de documentos por código y tipo
El sistema SHALL permitir buscar documentos por `code` (búsqueda parcial) y/o `documentTypeId`.

#### Scenario: Búsqueda por código parcial
- **WHEN** se ejecuta GET `/documental/records?code=GER-2025`
- **THEN** se retornan todos los documentos cuyo código contenga "GER-2025"

### Requirement: Historial de cambios de documento
Toda modificación a un registro documental SHALL generar un registro en `audit_logs` con los valores anteriores y nuevos.

#### Scenario: Audit al editar observaciones
- **WHEN** se edita el campo `observations` de un documento
- **THEN** `audit_logs` registra `module: documental`, `action: update` con `oldValue` y `newValue`
