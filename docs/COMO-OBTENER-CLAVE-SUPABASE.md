# Cómo obtener la contraseña de base de datos (Supabase)

Tu proyecto: **duxpqkldgdnfcabpkogl**

## Enlace directo

Abre:  
https://supabase.com/dashboard/project/duxpqkldgdnfcabpkogl/settings/database

---

## Método 1 — Crear contraseña nueva (el más fácil)

Si nunca guardaste la contraseña o no la encuentras:

1. En esa página, busca **Database password**
2. Clic en **Reset database password**
3. Supabase te muestra una **contraseña nueva** (cópiala en ese momento)
4. Guárdala en un lugar seguro

Luego en `apps/api/.env`:

```
DATABASE_URL=postgresql://postgres:LA_CLAVE_QUE_COPIASTE@db.duxpqkldgdnfcabpkogl.supabase.co:5432/postgres
```

---

## Método 2 — Copiar la URI completa

En la misma página **Database**:

1. Busca **Connection string** o **Connect**
2. Pestaña **URI**
3. Modo **Direct connection** (no pooler, para `npm run db:setup`)
4. Copia la cadena que se parece a:

   ```
   postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-...supabase.com:5432/postgres
   ```

   O la clásica:

   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.duxpqkldgdnfcabpkogl.supabase.co:5432/postgres
   ```

5. Reemplaza `[YOUR-PASSWORD]` por tu contraseña (o usa la del reset)
6. Pega **toda la línea** en `.env`:

   ```
   DATABASE_URL=postgresql://postgres:xxxxx@db.duxpqkldgdnfcabpkogl.supabase.co:5432/postgres
   ```

---

## Lo que NO es la contraseña

| No uses esto | Es para |
|--------------|---------|
| `sb_publishable_...` | Frontend / API pública |
| `service_role` / secret key | Servidor (muy sensible) |
| URL del proyecto `https://xxx.supabase.co` | Solo dirección web |

La contraseña es solo para **PostgreSQL** (usuario `postgres`).

---

## Si la contraseña tiene símbolos (@, #, %, etc.)

Codifica la clave en la URL o usa comillas en `.env` y escapa caracteres especiales.  
Si tienes problemas, elige una contraseña nueva con **Reset** usando solo letras y números (ej. `CorazaDb2026Segura`).

---

## Después de guardar `.env`

```powershell
cd C:\Users\USUARIO\Documents\02-documentos\Portal_Coraza
npm run db:setup
```
