# Extraction test (Phase 0)

## Summary
- **Receipts tested:** three real Madrid receipts (Mercadona, Desi Gourmet, Spice Bazar), photographed by the product owner on 2026-10-31.
- **How:** Claude read the photos directly in the build session and the results were checked line by line. This is a close stand-in for the AI vision approach, but it is **not** the production pipeline: no API key was available, so the app's real server code has not been run on the photos yet.
- **Result:** every store, date, total and line item could be read. On all three receipts, the item prices add up exactly to the printed total.
- **Decision:** use a Claude vision model for extraction, with translation in the same step (see `decisions.md`).
- **Next step:** run `npm run eval -w server` with an API key to measure the real pipeline against these results.

The hand-checked results are stored as test fixtures in `packages/shared/fixtures/`. The photos are personal data and are **not** in the repository. The eval script expects them in `samples/receipts/` (git-ignored) under the fixture names.

## What each receipt taught us

### Mercadona (30/10/2026, €20.08, 15 items)
1. **A tilted photo shifts the price column.** The paper is rotated, so each price sits about one line above its item. Reading straight across assigns the wrong price to most items, **but the total still matches**, so the totals check alone cannot catch this error.
   - Two clues on the receipt give the correct mapping. First, "2 NAPO CHOCO 0,95 → 1,90" (quantity × unit price) lines up only with the shifted reading. Second, the VAT summary shows €3.60 at 21%, which equals toilet paper (2.40) + air freshener (1.20), the only non-food items. The same-line reading gives €1.73 instead.
   - The extraction prompt now tells the model to use these clues. The review screen shows the photo so the user can compare.
   - Possible later improvement: check prices automatically against the VAT bands.
2. **Weighed produce is printed over two lines** ("PATATA" / "0,722 kg 1,90 €/kg 1,37"). It is read as one item: 0.722 kg of potatoes at €1.90/kg = €1.37. This is also the first real data for the "spend on potatoes" feature.
3. **Abbreviations:** most expand cleanly ("GRIEGO NATURAL P-6" means plain Greek yogurt, 6-pack). Three are guesses and are marked uncertain: "CEBOLLA TUBO", "CAFE LIGHT S/LAC" and "SPRAY ESSENCE".

### Desi Gourmet (30/10/2026, €20.59, 5 items)
- The receipt is bilingual ("Pasta de jengibre y ajo | Ginger Garlic Paste 300g TRS"), so the English name comes straight from the receipt.
- "(2 x €3.90)" is printed under one item, which gives quantity 2 and unit price €3.90.

### Spice Bazar (27/10/2026, €10.75, 3 items)
- **The products are not named.** Every line says "PRECIO DIRECTO" (the price was typed in at the till). No reader can know what was bought, so the user has to type the names during review.
- This affects Milestone 2 (spend per item): at small shops, item-level data will only be as good as what the user enters.

## Cost per scan (estimate, not measured)
Claude Opus 5.5 costs $4 per million input tokens and $20 per million output tokens. One receipt photo plus the prompt is a few thousand input tokens. The output (JSON plus the model's reasoning) is a few thousand tokens. That gives an estimate of **roughly 3–10 US cents per receipt**. The eval script will give real numbers.

The model and effort can be changed in `apps/server/.env` without code changes. A cheaper model (e.g. Claude Haiku 5.5, about 1/40th of the price) can be tried, and should only be kept if it matches the fixtures equally well.
