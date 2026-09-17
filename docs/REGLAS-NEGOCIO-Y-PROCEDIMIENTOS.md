# Portal Coraza — Reglas de negocio y procedimientos

**Versión:** 2026-09-16  
**Audiencia:** gerencia, operaciones, soporte, nómina y desarrollo  
**Objetivo:** entender *cómo funciona* cada módulo sin tener que leer el código.

> Documento de **negocio y operación**. Para setup técnico (`.env`, Render, migraciones) ver `docs/SUPABASE.md`, `docs/DEPLOY-RENDER.md` y `docs/CONTINUAR-DESARROLLO.md`.  
> Minuta vigilante: `[MINUTA-VIRTUAL.md](MINUTA-VIRTUAL.md)` · Operaciones: `[OPERACIONES.md](OPERACIONES.md)`.

---

## Cómo usar este documento

1. Busca el módulo en el índice.
2. Lee **para qué sirve**, **quién puede**, **cómo se usa** y **reglas que no se pueden saltar**.
3. Revisa **integraciones** y **limitaciones conocidas** antes de pedir un cambio.

---



## Índice

1. [Conceptos comunes](#1-conceptos-comunes)
2. [Administración](#2-administración)
3. [Recursos Humanos](#3-recursos-humanos)
4. [Dotación — Inventario](#4-dotación--inventario)
5. [Dotación — Entregas](#5-dotación--entregas)
6. [Dotación — Elementos de puesto](#6-dotación--elementos-de-puesto)
7. [Programación](#7-programación)
8. [Nómina (liquidación)](#8-nómina-liquidación)
9. [Operaciones y Minuta Virtual](#9-operaciones-y-minuta-virtual)
10. [Documental](#10-documental)
11. [Recepción](#11-recepción)
12. [SST](#12-sst)
13. [SIG — Indicadores](#13-sig--indicadores)
14. [Notificaciones](#14-notificaciones)
15. [Dashboard](#15-dashboard)
16. [Firmas y almacenamiento](#16-firmas-y-almacenamiento)
17. [Matriz rápida de roles](#17-matriz-rápida-de-roles)
18. [Fuera de alcance](#18-fuera-de-alcance)

---



## 1. Conceptos comunes



### Login y sesión

- El usuario entra con **email + contraseña**.
- Si la cuenta está **inactiva**, no puede entrar.
- Tras login correcto: token de acceso (~2 h) y refresh (~7 días).
- Los **permisos del rol** van en el token. Si GERENCIA cambia un rol, el usuario lo ve al **volver a iniciar sesión** (o al renovar el access token).



### Permisos

- Formato: `modulo.accion` (ej. `inventory.edit`, `payroll.view`).
- Cada pantalla/API exige uno o más permisos concretos.
- GERENCIA: consulta amplia. En Dotación **no** crea catálogo, no mueve stock ni entrega (escritura de inventario/entregas revocada).
- El rol **AUDITOR** es solo lectura (`*.view` y equivalentes).
- El rol **NOMINA** es solo lectura de RRHH + ver Nómina (sin crear/editar/retirar/importar ni datos sensibles Ley 1581).



### Auditoría

- Acciones importantes (login, usuarios, entregas, retiros, etc.) quedan en bitácora.



### Puestos (`posts`) y alcance

- Un usuario puede tener uno o varios **puestos** (`user_posts`).
- Sirve para amarrar programación, elementos de puesto y **Minuta Virtual** (cuenta `PUESTO`).
- **No existe** módulo Residencial en el portal actual.



### Multi-aplicación


| App        | Quién                               | URL típica               |
| ---------- | ----------------------------------- | ------------------------ |
| Portal web | Oficina / gerencia / RRHH / almacén | `portalcoraza-web`       |
| API        | Backend compartido                  | `portalcoraza` `/api/v1` |
| Minuta web | Vigilantes (rol `PUESTO`)           | `portalcoraza-minuta`    |


---



## 2. Administración

**Rutas:** `/admin`, `/admin/usuarios`, `/admin/roles`  
**Permisos:** `users.view/create/edit`, `roles.view/manage`

### Para qué sirve

Quién entra al portal, qué rol tiene y (vía API) a qué puestos está ligado.

### Procedimiento — crear usuario

1. Administración → Usuarios → crear.
2. Email, contraseña y rol.
3. Si es almacenista: asignar **almacén** (Medellín o Rionegro). Sin almacén no opera.
4. Si es cuenta Minuta (`PUESTO`): vincular **puesto**.
5. Email en minúsculas y único. Preferir `@corazaseguridadcta.com`.



### Reglas


| Regla              | Detalle                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Soft-delete        | “Eliminar” = desactivar (`isActive = false`)                                                  |
| Auto-protección    | No desactivar la propia cuenta                                                                |
| Recuperación admin | Secreto de servidor (`ADMIN_RECOVERY_SECRET`); no hay reset por correo para usuarios normales |
| Roles retirados    | No crear `ADMINISTRADOR_UNIDAD`                                                               |


---



## 3. Recursos Humanos

**Rutas base:** `/rrhh/...`  
RRHH es la **fuente de verdad del personal**. Dotación, Programación y Nómina consumen asociados; no se duplican.

### 3.1 Asociados (Personal / Directorio)

**Rutas:** `/rrhh/asociados`, alta/edición/ficha/reingreso  
**Permisos:** `associates.view/create/edit/retire`, `retirements.readmit`, `hr_sensitive.view`

#### Estados

`ACTIVO` · `INACTIVO` · `SUSPENDIDO` · `VACACIONES` · `RETIRADO`

#### Filtros del Directorio (2026-09)


| Filtro                                        | Qué hace                                                             |
| --------------------------------------------- | -------------------------------------------------------------------- |
| Búsqueda                                      | Documento o nombre                                                   |
| Estado                                        | Chips (Activos, Retirados, etc.)                                     |
| Cargo / centro / nivel educativo / criticidad | Combos; recarga al cambiar                                           |
| Antigüedad                                    | Incluye **menos de 1 mes**, menos de 3 meses, rangos hasta >60 meses |
| **Ingresaron en el mes**                      | Selector de mes → `hireDate` entre primer y último día de ese mes    |


Paginación de a 50. Ficha “completa” = celular + fecha ingreso + cargo.

#### Procedimientos

- **Alta:** documento único; si ya existe como `RETIRADO` → **reingreso**, no alta nueva.
- **Retiro:** pasa a `RETIRADO`; encuesta/liquidación en submódulo Retiros.
- **Reingreso:** solo `RETIRADO`; nueva fecha de ingreso y cargo → vuelve `ACTIVO`.



#### Reglas


| Regla                      | Detalle                                              |
| -------------------------- | ---------------------------------------------------- |
| Documento único            | Una cédula = una persona                             |
| Datos sensibles (Ley 1581) | Solo con `hr_sensitive.view` (GERENCIA/RRHH típicos) |
| Dotación                   | Solo `ACTIVO` o `VACACIONES`                         |




### 3.2 Retiros

**Ruta:** `/rrhh/retiros`  
**Permisos:** `retirements.view/create/edit/readmit`

- Lista con paginación.
- Filtro **Se retiraron en el mes** → rango sobre `retirementDate`.
- Al crear retiro se congela edad/antigüedad al momento del retiro.



### 3.3 Ausentismo

**Ruta:** `/rrhh/ausentismo` · `absences.`*  
Registro e importación Excel (por cédula). GERENCIA/RRHH gestionan; otros pueden tener solo `absences.view`.

### 3.4 Cargos, centros y catálogos

**Rutas:** `/rrhh/admin/...` · `job_positions.`*, `work_centers.*`, `catalogs.*`  
Alimentan formularios y **filtros** del directorio (por eso un rol de solo lectura necesita los `.view` de cargos/centros/catálogos).

### 3.5 Panel / alertas / matriz SST / bitácora / import

- Panel: `hr_dashboard.view`
- Alertas: `hr_alerts.*`
- Matriz SST: `hr_compliance.view`
- Bitácora: `hr_audit.view`
- Import Excel: `hr_import.execute` (solo perfiles de escritura)

---



## 4. Dotación — Inventario

**Rutas:** `/dotacion/inventario` · `inventory.`*  
**Almacenes:** Medellín y Rionegro. Catálogo compartido; stock **por variante y almacén**.


|                       | Ve stock | Crea/edita | Mueve stock  | Traslado      |
| --------------------- | -------- | ---------- | ------------ | ------------- |
| Almacenista (su sede) | todo     | sí         | solo su sede | desde su sede |
| GERENCIA              | todo     | no         | no           | no            |


Usuario de almacén debe tener `warehouse_id`. Tras cambiar sede/permisos: **relogin**.

---



## 5. Dotación — Entregas

**Rutas:** `/dotacion/asociados` · `deliveries.view/create/sign`


| Regla        | Detalle                                            |
| ------------ | -------------------------------------------------- |
| Destinatario | Asociado `ACTIVO` o `VACACIONES`                   |
| Stock        | Descuenta del almacén del almacenista              |
| Firma        | Confirma entrega; imagen en bucket privado vía API |


---



## 6. Dotación — Elementos de puesto

**Permisos:** `post_equipment.`*  
Catálogo → unidades numeradas → asignar a puesto (`AVAILABLE` → `ASSIGNED`) → devolver. No hay “Eliminar” de catálogo en la app.

---



## 7. Programación

**Rutas:** `/programacion`, `/programacion/cuadro`, `/programacion/alertas`, `/programacion/recargos`  
**Permisos:** `scheduling.view/create/edit`

### Para qué sirve

Cuadro mensual de turnos por **puesto**. Panel con KPIs. Vista multi-puesto (matriz) retirada.

### Reglas


| Regla              | Detalle                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Sin solapamiento   | Misma persona, mismo día/franja, dos puestos → alerta de conflicto                                                                |
| Fechas pasadas     | No editar turnos de hoy o del pasado (reglas del cuadro)                                                                          |
| Publicación        | Borrador → publicado                                                                                                              |
| Alertas del puesto | Banner “hoy en adelante”; botón **Detalles** lista alertas **solo de ese puesto** (huecos, conflictos, no disponibles, carga >24) |
| Recargos           | `/programacion/recargos` calcula **horas** (ordinarias, extras, nocturno, dom/fest) desde la malla para alimentar nómina          |




### Integración

Consume asociados (RRHH) y puestos (Operaciones). Códigos típicos: `D`, `N`, `D8`, `N8`, `N10`, descansos y novedades (`DR`, `NR`, `VAC`, `LC`, `IN`, …).

---



## 8. Nómina (liquidación)

**Ruta:** `/nomina`  
**Permisos:** `payroll.view`, `payroll.calculate` (y export si aplica)  
**Rol típico de consulta:** `NOMINA`

### Para qué sirve

Módulo encargado de la **liquidación de vigilantes / asociados**: periodos, liquidar y colillas.

### Flujo de negocio

1. Crear **periodo** (nombre, fechas) → estado `BORRADOR`.
2. **Liquidar nómina** → lee asignaciones del mes en la malla (`schedule_assignments`).
3. Genera **colilla** por asociado activo + detalle de conceptos.
4. Estado → `LIQUIDADO` (no se reliquida si estuviera cerrado).



### Reglas actuales del cálculo (código vigente)


| Tema                | Regla                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| Fuente              | Cuadro mensual (año/mes del inicio del periodo)                             |
| Quién entra         | Asociados en estado `ACTIVO`                                                |
| Sin turnos en malla | Hoy asume 30 días base (limitación conocida; revisar en unificación futura) |
| Básico              | SMMLV 2026 referencial en el motor actual                                   |
| Aux. transporte     | Si básico ≤ 2 SMMLV                                                         |
| Recargos            | Noche ordinaria y dominicales/festivos según códigos D/N/D8/N8              |
| Deducciones         | Salud 4% + pensión 4% sobre el básico                                       |
| Contabilidad        | **Retirada** — ya no se generan asientos PUC al liquidar                    |




### Relación con Programación / Recargos

Hay **dos motores** que aún no están unificados:

1. **Programación → Recargos:** horas y factores (reporte / Excel).
2. **Nómina → Liquidar:** pesos y colillas (vuelve a leer la malla con su propia fórmula).

Meta de producto: que la colilla consuma la misma lógica de horas que Recargos.

### Contabilidad (retirada)

El módulo Contabilidad / PUC / comprobantes **ya no forma parte del producto**. Tablas antiguas pueden existir en BD; la UI y la API de contabilidad se eliminaron. La liquidación vive solo en **Nómina**.

---



## 9. Operaciones y Minuta Virtual



### 9.1 Operaciones (Portal)

**Rutas:** `/operaciones`, `/operaciones/puestos`, `/operaciones/minutas`  
**Permisos:** `operations.view` / `posts.view` (y create/edit de puestos)

- Catálogo operativo de **puestos**.
- Supervisión de minutas: historial / PDF por puesto y mes; enlace a Minuta Web; cuentas `PUESTO`.

Detalle: `[OPERACIONES.md](OPERACIONES.md)`.

### 9.2 Minuta Virtual (app aparte)

**App:** `apps/minuta-web` · rol `PUESTO`  
**Permisos:** `minuta.view`, `minuta.create`


| Regla          | Detalle                                                  |
| -------------- | -------------------------------------------------------- |
| Alcance        | Cuenta ligada a puesto (`user_posts`)                    |
| Registros      | Inmutables (sin edición posterior)                       |
| Quién registra | Vigilante escribe su nombre; la hora la pone el sistema  |
| Portal         | No muestra Minuta en el menú principal; solo Operaciones |


Detalle: `[MINUTA-VIRTUAL.md](MINUTA-VIRTUAL.md)`.

---



## 10. Documental

**Rutas:** `/documental/...` · `documental.view/create/manage`  
SGD nativo: radicación, TRD, préstamos, biblioteca, etc. Contadores al crear; préstamos con máquina de estados.

---



## 11. Recepción

**Rutas:** `/recepcion` · `reception.view/register/exit` · rol típico `RECEPCIONISTA`

Ingreso/salida en sede. Con cédula cruza RRHH (`ACTIVO`/`VACACIONES`) → etiqueta **Asociado** o **Visitante**. Historial permanente (se cierra con salida, no se borra).

---



## 12. SST

**Ruta:** `/sst` · `sst.view` (y permisos de gestión según seed)  
Inspecciones / salud y seguridad en el trabajo; PDFs con membrete corporativo cuando aplica.

---



## 13. SIG — Indicadores

**Ruta:** `/sig` · `sig.view`  
Indicadores de gestión / calidad según el módulo SIG cargado.

---



## 14. Notificaciones

Campana en el layout · `notifications.view/read`  
Backend crea avisos; Realtime Supabase sobre `notifications` filtrado por usuario.

---



## 15. Dashboard

**Ruta:** `/dashboard` · permiso `dashboard.view` (command center) u otros según rol  
Widgets según perfil. Cada módulo suele abrir con panel de KPIs propio.

---



## 16. Firmas y almacenamiento


| Tema              | Regla                                                      |
| ----------------- | ---------------------------------------------------------- |
| Firmas de entrega | Solo API con service role; bucket privado                  |
| Frontend          | Nunca lleva la service role                                |
| Membrete PDF      | Assets corporativos (`MENBRETE` / `public/brand/membrete`) |


---



## 17. Matriz rápida de roles

> Orientativa según seeds. Verificar en Administración → Roles si hubo cambios manuales.


| Rol (código)            | Enfoque típico                                                   |
| ----------------------- | ---------------------------------------------------------------- |
| `GERENCIA`              | Supervisión / consulta amplia; Dotación sin mover stock          |
| `RRHH`                  | Personal completo (escritura), alertas, retiros, datos sensibles |
| `NOMINA`                | **Solo lectura** RRHH (con filtros) + ver Nómina                 |
| `ALMACENISTA`           | Inventario y entregas de **su** almacén                          |
| `PROGRAMADOR`           | Turnos / cuadro / alertas / recargos                             |
| `RECEPCIONISTA`         | Recepción sede                                                   |
| `PUESTO`                | Minuta Virtual (app vigilante)                                   |
| `SUPERVISOR`            | Consulta operativa / dashboard                                   |
| `COORDINADOR_OPERATIVO` | Consulta laboral sin datos sensibles (según seed)                |
| `AUDITOR`               | Solo lectura en todos los módulos                                |
| `PILOTO_PLAN`           | Perfil acotado de piloto (según seed vigente)                    |




### Usuario de referencia Nómina (producción)

- Email: `nomina@corazaseguridadcta.com`
- Rol: `NOMINA`
- Alcance: visualizar Gestión Humana (filtros incluidos) y módulo Nómina; sin escritura.

---



## 18. Fuera de alcance


| Ítem                                                 | Estado                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Contabilidad / PUC / comprobantes                    | **Retirado** del producto (2026-09)                                        |
| Residencial (`/residential`, `ADMINISTRADOR_UNIDAD`) | **Retirado**                                                               |
| Video suelto `VIDEO LOGIN/` (MP4 cocodrilo)          | **Eliminado** del repo; login usa `apps/web/public/videos/coraza-logo.mp4` |


---



## Glosario corto


| Término         | Significado                                              |
| --------------- | -------------------------------------------------------- |
| Asociado        | Persona de planta en RRHH                                |
| Puesto (`Post`) | Ubicación/servicio operativo                             |
| Malla / cuadro  | Programación mensual de turnos                           |
| Colilla         | Resultado de liquidación por persona en un periodo       |
| Minuta          | Registro de novedades/accesos del puesto (app vigilante) |
| Soft-delete     | Desactivar sin borrar histórico                          |


---



## Mantenimiento de este documento

Al cambiar una regla de negocio en código:

1. Actualizar la sección del módulo aquí.
2. Anotar fecha en la cabecera (**Versión**).
3. Si afecta roles, actualizar la matriz (§17) y “Fuera de alcance” (§18).

Docs relacionadas: `[RENDIMIENTO.md](RENDIMIENTO.md)` · `[OPERACIONES.md](OPERACIONES.md)` · `[MINUTA-VIRTUAL.md](MINUTA-VIRTUAL.md)` · `[CONTINUAR-DESARROLLO.md](CONTINUAR-DESARROLLO.md)`.