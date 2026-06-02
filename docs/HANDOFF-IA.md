# Handoff — System Coraza (Portal Coraza)

Documento para continuar el desarrollo con otra IA o desarrollador.

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

- Login, dashboard, listado asociados (lectura)
- Layout con sidebar, tema en `src/styles/_theme.scss`
- `environment.ts` con `supabase.url` y `publishableKey`
- Rutas lazy: `/auth/login`, `/dashboard`, `/rrhh/asociados`

### Base de datos (SQL en repo, **no confirmado aplicado en Supabase**)

- `supabase/migrations/001_core_schema.sql` — tablas core
- `supabase/seed/001_roles_permissions.sql` — 6 roles + permisos
- `supabase/seed/002_gerencia_full_permissions.sql` — parche GERENCIA

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

## 4. Qué NO está hecho / bloqueado

| Ítem | Estado |
|------|--------|
| SQL ejecutado en Supabase | **Pendiente** (o no verificado) |
| Usuario admin en BD | **Pendiente** |
| Login end-to-end funcionando | **Pendiente** (depende de BD + API) |
| `npm run db:setup` desde agente Cursor | **Falló** — ver sección 6 |
| Push a GitHub | **Falló** — usuario `jhoncode1994` sin permiso 403 en org `desarrollotic-cpu` |
| UI CRUD usuarios / asociados / puestos | **Pendiente** |
| Angular Material | No instalado (estilos SCSS propios) |
| Supabase CLI | No instalada en Windows del usuario |
| Fases 2–6 (dotación, programación, etc.) | No iniciadas |

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

1. Pantalla admin: crear usuarios (RRHH, etc.) — API `POST /users` ya existe
2. CRUD asociados (solo RRHH crea — regla de negocio)
3. CRUD puestos
4. Commit + push a GitHub (resolver permisos org)
5. Rotar contraseña BD (fue expuesta en chat con el usuario)

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
- `docs/HANDOFF-IA.md` — este archivo

---

## 11. Mensaje corto para pegar a otra IA

```
Continúa System Coraza en Portal_Coraza (monorepo NestJS + Angular 21 + Supabase duxpqkldgdnfcabpkogl).

HECHO: Fase 1 API (auth JWT, RBAC, associates, posts, audit), frontend login/dashboard/lista asociados, SQL migrations/seeds, .env con DATABASE_URL, script npm run db:setup.

BLOQUEADO: db:setup no corrió desde agente (DNS EAI_AGAIN). Tablas y admin@coraza.local probablemente NO existen en Supabase aún.

HAZ PRIMERO: npm run db:setup en terminal local O ejecutar SQL en Supabase + seed:admin. Luego api:dev + web:dev y verificar login.

SIGUIENTE: UI CRUD usuarios/asociados/puestos, push a github.com/desarrollotic-cpu/Portalcoraza, no commitear .env.
```
