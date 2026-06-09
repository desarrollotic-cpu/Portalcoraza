## Why

PortalCoraza ya tiene el núcleo técnico funcionando, pero faltan decisiones de negocio cerradas para ejecutar la fase 1 sin ambigüedades. Este change sincroniza system-coraza-v2 con la línea base final acordada: turnos tipo Excel como interfaz principal, residencial ampliado, parqueaderos visitantes con cupos, administración multi-unidad real, firma manuscrita para dotación y consolidación arquitectónica sin cambios estructurales.

## What Changes

- Se cierra la configuración de autenticación para fase 1: access token de 2 horas y refresh token de 7 días.
- Se consolida el modelo N:N en `user_posts`: ADMINISTRADOR_UNIDAD puede gestionar múltiples unidades y el filtrado residencial usa todos los `post_id` asignados.
- Se formaliza la firma manuscrita con Signature Pad y almacenamiento en Supabase Storage para entregas de dotación; entrega firmada queda inmutable.
- Se redefine programación para operación real: matriz mensual tipo Excel como vista principal; calendario complementario; drag-and-drop fuera de alcance inicial.
- Se amplía formalmente el módulo residencial: residentes, propietarios, arrendatarios, vehículos, visitantes, parqueaderos visitantes con cupos, correspondencia, paquetería, reservas, libro virtual y novedades.
- Se define el módulo documental v1 como metadata-only, preparado para evolución con campos opcionales (`file_url`, `storage_provider`) sin uso operativo en esta fase.
- Se amplía el catálogo de notificaciones para incluir eventos de RRHH, dotación, programación, residencial y documental.
- Se actualizan widgets contextuales por rol para GERENCIA, SUPERVISOR y ADMINISTRADOR_UNIDAD.
- Se mantiene la arquitectura actual del repositorio sin reorganizaciones estructurales de módulos.

## Capabilities

### New Capabilities

- `jwt-permissions`: permisos embebidos en JWT + expiración operativa definida (2h/7d con refresh).
- `user-post-assignment`: asignación N:N usuario-puesto con aislamiento multi-post para residencial.
- `inventory-management`: categorías, ítems, variantes, stock y movimientos.
- `delivery-management`: entregas con firma manuscrita, evidencia en Storage e inmutabilidad posterior.
- `shift-scheduling`: programación mensual tipo Excel con turnos diurno/nocturno/descanso y jornadas 8h/12h.
- `document-registry`: gestión documental por metadata, sin archivo físico en v1, preparada para evolución.
- `residential-management`: dominio residencial ampliado con reservas configurables, parqueaderos visitantes y novedades.
- `realtime-notifications`: notificaciones en tiempo real por usuario para módulos críticos del negocio.
- `permission-directive`: directiva Angular para visibilidad condicional por permiso.
- `rrhh-complete`: flujo RRHH completo en frontend.
- `dashboard-widgets`: widgets contextuales por rol operativo de negocio.

### Modified Capabilities

- `auth-core`: response/login y control de sesión alineados con expiraciones y permisos cerrados para fase 1.

## Impact

**Backend NestJS**
- Ajuste de auth/guard para permisos embebidos en JWT con vigencia definida.
- Endpoints de asignación de puestos y filtrado residencial por conjunto de `post_id`.
- Módulos de negocio alineados a alcance final sin rediseño estructural de carpetas existente.

**Base de Datos**
- Migraciones aditivas para dominios de negocio + tablas de soporte de asignación.
- Ajustes de esquema residencial para cupos de parqueadero visitante, reservas configurables y novedades.
- Documental v1 sin binarios, con columnas opcionales de evolución futura.

**Frontend Angular**
- Programación con matriz mensual operacional como vista principal.
- Dotación con firma manuscrita capturada en cliente y persistida por backend.
- Dashboard y notificaciones alineados al modelo de roles final.

**Infraestructura**
- Supabase Storage para firmas de entrega (`delivery-signatures`).
- Supabase Realtime para eventos de notificación filtrados por usuario.

## Estado de Ejecucion y Trazabilidad

- Estado de implementacion por tarea: `tasks.md` (fuente de verdad)
- Bitacora de continuidad entre sesiones/IDs: `progress.md`
- Regla de trabajo: cada avance debe reflejarse en ambos archivos para que cualquier ejecucion posterior de OpenSpec encuentre contexto completo de lo realizado, en curso y pendiente.
