# AGENTS.md — Portalcoraza

Guía para agentes de código (Cursor, etc.). El producto es el monorepo NestJS + Angular + Supabase.

## Preferencias del usuario

- Responder empezando por **JHON**.
- Cambios de recepción/dotación: rama → commit → merge a `main` solo cuando lo pida.
- Mejorar el *agente* con skills/reglas; no volcar metodologías como código de negocio.

## Toolkit instalado en este repo

| Capa | Ubicación | Rol |
|------|-----------|-----|
| Ponytail | `.cursor/rules/ponytail.mdc` | Código mínimo, YAGNI, reutilizar |
| Coordinación | `.cursor/rules/agent-toolkit.mdc` | Cuándo usar cada skill |
| Nombre | `.cursor/rules/respuesta-con-nombre.mdc` | Saludo JHON |
| Superpowers | `.cursor/skills/*` | Plan, TDD, debug, review, subagentes |
| Graphify | `.cursor/skills/graphify/` | Grafo del codebase (`/graphify`) |
| Dominio | `.agents/skills/supabase*` | Supabase / Postgres |

## Graphify (CLI opcional)

Sin Python en PATH el skill queda instalado, pero el pipeline completo necesita:

```bash
pipx install graphifyy
graphify install
graphify .
```

Salida esperada en `graphify-out/` (ignorada por git). Luego consultas vía skill `/graphify query "..."`.

## Stack rápido

- API: `apps/api` (NestJS)
- Web: `apps/web` (Angular)
- SQL: `supabase/migrations`
- Scripts: `npm run api:dev` / `npm run web:dev`
