# Portal Coraza — Estado del proyecto y guía al 100%

> **Changes OpenSpec activos:**
> - `system-coraza-v2` — ~109/118 tareas (~92%)
> - `migrate-dotacion-ux` — **35/35 tareas (código completo)** — UX de entregas alineada con coraza-system
>
> **Última actualización:** 2026-06-29

---

## Resumen ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿El código está listo? | **Sí** — backend, frontend, dotación UX migrada y despliegue en Render. |
| ¿Funciona en producción hoy? | **Parcialmente** — login y módulos principales; firmas, Realtime y migración `008` dependen de Supabase. |
| ¿Qué falta para el 100%? | Ejecutar **Parte 3** (Supabase + `.env` + datos inventario) y **Parte 4** (pruebas E2E). |
| ¿Tiempo estimado de cierre? | **45–90 minutos** con acceso al dashboard de Supabase. |

### URLs de producción (Render)

| Servicio | URL |
|----------|-----|
| Frontend | https://portalcoraza-web.onrender.com |
| API | https://portalcoraza.onrender.com |
| Login | https://portalcoraza-web.onrender.com/auth/login |

**Credenciales seed (si existe el usuario admin):** `admin@coraza.local` / `Coraza2026!` (rol GERENCIA)

### Proyecto Supabase

| Dato | Valor |
|------|-------|
| Project ref | `duxpqkldgdnfcabpkogl` |
| URL | https://duxpqkldgdnfcabpkogl.supabase.co |
| Dashboard | https://supabase.com/dashboard/project/duxpqkldgdnfcabpkogl |

---

## Parte 1 — Lo que ya está listo

### Backend (NestJS)

| Módulo | Funcionalidad |
|--------|----------------|
| Auth | JWT propio, permisos en payload, access 2h / refresh 7d |
| Usuarios y roles | CRUD usuarios, asignación de puestos, `PUT /roles/:id/permissions` |
| RRHH | Asociados, historial, retiro |
| Inventario | Stock, movimientos, `validate-stock`, `available-stock` por talla/género |
| Entregas | PENDING → DELIVERED → REVERTED; firma vía API; entrega a asociado o puesto; reversión 5 días |
| Programación | Matriz de turnos, constraint anti-solapamiento en BD |
| Documental | Registro metadata-only (v1) |
| Residencial | Unidades, visitantes, paquetes, reservas, novedades, parqueaderos |
| Notificaciones | API REST + inserción en tabla `notifications` |

### Frontend (Angular)

| Feature | Rutas / puntos de entrada |
|---------|---------------------------|
| Login + branding | `/auth/login` |
| Dashboard | `/dashboard` (widgets por rol) |
| RRHH | `/rrhh/asociados` + botón **Entregar dotación** |
| Dotación | `/dotacion`, `/dotacion/entregas`, modal con tallas/género y firma |
| Programación | `/programacion` + **Entregar dotación al puesto** + historial |
| Documental | `/documental` |
| Residencial | `/residential/*` |
| Admin | `/admin/usuarios`, `/admin/roles` |
| Notificaciones | Campana en layout + Realtime (código listo) |

### Infraestructura

- Monorepo: `npm install` en raíz
- `render.yaml` para deploy frontend
- OpenSpec: `system-coraza-v2` + `migrate-dotacion-ux` (completo en código)
- Migraciones SQL: `001`–`008` en `supabase/migrations/`
- Seeds: `001_roles_permissions.sql`, `003_business_permissions.sql`
- Tests API entregas: `npm run test -w @coraza/api`

---

## Parte 2 — Lo que falta (checklist)

Marca cada ítem al completarlo:

### Entorno y Supabase base

- [ ] **A.** Herramientas en el PC (Node ≥ 20, npm, Git)
- [ ] **B.** Dependencias instaladas (`npm install`)
- [ ] **C.** Archivo `apps/api/.env` con credenciales reales
- [ ] **D.** Proyecto Supabase activo (no pausado)
- [ ] **E.** Migraciones SQL **001–008** ejecutadas en Supabase
- [ ] **F.** Seeds 001 + 003 ejecutados
- [ ] **G.** Usuario administrador (`npm run seed:admin -w @coraza/api`)
- [ ] **H.** Bucket Storage `delivery-signatures`
- [ ] **I.** Realtime activo en tabla `notifications`
- [ ] **J.** Variables de entorno en Render (API) actualizadas

### Dotación (migrate-dotacion-ux)

