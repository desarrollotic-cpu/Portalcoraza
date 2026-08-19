# Demo smoke tests — Login / RRHH / Dotación / Programación / Recepción

**Date:** 2026-08-19  
**Status:** approved  
**Goal:** In ~2 days, prove the demo path works (auth, read, safe write) without damaging production data.

## Safety rules (non-negotiable)

1. **No** update/delete of users, roles, associates, inventory stock, or monthly schedules.
2. Prefer **read-only** checks against live `DATABASE_URL` / API.
3. If a write is needed (reception visitor), create a clearly tagged test row and **delete it** in `finally`, or skip write if `DEMO_TESTS_ALLOW_WRITE!=1`.
4. Default mode: **read-only**. Writes opt-in via env flag.
5. Never commit secrets; use existing `apps/api/.env`.

## Scope

| Area | Checks |
|------|--------|
| Login | Valid credentials → JWT; bad password → 401 |
| RRHH | Associates list page returns items+total; education filter optional |
| Dotación | Warehouses/stock readable; overview returns numbers |
| Programación | August ≥8 schedules; May ≥200 schedules |
| Recepción | Lookup associate by known doc; list inside; optional register+delete |

## Delivery

- `npm run test:demo -w @coraza/api` → PASS/FAIL + ms per check
- Spec/plan under `docs/superpowers/`
- Docs note in CONTINUAR or RENDIMIENTO: how to run before the presentation
