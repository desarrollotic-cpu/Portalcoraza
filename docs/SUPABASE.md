# Supabase — System Coraza

**Proyecto:** `duxpqkldgdnfcabpkogl`  
**URL:** https://duxpqkldgdnfcabpkogl.supabase.co

### Variables (Next.js vs este proyecto)

| Next.js | System Coraza (Angular) |
|---------|-------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `environment.supabase.url` en `apps/web/src/environments/` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `environment.supabase.publishableKey` |

La API NestJS usa `DATABASE_URL` (PostgreSQL) — **no** sustituye la clave publicable.

## 1. Contraseña de base de datos

1. Supabase Dashboard → **Project Settings** → **Database**
2. Copia o restablece la contraseña de `postgres`
3. En `apps/api/.env`, sustituye `REEMPLAZA_TU_PASSWORD` en `DATABASE_URL`

## 2. Crear tablas y roles (primera vez)

**Opción A — SQL Editor (recomendado al inicio)**

Ejecuta en orden:

1. `supabase/migrations/001_core_schema.sql`
2. `supabase/seed/001_roles_permissions.sql`
3. `supabase/seed/003_business_permissions.sql` (rol SUPERVISOR + permisos de negocio consolidados)

**Opción B — Supabase CLI**

```bash
supabase login
supabase link --project-ref duxpqkldgdnfcabpkogl
supabase db push
```

> Los archivos de migración del repo deben estar en `supabase/migrations/` con el formato que espera la CLI.

## 3. Usuario administrador

```bash
cd apps/api
npm run seed:admin
```

- Email: `admin@coraza.local`
- Clave: `Coraza2026!`
- Rol: GERENCIA

## 4. Arrancar

```bash
npm run api:dev
npm run web:dev
```

## Seguridad

- **No subas** `.env` ni la contraseña de postgres a GitHub.
- La clave `sb_publishable_...` puede ir en el frontend; **nunca** la `service_role` en el cliente.
