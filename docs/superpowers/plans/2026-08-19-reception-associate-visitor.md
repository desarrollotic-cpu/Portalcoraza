# Reception associate visitor badge — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Persist and show Asociado/Visitante on reception visitors by document match to ACTIVO/VACACIONES associates.

**Architecture:** On register, normalize document digits and query associates; save `is_associate`. Optional lookup endpoint for live preview. UI badge on register/inside/history.

**Tech Stack:** NestJS, TypeORM, Angular, Supabase SQL migration 037.

## Global Constraints

- Match only ACTIVO / VACACIONES
- Digits-only document compare
- No manual override of the flag
- No associate_id in this slice

---

### Task 1: Migration + entity + register resolve

- [ ] `037_reception_visitor_associate.sql` + apply script
- [ ] Entity `isAssociate`
- [ ] `ReceptionService.register` sets flag; include in LIST_COLUMNS
- [ ] Optional `lookupAssociate(document)` GET

### Task 2: Web badge

- [ ] API types + lookup call
- [ ] Register preview on document blur/change
- [ ] Badge on inside + history lists

### Task 3: Docs

- [ ] Update REGLAS recepción briefly
