# Portal Coraza — Reglas de negocio y procedimientos

**Versión:** 2026-08-19  
**Audiencia:** gerencia, operaciones, soporte y desarrollo  
**Objetivo:** entender *cómo funciona* cada módulo sin tener que leer el código.

> Documento de **negocio y operación**. Para setup técnico (`.env`, Render, migraciones) ver `docs/SUPABASE.md`, `docs/DEPLOY-RENDER.md` y `docs/CONTINUAR-DESARROLLO.md`.

---

## Cómo usar este documento

1. Busca el módulo en el índice.
2. Lee **para qué sirve**, **quién puede**, **cómo se usa** y **reglas que no se pueden saltar**.
3. Revisa **integraciones** y **limitaciones conocidas** antes de pedir un cambio.

---

## Índice

1. [Conceptos comunes (login, permisos, auditoría)](#1-conceptos-comunes)
2. [Administración (usuarios y roles)](#2-administración)
3. [Recursos Humanos](#3-recursos-humanos)
4. [Dotación — Inventario](#4-dotación--inventario)
5. [Dotación — Entregas a personas / puestos](#5-dotación--entregas)
6. [Dotación — Elementos de puesto](#6-dotación--elementos-de-puesto)
7. [Programación](#7-programación)
8. [Documental](#8-documental)
9. [Recepción](#9-recepción)
10. [Notificaciones](#10-notificaciones)
11. [Dashboard y paneles por módulo](#11-dashboard-y-paneles-por-módulo)
12. [Firmas y almacenamiento (Supabase)](#12-firmas-y-almacenamiento)
13. [Matriz rápida de roles](#13-matriz-rápida-de-roles)

---

## 1. Conceptos comunes

### Login y sesión

- El usuario entra con **email + contraseña**.
- Si la cuenta está **inactiva**, no puede entrar.
- Tras login correcto se generan tokens: acceso (~2 h) y refresh (~7 días).
- Los **permisos del rol** viajan dentro del token de acceso. Si GERENCIA cambia permisos de un rol, el usuario los ve al **volver a iniciar sesión** o cuando expire el access token.

### Permisos

- Formato: `modulo.accion` (ej. `inventory.edit`, `deliveries.sign`).
- GERENCIA tiene acceso amplio de **consulta**. En Dotación **no** crea catálogo, no mueve stock ni entrega (permisos de escritura de inventario/entregas revocados).
- Cada pantalla/API exige uno o más permisos concretos.
- El rol **AUDITOR** solo tiene permisos de consulta (`*.view` y equivalentes de lectura).

### Auditoría

- Acciones importantes (login, crear/editar usuarios, confirmar entrega, retiro de asociado, etc.) quedan registradas en bitácora de auditoría.

### Puestos (`posts`) y alcance

- Un usuario puede tener uno o varios **puestos** asignados (`user_posts`).
- Sirve para amarrar operación (p. ej. programación / elementos de puesto) al alcance del usuario.
- **No existe** módulo Residencial en el portal actual; el rol `ADMINISTRADOR_UNIDAD` está **retirado**.

---

## 2. Administración

**Rutas:** `/admin` (panel), `/admin/usuarios`, `/admin/roles`  
**Permisos:** `users.view/create/edit`, `roles.view/manage`

### Para qué sirve

Gestionar quién entra al portal, qué rol tiene y (vía API) a qué puestos está ligado. El **panel** muestra conteos de usuarios activos/inactivos, roles y últimos usuarios creados.

### Procedimiento — crear usuario

1. Administración → Usuarios → crear.
2. Definir email, contraseña y rol.
3. Si el rol es almacenista, asignar **almacén** (Medellín o Rionegro). Sin almacén no puede ingresar ni entregar.
4. El email se guarda en minúsculas y debe ser único.
5. Preferir dominio corporativo `@corazaseguridadcta.com` cuando aplique la política vigente.

### Procedimiento — desactivar usuario

1. No se borra físicamente: se **desactiva** (`isActive = false`).
2. Un usuario **no puede desactivarse a sí mismo**.
3. Al resetear o cambiar clave se invalidan sesiones (refresh tokens).

### Procedimiento — cambiar mi clave

1. Menú de perfil → cambio de contraseña.
2. Debe indicar la clave actual.
3. La nueva debe ser distinta de la actual.

### Reglas

| Regla | Detalle |
|-------|---------|
| Email único | No dos usuarios con el mismo email |
| Soft-delete | “Eliminar” = desactivar |
| Auto-protección | No desactivar/eliminar la propia cuenta |
| Recuperación admin | Existe flujo de emergencia con secreto de servidor (`ADMIN_RECOVERY_SECRET`); no es recuperación por correo |
| Roles retirados | No crear ni reactivar `ADMINISTRADOR_UNIDAD` (residencial fuera de alcance) |

### Limitaciones

- La asignación de puestos a usuarios existe en API; la UI de puestos por usuario puede estar incompleta.
- No hay recuperación de contraseña por email para usuarios normales: la resetea un admin.

---

## 3. Recursos Humanos

**Rutas base:** `/rrhh/...`  
RRHH es la **fuente de verdad del personal**. Dotación y Programación consumen asociados; no se duplican.

### 3.1 Asociados

**Rutas:** `/rrhh/asociados`, alta/edición/ficha/reingreso  
**Permisos:** `associates.view/create/edit/retire`, `retirements.readmit`, `hr_sensitive.view`

El **Directorio** pagina de a 50. Filtros: búsqueda, estado, cargo, centro de trabajo, **nivel educativo** (catálogo `NIVEL_ESTUDIO`: bachiller, técnico, tecnólogo, profesional, etc.) y criticidad. Al elegir un valor en el combo, la lista se recarga sola (no hay botón “Aplicar”). La tabla muestra la columna **Nivel educativo**.

#### Estados del asociado

`ACTIVO` · `INACTIVO` · `SUSPENDIDO` · `VACACIONES` · `RETIRADO`

#### Procedimiento — alta

1. Crear asociado con documento y datos de contrato/contacto.
2. Si el documento ya existe en estado distinto de retirado → se bloquea el duplicado.
3. Si existe como `RETIRADO` → usar **reingreso**, no un alta nueva.

#### Procedimiento — retiro

1. Desde la ficha, retirar (`associates.retire`).
2. Pasa a `RETIRADO`.
3. La encuesta/liquidación detallada se gestiona en el submódulo de **Retiros**.

#### Procedimiento — reingreso

1. Solo si está `RETIRADO`.
2. Exige nueva fecha de ingreso y cargo.
3. Vuelve a `ACTIVO` y registra historial de cargo.

#### Reglas

| Regla | Detalle |
|-------|---------|
| Documento único | La cédula/documento identifica a una sola persona en el sistema |
| Datos sensibles (Ley 1581) | Raza, religión, orientación sexual, etc. solo visibles con `hr_sensitive.view` (típicamente GERENCIA/RRHH); el resto ve datos enmascarados |
| Historial de cargos | Cambiar cargo genera registro en historial |
| Dotación | Solo se entrega a asociados en `ACTIVO` o `VACACIONES` |

### 3.2 Ausentismo

**Ruta:** `/rrhh/ausentismo`  
**Permisos:** `absences.view/create/edit/delete/import`

- Registro de ausencias médicas u otras.
- Importación Excel posible (hojas de ausentismo / CIE-10), emparejando por cédula.
- GERENCIA/RRHH gestionan; otros roles pueden tener solo consulta según seed.

### 3.3 Cargos, centros y catálogos

**Rutas:** `/rrhh/admin/cargos`, centros, catálogos  
**Permisos:** `job_positions.*`, `work_centers.*`, `catalogs.*`

Catálogos maestros (EPS, género, motivos de retiro, etc.) alimentan formularios de asociados y reportes.

### 3.4 Panel RRHH / alertas / matriz SST / bitácora

- Panel (`hr_dashboard.view`): KPIs, rotación, demografía.
- Alertas HR, matriz de cumplimiento SST y bitácora HR según permisos `hr_alerts.*`, `hr_audit.view`.

---

## 4. Dotación — Inventario

**Rutas:** `/dotacion/inventario`, historial de movimientos  
**Permisos:** `inventory.view/create/edit/move/alerts`  
**Roles:** ALMACENISTA (escribe en su sede), GERENCIA (solo ve)

Hay **dos almacenes físicos**: Medellín y Rionegro. El catálogo (camisa, pantalón, botas, tallas) es **el mismo**. El stock es **por variante y almacén**. Cada prenda nace con líneas **hombre y mujer**.

### Quién puede qué

| | Ve stock e historial | Crea/edita elementos | Ingreso, entrega, ajuste | Traslado desde su sede |
|---|---|---|---|---|
| Almacenista Medellín | todo | sí | solo Medellín | Medellín → Rionegro |
| Almacenista Rionegro | todo | sí | solo Rionegro | Rionegro → Medellín |
| GERENCIA | todo | no | no | no |

El usuario de almacén debe tener `warehouse_id`. Tras un cambio de sede o permisos: **volver a iniciar sesión**.

### Procedimiento — ingreso

1. Inventario → en la línea (género/talla) **+ stock**.
2. Cantidad y motivo (compra, devolución, etc.).
3. Suma solo al almacén del usuario. No se puede cargar al almacén contrario.

### Procedimiento — traslado

1. Misma fila → **traslado**.
2. Sale del almacén propio y entra al otro. Requiere stock suficiente en origen.
3. Queda en historial: origen → destino, cantidad y quién lo hizo.

### Historial

Ingresos, salidas, ajustes, traslados, entregas y **quién creó o editó un elemento**.

### Alertas

Stock bajo se evalúa **por almacén** frente al umbral del ítem.

---

## 5. Dotación — Entregas

**Rutas:** `/dotacion/asociados`, historial, firma  
**Permisos:** `deliveries.view/create/sign`

### Reglas

| Regla | Detalle |
|-------|---------|
| Destinatario | Asociado `ACTIVO` o `VACACIONES` |
| Almacén | La entrega descuenta stock **del almacén del almacenista** que la crea/firma |
| Firma | Confirma la entrega; imagen en bucket privado vía API |
| Reversión | Solo con flujo/permiso previsto (ventana 5 días); devuelve stock al mismo almacén |

---

## 6. Dotación — Elementos de puesto

**Rutas:** catálogo / asignación de elementos de puesto  
**Permisos:** `post_equipment.view/assign/return/manage`

### Procedimiento típico

1. Definir tipo de elemento en catálogo.
2. Puede generar unidades físicas numeradas.
3. Asignar unidad `AVAILABLE` a un puesto → `ASSIGNED`.
4. Al devolver, la unidad queda disponible o dada de baja según el resultado.

### Reglas

| Regla | Detalle |
|-------|---------|
| **No hay Eliminar en catálogo** | Hoy no existe borrado de tipos/unidades en la aplicación |
| Una unidad asignada | No se reasigna sin devolver antes |

---

## 7. Programación

**Rutas:** `/programacion` (panel), `/programacion/matriz`, `/programacion/cuadro`  
**Permisos:** `scheduling.view/create/edit`

### Para qué sirve

Turnos de personal por puesto (matriz mensual / cuadro). El **panel** resume puestos del mes, asignaciones, conflictos y plantillas.

### Reglas

| Regla | Detalle |
|-------|---------|
| Sin solapamiento | Un asociado no puede quedar en conflicto el mismo día en dos puestos (detector de conflictos) |
| Fechas pasadas | No se editan ni eliminan turnos de hoy o del pasado; solo futuros (reglas del cuadro) |
| Publicación | Al publicar matriz mensual se puede notificar a GERENCIA |
| Motor automático | Puede regenerar asignaciones del mes (sobrescribe las existentes del schedule) |

### Integración

Consume asociados (RRHH) y puestos. El alcance por puestos del rol PROGRAMADOR debe respetarse operativamente cuando el usuario tenga puestos asignados.

**Cargado (2026-08-19):** 226 puestos desde la BD de programación (`puestos` → `posts`). Se conservaron los UUID de origen. Usuarios/roles del Portal no se tocaron. Los centros de trabajo RRHH (33) no coinciden por código con `MED-####`; `work_center_id` queda vacío. El formulario de Operaciones cubre zona, contacto, teléfono, prioridad, contrato, tipo de servicio, armamento, requisitos e instrucciones. **No se migran** turnos ni asignaciones de esa BD hasta un plan de bajo error aparte.

---

## 8. Documental

**Rutas:** `/documental` (panel), correspondencia, minutas, contratos, préstamos, biblioteca, TRD, workflows, buscador, informes, …  
**Permisos:** `documental.view/create/manage`

### Para qué sirve

SGD nativo del portal (ya no hay redirección a Google Apps Script): radicación, TRD, préstamos, biblioteca, asociados retirados documentales, etc.

### Reglas clave

- `documental.view` → consulta / paneles / listados.
- `documental.create` → altas (correspondencia, minutas, etc.).
- `documental.manage` → administración (TRD, workflows, estados de préstamo, etc.).
- Contadores / consecutivos se consumen al crear (no reutilizar números).
- Préstamos siguen máquina de estados (pendiente → prestado → devuelto / vencido, etc.).

### Limitaciones

- Algunas funciones avanzadas (import histórico Excel, UI pública de préstamos) pueden estar pendientes o parciales; ver plan SGD si aplica.

---

## 9. Recepción

**Rutas:** `/recepcion` (panel), registrar, dentro, historial  
**Permisos:** `reception.view/register/exit`  
**Rol típico:** RECEPCIONISTA (+ GERENCIA / otros según seed)

### Para qué sirve

Control de ingreso/salida de visitantes a **sede**. Al registrar con cédula, el sistema cruza con RRHH (ACTIVO / VACACIONES) y etiqueta **Asociado** o **Visitante** (se guarda y se ve en Dentro, Historial y PDF).

### Procedimiento

1. **Registrar** ingreso (muchos campos son opcionales). Si hay cédula, aparece la etiqueta Asociado/Visitante.
2. Ver quién está **dentro** (con la misma etiqueta).
3. Registrar **salida** (no se borra el registro: se cierra con hora de salida). La pantalla **no** salta al historial: se puede dar salida a varios seguidos desde “Visitantes dentro” o el panel.
4. Consultar **historial** (y PDF de historial si aplica).

### Reglas

| Regla | Detalle |
|-------|---------|
| Historial permanente | No hay borrado de visitas; se cierra con salida |
| Asociado vs Visitante | Por documento (solo dígitos) contra asociados ACTIVO/VACACIONES; se guarda al registrar |

---

## 10. Notificaciones

**UI:** campana en el layout principal  
**Permisos:** `notifications.view/read`

### Cómo funciona

1. El backend crea notificaciones dirigidas a usuarios/roles (retiros, alertas HR, programación, etc.).
2. El usuario las ve en la campana.
3. Marcar leída es acción explícita.
4. Tiempo real: el navegador escucha eventos de la tabla `notifications` (Realtime Supabase), filtrados por `user_id`.

### Requisito operativo

La tabla debe estar en la publicación Realtime (migración `025` / Replication en Dashboard).

---

## 11. Dashboard y paneles por módulo

**Ruta global:** `/dashboard`

Widgets según rol (ejemplos):

- **GERENCIA:** asociados activos, entregas pendientes, señales documentales, etc.
- **SUPERVISOR:** entregas, novedades, turnos del día.
- Si un módulo falla, el dashboard tiende a mostrar ceros en lugar de romper toda la pantalla.

Además, cada módulo operativo abre en un **panel de estadísticas** (KPIs + listas/gráficos cortos): RRHH, Dotación, Programación, Documental, Recepción y Administración. El overview de RRHH (`hr_dashboard.view`) concentra métricas demográficas, rotación y cumplimiento.

---

## 12. Firmas y almacenamiento

| Tema | Regla |
|------|--------|
| Quién sube/baja firmas | Solo la **API** con `SUPABASE_SERVICE_ROLE_KEY` |
| Bucket | `delivery-signatures`, **privado** |
| Quién ve la imagen | Usuario autenticado con `deliveries.view` vía `GET /deliveries/:id/signature` |
| Frontend | Nunca lleva la service role |

Variables relevantes en API: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, opcional `SUPABASE_SIGNATURE_BUCKET`.

---

## 13. Matriz rápida de roles

> Orientativa según seeds. GERENCIA concentra acceso amplio. Verificar en Administración → Roles si hubo cambios manuales.

| Rol (código) | Enfoque típico |
|--------------|----------------|
| `GERENCIA` | Supervisión / consulta amplia; en Dotación no mueve stock |
| `RRHH` | Asociados, alertas, retiros, datos sensibles |
| `ALMACENISTA` | Inventario y entregas **de su almacén** (Medellín o Rionegro) |
| `PROGRAMADOR` | Turnos / matriz |
| `RECEPCIONISTA` | Recepción sede |
| `SUPERVISOR` | Consulta operativa / dashboard |
| `COORDINADOR_OPERATIVO` | Operación / consultas según seed |
| `VIGILANTE` | Alcance limitado (según permisos asignados) |
| `AUDITOR` | Solo lectura en todos los módulos (`*.view`) |

### Fuera de alcance

| Rol / módulo | Estado |
|--------------|--------|
| `ADMINISTRADOR_UNIDAD` | **Retirado** — no usar |
| Residencial (`/residential`, permisos `residential.*`) | **Retirado** del producto (migración `028`) |

---

## Glosario corto

| Término | Significado |
|---------|-------------|
| Asociado | Persona de nómina/planta en RRHH |
| Puesto (`Post`) | Ubicación/servicio operativo |
| Variante | Ítem de inventario con talla/género/etc. |
| Almacén | Sede física de stock: Medellín o Rionegro |
| Traslado | Sale de un almacén y entra al otro; no es una compra |
| Entrega | Dotación personal (o a puesto) con firma |
| Elemento de puesto | Activo físico asignable a un puesto |
| Soft-delete | Desactivar sin borrar histórico |
| AUDITOR | Usuario de consulta sin capacidad de modificación |

---

## Mantenimiento de este documento

Al cambiar una regla de negocio en código:

1. Actualizar la sección del módulo aquí.
2. Anotar fecha en la cabecera.
3. Si el cambio afecta roles, actualizar la matriz de la sección 13.

Rendimiento (pool, paginación, techos): [`docs/RENDIMIENTO.md`](RENDIMIENTO.md). Persistencia de inventario: [`docs/INVENTARIO_PERSISTENCIA.md`](INVENTARIO_PERSISTENCIA.md).