- [ ] **M.** Datos de inventario con variantes y `attributes` JSONB (tallas/género) — ver Paso **E.1**
- [ ] **N.** Prueba flujo asociado: entregar → firmar → historial → revertir — ver **4.3**
- [ ] **O.** Prueba flujo puesto: entregar → firmar → historial → revertir — ver **4.3**

### Cierre general

- [ ] **K.** Pruebas E2E restantes (sección 4)
- [ ] **L.** (Opcional) Logo PNG en login
- [ ] **P.** Archivar changes OpenSpec (`/opsx:archive`)

---

## Parte 3 — Paso a paso para llegar al 100%

### Paso A — Requisitos en tu PC

1. Instalar **Node.js 20 o superior**: https://nodejs.org
2. Verificar en PowerShell:

```powershell
node -v    # debe ser >= v20
npm -v
git --version
```

3. Si usas OpenSpec CLI, agregar al PATH:

```
C:\Users\USUARIO\AppData\Roaming\npm
```

4. Entrar al monorepo:

```powershell
cd "C:\Users\USUARIO\Documents\02-documentos\portal coraza\Portalcoraza"
```

---

### Paso B — Instalar dependencias y validar build

```powershell
npm install
npm run api:build
npm run web:build
npm run test -w @coraza/api
```

Los tres comandos deben terminar sin errores (tests de entregas: 3 passing).

---

### Paso C — Configurar entorno local (`apps/api/.env`)

1. Copiar el ejemplo:

```powershell
copy apps\api\.env.example apps\api\.env
```

2. Completar variables:

| Variable | Dónde obtenerla | Notas |
|----------|-----------------|-------|
| `DATABASE_URL` | Supabase → **Settings → Database** → URI **Direct** (local) | Sustituir `[PASSWORD]` |
| `SUPABASE_URL` | `https://duxpqkldgdnfcabpkogl.supabase.co` | |
| `SUPABASE_PUBLISHABLE_KEY` | **Settings → API** → anon / publishable | También en `environment.ts` (web) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Settings → API** → `service_role` | **Solo backend. Nunca en Angular.** |
| `SUPABASE_PROJECT_REF` | `duxpqkldgdnfcabpkogl` | |
| `JWT_ACCESS_SECRET` | Cadena ≥ 32 caracteres | Distinta a refresh |
| `JWT_REFRESH_SECRET` | Cadena ≥ 32 caracteres | |
| `JWT_ACCESS_EXPIRES_IN` | `2h` | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | |
| `SUPABASE_SIGNATURE_BUCKET` | `delivery-signatures` | Debe existir el bucket (Paso H) |
| `CORS_ORIGIN` | `http://localhost:4200` | Desarrollo local |

3. **No commitear** `apps/api/.env`.

El frontend usa `apps/web/src/environments/environment.ts` para API y Supabase Realtime.

---

### Paso D — Activar proyecto Supabase

1. https://supabase.com/dashboard/project/duxpqkldgdnfcabpkogl
2. Si está **pausado**, pulsa **Restore project**.
3. Espera estado **Active**.

---

### Paso E — Ejecutar migraciones SQL

En Supabase → **SQL Editor** → **New query**, ejecuta **en orden** cada archivo:

| Orden | Archivo |
|-------|---------|
| 1 | `supabase/migrations/001_core_schema.sql` |
| 2 | `supabase/migrations/002_user_posts_permissions.sql` |
| 3 | `supabase/migrations/003_inventory.sql` |
| 4 | `supabase/migrations/004_deliveries.sql` |
| 5 | `supabase/migrations/005_scheduling.sql` |
| 6 | `supabase/migrations/006_documental.sql` |
| 7 | `supabase/migrations/007_residential.sql` |
| 8 | `supabase/migrations/008_delivery_ux.sql` |

**Qué añade la 008:** `post_id` en entregas, estado `REVERTED`, campos de reversión, entrega a puesto.

**Cómo hacerlo:** abrir archivo → copiar todo → pegar en SQL Editor → **Run** → siguiente.

> Si una migración ya corrió, muchas usan `IF NOT EXISTS`. Si falla por “ya existe”, anota y continúa.

**Alternativa CLI:**

```bash
supabase login
supabase link --project-ref duxpqkldgdnfcabpkogl
supabase db push
```

---

### Paso E.1 — Datos de inventario para dotación (obligatorio para tallas)

El modal de entrega busca variantes por **categoría + attributes JSONB**. Sin esto, no aparecen tallas ni stock.

