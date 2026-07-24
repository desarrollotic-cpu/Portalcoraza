# Private delivery signatures — Design

**Date:** 2026-07-21  
**Status:** Approved  
**Closes:** openspec task 2.7 (bucket policies)

## Problem

Firmas de dotación se suben al bucket `delivery-signatures` y se guardan como URL pública. Quien tenga el link ve la firma sin autenticación.

## Decision

**Enfoque 1:** bucket **privado** + descarga solo vía API Nest autenticada.

## Behavior

1. Upload sigue usando `service_role`; se guarda en DB la misma forma de URL pública (path extraíble) o el path relativo — compatible con firmas existentes vía `extractFilePath`.
2. Nuevo `GET /api/v1/deliveries/:id/signature` con `JwtAuthGuard` + permiso `deliveries.view` (o `inventory.view` alineado a listados/PDF). Sirve bytes (`image/jpeg|png|webp`) como `StreamableFile`.
3. UI (`SignatureViewer`): recibe `deliveryId`, pide el blob con `HttpClient` (interceptor JWT), muestra `blob:` URL. No usa la URL de Storage en `<img>`.
4. PDF (`DeliveriesReportsService`): descarga la imagen con Storage client (`service_role`), no con `fetch(publicUrl)`.
5. Operación manual: en Supabase Dashboard marcar el bucket como **Private** (o recrear políticas sin acceso `anon` de lectura).

## Non-goals

- Migrar URLs históricas en DB (no hace falta si `extractFilePath` sigue funcionando).
- Signed URLs temporales.
- Cambiar el flujo de captura/firma en el pad.

## Success criteria

- Sin token JWT, la imagen de firma no es accesible.
- Historial/listado muestran la firma igual que hoy.
- PDF por asociado sigue embebiendo la firma.
- Tests unitarios cubren resolución de path + 404 sin firma.
