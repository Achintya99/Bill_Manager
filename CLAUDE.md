# Bill Manager (receipt app)

Scan paper receipts, extract store/date/total/items (with English names for Spanish receipts), and browse spending.
Product spec: `docs/SPEC.md`. Plan and status: `docs/plan.md`. Decisions: `docs/decisions.md`.

## Stack
- npm workspaces, TypeScript everywhere, Node 22+.
- `apps/mobile`: Expo SDK 58 app (React Native, Expo Router in `src/app/`, expo-sqlite for local storage). Also read `apps/mobile/AGENTS.md`.
- `apps/server`: Hono server. `POST /extract` sends the photo to Claude (`@anthropic-ai/sdk`, structured outputs) and returns the receipt. It stores nothing.
- `packages/shared`: zod schema, review-draft logic, checks, money/date helpers, and receipt fixtures. Imported by both apps as TS source (no build step).

## Commands (run from the repo root)
```bash
npm install
npm test              # vitest: packages/shared and apps/server
npm run typecheck     # tsc in every workspace
npm run server        # dev server on :8787 (needs apps/server/.env)
npm run mobile        # Expo dev server; open in Expo Go
EXTRACTOR=mock npm run server   # server returns the sample Mercadona receipt; no API key needed
npm run eval -w server          # real extraction vs fixtures; needs a key and photos in samples/receipts/ (costs money)
```
Bundle check without a phone: `cd apps/mobile && npx expo export --platform android --output-dir /tmp/out`.
In restricted-network sandboxes, prefix Expo CLI commands with `EXPO_OFFLINE=1` (e.g. `EXPO_OFFLINE=1 npx expo install <pkg>`).

## Conventions
- Put pure logic in `packages/shared` and test it there. The mobile app has no unit tests yet, so keep screens thin.
- Store money as integer cents in SQLite. Use `toCents`/`sumAmounts`, never raw float sums.
- Dates are `YYYY-MM-DD` strings and times `HH:MM`, both receipt-local (no time zones).
- Each item keeps both `name_original` (as printed) and `name_en`.
- DB schema changes: append a new entry to `MIGRATIONS` in `apps/mobile/src/lib/db.ts`. Never edit an existing entry.
- Add Expo packages with `npx expo install`, not `npm install`.
- Never commit real receipt photos or `.env` files. New real receipts become fixtures in `packages/shared/fixtures/` (expected JSON only).
- Treat items marked **[Open]** in the spec as undecided: ask the product owner.
- Small commits with clear messages.
