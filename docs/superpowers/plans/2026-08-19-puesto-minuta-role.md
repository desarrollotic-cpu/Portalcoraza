# Rol PUESTO Minuta — Implementation Plan

> **For agentic workers:** Use executing-plans / implement task-by-task.

**Goal:** Rol PUESTO + seed Amisi + filtro Minuta por `user_posts`.

**Architecture:** Seed SQL/script como almacenista; helper `resolvePostScope` en MinutaService; `minuta.create` en creates; GERENCIA sin cambio de filtro.

**Tech Stack:** NestJS, TypeORM, pg seed script, Jest.

## Global Constraints

- No reescribir módulo Minuta de negocio.
- Diff mínimo; reutilizar `user_posts`.

---

### Task 1: Seed rol + permisos + usuario Amisi

- [ ] Script `seed-puesto-amisi.ts`
- [ ] Permisos `minuta.view`, `minuta.create`; rol PUESTO; user_posts
- [ ] Ejecutar contra BD portal

### Task 2: Filtro API Minuta

- [ ] Helper scope por role PUESTO
- [ ] dashboard / historial / crear con postId forzado
- [ ] Test unitario del scope
- [ ] Controller: creates con `minuta.create`
