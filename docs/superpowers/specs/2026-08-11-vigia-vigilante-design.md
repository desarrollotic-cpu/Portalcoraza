# Diseño — Coraza Vigía (app vigilante)

**Fecha:** 2026-08-11  
**Estado:** MVP a implementar (opción A — nativo Portal)

## Decisiones

| Tema | Decisión |
|------|----------|
| Ubicación | `/vigia` nativo Angular + Nest + Supabase |
| Auth | Cédula + PIN 4 dígitos. Primera vez: cédula + nombre para crear PIN (hash bcrypt). JWT `aud=vigia` |
| Offline | Fase 2 (online-first; sesión local solo si API cae en login) |
| Acceso | Fuera del menú admin; URL directa móvil |
| Lectura | Vigilante solo ve/registra lo suyo; sin admin de puestos |

## MVP

1. Login cédula+PIN → sesión + inicio turno. Primera vez: setup con cédula+nombre+PIN  
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
