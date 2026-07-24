# Portal Coraza — Reglas de negocio y procedimientos

**Versión:** 2026-07-24  
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
9. [Residencial](#9-residencial)
10. [Recepción](#10-recepción)
11. [Notificaciones](#11-notificaciones)
12. [Dashboard](#12-dashboard)
13. [Firmas y almacenamiento (Supabase)](#13-firmas-y-almacenamiento)
14. [Matriz rápida de roles](#14-matriz-rápida-de-roles)

---

## 1. Conceptos comunes

### Login y sesión

- El usuario entra con **email + contraseña**.
- Si la cuenta está **inactiva**, no puede entrar.
- Tras login correcto se generan tokens: acceso (~2 h) y refresh (~7 días).
- Los **permisos del rol** viajan dentro del token de acceso. Si GERENCIA cambia permisos de un rol, el usuario los ve al **volver a iniciar sesión** o cuando expire el access token.

### Permisos

- Formato: `modulo.accion` (ej. `inventory.edit`, `deliveries.sign`).
- GERENCIA suele tener todos los permisos de negocio.
- Cada pantalla/API exige uno o más permisos concretos.

### Auditoría

- Acciones importantes (login, crear/editar usuarios, confirmar entrega, retiro de asociado, etc.) quedan registradas en bitácora de auditoría.

### Puestos (`posts`) y aislamiento

- Un usuario puede tener uno o varios **puestos** asignados.
- En **Residencial**, quien no es GERENCIA solo ve datos de sus puestos.
- Si un usuario no tiene puestos y no es GERENCIA, en Residencial verá **listas vacías**.

---

## 2. Administración

**Rutas:** `/admin/usuarios`, `/admin/roles`  
**Permisos:** `users.view/create/edit`, `roles.view/manage`

### Para qué sirve

Gestionar quién entra al portal, qué rol tiene y (vía API) a qué puestos está ligado.

### Procedimiento — crear usuario

1. Administración → Usuarios → crear.
2. Definir email, contraseña y rol.
3. El email se guarda en minúsculas y debe ser único.

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

| Regla | Detalle |
|-------|---------|
| Sin borrado de cargos/centros | Solo crear/editar (no DELETE) |
| Catálogos | Se activan/desactivan; no se “borran” del histórico |
| Centros → puestos | Existe sincronización centro de trabajo RRHH → puesto operativo (`Post`) |

### 3.4 Alertas HR

**Ruta:** `/rrhh/alertas`  
**Permisos:** `hr_alerts.view/resolve/run_cron`

- Avisa vencimientos de curso, psicofísico, psicosensométrico, póliza y documentos faltantes.
- Umbrales típicos: **60 / 30 / 7 días** (y vencido).
- Solo asociados `ACTIVO`.
- No duplica la misma alerta pendiente.
- Se puede ejecutar el motor de alertas con permiso `hr_alerts.run_cron`.

### 3.5 Documentos del asociado (HR)

**Permisos:** `hr_documents.view/upload/delete`

- Tipos: cédula, certificados, exámenes, póliza, contrato, acta, otro.
- La fecha de vencimiento alimenta el motor de alertas.

### 3.6 Retiros (encuesta / liquidación)

**Rutas:** `/rrhh/retiros`  
**Permisos:** `retirements.view/create/edit/readmit`

- Complementa el cambio de estado a `RETIRADO`.
- Incluye motivos/razones de catálogo, liquidación y encuesta de salida.

---

## 4. Dotación — Inventario

**Rutas:** `/dotacion/inventario`, nuevo, editar  
**Permisos:** `inventory.view/create/edit/move/alerts`  
**Rol típico:** ALMACENISTA, GERENCIA

### Para qué sirve

Catálogo de **elementos de dotación personal** (uniformes, etc.): categorías, ítems, variantes (talla/género/color) y stock.

### Procedimiento — crear elemento

1. Inventario → Agregar elemento.
2. Definir código, nombre, categoría, umbral de stock bajo.
3. Crear variantes (talla/género) con stock inicial si aplica.

### Procedimiento — movimientos de stock

1. Entradas / salidas / ajustes quedan en historial de movimientos.
2. El descuento definitivo por entrega ocurre al **firmar** la entrega (no al crear el borrador).

### Procedimiento — eliminar elemento de inventario

1. Botón **Eliminar** en la lista (requiere `inventory.edit`).
2. **No se puede** si alguna variante ya se usó en una entrega.
3. Si se puede, borra variantes, movimientos asociados y el ítem.

### Reglas

| Regla | Detalle |
|-------|---------|
| Código / SKU únicos | Ítem y variantes no se duplican |
| Stock insuficiente | Bloquea la confirmación de entrega |
| Alertas de stock bajo | Según umbral del ítem |

---

## 5. Dotación — Entregas

**Rutas:** panel, asociados, firmar entrega, historial de movimientos, sin dotación  
**Permisos:** `deliveries.view/create/sign/revert`

### Estados de una entrega

`PENDING` → `DELIVERED` → (opcional) `REVERTED`

### Procedimiento — entregar a un asociado

1. Elegir asociado elegible (`ACTIVO` o `VACACIONES`).
2. Armar líneas (variante + cantidad) y crear entrega → queda `PENDING`.
3. Firmar en tablet/PC (`deliveries.sign`):
   - Valida stock.
   - Descuenta inventario.
   - Guarda firma.
   - Pasa a `DELIVERED` e inmutable.

### Procedimiento — entregar a un puesto

1. Misma lógica, pero destino = **puesto**, no asociado.
2. Una entrega es **asociado O puesto**, nunca ambos ni ninguno.

### Procedimiento — revertir

1. Solo entregas `DELIVERED`.
2. Ventana máxima: **120 horas (5 días)** desde `deliveredAt`.
3. Motivo obligatorio.
4. Restaura stock y marca `REVERTED`.

### Procedimiento — ver firma / PDF

1. Historial o listados muestran la firma vía API autenticada (no enlace público del Storage).
2. Reportes PDF (general / por ítem / por asociado) requieren permisos de inventario/vista según endpoint.

### Reglas

| Regla | Detalle |
|-------|---------|
| Destinatario | Asociado **o** puesto |
| Elegibilidad | Solo `ACTIVO` / `VACACIONES` |
| Stock al firmar | El descuento es en la firma, no al crear |
| Reversión | ≤ 5 días (120 h) |
| Firmas | Bucket privado; solo con login + permiso |

### Indicador “Sin dotación 7+ meses”

Lista asociados activos/vacaciones sin entrega firmada reciente (meses configurables; por defecto 7).

---

## 6. Dotación — Elementos de puesto

**Rutas:** `/dotacion/elementos`, puestos, detalle  
**Permisos:** `post_equipment.view/manage/assign/return`

### Para qué sirve

Equipo físico de **puestos** (sombrillas, radios, etc.), distinto del inventario de uniformes.

### Procedimiento — crear tipo de elemento

1. Elementos → crear (código + nombre; resto opcional).
2. Puede generar unidades físicas numeradas.

### Procedimiento — asignar / devolver

1. Asignar unidad `AVAILABLE` a un puesto → `ASSIGNED`.
2. Devolver solo si está asignada → `RETURNED`, `LOST` o `WRITTEN_OFF` según el caso.
3. Al devolver, la unidad queda disponible o dada de baja según el resultado.

### Reglas

| Regla | Detalle |
|-------|---------|
| **No hay Eliminar en catálogo** | Hoy no existe borrado de tipos/unidades en la aplicación |
| Una unidad asignada | No se reasigna sin devolver antes |
| Conteos | Total / disponibles / en puestos se calculan en vivo |

> Si se necesita “quitar” un tipo, hoy es limitación de producto (no es falta de permiso de almacén).

---

## 7. Programación

**Ruta:** `/programacion`  
**Permisos:** `scheduling.view/create/edit`

### Para qué sirve

Turnos de personal por puesto (matriz mensual / turnos individuales).

### Reglas

| Regla | Detalle |
|-------|---------|
| Sin solapamiento | Un asociado no puede tener dos turnos el mismo día (regla también en base de datos) |
| Fechas pasadas | No se editan ni eliminan turnos de hoy o del pasado; solo futuros |
| Publicación | Al publicar matriz mensual se notifica a GERENCIA |
| Motor automático | Puede regenerar asignaciones del mes (sobrescribe las existentes del schedule) |

### Integración

Consume asociados (RRHH) y puestos. El alcance por puestos del rol PROGRAMADOR debe respetarse operativamente (validación estricta por puesto: revisar si el rol tiene puestos asignados).

---

## 8. Documental

**Rutas:** `/documental`  
**Permisos:** `documental.view/create/manage`

### Regla clave (fase actual)

**Metadata-only:** se registra la información del documento (tipo, código, ubicación física, etc.). **No** se suben archivos al Storage en esta fase (los campos de archivo existen preparados para el futuro).

- `documental.manage` → tipos documentales.
- `documental.create` → alta/edición de registros.

---

## 9. Residencial

**Rutas:** `/residential/unidades`, visitantes, paquetes, reservas, …  
**Permisos:** `residential.view/manage/visitors/packages/reservations/incidents/parking`

### Aislamiento

| Quién | Qué ve |
|-------|--------|
| GERENCIA | Todas las unidades |
| Otros roles | Solo unidades de sus puestos asignados |
| Sin puestos | Listados vacíos; operar fuera de alcance → denegado |

### Procedimientos típicos

- **Visitantes / paquetes / correspondencia:** registro de ingreso y entrega; un paquete/correo no se entrega dos veces.
- **Reservas:** estados `PENDING → APPROVED/REJECTED/CANCELLED/COMPLETED`. Cada unidad puede tener aprobación **manual** o **automática**.
- **Incidencias:** ciclo abierta → en proceso → resuelta/cerrada, con prioridad.

### Limitaciones

- Algunas pantallas (incidencias/parqueadero) pueden estar más avanzadas en API que en UI.
- Permisos de vigilante residencial: verificar asignación en seeds según el rol operativo real.

---

## 10. Recepción

**Rutas:** `/recepcion/panel`, registrar, dentro, historial  
**Permisos:** `reception.view/register/exit`  
**Rol típico:** RECEPCIONISTA (+ GERENCIA / otros según seed)

### Para qué sirve

Control de ingreso/salida de visitantes a **sede** (independiente de Residencial y de asociados RRHH).

### Procedimiento

1. **Registrar** ingreso (muchos campos son opcionales).
2. Ver quién está **dentro**.
3. Registrar **salida** (no se borra el registro: se cierra con hora de salida). La pantalla **no** salta al historial: se puede dar salida a varios seguidos desde “Visitantes dentro” o el panel.
4. Consultar **historial** (y PDF de historial si aplica).

### Reglas

| Regla | Detalle |
|-------|---------|
| Historial permanente | No hay borrado de visitas; se cierra con salida |
| Independencia | No se liga automáticamente a Asociados ni a unidades residenciales |

---

## 11. Notificaciones

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

## 12. Dashboard

**Ruta:** `/dashboard`

Widgets según rol (ejemplos):

- **GERENCIA:** asociados activos, entregas pendientes, señales documentales/residenciales, etc.
- **SUPERVISOR:** entregas, novedades, turnos del día.
- Si un módulo falla, el dashboard tiende a mostrar ceros en lugar de romper toda la pantalla.

El overview de RRHH (`hr_dashboard.view`) concentra métricas demográficas, rotación y cumplimiento.

---

## 13. Firmas y almacenamiento

| Tema | Regla |
|------|--------|
| Quién sube/baja firmas | Solo la **API** con `SUPABASE_SERVICE_ROLE_KEY` |
| Bucket | `delivery-signatures`, **privado** |
| Quién ve la imagen | Usuario autenticado con `deliveries.view` vía `GET /deliveries/:id/signature` |
| Frontend | Nunca lleva la service role |

Variables relevantes en API: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, opcional `SUPABASE_SIGNATURE_BUCKET`.

---

## 14. Matriz rápida de roles

> Orientativa según seeds. GERENCIA concentra acceso amplio. Verificar en Administración → Roles si hubo cambios manuales.

| Rol (código) | Enfoque típico |
|--------------|----------------|
| `GERENCIA` | Todo / supervisión |
| `RRHH` | Asociados, alertas, retiros, datos sensibles |
| `ALMACENISTA` | Inventario, entregas, movimientos |
| `PROGRAMADOR` | Turnos / matriz |
| `RECEPCIONISTA` | Recepción sede |
| `SUPERVISOR` | Consulta operativa / dashboard |
| `VIGILANTE` | Alcance limitado (según permisos asignados) |
| `COORDINADOR_OPERATIVO` | Operación / consultas según seed |
| `ADMINISTRADOR_UNIDAD` | Residencial acotado a sus puestos |

---

## Glosario corto

| Término | Significado |
|---------|-------------|
| Asociado | Persona de nómina/planta en RRHH |
| Puesto (`Post`) | Ubicación/servicio operativo |
| Variante | Ítem de inventario con talla/género/etc. |
| Entrega | Dotación personal (o a puesto) con firma |
| Elemento de puesto | Activo físico asignable a un puesto |
| Soft-delete | Desactivar sin borrar histórico |

---

## Mantenimiento de este documento

Al cambiar una regla de negocio en código:

1. Actualizar la sección del módulo aquí.
2. Anotar fecha en la cabecera.
3. Si el cambio es operativo (Supabase/Render), actualizar también `docs/SUPABASE.md` / `docs/DEPLOY-RENDER.md`.

**Última revisión de contenido:** 2026-07-24 (estado del código en `main` tras firmas privadas, recepción, Realtime `025` y módulos de dotación/elementos).