1. En la app o por SQL, crear **categorías** alineadas con `apps/web/src/app/features/dotacion/config/tallas.config.ts`:

   | Código categoría | Ejemplos de ítem |
   |------------------|------------------|
   | `botas` | Botas seguridad |
   | `camisa` | Camisa operativa |
   | `pantalon` | Pantalón |
   | `overol` | Overol |
   | `chaqueta` | Chaqueta |
   | `chaqueta_impermeable` | Chaqueta impermeable |

2. Crear **ítems** por categoría (ej. código `CAMISA-OP`, nombre `Camisa operativa`).

3. Crear **variantes** con stock y atributos, por ejemplo:

```json
{ "talla": "40", "genero": "M" }
```

| Campo variante | Ejemplo |
|----------------|---------|
| `sku` | `CAMISA-40-M` |
| `stock_current` | `25` |
| `attributes.talla` | `40` |
| `attributes.genero` | `M` o `F` (omitir en overol/botas si no aplica) |

4. Verificar en la app: **Dotación → Inventario** que las variantes muestran stock.

5. (Opcional) Migrar datos desde **coraza-system** (`supply_inventory`) mapeando columnas `talla`/`genero` a `attributes`.

---

### Paso F — Ejecutar seeds (roles y permisos)

En **SQL Editor**, en orden:

| Orden | Archivo |
|-------|---------|
| 1 | `supabase/seed/001_roles_permissions.sql` |
| 2 | `supabase/seed/003_business_permissions.sql` |

Permisos de dotación:

| Permiso | Uso |
|---------|-----|
| `deliveries.view` | Ver listados e historial |
| `deliveries.create` | Crear entrega y revertir |
| `deliveries.sign` | Confirmar con firma |

Roles con dotación completa: **ALMACENISTA**, **SUPERVISOR**, **GERENCIA**.

---

### Paso G — Crear usuario administrador

```powershell
npm run seed:admin -w @coraza/api
```

Crea: `admin@coraza.local` / `Coraza2026!` (GERENCIA)

Para probar dotación como almacenista, crea un usuario con rol **ALMACENISTA** o **SUPERVISOR** desde `/admin/usuarios`.

---

### Paso H — Bucket Storage para firmas

**Sin este paso, las entregas fallan al firmar.**

1. Supabase → **Storage** → **New bucket**
2. Name: `delivery-signatures` | Public: **Sí**
3. Confirmar en `.env` y Render:

```
SUPABASE_SERVICE_ROLE_KEY=<service role>
SUPABASE_SIGNATURE_BUCKET=delivery-signatures
```

4. Redesplegar API en Render si cambiaste variables.

---

### Paso I — Activar Realtime en notificaciones

1. Supabase → **Database** → **Replication** / **Publications**
2. Tabla **`notifications`** → activar Realtime
3. Sin esto, la campana solo actualiza al recargar.

---

### Paso J — Variables en Render (producción)

En https://dashboard.render.com → servicio **API**:

```
NODE_ENV=production
DATABASE_URL=postgresql://postgres.duxpqkldgdnfcabpkogl:[PASSWORD]@aws-X-[REGION].pooler.supabase.com:5432/postgres
JWT_ACCESS_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
JWT_ACCESS_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://portalcoraza-web.onrender.com
SUPABASE_URL=https://duxpqkldgdnfcabpkogl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_SIGNATURE_BUCKET=delivery-signatures
```

- Usar **Session pooler** (puerto 5432), usuario `postgres.duxpqkldgdnfcabpkogl`
- **Manual Deploy** de la API tras cambios

---

### Paso K — Arrancar en local

**Terminal 1 — API:**

```powershell
npm run api:dev
```

→ http://localhost:3000/api/v1

**Terminal 2 — Web:**

```powershell
npm run web:dev
```

→ http://localhost:4200

**Login:** http://localhost:4200/auth/login

---

## Parte 4 — Pruebas E2E (validación al 100%)

### 4.1 Login y permisos

- [ ] Login devuelve `permissions[]` (Network → `auth/login`)
- [ ] Menú lateral según rol
- [ ] 403 o enlace oculto sin permiso

### 4.2 RRHH

- [ ] Listar / crear / editar asociado
- [ ] Ver historial y retirar

### 4.3 Dotación y firma (requiere pasos E, E.1, H)

**Flujo asociado**

