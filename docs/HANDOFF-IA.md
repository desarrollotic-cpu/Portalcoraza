# Handoff — System Coraza (Portal Coraza)

Documento para continuar el desarrollo con otra IA o desarrollador.

> **Inicio rápido para compañeros:** [`docs/CONTINUAR-DESARROLLO.md`](CONTINUAR-DESARROLLO.md) — mensaje listo para copiar al agente de Cursor.

---

## ACTUALIZACION OPENSpec (2026-06-23)

Estado real del change activo `system-coraza-v2`:

- Change path: `openspec/changes/system-coraza-v2/`
- Fuente de verdad de avance: `openspec/changes/system-coraza-v2/tasks.md`
- Bitacora de continuidad: `openspec/changes/system-coraza-v2/progress.md`

**Producción Render (activo):**

| Servicio | URL |
|----------|-----|
| API | `https://portalcoraza.onrender.com` |
| Web | `https://portalcoraza-web.onrender.com` |
| Login | `https://portalcoraza-web.onrender.com/auth/login` |

Credenciales seed: `admin@coraza.local` / `Coraza2026!` (GERENCIA)

Avance confirmado:

- Backend completado: 0.x–8.x (inventario, entregas, programación, documental, residencial, notificaciones)
- Frontend completado: 1.x RRHH, 9.x dotación, 10.x programación, 11.x documental, 15.x login/branding
- Deploy: `render.yaml`, Static Site `portalcoraza-web`, Publish Directory `apps/web/dist/web/browser`
- Login: split layout + video `coraza-logo.mp4` en panel derecho

Pendiente inmediato:

- 12.x Frontend residencial
- 13.x Notificaciones Realtime + admin + dashboard widgets
- 14.x Verificación final
- 2.7 Bucket `delivery-signatures` (manual Supabase)
- 2.8 Realtime en `notifications` (manual Supabase)
- 4.3 SDK oficial Supabase Storage para firmas
- 15.7 PNG `coraza-logo.png` (opcional, usuario)

Protocolo obligatorio para continuar desde otro ID de desarrollo:

1. Leer `proposal.md`, `design.md`, `tasks.md`, `progress.md` del change activo
2. Implementar solo el bloque pendiente siguiente (12.x residencial)
3. Actualizar `tasks.md` al cerrar cada tarea
4. Actualizar `progress.md` al cerrar cada bloque

---

## 1. Qué es el proyecto

**System Coraza** — plataforma web modular para gestión administrativa y operativa de una empresa de vigilancia y seguridad privada.

- **Repo GitHub (vacío al inicio, código local pendiente de push):** https://github.com/desarrollotic-cpu/Portalcoraza
- **Carpeta local:** `C:\Users\USUARIO\Documents\02-documentos\Portal_Coraza`
- **Arquitectura:** monorepo npm workspaces

```
Portal_Coraza/
├── apps/api/          # NestJS 11 — REST API, JWT, TypeORM, PostgreSQL
├── apps/web/          # Angular 21 — SPA (no Next.js)
├── supabase/          # migrations + seeds SQL
├── docs/              # guías
└── .agents/skills/    # Supabase agent skills (opcional)
```

---

## 2. Stack acordado

| Capa | Tecnología |
|------|------------|
| Frontend | Angular 21+, SCSS, design tokens índigo/azul |
| Backend | NestJS 11, TypeScript |
| BD | PostgreSQL en Supabase |
| Auth API | JWT + refresh tokens (auth propia, no Supabase Auth aún) |
| Despliegue previsto | Render |

---

## 3. Qué YA está implementado (código)

### API (`apps/api`) — Fase 1

- Módulos: `auth`, `users`, `roles`, `permissions`, `associates`, `posts`, `audit`
- RBAC con permisos granulares (`associates.create`, `users.create`, etc.)
- Guards JWT + `PermissionsGuard`
- Endpoints bajo prefijo `/api/v1`
- Scripts:
  - `npm run db:setup` — migraciones + seeds + usuario admin
  - `npm run seed:admin` — solo admin
- `.env` local configurado (ver sección 5)

### Web (`apps/web`)

- Login rediseñado (split layout, video animado, formulario estilo Material)
- Dashboard, RRHH (asociados CRUD + detalle + historial)
- Dotación: inventario, entregas, firma canvas
- Programación: matriz Excel, calendario, formulario turnos
- Documental: listado + formulario metadata-only
- Layout con sidebar condicional por permisos (`inventory.view`, `scheduling.view`, `documental.view`)
- Tema en `src/styles/_theme.scss`
- Assets login: `public/videos/coraza-logo.mp4`, `public/images/` (PNG opcional)
- Rutas lazy con `permissionGuard` en `app.routes.ts`

### Base de datos

- Migraciones 001–007 en repo (`supabase/migrations/`)
- Seeds roles/permisos + admin
- Producción: Supabase Session pooler en Render API

### Despliegue

- API + Static Site en Render (ver `docs/DEPLOY-RENDER.md`)
- Repo GitHub: `desarrollotic-cpu/Portalcoraza`

### Roles iniciales

`GERENCIA`, `RRHH`, `PROGRAMADOR`, `ALMACENISTA`, `VIGILANTE`, `ADMINISTRADOR_UNIDAD`

