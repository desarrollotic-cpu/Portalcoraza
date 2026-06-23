# Despliegue en Render + Supabase

## Arquitectura

| Servicio | URL típica | Qué es |
|----------|------------|--------|
| **API** (`portalcoraza`) | `https://portalcoraza.onrender.com` | NestJS — rutas en `/api/v1/*` |
| **Web** (`portalcoraza-web`) | `https://portalcoraza-web.onrender.com` | Angular — login, dashboard, módulos |

Abrir solo la URL de la **API** en `/` devuelve `404 Cannot GET /` — es normal. El portal está en el **Static Site**.

---

## Desplegar el frontend (Angular)

### Opción A — Blueprint (`render.yaml` en la raíz)

1. Haz **push** de este repo a GitHub (incluye `render.yaml` y `apps/web/public/_redirects`).
2. En [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Conecta el repo `Portalcoraza`.
4. Render creará el servicio **`portalcoraza-web`** (Static Site).
5. Al terminar el deploy, abre la URL del static site (ej. `https://portalcoraza-web.onrender.com`).

### Opción B — Manual (Static Site)

1. **New** → **Static Site** → mismo repo.
2. Configuración:

| Campo | Valor |
|-------|--------|
| Name | `portalcoraza-web` |
| Branch | `main` |
| Root Directory | *(vacío — raíz del monorepo)* |
| Build Command | `npm install && npm run web:build` |
| Publish Directory | `apps/web/dist/web/browser` |

3. **Create Static Site** y espera el build.

### Después del deploy del frontend

1. Copia la URL del static site (ej. `https://portalcoraza-web.onrender.com`).
2. En el servicio **API** → **Environment**, actualiza:

```
CORS_ORIGIN=https://portalcoraza-web.onrender.com
```

3. Redespliega la API.
4. Entra al static site → `/auth/login`.

Credenciales por defecto (si corriste seed): `admin@coraza.local` / `Coraza2026!`

---

## API — variables de entorno

Este error en Render casi siempre significa que **`DATABASE_URL` en Render no coincide** con la cadena del dashboard de Supabase (host del pooler o usuario incorrectos).

Render es **solo IPv4**. No uses la conexión directa `db.<ref>.supabase.co` en producción; usa el **Connection Pooler**.

## Configurar `DATABASE_URL` en Render

1. Abre [Supabase → Database → Connection string](https://supabase.com/dashboard/project/duxpqkldgdnfcabpkogl/settings/database)
2. Pestaña **Connection pooling**
3. Modo **Session** (puerto **5432**)
4. Copia la URI completa **sin modificar el host** (puede ser `aws-0-...` o `aws-1-...` según tu proyecto)

Formato esperado:

```
postgresql://postgres.duxpqkldgdnfcabpkogl:[PASSWORD]@aws-X-[REGION].pooler.supabase.com:5432/postgres
```

Puntos críticos:

| Campo | Valor correcto | Error común |
|-------|----------------|-------------|
| Usuario | `postgres.duxpqkldgdnfcabpkogl` | Solo `postgres` (válido solo en conexión directa local) |
| Host | El que muestra **tu** dashboard (`aws-0` vs `aws-1`) | Copiar un host de documentación genérica |
| Puerto | `5432` (Session pooler) | Mezclar puerto 6543 con modo Session |
| Contraseña | Sin `@`, `#`, `%` sin codificar | Caracteres especiales sin URL-encode |

5. En **Render** → tu servicio API → **Environment** → pega `DATABASE_URL` con la URI copiada.

## Otras variables en Render

```
NODE_ENV=production
JWT_ACCESS_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
JWT_ACCESS_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://portalcoraza-web.onrender.com
SUPABASE_URL=https://duxpqkldgdnfcabpkogl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

---

## Error: `tenant/user postgres.<ref> not found`

Si el proyecto está **pausado** (plan free inactivo), el pooler también responde `tenant/user not found`.  
En el dashboard, reanuda el proyecto antes de redesplegar.

## Después de corregir

1. Guarda variables en Render
2. **Manual Deploy** → Clear build cache & deploy (opcional si persiste)
3. Revisa logs: debe aparecer `System Coraza API: http://localhost:...`

## Local vs producción

| Entorno | Conexión recomendada |
|---------|-------------------|
| Local (`npm run db:setup`) | Direct: `postgresql://postgres:[PASSWORD]@db.duxpqkldgdnfcabpkogl.supabase.co:5432/postgres` |
| Render (producción) | Session pooler: `postgresql://postgres.duxpqkldgdnfcabpkogl:...@aws-X-....pooler.supabase.com:5432/postgres` |
