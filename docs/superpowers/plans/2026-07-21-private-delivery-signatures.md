# Private delivery signatures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Servir firmas de entregas solo a usuarios autenticados; bucket Storage privado.

**Architecture:** Nest descarga con `service_role` y expone `GET /deliveries/:id/signature`. Angular carga blob vía HTTP + JWT. Reportes PDF usan el mismo download interno.

**Tech Stack:** NestJS, Supabase Storage JS, Angular HttpClient, StreamableFile.

## Global Constraints

- Ponytail: mínimo diff; reutilizar `SupabaseStorageService` y `extractFilePath`.
- Permiso de lectura de firma: `deliveries.view` (mismo que listar entregas).
- No nuevas dependencias npm.

---

## File map

| File | Change |
|------|--------|
| `apps/api/src/common/services/supabase-storage.service.ts` | `downloadObject` |
| `apps/api/src/modules/deliveries/deliveries.service.ts` | `getSignatureImage` |
| `apps/api/src/modules/deliveries/deliveries.controller.ts` | `GET :id/signature` |
| `apps/api/src/modules/deliveries/deliveries-reports.service.ts` | download vía storage |
| `apps/api/src/modules/deliveries/deliveries.service.spec.ts` | tests firma |
| `apps/web/.../inventory-api.service.ts` | `getDeliverySignatureBlob` |
| `apps/web/.../signature-viewer/signature-viewer.ts` | blob + `deliveryId` |
| `apps/web/.../deliveries-list.ts`, `delivery-history.ts` | pasar `deliveryId` |
| `docs/SUPABASE.md` | checklist bucket private |
| `openspec/.../tasks.md` | marcar 2.7 |

---

### Task 1: Storage download + API endpoint

- [ ] Add `downloadObject(bucket, filePath): Promise<{ data: Buffer; contentType: string }>`
- [ ] `DeliveriesService.getSignatureImage(id)` → buffer + contentType; 404 si no hay firma/path
- [ ] Controller `GET :id/signature` + `StreamableFile` + Content-Type
- [ ] Unit tests for missing delivery / missing signatureUrl
- [ ] Commit

### Task 2: PDF reports use private download

- [ ] Inject storage (or call deliveries helper) in reports; replace `fetch(url)`
- [ ] Commit

### Task 3: Angular viewer

- [ ] API client blob method
- [ ] SignatureViewer loads by `deliveryId`
- [ ] Update list + history templates
- [ ] Commit

### Task 4: Docs + ops checklist

- [ ] SUPABASE.md: bucket Private
- [ ] Mark openspec 2.7 done
- [ ] Commit / merge when asked
