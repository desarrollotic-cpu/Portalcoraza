# System Coraza

Plataforma web modular para gestión administrativa y operativa de vigilancia y seguridad privada.

**Repositorio:** [github.com/desarrollotic-cpu/Portalcoraza](https://github.com/desarrollotic-cpu/Portalcoraza)

## Estructura

```
Portal_Coraza/
├── apps/
│   ├── api/          # NestJS — API REST
│   └── web/          # Angular 21 — Frontend
├── supabase/
│   ├── migrations/   # Esquema PostgreSQL
│   └── seed/         # Roles, permisos
└── docs/
```

## Requisitos

- Node.js 20+
- Proyecto en [Supabase](https://supabase.com) (PostgreSQL)
- Cuenta en [Render](https://render.com) (despliegue, fases posteriores)

## Inicio rápido

### 1. Base de datos

**Opción automática (recomendada):** pon tu contraseña en `apps/api/.env` y ejecuta:

```bash
npm run db:setup
```

**Opción manual:** SQL Editor de Supabase — `001_core_schema.sql` y `001_roles_permissions.sql`

### 2. API

```bash
cd apps/api
copy .env.example .env
# Edita DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
```

Desde la raíz del monorepo:

```bash
npm install
npm run api:dev
```

Crear usuario administrador (después de tener roles en BD):

```bash
cd apps/api
npx ts-node scripts/seed-admin.ts
```

Credenciales por defecto: `admin@coraza.local` / `Coraza2026!` (rol **GERENCIA**, permisos completos Fase 1)

Si ya habías ejecutado el seed antiguo (GERENCIA solo lectura), ejecuta también `supabase/seed/002_gerencia_full_permissions.sql`.

### 3. Frontend

```bash
npm run web:dev
```

Abre http://localhost:4200 e inicia sesión.

## API (Fase 1)

Prefijo: `http://localhost:3000/api/v1`

| Método | Ruta | Permiso |
|--------|------|---------|
| POST | `/auth/login` | Público |
| POST | `/auth/refresh` | Público |
| POST | `/auth/logout` | JWT |
| GET | `/roles` | `roles.view` |
| GET | `/permissions` | `roles.view` |
| GET | `/users` | `users.view` |
| GET/POST/PATCH | `/associates` | `associates.*` |
| POST | `/associates/:id/retire` | `associates.retire` |
| GET/POST/PATCH | `/posts` | `posts.*` |

**Regla de negocio:** solo usuarios con `associates.create` (rol RRHH) pueden crear asociados.

## Roadmap

- **Fase 1** (actual): Auth, roles, permisos, asociados, puestos
- Fase 2: Dashboard avanzado, dotación
- Fase 3: Programación
- Fase 4: Documental
- Fase 5: Unidades residenciales
- Fase 6: Notificaciones Realtime, auditoría avanzada

## Stack oficial

Angular 20+ · NestJS · PostgreSQL (Supabase) · JWT · Render · GitHub
