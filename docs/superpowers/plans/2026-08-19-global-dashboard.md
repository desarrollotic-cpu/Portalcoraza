# Global Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/dashboard` as a permission-filtered hybrid home (alerts + module sections) using existing overview APIs.

**Architecture:** Rewrite `DashboardApiService.loadHome()` to call allowed module overviews in series, map each to a section + alert chips, and render in `dashboard.ts` without hardcoding `GERENCIA`.

**Tech Stack:** Angular standalone, RxJS (`from` + `concatMap` + `reduce`), existing feature API services / HTTP.

## Global Constraints

- No new backend mega-endpoint in v1.
- Gate by `*.view` permissions; no `role.code` hardcode for data.
- Serial load (or ≤2 parallel); each source `catchError` isolated.
- Núcleo only: RRHH, Dotación, Recepción, Programación, Documental, Admin.
- Read-only + navigation CTAs.

---

## File map

| File | Role |
|------|------|
| `apps/web/.../dashboard/dashboard-api.service.ts` | Orchestrator + mappers + types |
| `apps/web/.../dashboard/dashboard.ts` | UI: hero CTAs, alert strip, module sections |

## Task 1: Dashboard API orchestrator

- [x] Replace `loadForRole` with `loadHome()` returning `DashboardHome`.
- [x] Permission gates per spec; inject `AuthService` or accept permission checker.
- [x] Serial `concatMap` loaders; map HR / deliveries / reception / scheduling / documental / users.
- [x] Documental: `analytics` + `notifications` (alerts).
- [x] Unit-style self-check optional: pure mapper functions for alert thresholds.

## Task 2: Dashboard UI

- [x] Remove `role === 'GERENCIA'` / `isKnownRole` gating of KPIs.
- [x] Render alert chips + module section cards (ok/error).
- [x] Hero CTAs: add Recepción + Admin; keep existing.
- [x] Empty state when user has zero module view permissions.

## Task 3: Verify

- [x] Lint/typecheck touched files.
- [x] Manual: login with broad role sees multiple sections.
- [ ] Commit/push when JHON asks.