- [ ] RRHH → Asociados → **Entregar dotación**
- [ ] Modal: categoría → talla/género → cantidad (chip de stock visible)
- [ ] Firmar en canvas → entrega `DELIVERED`
- [ ] Detalle asociado → historial con miniatura de firma
- [ ] **Revertir** entrega (&lt;5 días, motivo ≥10 caracteres) → estado `REVERTED` y stock devuelto
- [ ] Entrega revertida no permite segunda reversión

**Flujo desde menú Dotación**

- [ ] `/dotacion/entregas` → **Nueva entrega** (selector asociado + modal)
- [ ] Entrega pendiente → `/dotacion/entregas/:id/firmar` si no se firmó en modal

**Flujo puesto**

- [ ] Programación → elegir puesto → **Entregar dotación al puesto**
- [ ] Completar modal y firmar
- [ ] Historial del puesto visible debajo de la matriz
- [ ] Revertir entrega a puesto si aplica

**API (opcional con Postman)**

- [ ] `GET /inventory/variants/available-stock?category=camisa&talla=40&genero=M`
- [ ] `POST /inventory/validate-stock` con array de elementos
- [ ] `POST /deliveries/:id/revert` con `{ "reason": "..." }`

### 4.4 Programación

- [ ] Matriz mensual en `/programacion`
- [ ] Crear turno; solapamiento → 409

### 4.5 Documental y residencial

- [ ] Documento metadata; visitante; paquete; reserva

### 4.6 Aislamiento ADMINISTRADOR_UNIDAD

- [ ] Solo ve unidades de sus puestos asignados

### 4.7 Notificaciones Realtime (requiere paso I)

- [ ] Campana actualiza sin recargar

### 4.8 Refresh token

- [ ] 401 renueva sesión; logout tras refresh inválido

### 4.9 Admin

- [ ] Usuarios y permisos por rol

### 4.10 Producción Render

- [ ] Login en portalcoraza-web.onrender.com
- [ ] Video login carga
- [ ] API en `/api/v1/*`

---

## Parte 5 — Opcional

### Logo PNG (tarea 15.7)

```
apps/web/public/images/coraza-logo.png
```

### Archivar changes OpenSpec

Cuando Parte 2 y Parte 4 estén verificadas:

```powershell
openspec list
# migrate-dotacion-ux → 35/35
# system-coraza-v2 → pendientes 2.7, 2.8, 14.x E2E, 15.7
```

En Cursor: `/opsx:archive migrate-dotacion-ux` y luego `system-coraza-v2` cuando aplique.

---

## Parte 6 — Solución de problemas

| Problema | Causa probable | Solución |
|----------|----------------|----------|
| Modal sin categorías/tallas | Sin variantes o `attributes` vacíos | Paso **E.1** |
| `Stock insuficiente` al confirmar | Stock real &lt; cantidad | Ajustar `stock_current` o cantidad |
| Firma falla | Bucket o service role | Pasos **H** y **C** |
| Reversión rechazada | &gt;5 días desde entrega | Normal; probar con entrega reciente |
| `post_id` / `REVERTED` error SQL | Falta migración **008** | Paso **E** archivo 008 |
| Notificaciones sin live | Realtime off | Paso **I** |
| CORS en login | `CORS_ORIGIN` incorrecto | Paso **J** |
| 403 en dotación | Rol sin permisos | Seed **F** o `/admin/roles` |

---

## Referencias internas

| Documento | Contenido |
|-----------|-----------|
| `docs/SUPABASE.md` | Conexión y seeds |
| `docs/DEPLOY-RENDER.md` | Deploy Render |
| `docs/CONTINUAR-DESARROLLO.md` | Handoff desarrolladores |
| `openspec/changes/migrate-dotacion-ux/VERIFICATION.md` | Checklist dotación UX |
| `openspec/changes/system-coraza-v2/tasks.md` | Tareas plataforma v2 |
| `openspec/changes/migrate-dotacion-ux/tasks.md` | Tareas dotación (completo) |

---

## Definición de “proyecto al 100%”

1. Todas las casillas de la **Parte 2** marcadas (incluye **M**, **N**, **O** para dotación).
2. Pruebas de la **Parte 4** pasan en local y Render.
3. Firmas, reversión de entregas y Realtime funcionan en producción.
4. `migrate-dotacion-ux` archivado; `system-coraza-v2` solo con opcionales (15.7) o E2E documentados.

**Estado actual:** código listo (incluye UX dotación migrada) → falta ejecutar **Parte 3** en Supabase y validar **Parte 4**.
