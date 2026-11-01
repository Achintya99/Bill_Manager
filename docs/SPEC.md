# Receipt App: Product Spec (Draft v0.1)

> Working name: TBD
> Status: Draft. Problem and v1 scope are defined. Technical choices are still open.
> Legend: **[Decided]** = confirmed by the product owner. **[Proposed]** = suggestion, not yet confirmed. **[Open]** = needs a decision.

---

## 1. Problem

People collect paper receipts (groceries, appliances, other purchases) in a box or folder with no structure. When they later need to know when they bought something or what they paid, they have to dig through everything manually. The information on the receipt (date, store, price per item) stays locked on paper, so simple questions are hard to answer:

- "When did I buy this, and how much did I pay?"
- "What did I spend on a given day?"
- "How much do I spend on potatoes per month?"

## 2. Target user

- **[Decided]** First user is the product owner: a person living alone in a studio in Madrid, Spain.
- **[Decided]** The problem is believed to be common, so the app should be usable by other people later.
- **[Decided]** Mainly paper receipts. Digital receipts are rare for this user. The user sometimes skips taking a receipt at all (see Parked).

## 3. Primary goal

**[Decided]** Remove the burden of storing physical receipts. Scan a paper receipt, turn it into structured data, and let the user search and browse purchases and spending, day by day.

The primary purpose is to make finding receipts and understanding spending easy. Everything else is secondary.

## 4. Core user flow (v1)

1. **Scan:** the user photographs a paper receipt.
2. **Extract:** the app reads the store, date, total, and each line item (name, quantity, price).
3. **Translate:** if the receipt is in Spanish, item text is shown in English. **[Decided]**
4. **Review:** the user can check and correct extracted data. **[Proposed]**
5. **Store:** the data is saved as a structured record, with the receipt image kept. **[Proposed]** for the image.
6. **Browse and search:** the user finds purchases by date, store, or item, and sees how much was spent.

## 5. Features

### 5.1 In scope for v1

| Feature | Status |
|---|---|
| Scan a paper receipt (photo) and extract store, date, total, and line items | **[Decided]** |
| Item-level tracking for **both** groceries and big-ticket items (appliances, etc.) | **[Decided]** |
| Browse spending by date ("how much did I spend on this day?") | **[Decided]** |
| Item-level spend over time (e.g., monthly spend on potatoes) | **[Decided]** |
| Search for a past receipt or purchase | **[Decided]** |
| App available in **English and Spanish** | **[Decided]** |
| Spanish receipt text translated into English, with extracted data updated accordingly | **[Decided]** |
| Review and correct extracted data | **[Proposed]** |
| Keep the original receipt image alongside the data | **[Proposed]** |

### 5.2 Later (secondary features)

- **[Decided] Waste tracking:** record food that was bought but thrown away. Example: bought 1 kg of carrots, used 0.2 kg, 0.8 kg rotted. This depends on the user entering data, and that is accepted by design.
- **[Open]** Whether the app should only ask for the wasted amount and derive "used" from the purchased quantity.

### 5.3 Parked (not for now)

- **[Decided]** Logging purchases that have no receipt. This is a small use case to solve later.

### 5.4 Not decided

- **[Open]** Warranty and return tracking for big-ticket items (purchase date, warranty length, reminders).
- **[Open]** Importing digital receipts (PDF or email), since some Spanish supermarkets now issue them.
- **[Open]** Budgets, categories, charts beyond basic spend views.
- **[Open]** Sharing data with other people (household use).

## 6. Data model (draft)

**[Proposed]** One purchase contains many items. Example shape, based on the product owner's example (potatoes, 1 November, 2 kg, about 4.50 euros):

```json
{
  "id": "…",
  "date": "2026-11-01",
  "store": "…",
  "total": 4.50,
  "currency": "EUR",
  "receipt_image": "path-or-url",
  "language": "es",
  "items": [
    {
      "name_original": "…",
      "name_en": "potatoes",
      "quantity": 2,
      "unit": "kg",
      "price": 4.50
    }
  ]
}
```

Notes:
- **[Proposed]** Keep both the original Spanish item name and the English translation, so corrections and re-translation stay possible.
- **[Open]** How to group different store labels for the same product (e.g., several names for potatoes) so item-level totals work. This is essential for the "monthly spend on potatoes" feature.
- **[Open]** Product categories (produce, dairy, appliances, etc.) and who defines them.
- **[Open]** Whether the underlying store is a database. A database is a better fit than a knowledge graph because the data is regular (purchases containing items).

## 7. Languages

- **[Decided]** The app interface is available in English and Spanish.
- **[Decided]** Receipts are often in Spanish, and the product owner's Spanish is limited, so receipt content must be understandable in English.
- **[Open]** Whether translation is done with the extraction step or as a separate step.
- **[Open]** Whether users can switch the displayed language per receipt.

## 8. Technical approach

None of this is decided.

- **[Open] Platform:** mobile app (iOS/Android), web app, or installable web app (PWA). Camera access matters for scanning.
- **[Open] Receipt reading:** options include a vision-capable AI model or a dedicated receipt OCR service. Line items are usually the hardest field to read correctly, so accuracy needs testing on real Spanish receipts.
- **[Open] Storage:** local on the device, cloud, or both. Affects privacy, sync, and cost.
- **[Open] Stack and hosting:** to be proposed and agreed before building.
- **[Open] Cost:** any paid API usage per scan should be understood before choosing.

## 9. Risks and open questions

1. **Line-item accuracy:** faded or crumpled thermal paper and multi-line items (for example, weighed produce printed over two lines) may be read incorrectly. A review step is probably needed.
2. **Translation quality:** Spanish supermarket abbreviations may be hard to translate or normalize.
3. **Item grouping:** without normalizing product names, item-level spend totals will be unreliable.
4. **Privacy:** receipts reveal purchasing habits. Where data is stored and what is sent to third-party services must be decided deliberately.
5. **Crowded market:** many apps already scan grocery receipts at item level, including some with Spanish and English support. Differentiation is likely in the combination of groceries plus big-ticket items, English translation of Spanish receipts, and later waste tracking. This has not been validated by testing competitors.

## 10. Suggested milestones

**[Proposed]** Build the thinnest useful slice first.

1. **Milestone 1:** scan one receipt, extract data, show it for review, save it, and list saved receipts by date.
2. **Milestone 2:** item-level search and spend views (by day, by item, by month).
3. **Milestone 3:** English/Spanish interface and Spanish-to-English receipt translation, refined with real receipts.
4. **Milestone 4:** waste tracking.

## 11. Notes for Claude Code

- Read this whole file before proposing anything.
- Do not treat **[Open]** items as decided. Ask the product owner, or propose options with trade-offs.
- Before writing code, produce a short plan: proposed stack, folder structure, and how Milestone 1 will be built.
- After the stack is agreed, write a concise `CLAUDE.md` covering the stack, commands for running and testing, and conventions.
- Keep changes small and commit with clear messages.
