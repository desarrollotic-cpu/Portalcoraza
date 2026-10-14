# Despliegue en Render + Supabase

## Arquitectura

| Servicio | URL típica | Qué es |
|----------|------------|--------|
| **API** (`portalcoraza`) | `https://portalcoraza.onrender.com` | NestJS — rutas en `/api/v1/*` |
| **Web** (`portalcoraza-web`) | `https://portalcoraza-web.onrender.com` | Angular — login, dashboard, módulos |
| **Minuta** (`portalcoraza-minuta`) | `https://portalcoraza-minuta.onrender.com` | Angular — vigilantes en puesto (rol `PUESTO`) |

> Handoff deploy Minuta: [`docs/MINUTA-WEB-DEPLOY-HANDOFF.md`](./MINUTA-WEB-DEPLOY-HANDOFF.md)  
> Producto / UX Minuta: [`docs/MINUTA-VIRTUAL.md`](./MINUTA-VIRTUAL.md)  
> Operaciones (puestos + minutas ops): [`docs/OPERACIONES.md`](./OPERACIONES.md)

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

### Importante — rutas Angular (evitar “Not Found” en `/auth/login`)

En **Render Dashboard** → servicio `portalcoraza-web` → **Redirects/Rewrites** → Add:

| Campo | Valor |
|-------|--------|
| Source Path | `/*` |
| Destination Path | `/index.html` |
| Action | `Rewrite` |

Sin esa regla, rutas como `/auth/login` o `/sst/panel` devuelven **Not Found**.  
La raíz `/` sí carga; también sirven las rutas pregeneradas por `apps/web/scripts/spa-fallback-pages.js` tras el build.

> Recomendado: deja la rewrite `/*` → `/index.html` en el Dashboard. El script de fallback cubre las rutas principales si la rewrite aún no está.

### Después del deploy del frontend

1. Copia la URL del static site (ej. `https://portalcoraza-web.onrender.com`).
2. En el servicio **API** → **Environment**, actualiza:

```
CORS_ORIGIN=https://portalcoraza-web.onrender.com,https://portalcoraza-minuta.onrender.com
```

3. Redespliega la API.
4. Entra al static site → `/auth/login`.

Credenciales por defecto (si corriste seed): `admin@coraza.local` / `Coraza2026!`

---

## Assets del login (video y logo)

Los archivos estáticos viven en `apps/web/public/` y Angular los copia a `apps/web/dist/web/browser/` al hacer build.

| Archivo | Ruta en repo | URL en producción |
|---------|--------------|-------------------|
| Video animado | `apps/web/public/videos/coraza-logo.mp4` | `/videos/coraza-logo.mp4` |
| Logo PNG (opcional) | `apps/web/public/images/coraza-logo.png` | `/images/coraza-logo.png` |

**Requisitos del video:**

- Nombre exacto: `coraza-logo.mp4` (minúsculas, sin doble extensión)
- Formato: MP4 (H.264), sin audio, idealmente &lt; 3 MB
- Se reproduce en loop, muted, autoplay en el panel derecho del login

**Verificar que el video se sirve:**

1. Tras deploy, abre: `https://portalcoraza-web.onrender.com/videos/coraza-logo.mp4`
2. Debe reproducir/descargar el MP4 — **no** la página HTML del SPA
3. Si devuelve HTML → revisa **Publish Directory** (`apps/web/dist/web/browser`)

**SPA routing vs assets estáticos:**

- El rewrite `/* → /index.html` está en `render.yaml` (Render sirve archivos existentes antes del rewrite)
- **No** usar catch-all en `apps/web/public/_redirects` (`/* /index.html`) — puede bloquear `/videos/*` en algunos hosts
- El routing SPA de Angular queda cubierto por `render.yaml`

**Troubleshooting video invisible en login:**

1. Confirmar que `coraza-logo.mp4` está en git y en el build (`dist/web/browser/videos/`)
2. Probar URL directa del video (arriba)
3. Hard refresh: Ctrl+F5
4. Si falla el video, el layout muestra texto "Coraza" como fallback

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

## Memoria del API (`exceeded its memory limit`)

Render manda ese correo cuando la instancia supera su RAM y la reinicia. La causa
de fondo es que Node calcula el tamaño de su heap mirando la memoria **del host**,
no el límite del contenedor: cree que tiene de sobra, el recolector no actúa a
tiempo y el proceso cruza el tope.

