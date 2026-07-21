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

### Recuperar contraseña del admin

**Opción A — script (recomendado)**

```bash
# Desde la raíz del monorepo
SEED_ADMIN_PASSWORD="TuNuevaClave123!" npm run reset:admin-password
```

**Opción B — desde el login**

1. En `apps/api/.env` define una clave larga:
   `ADMIN_RECOVERY_SECRET=una-clave-secreta-de-al-menos-16`
2. Reinicia la API
3. En la pantalla de login → “recupera el acceso aquí” → ingresa esa clave y la nueva contraseña

Los demás usuarios: si olvidan la clave, el admin la restablece en **Administración → Usuarios → Restablecer clave**. Si la recuerdan, cada uno la cambia desde el menú de su perfil (arriba a la derecha).

## 4. Arrancar

```bash
npm run api:dev
npm run web:dev
```

## 5. Evitar pausa del plan free (keep-alive)

Supabase free puede pausar el proyecto por inactividad. Hay dos formas de mantenerlo activo:

### A) Manual / local

```bash
npm run db:keepalive
```

### B) Automático con GitHub Actions (recomendado)

1. En GitHub: **Settings → Secrets and variables → Actions**
2. Crea el secret `DATABASE_URL` con la misma URI de Postgres de `apps/api/.env`
3. El workflow `.github/workflows/keepalive-db.yml` corre cada 2 días (también se puede lanzar a mano en **Actions → Keepalive Supabase DB → Run workflow**)

## Seguridad

- **No subas** `.env` ni la contraseña de postgres a GitHub.
- La clave `sb_publishable_...` puede ir en el frontend; **nunca** la `service_role` en el cliente.

### Bucket `delivery-signatures` (privado)

1. Supabase Dashboard → **Storage** → bucket `delivery-signatures` (créalo si no existe).
2. Marca el bucket como **Private** (sin lectura pública `anon`).
3. La API Nest sube/descarga con `SUPABASE_SERVICE_ROLE_KEY`.
4. El portal muestra firmas vía `GET /api/v1/deliveries/:id/signature` (JWT + permiso `deliveries.view`).
5. Variables en `apps/api/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, opcional `SUPABASE_SIGNATURE_BUCKET=delivery-signatures`.

### Realtime `notifications` (2.8)

1. Preferido: ejecutar migración `supabase/migrations/025_notifications_realtime.sql` (añade la tabla a la publication `supabase_realtime`).
2. Alternativa Dashboard: **Database → Replication** (o Publications) → habilitar `public.notifications`.
3. El código Angular ya escucha `INSERT` filtrado por `user_id` (`NotificationService`).
4. Tras activar: crear una notificación de prueba desde la API y confirmar que aparece en la campana sin refrescar.
