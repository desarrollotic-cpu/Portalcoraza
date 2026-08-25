# Demo smoke tests — Implementation Plan

> **For agentic workers:** implement task-by-task.

**Goal:** Safe smoke suite for presentation modules.

**Architecture:** One Node/Jest script hitting Nest HTTP (or pg read-only) with timed assertions; default no writes.

**Tech Stack:** Nest API, Jest or plain ts-node, pg, apps/api/.env

## Tasks

- [ ] Task 1: `scripts/demo-smoke.ts` + npm script `test:demo`
- [ ] Task 2: Login + RRHH + Dotación + Programación + Recepción read checks
- [ ] Task 3: Optional write (reception) behind `DEMO_TESTS_ALLOW_WRITE=1` with cleanup
- [ ] Task 4: Doc one-liner how to run