Por eso `start:prod` arranca con un tope explícito:

```
node --max-old-space-size=${NODE_HEAP_MB:-460} dist/main
```

Ajusta `NODE_HEAP_MB` en Render a **~75-80 % de la RAM de la instancia**:

| Instancia | RAM | `NODE_HEAP_MB` |
|-----------|-----|----------------|
| Free / Starter | 512 MB | `460` (valor por defecto) |
| Standard | 2 GB | `1536` |
| Pro | 4 GB | `3072` |

Si subes de plan y no cambias la variable, el API seguirá limitado a 460 MB.

### Comando de arranque

El servicio `portalcoraza` tiene **Root Directory** `apps/api`, así que sus
comandos se ejecutan ya dentro de esa carpeta:

| Campo | Valor |
|-------|-------|
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm run start:prod` |

El tope de heap vive en el script `start:prod`. Si el Start Command es
`node dist/main.js` directamente —como estuvo hasta ahora— el tope **no se
aplica**, por mucho que esté en el `package.json`.

> `--max-old-space-size` limita el heap de V8, pero **no** la memoria externa:
> los `Buffer` (Excel, PDF) viven fuera del heap. Por eso las exportaciones se
> escriben en streaming en vez de armarse completas en memoria, y por eso el
> tope de heap es una red de seguridad, no la solución.

### Historial de caídas por memoria (para referencia)

| Fecha | Hora (Colombia) |
|-------|-----------------|
| 8 oct 2026 | 16:40 |
| 9 oct 2026 | 07:33 y 10:26 |
| 13 oct 2026 | 08:07 |
| 14 oct 2026 | 16:28 |

Todas en horario laboral y con la memoria **plana en ~190 MB (38 %) el resto
del tiempo**: no era una fuga que creciera poco a poco, sino un pico puntual de
una sola operación. Esa es la firma de una exportación o un PDF armado entero
en memoria, no la de un cron ni la de un acumulador.

### Qué mirar cuando vuelva a pasar

El API deja una muestra por minuto en los logs:

```
[Memoria] rss=312.4MB (61% de 512MB) heap=180.2/220.0MB ext=94.1MB buffers=88.3MB pico=355.0MB
```

Cómo leerla:

- **`ext` / `buffers` creciendo** → el consumo viene de Buffers: una exportación,
  un PDF o una subida.
- **`heap` creciendo y sin bajar** → fuga de objetos en la aplicación.
- A partir del 80 % la línea sale como `warn`, para localizarla rápido.

Además, toda petición que haga crecer la memoria más de 25 MB se registra con su
ruta:

```
[MemoriaPeticion] GET /api/v1/associates/export +180.3MB en 4200ms (rss=420.1MB)
```

Esa línea es la que señala al culpable sin tener que deducirlo por la hora.

Variables para ajustarlo (todas opcionales):

| Variable | Por defecto | Para qué |
|----------|-------------|----------|
| `MEMORY_SAMPLE_INTERVAL_MS` | `60000` | Cada cuánto se muestrea |
| `MEMORY_REQUEST_DELTA_MB` | `25` | Umbral para registrar una petición |
| `MEMORY_LIMIT_MB` | `512` | RAM de la instancia, para el porcentaje |
| `MEMORY_MONITOR` | *(vacío)* | `off` desactiva la instrumentación |

### Zona horaria de las tareas programadas

El contenedor de Render corre en **UTC**. Un `@Cron` sin `timeZone` usa esa hora,
así que `0 8 * * *` se disparaba a las **3:00 a.m. hora Colombia**, no a las 8:00
como decía el código.

Los tres crons declaran ahora `timeZone: APP_TIMEZONE` (`America/Bogota`), que
vive en `apps/api/src/common/constants/app-timezone.ts`. Quedan así:

| Tarea | Hora Colombia |
|-------|---------------|
| Recordatorios de préstamos vencidos | 8:00 a.m. y 2:00 p.m. |
| Motor de alertas de Gestión Humana | 3:00 a.m. |
| Purga de historial de auditoría | 4:00 a.m. |

No hace falta definir `TZ` en Render: la zona va explícita en el código. Si aun
así la defines, no entra en conflicto.

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
