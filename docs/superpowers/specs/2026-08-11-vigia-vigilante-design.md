# Diseño — Coraza Vigía (app vigilante)

**Fecha:** 2026-08-11  
**Estado:** MVP a implementar (opción A — nativo Portal)

## Decisiones

| Tema | Decisión |
|------|----------|
| Ubicación | `/vigia` nativo Angular + Nest + Supabase |
| Auth | Cédula + primer nombre (asociado ACTIVO). JWT `aud=vigia` (sin password) |
| Offline | Fase 2 (online-first; sesión local solo si API cae en login) |
| Acceso | Fuera del menú admin; URL directa móvil |
| Lectura | Vigilante solo ve/registra lo suyo; sin admin de puestos |

## MVP

1. Login cédula+nombre → sesión + inicio turno + primer puesto activo  
2. Dashboard: turnero, consignas, SOS, dotación, colillas + cronómetro  
3. SOS + alerta de vida (cliente)  
4. Consignas (directorio/reglas)  
5. Dotación (lista + solicitar cambio + firmar)  
6. Nómina (lista + reclamar)  
7. Cerrar turno con relevo  
8. Bitácora/minutas (API activa; oculto del menú home)

## Fuera de MVP

- Sync offline completa  
- Maps “cómo llegar” avanzado (link Maps básico sí)  
- Admin UI de consignas/nómina (seed + API)
