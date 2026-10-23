# Módulo Operaciones

**Fecha:** 2026-10-23 (antes 2026-10-07)

## Alcance

Operaciones gestiona el **catálogo de puestos** (`posts`), la **supervisión de minutas**, **rondas GPS** y la **consulta de inspecciones de patineta eléctrica** (PESV). Lo consumen:

- **Programación** (cuadro mensual)
- **Dotación** (entrega de elementos a puestos)
- **Minuta Virtual** (cuenta `PUESTO` en app separada; ops consulta/PDF + inspecciones)
- Otros módulos vía `GET /posts`

## Rutas (Portal web)

| Ruta | Permiso | Descripción |
|------|---------|-------------|
| `/operaciones` | `operations.view` | Panel resumen |
| `/operaciones/puestos` | `operations.view` | CRUD de puestos |
| `/operaciones/puestos/fichas` | `operations.view` / `posts.view` | Fichas de puestos |
| `/operaciones/minutas` | `operations.view` | Historial / PDF por puesto + mes; enlace Minuta Web |
| `/operaciones/rondas` | `rondas.view` / `operations.view` | Cumplimiento de rondas GPS e informe mensual PDF por puesto |
| `/operaciones/patineta` | `scooter.view` / `operations.view` | Inspecciones preoperacionales de patineta (solo lectura) |
| `/operaciones/control-radio` | `radio_control.view` / `operations.view` | Historial de pasadas del Control de radio (solo lectura) |
| `/control` | `radio_control.view` / `operations.view` | Pantalla de trabajo de Control (marcar radios) |

Crear / editar puestos: `posts.create` / `posts.edit`.

**Nota:** Minuta Virtual **no** aparece en el menú principal del Portal. Los vigilantes usan https://portalcoraza-minuta.onrender.com (`apps/minuta-web`). Detalle: [`MINUTA-VIRTUAL.md`](MINUTA-VIRTUAL.md).

## Inspección patineta eléctrica (PESV)

- Flag por puesto: `posts.tiene_patineta_electrica` (checkbox en editar puesto).
- Vigilante diligencia en Minuta (`/patineta`) si su puesto tiene el flag.
- Operaciones consulta listado + detalle en `/operaciones/patineta`.
- API: `GET/POST /api/v1/scooter-inspections` (permisos `scooter.view` / `scooter.create` o `operations.view` / `minuta.create`).
- Migración: `079_scooter_inspections.sql`.
- Spec: [`superpowers/specs/2026-10-05-inspeccion-patineta-electrica-design.md`](superpowers/specs/2026-10-05-inspeccion-patineta-electrica-design.md).

## Rondas GPS

Cada recorrido es una **sesión** (`rondas_sesiones`: hora de inicio y de fin). Las marcas (`rondas_marcaciones`) cuelgan de esa sesión (`sesion_id`). El vigilante entra a la app de campo con **nombre de la ronda y clave** (`POST /rondas/campo/entrar`); Rondas no identifica al vigilante.

`POST campo/entrar` es público y lleva `AuthRateLimitGuard` (10 intentos/min por IP, en memoria por instancia).

### Informe mensual (PDF, un puesto)

En Cumplimiento (`/operaciones/rondas`) se elige **puesto** y **mes** y se descarga un PDF. Un archivo = un puesto: si hay diez puestos, se generan diez informes, cada uno del puesto que pida administración.

- API: `GET /api/v1/rondas/informe?anio=&mes=&postId=` (`rondas.view`). `postId` es obligatorio.
- Contenido: resumen del mes (recorridos, completos, incompletos, en curso) y, por ronda, cada recorrido con inicio, fin, minutos y la hora de cada punto.
- Archivo: `Informe_Rondas_<puesto>_YYYY-MM.pdf`.
- Código: `rondas-informe.ts` (arma las rondas) y `rondas-informe-pdf.ts` (PDF).

Las marcaciones son inmutables (`trg_rondas_marc_inmutable`): no se editan ni se borran desde la app.

## Control de radio

- Operador (rol Control) marca cada radio del roster con estado (`S/N`, `N/C`, `N/A`, …), hora del equipo y **Observaciones** opcionales por radio.
- Cada ciclo es una **pasada** (`radio_control_passes`); `next-pass` cierra la abierta y abre la siguiente.
- API (`/api/v1/radio-control`): `GET board`, `GET history`, `GET passes/:id`, `PUT check`, `POST fill`, `POST next-pass`.
- Cada acción se audita (`radio_control.check|fill|next_pass`) → aparece en **Historial de movimientos** (pestaña Control) y en **Control de Actividades** (tarjeta Control).
- La hora de la marca es editable y puede quedar adelantada; para medir *uso* del portal, Control de Actividades usa `radio_control_checks.updated_at` (momento real de registro), no `checked_at`.
- Migraciones: `081`–`085` (`radio_control*`).

## Retención de historial (30 días)

- `AUDIT_RETENTION_DAYS = 30` (`audit.service.ts`). Cron `audit-retention-daily` (4:00 AM, `audit-retention.cron.ts`) borra por lotes: `audit_logs`, `associate_history`, `radio_control_checks` y `radio_control_passes` cerradas con más de 30 días.
- `listMovements` (Historial de movimientos) no devuelve nada anterior a 30 días.
- **No** se purgan las tablas operativas `minuta_*` (son registro de negocio, no historial de uso).
- Índices de apoyo: `086_audit_retention_indexes.sql`.
- Control de Actividades lee los agregados desde SQL y las tablas `minuta_*` / `radio_control_*` con el QueryRunner de la request (RLS por tenant); un `DataSource.query` directo devolvería 0 filas.

## API

Reutiliza `PostsModule`:

- `GET /posts`
- `POST /posts` (`posts.create`)
- `PATCH /posts/:id` (`posts.edit`) — incluye `tienePatinetaElectrica`

Minutas ops (módulo `minuta`): historial / PDF mensual por puesto.

Scooter: módulo `scooter-inspections` (ver spec).

## Relación con RRHH

Los **centros de trabajo** en RRHH (`/rrhh/admin/centros`) siguen sincronizando a `posts` vía `syncFromWorkCenter`.  
El catálogo operativo principal para Programación vive en **Operaciones → Puestos**.

El formulario de puesto incluye, además de código/nombre/tipo/estado/cliente/dirección/notas: **zona, contacto, teléfono, contrato, servicios/frentes, armamento, requisitos, instrucciones** y **tiene patineta eléctrica**.

## UI

- Layout: `apps/web/src/app/features/operaciones/`
- Menú: `OPERACIONES_NAV` en `portal-nav.ts`
- Patineta: `scooter-inspections-panel/`
- Minutas: `minutas-list/` · Rondas: `rondas-panel/` (selector de puesto + mes → PDF)
