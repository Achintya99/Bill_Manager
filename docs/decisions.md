# Decisions

Each entry says who decided it. "Proposed by Claude" means the product owner has not confirmed it yet. These choices can all be changed, and the reason for each is given so it can be revisited.

| # | Decision | Status | Why |
|---|---|---|---|
| D1 | **Native mobile app built with Expo (React Native, TypeScript).** One codebase for iPhone and Android. | Owner asked for an app (not web). Framework proposed by Claude. | Works on either phone. The prototype can be tried on a phone through the free Expo Go app, with no app store or developer account. |
| D2 | **Receipts are read by a Claude vision model** (`claude-opus-5-5`, effort `medium`) using structured outputs. | Proposed by Claude | Handled all three test receipts, including a tilted photo, two-line weighed items and abbreviations (see `extraction-test.md`). Model and effort are settings, not code. |
| D3 | **Translation happens in the same step as extraction.** Each item stores `name_original` and `name_en`. | Proposed by Claude (spec §7 open item) | One call instead of two. English names exist from Milestone 1, which Milestone 2 search needs. Milestone 3 becomes refinement work. |
| D4 | **Data is stored only on the phone** (SQLite). Receipt photos are kept on the phone too. | Proposed by Claude (spec §8 open item) | Most private and simplest option. Nothing to host. Downside: no backup or sync between devices yet. |
| D5 | **A small server holds the API key** (Node + Hono, `apps/server`). It receives a photo, returns the extracted data, and stores nothing. | Proposed by Claude | An API key built into an app can be extracted. The server can run on a laptop for now. Hosting is decided later. |
| D6 | **The original photo is kept**, shrunk to at most 2400 px on the long side (JPEG). | Spec §5.1 marks this as proposed | The user can check data against the photo. Shrinking saves space and upload time while keeping small print readable. |
| D7 | **Amounts are stored as integer cents.** | Proposed by Claude | Exact sums for spend views. No floating-point rounding errors. |
| D8 | **Real receipt photos are not committed** to git. Hand-checked expected results are committed as fixtures. | Proposed by Claude | Receipts contain personal data (e.g. the last digits of a card number). |

## Open questions for the product owner
1. Which phone do you use (iPhone or Android)? Both work with Expo Go. This matters later for installing a standalone app.
2. Are you happy with an on-phone-only store for now (D4)? Losing or resetting the phone would lose the data until backup exists.
3. Model and cost: keep Opus 5.5 (most accurate, ~3–10 cents per scan, estimated), or test a cheaper model?
4. Where should the server run once the prototype works? (Your laptop, or a small cloud host.)
