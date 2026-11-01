# Build plan

Each phase is named after the milestone it finishes. Status as of 2026-11-01.

## Phase 0 → M0: Foundations agreed: **done (pending owner confirmation)**
- [x] Platform: native app with Expo (D1)
- [x] Receipt reading: Claude vision (D2), tested by hand on 3 real receipts (`extraction-test.md`)
- [x] Storage: on the phone (D4)
- [x] Translation in the extraction step (D3)
- [x] Data model v1 (`packages/shared/src/schema.ts`, `apps/mobile/src/lib/db.ts`)
- [x] Project setup (npm workspaces, TypeScript, Vitest) and `CLAUDE.md`
- [ ] Run the real pipeline on the 3 photos with an API key (`npm run eval -w server`)
- [ ] Owner confirms or changes the decisions in `decisions.md`

## Phase 1 → M1: Scan → review → save → list by date: **built, not yet tried on a phone**
- [x] Local database with migrations (receipts + items)
- [x] Photo capture and library pick, shrunk before upload
- [x] Extraction server (`POST /extract`) with error handling and an optional shared token
- [x] Review screen: edit every field, add or remove items, live warnings (total mismatch, line maths, uncertain lines), photo for comparison
- [x] Save with the photo; list grouped by day with day totals; detail view; edit; delete
- [x] Tests: shared logic and server API (`npm test`)
- [ ] Owner tries it on a real phone with new receipts

## Phase 2 → M2: Search and spend views
1. Item grouping: decide how different labels map to one product (e.g. "PATATA", "PATATA MALLA 3KG" → potatoes). *(Owner decision)*
2. Categories: now or later? *(Owner decision)*
3. Search by store, item (English and original) and date range
4. Spend per day; spend per product per month; monthly summary
5. Tests for aggregation queries

## Phase 3 → M3: English/Spanish interface and refined translation
1. Internationalisation framework; all UI text in EN and ES; language switch
2. Glossary of Spanish supermarket abbreviations; re-translate or correct saved items
3. Per-receipt language toggle (only if the owner wants it)
4. Tune with failures from real receipts, added as fixtures

## Phase 4 → M4: Waste tracking
1. Input model: enter only the wasted amount? *(Owner decision)*
2. Waste records linked to items; entry screen; waste views; tests

## Not planned
Purchases without a receipt (parked), warranties, digital receipts, budgets, household sharing.
