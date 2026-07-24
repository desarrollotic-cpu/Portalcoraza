## 0. Prerequisitos — Refactors de base

> Checklist completo del change. Handoff: [`docs/CONTINUAR-DESARROLLO.md`](../../docs/CONTINUAR-DESARROLLO.md)

- [x] 0.1 Agregar `permissions: string[]` a `JwtPayload` interface en `apps/api/src/modules/auth/interfaces/jwt-payload.interface.ts`
- [x] 0.2 Modificar `PermissionsService.getPermissionCodesForUser()` para que sea usable en `auth.service.ts` al hacer login
- [x] 0.3 Modificar `AuthService.login()` backend para incluir `permissions[]` en el JWT payload y en el response `user`
- [x] 0.3.1 Configurar expiración de tokens según línea base final: access token 2 horas y refresh token 7 días
- [x] 0.4 Refactorizar `PermissionsGuard` para leer `request.user.permissions` del JWT payload (eliminar DB query)
- [x] 0.5 Crear migración `supabase/migrations/002_user_posts_permissions.sql` con tablas `user_posts` y `user_permissions`
- [x] 0.6 Agregar endpoints en `UsersController`: `POST /users/:id/posts`, `DELETE /users/:id/posts/:postId`, `GET /users/:id/posts`
- [x] 0.7 Actualizar `AuthUser` en `apps/web/src/app/core/models/auth.model.ts` con `permissions: string[]`
- [x] 0.8 Agregar método `hasPermission(code: string): boolean` en `AuthService` Angular
- [x] 0.9 Crear `has-permission.directive.ts` en `apps/web/src/app/core/directives/`
- [x] 0.10 Crear `permission.guard.ts` en `apps/web/src/app/core/guards/`
- [x] 0.11 Crear `error.interceptor.ts` en `apps/web/src/app/core/interceptors/`
- [x] 0.12 Registrar `error.interceptor` en `app.config.ts`
- [x] 0.13 Actualizar seed `supabase/seed/001_roles_permissions.sql` con permisos de todos los módulos nuevos

## 1. RRHH — Completar módulo existente

- [x] 1.1 Agregar endpoint `GET /associates/:id/history` en `AssociatesController` y `AssociatesService`
- [x] 1.2 Crear componente Angular `rrhh/associate-form/associate-form.ts` (crear y editar)
- [x] 1.3 Crear componente Angular `rrhh/associate-detail/associate-detail.ts` con vista de historia
- [x] 1.4 Agregar botón "Retirar" con diálogo de confirmación en `associates-list`
- [x] 1.5 Añadir rutas RRHH en `app.routes.ts` con `permissionGuard`
- [x] 1.6 Agregar servicio `AssociatesApiService` en `features/rrhh/` para centralizar llamadas HTTP

## 2. Base de datos — Módulos de negocio

- [x] 2.1 Crear migración `supabase/migrations/003_inventory.sql` (tablas: `inventory_categories`, `inventory_items`, `inventory_variants`, `inventory_movements`)
- [x] 2.2 Crear migración `supabase/migrations/004_deliveries.sql` (tablas: `deliveries`, `delivery_details`; campo `signature_url`)
- [x] 2.3 Crear migración `supabase/migrations/005_scheduling.sql` (tabla `shift_schedules` con enum `shift_type` y exclusion constraint)
- [x] 2.4 Habilitar extensión `btree_gist` en Supabase para el exclusion constraint de scheduling
- [x] 2.5 Crear migración `supabase/migrations/006_documental.sql` (tablas: `document_types`, `document_records`)
- [x] 2.6 Crear migración `supabase/migrations/007_residential.sql` (tablas: `residential_units`, `residents`, `owners`, `tenants`, `visitors`, `vehicles`, `visitor_parking_slots`, `mail_records`, `packages`, `reservations`, `virtual_log`, `residential_incidents`)
- [x] 2.7 Crear bucket `delivery-signatures` en Supabase Storage con políticas de acceso
      (bucket privado + descarga autenticada vía API Nest; ver `docs/SUPABASE.md` y
      `docs/superpowers/specs/2026-07-21-private-delivery-signatures-design.md`)
- [x] 2.8 Activar Realtime en tabla `notifications` desde el dashboard de Supabase
      (migración `025_notifications_realtime.sql` + checklist en `docs/SUPABASE.md`)