**GERENCIA** = administrador Fase 1 (todos los permisos del seed).

### Usuario admin previsto (tras seed)

| Campo | Valor |
|-------|--------|
| Email | `admin@coraza.local` |
| Password | `Coraza2026!` |
| Rol | GERENCIA |

---

## 4. Qué NO está hecho / pendiente

| Ítem | Estado |
|------|--------|
| Frontend residencial (12.x) | **Pendiente** |
| Notificaciones Realtime UI (13.x) | **Pendiente** |
| Admin usuarios/roles UI (13.x) | **Pendiente** |
| Verificación E2E (14.x) | **Pendiente** |
| Bucket `delivery-signatures` (2.7) | **Manual Supabase** |
| Realtime `notifications` (2.8) | **Manual Supabase** |
| SDK oficial firma entregas (4.3) | **Pendiente** |
| PNG logo estático `coraza-logo.png` | **Opcional** |

---

## 5. Configuración Supabase

- **Project ref:** `duxpqkldgdnfcabpkogl`
- **URL:** `https://duxpqkldgdnfcabpkogl.supabase.co`
- **Publishable key:** en `apps/web/src/environments/environment.ts` y `apps/api/.env` como `SUPABASE_PUBLISHABLE_KEY`
- **DATABASE_URL:** en `apps/api/.env` — contraseña de usuario `postgres` ya colocada por el usuario (**no copiar a chat ni a Git**)

Formato esperado:

```
DATABASE_URL=postgresql://postgres:***@db.duxpqkldgdnfcabpkogl.supabase.co:5432/postgres
```

---

## 6. Qué pasó con `npm run db:setup`

1. Primer intento: error TypeScript — faltaba `@types/pg` → **corregido** en `apps/api/package.json`.
2. Intentos siguientes: **`getaddrinfo EAI_AGAIN`** al resolver `db.duxpqkldgdnfcabpkogl.supabase.co` desde el entorno del agente (red/DNS intermitente o restricción del sandbox).
3. `nslookup` desde la misma máquina **sí resolvió** el host (a veces solo IPv6).

**Conclusión:** el script es correcto; debe ejecutarse en la **terminal local del usuario** o aplicar SQL manualmente en Supabase Dashboard.

---

## 7. Próximos pasos (orden recomendado)

### A. Base de datos (obligatorio)

**Opción 1 — Terminal local del usuario:**

```bash
cd Portal_Coraza
npm install
npm run db:setup
```

**Opción 2 — SQL Editor Supabase:**

1. Ejecutar `supabase/migrations/001_core_schema.sql`
2. Ejecutar `supabase/seed/001_roles_permissions.sql`
3. En PC: `npm run seed:admin -w @coraza/api`

### B. Arrancar servicios

```bash
npm run api:dev    # http://localhost:3000/api/v1
npm run web:dev    # http://localhost:4200
```

### C. Verificar login

- URL: http://localhost:4200
- `admin@coraza.local` / `Coraza2026!`

### D. Desarrollo siguiente (producto)

1. **12.x Residencial** — unidades, visitantes, paquetes, reservas
2. **13.x** — Realtime notificaciones, admin, widgets dashboard
3. **14.x** — Verificación final
4. Tareas manuales Supabase: bucket firmas (2.7), Realtime (2.8)
5. Opcional: subir `coraza-logo.png` para logo estático en formulario

---

## 8. Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run db:setup` | Migraciones + seeds + admin |
| `npm run api:dev` | API en watch |
| `npm run web:dev` | Angular dev server |
| `npm run build -w @coraza/api` | Build API |
| `npm run build -w @coraza/web` | Build web |

---

## 9. Reglas de negocio clave (no romper)

- Solo **RRHH** puede **crear** asociados (`associates.create`).
- Asociados son entidad única consumida por dotación, programación y documental (sin duplicar).
- Módulo documental: solo metadatos, no archivos.
- `ADMINISTRADOR_UNIDAD`: solo ve su unidad (fase residencial, no implementada aún).

---

## 10. Documentación en repo

- `README.md` — inicio rápido
- `docs/ARCHITECTURE.md` — principios
- `docs/SUPABASE.md` — Supabase
- `docs/COMO-OBTENER-CLAVE-SUPABASE.md` — contraseña BD
- `docs/DEPLOY-RENDER.md` — despliegue Render + assets login (video/logo)
- `docs/HANDOFF-IA.md` — este archivo

---

## 11. Mensaje corto para pegar a otra IA

```
Continúa System Coraza (monorepo NestJS + Angular + Supabase).

PRODUCCIÓN: API portalcoraza.onrender.com | Web portalcoraza-web.onrender.com
Login: admin@coraza.local / Coraza2026!

HECHO: Backend 0.x–8.x completo. Frontend: RRHH, dotación, programación, documental, login con video.
Change activo: openspec/changes/system-coraza-v2/ — leer tasks.md + progress.md.

SIGUIENTE: 12.x Frontend residencial, luego 13.x notificaciones/admin.

PENDIENTE MANUAL: Supabase bucket delivery-signatures (2.7), Realtime notifications (2.8).
Assets login: apps/web/public/videos/coraza-logo.mp4 (deployed). PNG opcional en public/images/.
```
