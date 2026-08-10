# Gestión Documental — SGD CORAZA (lógica de negocio)

> Análisis del repositorio de referencia [`pbc360252-a11y/DOCUMENTAL-`](https://github.com/pbc360252-a11y/DOCUMENTAL-) (SGD CORAZA).
> Objetivo: extraer **toda la lógica de negocio** para reimplementarla de forma nativa en Portal Coraza (NestJS + Angular + Supabase).
>
> Grafo de código generado con Graphify en `docs/graphify-app-documental/` (`graph.html`, `GRAPH_TREE.html`, `DOCUMENTAL-ref-callflow.html`, `GRAPH_REPORT.md`, `graph.json`).

---

## 1. Qué es y de dónde viene

**SGD CORAZA** es el Sistema de Gestión Documental de Coraza Seguridad C.T.A. Nació como app de **Google Apps Script + Google Sheets** (código original en `CODIGO DE LA APP ACTUAL/`) y fue migrado a una app web independiente:

| Capa | Tecnología en el repo de referencia | Equivalente nativo en Portal Coraza |
|------|-------------------------------------|-------------------------------------|
| Backend | Node/Express (`backend/server.js`, 1 archivo, ~1.1k líneas) | NestJS `apps/api` (módulo `documental`) |
| DB | PostgreSQL con fallback a JSON (`backend/db.js`, `backend/database.sql`) | Supabase/Postgres + TypeORM + `supabase/migrations` |
| Frontend | HTML/CSS/JS vanilla (`frontend/app.js` ~3.2k líneas, SweetAlert2, Chart.js) | Angular `apps/web` (feature `documental`) |
| Auth | JWT propio + bcryptjs | JWT ya existente en Portal Coraza (`modules/auth`) |
| Deploy | Render (`render.yaml`) / Vercel (`vercel.json`) | Render (ya en uso) |

**Nota clave:** el backend actual es un único `server.js` sin capas (controller/service/repo), con SQL embebido y un `db.js` que hace *fallback* a archivos JSON si Postgres no responde. Al portarlo a Portal Coraza se debe respetar la **lógica**, no la arquitectura.

---

## 2. Modelo de datos (esquema Postgres)

Fuente: `backend/database.sql`. 11 tablas.

### 2.1 `usuarios`
PK `email`. Campos: `password` (hash bcrypt), `nombre`, `departamento`, `estado` (`ACTIVO`/inactivo), `rol` (`ADMINISTRADOR`/`AUXILIAR`/`USUARIO`), `ultimo_acceso`, `intentos_logout`, `salt`.

### 2.2 `minutas`
PK `id` (`MIN-{timestamp}`). `tipo_minuta` (`SERVICIO`/`VISITANTES`/`CORRESPONDENCIA`), `nombre_puesto`, `fecha_inicio`, `fecha_cierre`, `observaciones`, `estado` (`ACTIVO`), `responsable`, `voxelsera`, `codigo_unico` (`MIN-{SER|VIS|COR}-####`), `codigo_numerico` (consecutivo por tipo).

### 2.3 `correspondencia`
PK `id` (`CORR-{timestamp}`). `codigo_documento` (UNIQUE, radicado TRD), `fecha_documento`, `medio`, `tipo_documento`, `depto_origen`, `depto_destino`, `asunto`, `detalle`, `estado` (`PENDIENTE`), `usuario_registro`, `voxelsera`, `codigo_unico`, `codigo_numerico`.

### 2.4 `personal_inactivo` (Asociados Retirados)
PK `id` (`PER-{timestamp}`). `nombre_completo`, `cedula` (UNIQUE), `fecha_baja`, `motivo_baja`, `observaciones`, `voxelsera`, `codigo_numerico` (consecutivo global), `tipo_persona` (`EMPLEADO`/…, columna agregada por el backend con `alter_personal.js`).

### 2.5 `contratos`
PK `id` (`CTR-{timestamp}`). `tipo_contrato`, `numero_contrato` (UNIQUE, `CTR-{n}-{año}`), `parte_a`, `parte_b`, `fecha_inicio`, `fecha_fin`, `valor_contrato` NUMERIC, `objeto_contrato`, `voxelsera`, `estado` (`VIGENTE`), `codigo_numerico` (consecutivo, arranca en 399). Campos extra usados en búsqueda: `nit`, `hoja_origen` (rastro del Excel de origen).

### 2.6 `prestamos`
PK `id` (`PREST-{timestamp}` o `SOL-######` público). `solicitante`, `departamento`, `documento`, `codigo_documento`, `fecha_prestamo`, `fecha_devolucion`, `fecha_devolucion_real`, `estado`, `observaciones`.

### 2.7 `workflows`
PK `id` (`WF-{timestamp}`). `tipo`, `documento_id`, `solicitante`, `aprobador`, `fecha_creacion`, `fecha_limite`, `estado` (`PENDIENTE`), `comentarios`, `comentarios_aprobacion`, `dias_sla`.

### 2.8 `biblioteca` y `biblioteca_carpetas`
- `biblioteca_carpetas`: PK `id` (`DIR-…`), `nombre`, `padre` (jerarquía, raíz `RAIZ`), `color`, `es_sistema`.
- `biblioteca`: PK `id` (`BIB-{timestamp}`), `nombre`, `categoria`, `version` (`1.0`), `estado` (`ACTIVO`/`ELIMINADO` = borrado lógico), `url`, `fecha_elaboracion`, `descripcion_cambio`, `responsable`, `carpeta_id`, `usuario_registro`.

### 2.9 `log_auditoria`
PK `id` SERIAL. `fecha`, `usuario`, `modulo`, `accion`, `detalle`, `estado` (`EXITO`/`ERROR`), `respuesta`, `version`. **Inmutable** (solo INSERT).

### 2.10 `tabla_trd` (Tabla de Retención Documental)
PK `id`. `codigo_dep`, `nombre_dep`, `codigo_serie`, `nombre_serie`, `codigo_subserie`, `nombre_subserie`, `tiempo_gestion_anos`, `tiempo_central_anos`, `disposicion_final`, `normativa_base`. Precargada con 5 dependencias de ley (AGN / Ley 594):

| Dep | Dependencia | Serie | Disposición final | Norma |
|-----|-------------|-------|-------------------|-------|
| 100 | Gerencia General | Comunicaciones Oficiales | Conservación total | C.Co Art. 60 / Ley 594 |
| 200 | Gestión Humana | Historias Laborales y SG-SST | Conservación total (20 años) | Decreto 1072/2015 |
| 300 | Financiera y Contable | Registros y Comprobantes | Eliminación regulada | Ley 527/1999 |
| 400 | Operaciones y Seguridad | Minutas y Reportes Operativos | Selección | Ley 594/2000 AGN |
| 500 | Jurídica y Contratos | Contratos y Convenios | Conservación total | Ley 80 / C.Co |

---

## 3. Reglas de negocio por módulo

### 3.1 Autenticación y roles
- Login `POST /api/auth/login`: normaliza email (alias `admin` → `admin@corazaseguridad.com`, `auxiliar` → `auxiliar@corazaseguridad.com`), **auto-siembra** esos dos usuarios con contraseña `Admin123` si no existen, valida estado `ACTIVO`, compara bcrypt y emite **JWT de 8h** con `{email, nombre, rol, depto}`. Registra auditoría de acceso y actualiza `ultimo_acceso`.
- **Roles:** `ADMINISTRADOR`/`ADMIN` tienen acceso total; el middleware `soloAdmin` protege operaciones sensibles (crear usuarios, aprobar/rechazar/devolver préstamos, crear/eliminar carpetas y archivos de biblioteca).
- `POST /api/auth/registrar` (solo admin): crea usuario con salt+hash por usuario.
- `GET /api/auth/usuarios` (solo admin): lista usuarios.

> ⚠️ **Deudas de seguridad a NO portar (corregir al reimplementar):**
> 1. **Backdoor:** el login acepta `password === 'Admin123' || 'admin'` para *cualquier* usuario (`server.js` líneas 155-159). Eliminar.
> 2. `JWT_SECRET` con fallback hardcodeado. Debe venir solo de env.
> 3. `intentos_logout` existe pero nunca bloquea (el `PROMPT DE MEJORA` pedía bloqueo tras 5 intentos → 15 min).
> 4. Salt estático en la semilla SQL.
>
> En Portal Coraza esto ya está resuelto por el módulo `auth` nativo: **reusar ese auth, no reimplementar el de SGD.**

### 3.2 Consecutivos y códigos (núcleo del negocio)
Helper `obtenerSiguienteNumeroSecuencial(tabla, colId, colDepto, deptoSigla)`: lee todos los códigos, extrae la parte numérica (tras el último `-` o quitando no-dígitos), devuelve `max+1`. Reglas específicas:

- **Correspondencia (radicado TRD):** `{depCode}-{serieCode}[.{subserieCode}]-{año}-{consecutivo:0000}`. El consecutivo es **por dependencia** (`depto_origen`). Endpoint de previsualización: `POST /api/correspondencia/codigo-trd`.
- **Minutas:** `MIN-{SER|VIS|COR}-{consecutivo:0000}`, consecutivo **por tipo de minuta** vía `MAX(codigo_numerico)`.
- **Personal inactivo:** consecutivo global `padStart(2)`.
- **Contratos:** `CTR-{n}-{año}`, consecutivo global desde `MAX(codigo_numerico)` (base 398 → primer nuevo 399). Endpoint previsualización `GET /api/contratos/siguiente-codigo`.

> ⚠️ Estos contadores recalculan leyendo toda la tabla en cada alta (el `PROMPT DE MEJORA` ya lo marcó como cuello de botella). En Portal Coraza conviene una **secuencia Postgres** o tabla de consecutivos por (módulo, dependencia, año) — patrón que ya existe para entregas/dotación.

### 3.3 Correspondencia
`POST /api/correspondencia` (auth): calcula radicado si no viene, guarda con estado `PENDIENTE`, audita. `GET` lista ordenado por `fecha_registro DESC`.

### 3.4 Minutas
`POST /api/minutas` (auth): consecutivo por tipo, estado `ACTIVO`, audita. `GET` limita a 200, ordena por `fecha_inicio DESC, codigo_numerico DESC`.

### 3.5 Personal inactivo / Asociados retirados
`POST` (auth) alta con `tipo_persona` (default `EMPLEADO`). `PUT /:id/tipo` cambia tipo. `GET` ordena por `fecha_baja DESC, nombre ASC`.

### 3.6 Contratos + workflow de alto valor
`POST /api/contratos` (auth): estado `VIGENTE`. **Regla:** si `valor_contrato > 1.000.000 COP` dispara un `workflow` tipo `APROBACION_CONTRATO_ALTO_VALOR`, aprobador `ge@corazacta.com`, SLA 3 días, estado `PENDIENTE`. Audita.

### 3.7 Préstamos de documentos (ciclo de vida completo)
Estados: `ACTIVO` → `VENCIDO` (automático) / `DEVUELTO`; y para solicitudes públicas `PENDIENTE_APROBACION` → `ACTIVO`/`RECHAZADO`.

- `POST /api/prestamos` (auth): alta directa `ACTIVO`.
- **Solicitud pública** `POST /api/public/solicitud-prestamo` (**sin login**, formulario `solicitud-prestamo.html` compartible): crea préstamo `PENDIENTE_APROBACION`, solicitante `"{nombre} (CC: {cedula})"`.
- `PUT /api/prestamos/aprobar/:id` (solo admin) → `ACTIVO`, fija `fecha_prestamo = hoy`.
- `PUT /api/prestamos/rechazar/:id` (solo admin) → `RECHAZADO`, concatena motivo a observaciones.
- `POST /api/prestamos/devolver` (solo admin) → `DEVUELTO`, `fecha_devolucion_real = NOW()`.
- **Auto-vencimiento:** en cada `GET /api/prestamos`, `/estado` y `/notificaciones` se ejecuta `UPDATE prestamos SET estado='VENCIDO' WHERE estado='ACTIVO' AND fecha_devolucion < CURRENT_DATE`.

### 3.8 Workflows
`GET /api/workflows/pendientes`; `POST /api/workflows/resolver` (`APROBAR`→`APROBADO`, otro→`RECHAZADO`, guarda comentario).

### 3.9 Biblioteca documental
Árbol de carpetas jerárquicas + archivos por URL con versionado.
- `GET /api/biblioteca/arbol`: si no hay carpetas, **siembra 5 por defecto** (Políticas, Manuales, Reglamentos/Formatos CTA, SG-SST, Jurídico) con colores. Devuelve solo archivos `estado='ACTIVO'`.
- `POST /api/biblioteca/carpetas` y `/archivos` (solo admin).
- `DELETE /archivos/:id` = **borrado lógico** (`estado='ELIMINADO'`). `DELETE /carpetas/:id` reasigna sus archivos a `RAIZ` antes de borrar la carpeta.

### 3.10 Búsqueda universal
`GET /api/busqueda?query=...`: divide la consulta en palabras, arma `WHERE` multi-palabra (todas las palabras deben aparecer, cada una en cualquier columna vía `ILIKE`) sobre **5 módulos**: contratos, correspondencia, minutas, personal_inactivo, préstamos. Devuelve resultados unificados con `modulo`, `titulo`, `codigo`, `fecha`, `detalles` (incluye ubicación física `VOXELSERA`). `GET /api/registro-detalle/:modulo/:id` trae el detalle completo.

### 3.11 VOXELSERA — mapa de archivo físico
`GET /api/voxelsera-mapa`: modela una estantería física de **4 estantes (A–D) × 9 compartimentos (1–9)** = 36 slots `VOXEL_{L}{n}`. Asignación por defecto por módulo:
- **Estante A** → Minutas
- **Estante B** → Asociados retirados
- **Estante C** → Contratos
- **Estante D** → Correspondencia (temporal/libre)

Si un registro no tiene `voxelsera`, se asigna determinísticamente por `id % 9 + 1`. Normaliza formatos legados (`A-1`, `a1`, etc.) a `VOXEL_A1`. Devuelve conteo e items (máx. 50) por slot. El frontend permite "iluminar" la ubicación física de un resultado de búsqueda.

### 3.12 Notificaciones
`GET /api/notificaciones`: genera alertas de (1) préstamos **vencidos** (crítico), (2) préstamos **por vencer ≤3 días** (advertencia), (3) contratos **por vencer ≤30 días** (advertencia). Antes marca vencidos automáticamente.

### 3.13 Auditoría y analytics
- `registrarAuditoria(...)` en cada operación de escritura (versión sello `v7.4 SECURE`).
- `GET /api/auditoria`: últimos 100 logs.
- `GET /api/analytics`: conteos por módulo, máximo consecutivo de contratos, desglose de minutas por tipo, préstamos activos/devueltos. Excluye contratos con `hoja_origen='CARPETAS PARA ESCANEAR'` (dato de migración).

### 3.14 Extras del frontend (no-API)
- **Cola de impresión** de tiras PDF (rótulos de carpeta) — ahorro de papel.
- **Grafo de conocimiento** interactivo que cruza módulos por ubicación VOXELSERA (`cargarGrafoConocimiento`).
- **Informes** con Chart.js.
- Chatbot IA (Groq) existía en la versión Apps Script; **no** está en el backend Node actual.

---

## 4. Mapa de endpoints (contrato de API)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/system/initialize` | — | Ejecuta `database.sql` |
| POST | `/api/auth/login` | — | Login, emite JWT 8h |
| POST | `/api/auth/registrar` | admin | Alta de usuario |
| GET | `/api/auth/usuarios` | admin | Lista usuarios |
| GET | `/api/trd` | — | Tabla de Retención Documental |
| POST | `/api/correspondencia/codigo-trd` | — | Previsualiza radicado |
| POST/GET | `/api/correspondencia` | auth | Radicar / listar |
| POST/GET | `/api/minutas` | auth | Registrar / listar |
| POST/GET | `/api/personal-inactivo` | auth | Registrar / listar |
| PUT | `/api/personal-inactivo/:id/tipo` | auth | Cambiar tipo |
| GET | `/api/contratos/siguiente-codigo` | auth | Previsualiza código |
| POST/GET | `/api/contratos` | auth | Registrar / listar (+workflow >1M) |
| POST/GET | `/api/prestamos` | auth | Registrar / listar (auto-vence) |
| POST | `/api/prestamos/devolver` | admin | Marcar devuelto |
| POST | `/api/public/solicitud-prestamo` | — | Solicitud pública |
| PUT | `/api/prestamos/aprobar/:id` | admin | Aprobar solicitud |
| PUT | `/api/prestamos/rechazar/:id` | admin | Rechazar solicitud |
| GET | `/api/prestamos/estado` | auth | Estado préstamos |
| GET | `/api/notificaciones` | auth | Alertas vencimientos |
| GET | `/api/workflows/pendientes` | auth | Workflows pendientes |
| POST | `/api/workflows/resolver` | auth | Aprobar/rechazar workflow |
| GET | `/api/biblioteca/arbol` | auth | Árbol carpetas+archivos |
| POST | `/api/biblioteca/carpetas` | admin | Crear carpeta |
| POST | `/api/biblioteca/archivos` | admin | Registrar archivo |
| DELETE | `/api/biblioteca/carpetas/:id` | admin | Borrar carpeta |
| DELETE | `/api/biblioteca/archivos/:id` | admin | Borrado lógico archivo |
| GET | `/api/busqueda?query=` | auth | Búsqueda universal |
| GET | `/api/voxelsera-mapa` | auth | Mapa físico estantería |
| GET | `/api/registro-detalle/:modulo/:id` | auth | Detalle de registro |
| GET | `/api/auditoria` | auth | Últimos 100 logs |
| GET | `/api/analytics` | auth | KPIs del dashboard |

---

## 5. Grafo de código (Graphify)

Generado con extracción AST local (sin coste de API) sobre el repo de referencia: **301 nodos, 440 aristas, 28 comunidades** sobre 29 archivos de código.

Artefactos en `docs/graphify-app-documental/`:
- `graph.html` — grafo interactivo (fuerza dirigida).
- `GRAPH_TREE.html` — árbol colapsable por archivo/símbolo.
- `DOCUMENTAL-ref-callflow.html` — 16 diagramas Mermaid de flujo de llamadas.
- `GRAPH_REPORT.md` — comunidades y métricas.
- `graph.json` — grafo crudo (consultable con `graphify query/path/explain --graph`).

**Nodos "dios" (más conectados)** — confirman la arquitectura:

| # | Nodo | Aristas | Rol |
|---|------|---------|-----|
| 1 | `apiCall()` | 36 | Cliente HTTP central del frontend (todo pasa por aquí) |
| 2 | `cargarTodoElSistema()` | 15 | Orquestador de carga inicial |
| 3 | `showSection()` | 12 | Router/navegación entre módulos |
| 4-10 | `cargarBiblioteca/Prestamos/Correspondencia/Personal/Dashboard`, `ejecutarBusqueda` | 7-10 | Cargas por módulo |
| 11-13 | `leerHoja`, `excelDateToDate`, `genId` | 6 | Utilidades de importación (legado Sheets/Excel) |

La presencia de `leerHoja`/`excelDateToDate` refleja los **scripts de migración** desde Excel (`import_*.js`, `sync_contratos_supabase.js`, `reindex_contratos_exact.js`), útiles como referencia para la **carga inicial de datos históricos** en Portal Coraza (contratos, minutas, asociados).

---

## 6. Recomendaciones para la implementación nativa en Portal Coraza

Alineado con Ponytail (reusar lo existente, mínimo código nuevo):

1. **Auth:** reusar el módulo `auth` nativo (JWT + roles + permisos) — descartar todo el auth de SGD y sus backdoors.
2. **Consecutivos:** usar secuencias/tabla de consecutivos por `(modulo, dependencia, año)` en vez de `MAX()+forEach` en cada alta.
3. **Entidades TypeORM + migración** en `supabase/migrations` (ya existe `006_documental.sql` como base; ampliar a: minutas, correspondencia, personal_inactivo, contratos, prestamos, workflows, biblioteca[_carpetas], tabla_trd).
4. **Auditoría:** reusar el módulo `audit` nativo en lugar de `log_auditoria` propio.
5. **Borrados lógicos** (biblioteca) y **auto-vencimiento** de préstamos: preservar tal cual (reglas de negocio válidas).
6. **VOXELSERA:** portar el modelo 4×9 y la normalización de códigos; es diferenciador del cliente.
7. **Solicitud pública de préstamo:** endpoint sin auth con validación estricta en el trust boundary (rate-limit + captcha si se expone públicamente).
8. **Frontend:** feature Angular `documental` con las 11 secciones del menú, reusando los componentes/servicios ya esbozados en `apps/web/src/app/features/documental/`.
9. **Datos históricos:** adaptar los `import_*.js` para una carga única hacia Supabase (contratos arrancan en consecutivo 399).

> **Pendiente de decisión de JHON:** alcance de la primera entrega (¿todos los módulos o empezar por Correspondencia + Minutas + Préstamos?) y si se migran los datos históricos del Excel en esta fase.