- [x] 2.9 Definir reservas por recurso configurable con política por unidad (`manual_approval` o `auto_approval`) y estados mínimos (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED`)
- [x] 2.10 Incluir campos opcionales `file_url` y `storage_provider` en documental para evolución futura (sin uso operativo en fase 1)

## 3. Backend — Módulo Inventario

- [x] 3.1 Crear entidades TypeORM: `InventoryCategory`, `InventoryItem`, `InventoryVariant`, `InventoryMovement`
- [x] 3.2 Crear `InventoryModule` respetando la estructura actual del repositorio (sin reorganización estructural)
- [x] 3.3 Implementar `InventoryService` con casos de uso: CRUD categorías, CRUD ítems, CRUD variantes, registrar movimiento
- [x] 3.4 Implementar validación de stock insuficiente en movimientos `OUT`
- [x] 3.5 Implementar emisión de evento `stock.low` cuando stock cae bajo umbral
- [x] 3.6 Crear `InventoryController` con endpoints REST y guards de permisos
- [x] 3.7 Registrar `InventoryModule` en `AppModule`

## 4. Backend — Módulo Entregas

- [x] 4.1 Crear entidades TypeORM: `Delivery`, `DeliveryDetail`
- [x] 4.2 Implementar `DeliveriesService`: crear entrega pendiente, confirmar entrega, bloquear edición de entregadas
- [x] 4.3 Implementar integración con Supabase Storage SDK para subir firma en `POST /deliveries/:id/sign` (actualmente resuelto con API HTTP directa)
- [x] 4.4 Crear `DeliveriesController` con endpoints y permisos
- [x] 4.5 Registrar `DeliveriesModule` en `AppModule`

## 5. Backend — Módulo Programación

- [x] 5.1 Crear entidad TypeORM `ShiftSchedule` con enum `ShiftType`
- [x] 5.2 Implementar `SchedulingService`: crear turno, eliminar turno, consultar por puesto+rango fechas
- [x] 5.2.1 Ajustar modelo de turnos para operación final: diurno, nocturno y descanso con jornadas de 8h y 12h
- [x] 5.3 Capturar error `23P01` (exclusion_violation) en el servicio y lanzar `ConflictException`
- [x] 5.4 Validar que solo se puedan editar/eliminar turnos con `shiftDate` futura
- [x] 5.5 Crear `SchedulingController` con endpoints y permisos
- [x] 5.6 Registrar `SchedulingModule` en `AppModule`

## 6. Backend — Módulo Documental

- [x] 6.1 Crear entidades TypeORM: `DocumentType`, `DocumentRecord`
- [x] 6.2 Implementar `DocumentalService`: CRUD tipos, CRUD registros, búsqueda por código parcial
- [x] 6.3 Crear `DocumentalController` con endpoints y permisos
- [x] 6.4 Registrar `DocumentalModule` en `AppModule`

## 7. Backend — Módulo Residencial

- [x] 7.1 Crear entidades TypeORM: `ResidentialUnit`, `Resident`, `Owner`, `Tenant`, `Visitor`, `Vehicle`, `VisitorParkingSlot`, `MailRecord`, `Package`, `Reservation`, `VirtualLog`, `ResidentialIncident`
- [x] 7.2 Implementar filtrado residencial por todos los `post_id` asignados al usuario autenticado
- [x] 7.3 Implementar `ResidentialService` para unidades, residentes, propietarios y arrendatarios
- [x] 7.4 Implementar `VisitorsService` con registro de entrada/salida y escritura al `virtual_log`
- [x] 7.4.1 Implementar control de parqueaderos visitantes con cupos totales, ocupados y disponibles en tiempo real
- [x] 7.5 Implementar `PackagesService` con notificación al recibir paquete
- [x] 7.6 Implementar `VehiclesService` CRUD básico
- [x] 7.7 Implementar `ReservationsService` con validación de conflicto de horario y flujo de aprobación configurable por recurso
- [x] 7.8 Implementar `IncidentsService` para novedades residenciales con estados, prioridades, responsable, historial y auditoría
- [x] 7.9 Crear `ResidentialController` con endpoints y permisos
- [x] 7.10 Registrar `ResidentialModule` en `AppModule`

## 8. Backend — Notificaciones Realtime

- [x] 8.1 Crear `NotificationsService` con método `send(userId, title, body, module)`
- [x] 8.2 Inyectar `NotificationsService` en los módulos que generan notificaciones (rrhh, inventory, scheduling, residential, documental)
- [x] 8.3 Crear endpoints `GET /notifications` y `PATCH /notifications/:id/read`
- [x] 8.4 Registrar `NotificationsModule` en `AppModule`

## 9. Frontend — Feature Dotación (Inventario)

- [x] 9.1 Crear servicio `InventoryApiService` en `features/dotacion/`
- [x] 9.2 Crear componente `dotacion/inventory-list/inventory-list.ts` con listado de ítems y stock
- [x] 9.3 Crear componente `dotacion/inventory-form/inventory-form.ts` para crear/editar ítems y variantes
- [x] 9.4 Crear componente `dotacion/deliveries-list/deliveries-list.ts` con listado de entregas
- [x] 9.5 Crear componente `dotacion/delivery-form/delivery-form.ts` con selección de asociado, ítems y canvas de firma
- [x] 9.6 Agregar rutas `/dotacion` en `app.routes.ts` con `permissionGuard`

## 10. Frontend — Feature Programación

- [x] 10.1 Crear servicio `SchedulingApiService` en `features/programacion/`
- [x] 10.2 Crear componente `programacion/schedule-matrix/schedule-matrix.ts` como vista principal mensual tipo Excel
- [x] 10.3 Mantener componente `programacion/schedule-calendar/schedule-calendar.ts` como vista complementaria
- [x] 10.4 Crear componente `programacion/shift-form/shift-form.ts` para asignar turno (asociado, puesto, tipo, jornada, fecha)
- [x] 10.5 Agregar rutas `/programacion` con `permissionGuard`

## 11. Frontend — Feature Documental

- [x] 11.1 Crear servicio `DocumentalApiService` en `features/documental/`
- [x] 11.2 Crear componente `documental/documents-list/documents-list.ts` con búsqueda por código y tipo
- [x] 11.3 Crear componente `documental/document-form/document-form.ts` para registrar/editar metadata
- [x] 11.4 Agregar rutas `/documental` con `permissionGuard`

## 15. Frontend — Login y branding (2026-06-23)

- [x] 15.1 Rediseñar `auth-layout` con split: formulario izquierda, brand/video derecha
- [x] 15.2 Rediseñar `login.ts`: saludo, inputs underline, botón píldora, toggle contraseña
- [x] 15.3 Ajustar proporciones del formulario (ancho, centrado vertical)
- [x] 15.4 Agregar soporte video animado en panel derecho (`/videos/coraza-logo.mp4`)
- [x] 15.5 Subir asset `apps/web/public/videos/coraza-logo.mp4`
- [x] 15.6 Corregir carga del video en Render ( `_redirects` + `play()` programático)
- [ ] 15.7 Agregar `apps/web/public/images/coraza-logo.png` (logo estático / poster — opcional, pendiente del usuario)

## 12. Frontend — Feature Residencial

- [x] 12.1 Crear servicio `ResidentialApiService` en `features/residential/`
- [x] 12.2 Crear componente `residential/units-list/units-list.ts` con unidades del puesto asignado
- [x] 12.3 Crear componente `residential/visitors-log/visitors-log.ts` con registro de entrada/salida y libro virtual
- [x] 12.4 Crear componente `residential/packages/packages.ts` con recepción y entrega de paquetes
- [x] 12.5 Crear componente `residential/reservations/reservations.ts` para gestión de reservas
- [x] 12.6 Agregar rutas `/residential` con `permissionGuard`

## 13. Frontend — Notificaciones y Admin

- [x] 13.1 Instalar Supabase JS client en `apps/web`: `npm install @supabase/supabase-js`
- [x] 13.2 Crear `notification.service.ts` en `core/services/` que suscribe al canal Realtime de Supabase
- [x] 13.3 Agregar badge de notificaciones no leídas en `MainLayout`
- [x] 13.4 Crear panel de notificaciones (dropdown o sidebar) en el layout
- [x] 13.5 Crear feature `admin/users-list/users-list.ts` con CRUD de usuarios
- [x] 13.6 Crear feature `admin/roles-permissions/roles-permissions.ts` con asignación de permisos a roles
- [x] 13.7 Agregar rutas `/admin` con `permissionGuard` para GERENCIA
- [x] 13.8 Ampliar `dashboard/dashboard.ts` con widgets contextuales por rol final:
- [x] 13.8.1 GERENCIA: asociados activos, dotaciones pendientes, documentos próximos a vencer, novedades abiertas, reservas pendientes
- [x] 13.8.2 SUPERVISOR: turnos del día, entregas pendientes, novedades abiertas
- [x] 13.8.3 ADMINISTRADOR_UNIDAD: visitantes activos, paquetes pendientes, reservas pendientes, novedades abiertas

## 14. Verificación y Seed final

> **Nota:** 14.1, 14.5–14.8 y 14.10 requieren Supabase configurado (migraciones, bucket, Realtime). Diferido al cierre — ver `progress.md` sección "Cierre Supabase".

- [ ] 14.1 Ejecutar todas las migraciones en Supabase (002 al 007) — **diferido cierre Supabase**
- [x] 14.2 Crear seed `supabase/seed/003_business_permissions.sql` con todos los permisos de módulos nuevos y asignación por rol
- [x] 14.3 Verificar que el flow completo de login devuelve `permissions[]` en el token y en el response — **revisión estática código** (pendiente E2E con BD)
- [x] 14.4 Verificar que `PermissionsGuard` no genera queries DB en endpoints protegidos — **revisión estática código**
- [ ] 14.5 Verificar aislamiento residencial: ADMINISTRADOR_UNIDAD no ve datos de otros puestos — **diferido E2E**
- [ ] 14.6 Verificar constraint de no solapamiento de turnos con dos requests concurrentes — **diferido E2E**
- [ ] 14.7 Verificar flujo completo de entrega con firma: creación → confirmación → inmutabilidad — **diferido cierre Supabase (bucket 2.7)**
- [ ] 14.8 Verificar que Supabase Realtime entrega notificaciones al frontend en tiempo real — **diferido cierre Supabase (2.8)**
- [x] 14.9 Verificar renovación automática mediante refresh token (access 2h, refresh 7d) — **defaults backend + interceptor refresh en frontend**
- [ ] 14.10 Verificar seguridad del canal Supabase Realtime para entrega por `user_id` — **diferido cierre Supabase (2.8)**
- [x] 14.11 Verificar consistencia de matriz mensual tipo Excel como vista principal de programación — **ruta `/programacion` → schedule-matrix**
