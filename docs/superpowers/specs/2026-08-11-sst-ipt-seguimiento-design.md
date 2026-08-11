# Diseño — Módulo SST IPT y Seguimiento (Portal Coraza)

**Fecha:** 2026-08-11  
**Estado:** MVP implementado en `feature/sst-ipt-seguimiento` (aplicar migración `029_sst_ipt.sql`)

## Decisiones

| Tema | Decisión |
|------|----------|
| Ubicación | Módulo nativo en Portal Coraza (`/sst`) |
| Datos | NestJS + Supabase (online primero) |
| Offline | Fase 2 |
| Puestos | Híbrido: enlace opcional a `posts` + alta SST libre |
| Branding | Logo Coraza CTA + tema del portal |

## MVP

1. Clientes y puestos SST (con `post_id` opcional).
2. Checklist oficial 34 ítems / 7 categorías.
3. IPT inicial y Seguimiento con precarga de última COMPLETADA/CERRADA.
4. Validación RIESGOSO → hallazgo + plan obligatorios.
5. % cumplimiento + semáforo (90/70).
6. Reincidencia + alerta crítica si count ≥ 3.
7. Tablero planes de acción (abiertos / reincidentes / vencidos).
8. Informes Markdown + ASCII al completar.
9. Permisos `sst.*` y rol `INSPECTOR_SST`; GERENCIA con acceso total.

## Fuera de MVP (fase 2)

- Offline-first (IndexedDB + sync).
- Evidencias en Storage Supabase (MVP: URL/Base64 en texto).
- UI dark theme dedicado (usa tokens del portal).
