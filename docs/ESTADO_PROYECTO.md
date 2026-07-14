# Estado del Proyecto — Portal Coraza

> **Última actualización**: 2026-07-14
> **Documento maestro**: fuente única de verdad del avance actual. Cualquier información en otros documentos (`HANDOFF-IA.md`, `CONTINUAR-DESARROLLO.md`, `ARCHITECTURE.md`, etc.) que contradiga a este archivo, este archivo prevalece.

Este documento consolida **todo lo que se ha hecho, todo lo que está en curso y todo lo que falta** en Portal Coraza. Está organizado para poder retomar el proyecto en cualquier momento sin perder contexto.

---

## Índice

1. [Visión general y objetivo del sistema](#1-visión-general-y-objetivo-del-sistema)
2. [Stack técnico](#2-stack-técnico)
3. [Estructura del monorepo](#3-estructura-del-monorepo)
4. [Modelo de dominio y base de datos](#4-modelo-de-dominio-y-base-de-datos)
5. [Autenticación, roles y permisos (RBAC)](#5-autenticación-roles-y-permisos-rbac)
6. [Módulo por módulo (definición funcional y estado)](#6-módulo-por-módulo)
   - 6.1 [Auth (login / sesión / notificaciones)](#61-auth)
   - 6.2 [Recursos Humanos (RRHH)](#62-recursos-humanos-rrhh)
   - 6.3 [Dotación](#63-dotación)
   - 6.4 [Programación](#64-programación)
   - 6.5 [Documental](#65-documental)
   - 6.6 [Residencial](#66-residencial)
   - 6.7 [Administración (usuarios, roles, puestos)](#67-administración)
   - 6.8 [Dashboard](#68-dashboard)
7. [Backend (NestJS)](#7-backend-nestjs)
8. [Frontend (Angular 21)](#8-frontend-angular-21)
9. [Sistema de diseño (rediseño premium)](#9-sistema-de-diseño-rediseño-premium)
10. [Historial de decisiones de producto](#10-historial-de-decisiones-de-producto)
11. [Estado actual — implementado vs. pendiente](#11-estado-actual--implementado-vs-pendiente)
12. [Pendientes transversales](#12-pendientes-transversales)
13. [Cómo levantar el entorno local](#13-cómo-levantar-el-entorno-local)
14. [Credenciales seed y roles de prueba](#14-credenciales-seed-y-roles-de-prueba)
15. [Comandos útiles](#15-comandos-útiles)
16. [Convenciones de trabajo](#16-convenciones-de-trabajo)

---

## 1. Visión general y objetivo del sistema

**Portal Coraza** es el ERP interno de una empresa de seguridad privada (Coraza) que integra en una sola plataforma:

- Gestión de personal (Recursos Humanos)
- Dotación e inventario con firma digital
- Programación mensual de turnos por puesto
- Gestión documental corporativa
- Control de acceso residencial (unidades, visitantes, paquetería, reservas, parqueaderos)
- Portal personal del vigilante (colillas, cursos, exámenes, programación propia)
- Administración de usuarios, roles y permisos

**Referencia productiva histórica**: `jhoncode1994/coraza-system` (GitHub). Portal Coraza es la **v2** que unifica ese producto en un solo portal con arquitectura moderna.

**Principios rectores**:

- **RRHH es la fuente única de verdad del personal**. Los demás módulos consumen esta información (nunca duplican asociados).
- **Segregación por puesto**: usuarios como `ADMINISTRADOR_UNIDAD` o `PROGRAMADOR` solo ven datos de los puestos asignados a su cuenta (`user_posts`).
- **Los cambios de permisos toman efecto en el próximo login / refresh de token**.
- **Auditoría obligatoria** de acciones sensibles (login, logout, alta de usuarios, asignación de puestos).

---

## 2. Stack técnico

### Backend (`apps/api`)

- **Framework**: NestJS 11
- **ORM**: TypeORM
- **DB**: PostgreSQL (Supabase pooler en producción)
- **Auth**: JWT (access + refresh) con `passport-jwt`, hashing `bcrypt`
- **Almacenamiento**: Supabase Storage (para firmas, documentos)
- **Lenguaje**: TypeScript

### Frontend (`apps/web`)

- **Framework**: Angular 21 (standalone components, signals, control-flow `@if / @for / @switch`)
- **Formularios**: Reactive Forms
- **Router**: `@angular/router` con lazy loading y guards
- **UI**: Componentes standalone + Lucide icons (`@lucide/angular`)
- **Fuentes**: Inter (UI) + Plus Jakarta Sans (display) via Google Fonts
- **Realtime**: `@supabase/supabase-js` (para notificaciones)
- **Testing**: Vitest (configurado, sin suites aún)

### Base de datos y migraciones

- **`supabase/migrations/`**: esquema versionado (incluye `012_hr_absenteeism.sql` — ausentismo + CIE-10)
- **`supabase/seed/`**: datos iniciales (roles, permisos, gerencia)
- Ejecución vía Supabase CLI, SQL Editor o scripts `npm run db:apply-*` en `apps/api`

### Monorepo

- **`npm workspaces`** con dos paquetes: `apps/api`, `apps/web`
- Node 18+
- npm 11

---

## 3. Estructura del monorepo

```
Portalcoraza/
├── apps/
│   ├── api/                        NestJS
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   ├── common/             (guards, decorators, servicios comunes)
│   │   │   └── modules/
│   │   │       ├── auth/           login, refresh, logout
│   │   │       ├── users/          CRUD usuarios + user_posts
│   │   │       ├── roles/          roles + role_permissions
│   │   │       ├── permissions/    consulta de permisos
│   │   │       ├── associates/     personal (RRHH)
│   │   │       ├── posts/          puestos operativos
│   │   │       ├── inventory/      inventario dotación
│   │   │       ├── deliveries/     entregas de dotación
│   │   │       ├── scheduling/     programación mensual
│   │   │       ├── documental/     documentos
│   │   │       ├── residential/    unidades, visitantes, paquetes, reservas
│   │   │       ├── notifications/  notificaciones en tiempo real
│   │   │       └── audit/          logs de auditoría
│   │   └── .env                    DATABASE_URL, JWT_SECRET, etc.
│   │
│   └── web/                        Angular
│       ├── src/
│       │   ├── index.html          fuentes + meta
│       │   ├── styles.scss         globales
│       │   ├── styles/
│       │   │   ├── _theme.scss     ⭐ tokens de diseño (paleta, tipografía, sombras)
│       │   │   └── _utilities.scss
│       │   ├── environments/
│       │   └── app/
│       │       ├── app.routes.ts   ⭐ definición de todas las rutas
│       │       ├── core/           guards, servicios (auth, notification, api)
│       │       ├── shared/         componentes reutilizables
│       │       │   └── components/
│       │       │       ├── icon/           wrapper Lucide
│       │       │       ├── module-shell/   ⭐ layout de cada módulo
│       │       │       └── module-placeholder/
│       │       ├── layouts/
│       │       │   ├── auth-layout/        pantalla login (hero + card)
│       │       │   └── main-layout/        sidebar + topbar + outlet
│       │       └── features/
│       │           ├── auth/login/
│       │           ├── dashboard/
│       │           ├── rrhh/               (asociados)
│       │           ├── dotacion/           (inventario, entregas, historial…)
│       │           ├── programacion/       (schedule-board)
│       │           ├── documental/
│       │           ├── residential/        (unidades, visitantes, paquetes, reservas)
│       │           └── admin/              (users, roles-permissions)
│       ├── angular.json            budgets subidos para diseño premium
│       └── package.json            @lucide/angular, @supabase/supabase-js
│
├── supabase/
│   ├── migrations/                 SQL versionado (001 → 009)
│   └── seed/                       roles, permisos, gerencia
│
├── docs/                           documentación
│   ├── ESTADO_PROYECTO.md          ⭐ este archivo
│   ├── ARCHITECTURE.md
│   ├── HANDOFF-IA.md
│   ├── CONTINUAR-DESARROLLO.md
│   ├── SUPABASE.md
│   ├── GUIA-CIERRE-100.md
│   ├── DEPLOY-RENDER.md
│   └── COMO-OBTENER-CLAVE-SUPABASE.md
│
├── openspec/                       especificaciones de cambios OpenSpec
└── package.json                    workspaces
```

---

## 4. Modelo de dominio y base de datos

### 4.1 Migraciones (`supabase/migrations/`)

| Archivo | Contenido |
|---|---|
| `001_core_schema.sql` | `roles`, `permissions`, `role_permissions`, `users`, `refresh_tokens`, `posts`, `associates`, `associate_history`, `audit_logs`, `notifications` |
| `002_user_posts_permissions.sql` | `user_posts` (asignación usuario→puesto) + `user_permissions` (overrides individuales, tabla existe pero **lógica sin implementar**) |
| `003_inventory.sql` | `inventory_categories`, `inventory_items`, `inventory_variants`, `inventory_movements` |
| `004_deliveries.sql` | `deliveries`, `delivery_details` |
| `005_scheduling.sql` | Programación (versión inicial) |
| `006_documental.sql` | `document_types`, `document_records` |
| `007_residential.sql` | `residential_units`, `owners`, `tenants`, `residents`, `visitors`, `packages`, `reservations`, `virtual_logs`, `residential_incidents`, `visitor_parking_slots`, etc. |
| `008_delivery_ux.sql` | Extensión de `deliveries` con `post_id`, observaciones y campos de reversión |
| `009_monthly_scheduling.sql` | `monthly_schedules`, `schedule_templates`, `schedule_assignments` (cuadro mensual) |

### 4.2 Seeds (`supabase/seed/`)

| Archivo | Contenido |
|---|---|
| `001_roles_permissions.sql` | Roles base + permisos base + relaciones role→permission |
| `002_gerencia_full_permissions.sql` | Refuerzo: Gerencia con todos los permisos |
| `003_business_permissions.sql` | Permisos de módulos de negocio (inventory, deliveries, scheduling, documental, residential, notifications) y relaciones para cada rol. **Idempotente**. |

### 4.3 Entidades TypeORM más importantes

Ubicación: `apps/api/src/modules/**/entities/*.entity.ts`. Total: **37 entidades**.

**Asociado** (`associates`) tiene estados:

```typescript
enum AssociateStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  VACACIONES = 'VACACIONES',
  RETIRADO = 'RETIRADO',
}
```

Campos actuales de Associate: `documentNumber`, `firstName`, `lastName`, `phone`, `email`, `address`, `eps`, `arl`, `afp`, `bank`, `bloodType`, `hireDate`, `status`, `createdBy`, `updatedBy`, timestamps.

> **Pendiente**: añadir `zona` y `cargo` como campos de negocio para RRHH (ver sección 6.2).

---

## 5. Autenticación, roles y permisos (RBAC)

### 5.1 Flujo de autenticación

1. `POST /auth/login` → devuelve `accessToken` (JWT) + `refreshToken` (persistido en `refresh_tokens`).
2. `POST /auth/refresh` → rota tokens.
3. `POST /auth/logout` → invalida refresh token.

- **JWT** firmado con `JWT_SECRET`.
- **Contraseñas**: hash con `bcrypt`.
- **Auditoría** de login/logout/refresh en `audit_logs`.
- **Backend**: `JwtAuthGuard` + `PermissionsGuard` con decorator `@RequirePermissions('inventory.view')`.
- **Frontend**: `authGuard` y `permissionGuard` (Angular) leen del `AuthService` que guarda el usuario y sus permisos.

**Regla acordada**: los cambios de permisos toman efecto al hacer refresh de token o volver a iniciar sesión. No es necesario refresh en tiempo real.

### 5.2 Roles definidos (seed)

| Código | Nombre | Uso |
|---|---|---|
| `GERENCIA` | Gerencia | Todos los permisos (admin del sistema) |
| `RRHH` | Recursos Humanos | Alta / edición / retiro de asociados, documental (lectura) |
| `PROGRAMADOR` | Programador | Programación mensual, consulta de asociados y puestos |
| `ALMACENISTA` | Almacenista | Dotación completa (inventario + entregas + firma) |
| `VIGILANTE` | Vigilante | Portal personal + operaciones residenciales del puesto (**definir permisos finos, ver 6.6/6.2**) |
| `ADMINISTRADOR_UNIDAD` | Administrador de Unidad | Gestión residencial del puesto asignado |
| `SUPERVISOR` | Supervisor | Definido en seed pero **explícitamente aplazado** por el usuario ("no se contemplará por ahora") |

### 5.3 Permisos (código.acción)

Módulos y permisos disponibles (`permissions.module`):

- `users`: view, create, edit
- `roles`: view, manage
- `associates`: view, create, edit, retire
- `posts`: view, create, edit
- `audit`: view
- `inventory`: view, create, edit, move, alerts
- `deliveries`: view, create, sign
- `scheduling`: view, create, edit
- `documental`: view, create, manage
- `residential`: view, manage, visitors, packages, reservations, incidents, parking
- `notifications`: view, read

### 5.4 `user_posts` y `user_permissions`

- **`user_posts`** *(implementado en DB y API)*: relación N a N entre `users` y `posts`. Se usa para restringir la vista de datos operativos:
  - `PROGRAMADOR` solo puede programar puestos que tenga asignados.
  - `ADMINISTRADOR_UNIDAD` solo opera la unidad residencial correspondiente al puesto asignado.
- **`user_permissions`** *(tabla existe en DB, lógica **no implementada**)*: pensado para overrides individuales por usuario. Se **aplaza** hasta que haga falta.

---

## 6. Módulo por módulo

Cada módulo se documenta con:

- **Objetivo**
- **Roles que interactúan**
- **Pantallas definidas / a implementar**
- **Datos y dependencias**
- **Reglas de negocio acordadas**
- **Estado**

### 6.1 Auth

**Objetivo**: Login seguro con JWT, gestión de sesión (access/refresh), notificaciones en tiempo real, y en el futuro portal personal del vigilante.

**Pantallas**:

- ✅ **Login** (`/auth/login`) — reactive form email + password
- ⏳ **Portal Personal / "Mi Portal"** — pendiente: colillas de pago, cursos de vigilancia, exámenes anuales, programación personal del vigilante

**Reglas**:

- Sesión JWT con refresh token.
- Auditoría automática de login/logout.
- Sin recuperación de contraseña por email (por ahora).
- Los cambios de permisos aplican en el siguiente refresh/login.

**Estado**:

- Login: **implementado y con diseño premium reciente**
- Guard `authGuard`, `permissionGuard`: implementados
- Notificaciones realtime (Supabase channel): implementadas en `NotificationService`
- Portal personal: **pendiente definir y construir**

---

### 6.2 Recursos Humanos (RRHH)

**Objetivo**: Fuente única de verdad del personal. Alta, edición, retiro, cumplimiento SST y ausentismo.

**Pantallas definidas**:

- ✅ **Panel / dashboard** (`/rrhh`)
- ✅ **Lista de asociados** (`/rrhh/asociados`)
- ✅ **Formulario alta / edición** (`/rrhh/asociados/nuevo`, `/rrhh/asociados/:id/editar`)
- ✅ **Detalle de asociado** (`/rrhh/asociados/:id`) — pestañas: personal, laboral, documentos, **ausencias**, alertas/bitácora
- ✅ **Matriz SST**, alertas, retiros, cargos, centros, catálogos, import Excel, bitácora
- ✅ **Ausentismo** (`/rrhh/ausentismo`) — médico/administrativo, CIE-10, KPIs, import Excel (paridad GESTION-HUMANA)
- ⏳ **Novedades laborales** (v1.1) — pendiente (si se distingue del ausentismo)

**Roles**:

- `RRHH` / `GERENCIA`: CRUD + import ausentismo; crear/editar/retirar asociados; ver datos sensibles
- `SST` / `COORDINADOR_OPERATIVO`: consulta de ausentismo (`absences.view`)
- `PROGRAMADOR`: solo lectura de asociados (para armar cuadro mensual)

**Reglas**:

- Estados: `ACTIVO`, `INACTIVO`, `SUSPENDIDO`, `VACACIONES`, `RETIRADO`
- Historial en `associate_history`
- **No** debe existir botón "Entregar dotación" en RRHH — se removió por decisión del usuario (la entrega la hace el `ALMACENISTA` desde su módulo)
- Ausentismo: ver detalle en `docs/MODULO_AUSENTISMO.md`

**Datos**: `associates`, `associate_history`, `diagnosticos_cie10`, `associate_absences`, alertas/documentos HR

**Pendientes específicos**:

- Añadir campos `zona` y `cargo` a `associates` (migración + entidad + DTO + formulario).
- Actualizar tabla para mostrar: `cédula | zona | cargo | estado`.
- Crear relación `users.associate_id` para vincular una cuenta de usuario a su asociado (necesario para el "Mi Portal" del vigilante).
- Catálogo CIE-10 completo vía Excel de producción RRHH (seed solo trae ejemplos).
- Validación formal con el área de Gestión Humana frente a la app de referencia.

**Estado**: **funcional** (incluye ausentismo). Pendiente validación de negocio y datos reales de asociados.

---

### 6.3 Dotación

**Objetivo**: Control del inventario de dotación (uniformes, accesorios) y de las entregas al personal, con firma digital y reversión controlada.

**Rol principal**: `ALMACENISTA`.

**Pantallas definidas**:

- ✅ **Panel principal** (`/dotacion/panel`) — KPIs, alertas de stock bajo, últimas entregas y resumen
- ✅ **Inventario** (`/dotacion/inventario`) — CRUD de items y variantes (talla, género, etc.)
- ✅ **Formulario de item** (`/dotacion/inventario/nuevo`, `.../editar`)
- ✅ **Entregas** (`/dotacion/entregas`) — lista de entregas
- ✅ **Nueva entrega** (`/dotacion/entregas/nueva`)
- ✅ **Firmar entrega** (`/dotacion/entregas/:id/firmar`)
- ✅ **Historial** (`/dotacion/movimientos`) — movimientos de inventario filtrables
- ✅ **Sin dotación 7+ meses** (`/dotacion/sin-dotacion`) — consulta y vista operativa

**Datos**: `inventory_categories`, `inventory_items`, `inventory_variants`, `inventory_movements`, `deliveries`, `delivery_details`

**Reglas de negocio (decidas con el usuario)**:

1. **Solo `ALMACENISTA` puede iniciar entregas**. Eliminado el botón "Entregar dotación" de RRHH y Programación.
2. **Solo `ALMACENISTA` puede revertir entregas** (`POST /deliveries/:id/revert`).
3. Las entregas solo son válidas para asociados con estado **`ACTIVO`** o **`VACACIONES`**.
4. La vista "Retirados / sin dotación 7+ meses" es una **pestaña dentro del módulo Dotación**, no una consulta suelta.

**Estado**: **módulo completo** (panel, inventario, entregas + firma, movimientos y reporte sin dotación).

---

### 6.4 Programación

**Objetivo**: Cuadro mensual de asignación de personal a puestos operativos.

**Rol principal**: `PROGRAMADOR`.

**Pantallas definidas**:

- ✅ **Schedule board** (`/programacion`) — cuadro mensual con celdas editables

**Datos**: `monthly_schedules`, `schedule_templates`, `schedule_assignments`, `posts`, `user_posts`, `associates`

**Reglas**:

- Un programador solo puede programar los puestos que tiene asignados (`user_posts`).
- Consume asociados de RRHH (solo lectura).
- Se **eliminó** cualquier botón que iniciara entrega de dotación desde acá.

**Estado**: **implementado en versión inicial**, pendiente rediseño premium interno y validación en backend de que el `PROGRAMADOR` tenga puestos asignados antes de acceder.

---

### 6.5 Documental

**Objetivo**: Gestión de documentos institucionales (contratos, hojas de vida, políticas).

**Pantallas**:

- ✅ **Lista de documentos** (`/documental`)
- ✅ **Formulario alta / edición** (`/documental/nuevo`, `/documental/:id/editar`)

**Datos**: `document_types`, `document_records`

**Roles**: `GERENCIA` (todo), `RRHH` (lectura), `documental.manage` para gestionar tipos.

**Estado**: **implementado**, pendiente rediseño interno.

---

### 6.6 Residencial

**Objetivo**: Control de acceso y operación de unidades residenciales atendidas por Coraza.

**Rol principal**: `ADMINISTRADOR_UNIDAD` (opera solo su unidad asignada por `user_posts`).

**Pantallas definidas**:

- ✅ **Unidades** (`/residential/unidades`)
- ✅ **Visitantes** (`/residential/visitantes`)
- ✅ **Paquetes** (`/residential/paquetes`)
- ✅ **Reservas** (`/residential/reservas`)
- ⏳ Incidencias / Parqueadero visitantes: entidades existen en DB, pantallas por añadir según necesidad

**Datos**: `residential_units`, `owners`, `tenants`, `residents`, `visitors`, `packages`, `reservations`, `virtual_logs`, `residential_incidents`, `visitor_parking_slots`, `visitor_parking_history`, `vehicles`

**Reglas**:

- El rol `VIGILANTE` debe poder trabajar aquí también (visitantes, paquetes, reservas, residentes) cuando está en un puesto residencial. **Pendiente**: asignar los permisos `residential.*` al rol `VIGILANTE` en el seed (hoy solo los tiene `ADMINISTRADOR_UNIDAD` y `GERENCIA`).
- El vigilante además debe tener acceso a "Mi Portal" con colillas, cursos, exámenes y programación (ver 6.1).

**Estado**: **implementado en versión inicial**, pendiente rediseño interno y afinar permisos del vigilante.

---

### 6.7 Administración

**Objetivo**: Gestión de usuarios del portal, roles y permisos.

**Pantallas definidas**:

- ✅ **Usuarios** (`/admin/usuarios`) — lista y alta de usuarios
- ✅ **Roles y permisos** (`/admin/roles`) — visualización y edición de matriz rol×permiso

**Datos**: `users`, `roles`, `role_permissions`, `user_posts`

**Roles**: `GERENCIA` (único con `users.*` y `roles.manage`).

**Pendientes**:

- UI para **asignar puestos** a un usuario (`user_posts`) — el endpoint existe, falta la pantalla.
- Validación en el backend de que roles operativos (`ADMINISTRADOR_UNIDAD`, `PROGRAMADOR`) tengan puestos asignados antes de acceder a sus módulos.

**Estado**: **funcional**, con los pendientes mencionados.

---

### 6.8 Dashboard

**Objetivo**: Pantalla de bienvenida con KPIs según rol.

**KPIs implementados**:

- **GERENCIA**: asociados activos, dotaciones pendientes, documentos a revisar, novedades abiertas, reservas pendientes.
- **ADMINISTRADOR_UNIDAD**: visitantes activos, paquetes pendientes, reservas pendientes, novedades abiertas.

**Estado**: **implementado con rediseño premium reciente** (hero + KPIs con gradientes + skeletons de carga).

---

## 7. Backend (NestJS)

Ubicación: `apps/api/`

### 7.1 Módulos registrados (`app.module.ts`)

- `AuthModule`, `UsersModule`, `RolesModule`, `PermissionsModule`
- `AssociatesModule`, `PostsModule`
- `InventoryModule`, `DeliveriesModule`
- `SchedulingModule`
- `DocumentalModule`
- `ResidentialModule`
- `NotificationsModule`
- `AuditModule`
- `CommonModule` (guards, decorators, supabase-storage)

### 7.2 Endpoints controllers principales

Cada `*.controller.ts` en `apps/api/src/modules/`:

- `auth.controller.ts` — `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `users.controller.ts` — CRUD usuarios + assign posts
- `roles.controller.ts` — roles + permisos por rol
- `permissions.controller.ts` — consulta de permisos
- `associates.controller.ts` — CRUD asociados
- `posts.controller.ts` — CRUD puestos
- `inventory.controller.ts` — categorías, items, variants, movimientos
- `deliveries.controller.ts` — list, create, sign, revert
- `scheduling.controller.ts` — turnos
- `monthly-scheduling.controller.ts` — cuadro mensual
- `documental.controller.ts` — documentos y tipos
- `residential.controller.ts` — todas las operaciones residenciales (visitantes, paquetes, reservas, unidades)
- `notifications.controller.ts` — listar, marcar leídas

### 7.3 Guards y decoradores comunes (`apps/api/src/common/`)

- `guards/jwt-auth.guard.ts` — verifica JWT y carga usuario
- `guards/permissions.guard.ts` — verifica `@RequirePermissions('foo.bar')`
- `decorators/current-user.decorator.ts` — inyecta `JwtPayload` en handlers
- `decorators/permissions.decorator.ts` — declara permisos requeridos
- `services/supabase-storage.service.ts` — subir firmas y archivos

### 7.4 Configuración

Archivo `apps/api/.env` (no versionado):

```
DATABASE_URL=postgresql://...supabase pooler...
JWT_SECRET=...
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_DAYS=7
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 7.5 Build actual

Existe carpeta `apps/api/dist/` versionada por descuido (aparece en `git status` como untracked). **Pendiente**: agregar `apps/api/dist/` al `.gitignore` si no está.

---

## 8. Frontend (Angular 21)

Ubicación: `apps/web/`

### 8.1 Enrutamiento (`app.routes.ts`)

Estructura:

```
/                               → redirect a /dashboard
/auth/login                     → Login (dentro de AuthLayout)
/dashboard                      → Dashboard (dentro de MainLayout, con authGuard)
/rrhh
  /rrhh/asociados               → AssociatesList
  /rrhh/asociados/nuevo         → AssociateForm (permission: associates.create)
  /rrhh/asociados/:id/editar    → AssociateForm (permission: associates.edit)
  /rrhh/asociados/:id           → AssociateDetail
/dotacion
  /dotacion/panel               → DotacionPanel
  /dotacion/inventario          → InventoryList
  /dotacion/inventario/nuevo    → InventoryForm
  /dotacion/inventario/:id/editar
  /dotacion/entregas            → DeliveriesList
  /dotacion/entregas/nueva      → DeliveryNew
  /dotacion/entregas/:id/firmar → DeliverySign
  /dotacion/movimientos         → DotacionMovimientos
  /dotacion/sin-dotacion        → DotacionSinDotacion
/programacion                   → ScheduleBoard
/documental                     → DocumentsList
  /documental/nuevo, /:id/editar → DocumentForm
/residential
  /residential/unidades         → UnitsList
  /residential/visitantes       → VisitorsLog
  /residential/paquetes         → Packages
  /residential/reservas         → Reservations
/admin
  /admin/usuarios               → UsersList
  /admin/roles                  → RolesPermissions
```

Todas las rutas usan lazy loading (`loadComponent`) y `permissionGuard` con `data: { permission: 'xxx' }`.

### 8.2 Layouts

- **`AuthLayout`** (`layouts/auth-layout/`): pantalla de login con hero (gradiente + orbs + copy + highlights) y card glass del formulario. **Sin video** desde ahora.
- **`MainLayout`** (`layouts/main-layout/`): sidebar con mesh gradient + topbar sticky con breadcrumb, search stub, notificaciones y menú de usuario.

### 8.3 Componentes compartidos (`shared/components/`)

- **`Icon`** — wrapper de `@lucide/angular` usando `NgComponentOutlet` para permitir iconos dinámicos (`[icon]="LucideBell"`, `[size]="18"`, `[strokeWidth]="1.8"`).
- **`ModuleShell`** — encabezado consistente de cada módulo con título, subtítulo, chip de pantalla activa y **launcher tipo Google apps** (botón 3×3 con panel glass y grid de pantallas con iconos Lucide).
- **`ModulePlaceholder`** — plantilla genérica para pantallas aún no implementadas (p. ej. portal del vigilante).

### 8.4 Servicios core (`core/`)

- `AuthService` — login, logout, refresh, `currentUser`, `hasPermission`
- `NotificationService` — realtime Supabase channel, panel de campana
- `guards/auth.guard.ts` — bloquea si no hay sesión
- `guards/permission.guard.ts` — bloquea según `data.permission`
- API services por módulo dentro de cada `features/*`

---

## 9. Sistema de diseño (rediseño premium)

Este es el **rediseño aplicado hoy (2026-07-08)**. Dirección elegida por el usuario:

- **Estilo**: Premium claro con gradientes (hero indigo-violeta, glassmorphism en cards, tipografía grande)
- **Modo oscuro**: no por ahora
- **Iconos**: Lucide (`@lucide/angular`)
- **Densidad**: cómoda, más aire

### 9.1 Tokens (`styles/_theme.scss`)

**Paleta primaria** indigo/violeta con escala completa 50-900. Colores base:

- `--primary-500: #6366f1`
- `--primary-600: #4f46e5`
- `--primary-700: #4338ca`
- `--accent-500: #a855f7` (violeta)
- `--accent-cyan: #22d3ee`

**Neutros** grises fríos (slate 0-900) y **semánticos** success/warning/error/info con `-bg` para chips.

**Gradientes**:

- `--gradient-primary` (indigo → violeta)
- `--gradient-hero` / `--gradient-hero-mesh` (mesh multicolor para hero y sidebar)
- `--gradient-page` (fondo suave de página)
- `--gradient-accent`, `--gradient-success`, `--gradient-warning`

**Sombras** en 7 niveles: `--shadow-xs`, `sm`, `--shadow`, `md`, `lg`, `xl`, `--shadow-primary` (con tinte indigo).

**Radios**: `--radius-xs (6)`, `sm (10)`, ` (14)`, `lg (18)`, `xl (24)`, `2xl (32)`, `pill (999)`.

**Tipografía**:

- `--font-sans`: **Inter** (400/500/600/700/800)
- `--font-display`: **Plus Jakarta Sans** (600/700/800) — para h1/h2/h3 y elementos hero
- Cargadas en `index.html` desde Google Fonts

**Aliases históricos**: se mantiene `--coraza-*` para no romper estilos previos.

### 9.2 Componentes rediseñados en esta entrega

| Componente | Highlights |
|---|---|
| **Login** | Card glass, badge "Acceso seguro", inputs con icono a la izquierda, botón con gradiente animado, spinner |
| **AuthLayout** | Hero con mesh + 3 orbs difuminados, logo icon-mark (sin video), copy y highlights de valor |
| **MainLayout — sidebar** | Fondo hero-mesh, brand con icon-mark, navegación agrupada (General / Operación / Sistema), items con icono redondeado + indicador lateral animado, card "Sistema activo" |
| **MainLayout — topbar** | Sticky con blur, breadcrumb, título del módulo, search box con `Ctrl K`, botón campana con badge de gradiente, chip de usuario con avatar y menú |
| **ModuleShell** | Botón launcher 3×3 (Lucide `Grid2X2`), panel glass con grid 3×N de pantallas con iconos, chip pulsante de pantalla activa |
| **Dashboard** | Hero con saludo, tarjetas glass de estado, grid de KPIs coloreados con gradiente, skeletons con shimmer, empty state |

### 9.3 Ajustes técnicos

- `angular.json`: budgets subidos a `anyComponentStyle` 12kB warn / 20kB error para permitir el CSS por componente del rediseño.
- Nueva dependencia: `@lucide/angular` v1.
- Se creó `apps/web/src/app/shared/components/icon/icon.ts` para renderizar iconos Lucide como componentes dinámicos.
- `index.html` incluye preconnect + `<link>` de Google Fonts para Inter y Plus Jakarta Sans.

### 9.4 Pendientes de diseño

Sistema base listo. Falta aplicarlo dentro de cada módulo:

- **Componentes compartidos**: `Button`, `Table`, `Chip`, `Badge`, `Card`, `Modal`, `Toast`, `Empty`, `FormField`, `Tag`. Hoy cada pantalla define sus estilos.
- **Rediseño interno** de: `associates-list`, `associate-form`, `associate-detail`, `inventory-list`, `inventory-form`, `deliveries-list`, `delivery-new`, `delivery-sign`, `schedule-board`, `documents-list`, `units-list`, `visitors-log`, `packages`, `reservations`, `users-list`, `roles-permissions`.

---

## 10. Historial de decisiones de producto

Decisiones que el usuario ya confirmó y quedan como norma del sistema:

1. **RRHH es fuente única de asociados.** Otros módulos consultan, no duplican.
2. **`user_posts` para segregación**: usuarios `PROGRAMADOR` y `ADMINISTRADOR_UNIDAD` operan solo sobre puestos asignados.
3. **Permisos** cambian con refresh/login. No hay push en tiempo real de permisos.
4. **Vigilante**: opera control de acceso residencial cuando está en puesto + tiene "Mi Portal" con colillas / cursos / exámenes / programación personal.
5. **`user_permissions` (overrides individuales)**: aplazado. Tabla existe pero no se implementa lógica.
6. **Supervisor**: rol definido en seed pero **no se contempla ahora**.
7. **Navegación intra-módulo**: launcher 3×3 (estilo Google apps) arriba a la izquierda, reemplazando las antiguas pestañas horizontales.
8. **Dotación — entregas**:
   - Solo `ALMACENISTA` inicia entregas.
   - Solo `ALMACENISTA` puede revertir.
   - Solo se entrega a asociados en estado `ACTIVO` o `VACACIONES`.
   - Se elimina el botón "Entregar dotación" de RRHH y Programación.
9. **Dotación — vistas**: "Retirados / sin dotación 7+ meses" es una pestaña dentro del módulo, no una consulta suelta.
10. **Diseño**: premium claro con gradientes, iconos Lucide, tipografía Inter + Plus Jakarta Sans, densidad cómoda, solo modo claro.
11. **Login**: se retira el video animado. El hero se queda con el logo icónico + gradientes + orbs + copy.

---

## 11. Estado actual — implementado vs. pendiente

### 11.1 Implementado y funcional

| Área | Estado |
|---|---|
| Login + JWT + refresh + logout | ✅ |
| Guards frontend (auth, permisos) | ✅ |
| Guards backend (JWT + permisos) | ✅ |
| Notificaciones realtime (Supabase channel) | ✅ |
| Roles y permisos (seed completo) | ✅ |
| `user_posts` (DB + API) | ✅ |
| Auditoría de acciones | ✅ |
| RRHH — CRUD asociados | ✅ |
| RRHH — dashboard, matriz SST, alertas, retiros, import Excel | ✅ |
| RRHH — Ausentismo (médico/admin, CIE-10, import, pestaña ficha) | ✅ |
| Dotación — CRUD inventario | ✅ |
| Dotación — entregas + firma | ✅ |
| Dotación — panel, movimientos, sin dotación 7+ meses | ✅ |
| Programación mensual (schedule board) | ✅ (inicial) |
| Documental — CRUD documentos | ✅ |
| Residencial — CRUD unidades/visitantes/paquetes/reservas | ✅ |
| Admin — usuarios y roles | ✅ |
| Dashboard con KPIs por rol | ✅ |
| Sistema de diseño premium (tokens + tipografía + iconos) | ✅ |
| Layouts principales (auth, main, module shell) rediseñados | ✅ |

### 11.2 Placeholder / esqueleto sin lógica

- "Mi Portal" del vigilante — ni ruta creada aún

### 11.3 Pendiente definir + implementar

- Pantallas de Novedades laborales adicionales en RRHH (si el alcance supera ausentismo)
- Detalle del portal personal del vigilante (colillas, cursos, exámenes, programación)

---

## 12. Pendientes transversales

Lista de tareas que atraviesan varios módulos, priorizadas:

### 12.1 Reglas de negocio faltantes en backend

- [ ] Validar que `PROGRAMADOR` y `ADMINISTRADOR_UNIDAD` tengan al menos un puesto asignado antes de entrar a sus módulos.
- [ ] Añadir permisos `residential.*` al rol `VIGILANTE` en el seed.

### 12.2 Datos y schema

- [ ] Migración: añadir `zona` y `cargo` a `associates` (+ actualizar entidad y DTO).
- [ ] Migración: añadir `associate_id UUID NULL` a `users` (link 1-1 hacia asociado).
- [ ] Agregar `apps/api/dist/` al `.gitignore` (hoy aparecen archivos generados como untracked).

### 12.3 UI

- [ ] Pantalla en `/admin/usuarios` para asignar/desasignar puestos a un usuario.
- [ ] Rediseño interno (aplicar el sistema de diseño) a las 15+ pantallas de features.
- [ ] Componentes compartidos: `Button`, `Table`, `Chip`, `Badge`, `Card`, `Modal`, `Toast`, `Empty`, `FormField`.
- [ ] Rutas y pantallas de "Mi Portal" del vigilante.

### 12.4 Funcionalidad Dotación

- [x] Panel principal con KPIs (stock bajo, entregas semana, top items entregados).
- [x] Historial de movimientos (`inventory_movements`) filtrable.
- [x] Vista "Sin dotación 7+ meses" con consulta específica.

### 12.5 Higiene técnica

- [ ] Suite de tests con Vitest (backend + componentes clave).
- [ ] CI (GitHub Actions o similar) que ejecute build + tests en PRs.
- [ ] Auditoría de vulnerabilidades: `npm audit` reporta 14 (2 low, 2 mod, 10 high) — evaluar `npm audit fix`.

---

## 13. Cómo levantar el entorno local

### 13.1 Requisitos

- Node.js 18+
- npm 11
- Acceso a la instancia Supabase del proyecto (URL, service role key, connection string del pooler)

### 13.2 Instalación

```powershell
# En la raíz del monorepo
npm install
```

### 13.3 Configurar variables

Crear `apps/api/.env` con:

```env
DATABASE_URL=postgresql://<usuario>:<password>@<host>:6543/postgres?pgbouncer=true
JWT_SECRET=<secret largo>
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_DAYS=7
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role>
```

Crear `apps/web/src/environments/environment.ts` con:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  supabaseUrl: '...',
  supabaseAnonKey: '...',
};
```

### 13.4 Arrancar (dos terminales)

```powershell
# Terminal 1 — API NestJS
npm run start:dev --workspace=apps/api

# Terminal 2 — Angular
npm run start --workspace=apps/web
```

- Web: `http://localhost:4200`
- API: `http://localhost:3000`

### 13.5 Ejecutar migraciones y seeds

Opciones:

- **Supabase SQL Editor**: pegar en orden los archivos `001_core_schema.sql` → `009_monthly_scheduling.sql` y luego `seed/001_roles_permissions.sql` → `seed/003_business_permissions.sql`.
- **Supabase CLI**: ver `docs/SUPABASE.md`.

---

## 14. Credenciales seed y roles de prueba

| Usuario | Email | Password | Rol / uso |
|---------|-------|----------|-----------|
| Admin / gerencia | `admin@coraza.local` | `Coraza2026!` | Acceso amplio |
| Almacén | `almacen@coraza.local` | `Almacen2026!` | Dotación |
| RRHH | `rrhh@coraza.local` | `Rrhh2026!` | Gestión Humana + ausentismo |

Scripts:

```powershell
npm run seed:admin -w @coraza/api
npm run seed:almacenista -w @coraza/api
npm run seed:rrhh -w @coraza/api
```

Tras asignar permisos nuevos en BD, **cerrar sesión y volver a entrar** (el JWT se regenera en el login).

---

## 15. Comandos útiles

```powershell
# Instalar todo (raíz)
npm install

# Dev (raíz monorepo)
npm run api:dev
npm run web:dev

# Build
npm run build -w @coraza/api
npm run build -w @coraza/web

# BD — módulo HR general / ausentismo / keepalive Supabase
npm run db:apply-hr -w @coraza/api
npm run db:apply-absences -w @coraza/api
npm run db:keepalive -w @coraza/api

# Seeds
npm run seed:rrhh -w @coraza/api
```

Documentación del módulo Ausentismo: `docs/MODULO_AUSENTISMO.md`.

---

## 16. Convenciones de trabajo

1. **Definición funcional antes que código**: antes de programar un módulo, se documenta pantallas, roles, reglas y datos. Este documento vive en `docs/ESTADO_PROYECTO.md`.
2. **Feature branches** por módulo cuando sea posible.
3. **Commits en español**, formato conventional (`feat`, `fix`, `chore`, `docs`, `refactor`).
4. **Pantallas nuevas**: crear el componente `.ts` bajo `apps/web/src/app/features/<modulo>/<screen>/` y agregar la ruta con `loadComponent` en `app.routes.ts`.
5. **Guard de permisos**: siempre `canActivate: [permissionGuard]` con `data: { permission: 'modulo.accion' }`.
6. **Icons**: usar `<app-icon [icon]="LucideXxx" [size]="..." [strokeWidth]="..." />` (no `<lucide-angular>` de la API vieja).
7. **Cambios de esquema**: nueva migración numerada en `supabase/migrations/` y actualizar entidades TypeORM.
8. **Sin datos de prueba en migraciones**: los datos van en `supabase/seed/*.sql`, idempotentes.

---

**Fin del documento.** Cualquier cambio significativo debe reflejarse aquí.
