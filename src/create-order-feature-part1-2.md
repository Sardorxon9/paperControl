# Feature: Create Order via Telegram Bot — Part 1 (Capture & Post)

## Context

We already have a production Telegram bot (Vercel serverless + Firestore) that handles
alerts, proposal generation, etc. This adds **one new feature: admins create an order
through the bot**, which then (a) gets written to Firestore and (b) gets posted as a clean
message to a Telegram group.

**Existing code to reuse — do NOT rebuild this:**
- `transliterateCyrillic(text)` — `api/telegram-webhook.js:14-56`
- `fuzzySearchClients(clients, query)` — `api/telegram-webhook.js:89-181`
  - This is the "which restaurant did the admin mean?" matcher. Reuse it as-is to resolve
    the restaurant name from the admin's input. Do not write a new matcher.

## Scope

**Part 1 (this task):** authorize the admin → capture the order → confirm → write to
Firestore → post the formatted message to the group. Stop there.

**Out of scope (Part 2, later — do not build now):** rendering/managing orders in the React
app, status transitions UI, order detail pages, editing/deleting orders.

> The only forward-looking requirement: **store each order with all fields listed in the
> schema below**, so Part 2 needs no migration.

---

## User flow

1. Admin opens the bot, taps a **"➕ Yangi buyurtma" (Create order)** button.
2. Bot prompts the admin to type the order on one line, e.g.:
   ```
   Лес айлес / 14 та / стик / ок
   ```
3. Bot parses it, resolves the restaurant via fuzzy match, and replies with a
   **confirmation card** showing how it interpreted everything (see below).
4. Admin taps **✅ Tasdiqlash (Confirm)** or **✏️ O'zgartirish (Edit / retype)**.
5. On confirm: write the order to Firestore **and** post the formatted Uzbek message to the
   group. Reply to the admin "✅ Buyurtma yuborildi".

---

## Input format & parsing

Format the admin types: `{restaurant} / {qty} та / {package} / {sugar}`

Example: `Лес айлес / 14 та / стик / ок`

| Segment      | Meaning                          | Notes |
|--------------|----------------------------------|-------|
| `Лес айлес`  | Restaurant (client) name         | Resolve via `fuzzySearchClients`. May be mistyped or Cyrillic — that's what the matcher handles. |
| `14 та`      | Quantity = **14 boxes (quti)**   | Extract the integer. `та` = unit marker. |
| `стик`       | Package type                     | One of: **стик** (stick) / **сашет** (sachet). |
| `ок`         | Sugar color                      | `ок` → **white** (oq) · `корич` → **brown** (jigarrang). |

**Parse robustly, don't rely only on position.** The admin won't always keep the exact
order. Recommended approach after splitting on `/`:
- The segment containing a number → **quantity**.
- The segment matching `стик|сашет` (and obvious variants) → **package**.
- The segment matching `ок|корич|oq|korich` → **sugar color**.
- The remaining segment → **restaurant** → pass to `fuzzySearchClients`.

**Ambiguity handling:**
- If the restaurant match is uncertain (low score / multiple candidates), reply with inline
  buttons listing the top 2–3 candidates instead of guessing.
- If a required field can't be parsed at all, reply with a short Uzbek error explaining what's
  missing and ask the admin to retype. Do **not** post a half-parsed order.

---

## Authorization (gate this at the very top, before any parsing)

- Read `from.id` from the incoming Telegram update.
- Query Firestore: `users where chatID == from.id && role == 'admin'`.
- No matching doc → reply `"Sizda buyurtma yaratish huquqi yo'q."` and stop.
- One Firestore read per message is fine; no caching needed.

> ⚠️ **Note on the `chatID` field:** store/compare the Telegram **user** id (`from.id`), not a
> chat id. In a private DM they're identical, so existing data works, but the value must be
> `from.id`.

---

## Confirmation card (before writing anything)

Reply to the admin with the parsed interpretation + two buttons:

```
Buyurtma:
🏢 Mijoz: Les Ailes
📦 Tur: Stick
🍬 Shakar: Oq
🔢 Miqdor: 14 quti

[✅ Tasdiqlash]  [✏️ O'zgartirish]
```

Only on **✅** do we write to Firestore and post to the group. This one extra tap prevents a
garbled order from broadcasting to the whole group + (later) the factory app.

---

## Firestore: `orders` collection

Create a new `orders` collection. Write via the **Firebase Admin SDK** (server-side, in the
Vercel function). One document per order:

```
orders/{orderId}
  clientId:         string      // matched client doc id
  clientName:       string      // denormalized full name for display (from client doc)
  packageType:      string      // 'stick' | 'sachet'
  sugarType:        string      // 'white' | 'brown'
  productId:        string      // resolved product id (see note)
  productName:      string      // denormalized, e.g. "Oq shakar"
  quantity:         number      // 14
  unit:             string      // 'box'   (та / quti)
  status:           string      // default 'new'  → later: 'in_progress' | 'done' | ...
  rawInput:         string      // exact text the admin typed (audit/debug)
  createdBy: {
    telegramUserId: number      // from.id
    name:           string      // admin's name from users doc
  }
  createdAt:        Timestamp   // serverTimestamp
  channelMessageId: number      // Telegram message_id of the posted message (store it now;
                                // Part 2 can edit that message when status changes)
```

**Derive real field names from existing code — don't assume.** Before writing the `orders`
doc, inspect how the current code reads the `clients` and `users` collections (start with
`fuzzySearchClients` and the auth query in `api/telegram-webhook.js`) and mirror those exact
field names. The field names above (`clientName`, etc.) are the intended shape, not
guaranteed matches to your live schema — align them with what the code actually uses.

For products/packages: if an existing `products`/`packages` collection is referenced anywhere
in the codebase, resolve `productId`/`packageType` against it (reuse the same fuzzy approach if
names are fuzzy). If no such collection exists, derive `productName` from `sugarType` + package
and leave `productId` null. State which path you took in your summary.

---

## Group message (post in **Uzbek**)

Use the matched client's **full name** (not the admin's raw input). Example:

```
🆕 Yangi buyurtma

🏢 Les Ailes
📦 Oq shakar (stick)
🔢 14 quti
🗓 06.06.2026, 14:30
👤 {admin name}
```

Drop the `Mijoz:` / `Mahsulot:` (and other) field labels — emoji + value only. No hashtag.
Keep the `🆕 Yangi buyurtma` header line.

- Capture the returned `message_id` and save it to the order's `channelMessageId`.
- The group is already created and the bot (the one this project already uses) is already a
  member/admin — no setup needed.
- Put the chat id in an **env var** (`ORDERS_GROUP_CHAT_ID`) rather than hardcoding it.

> ⚠️ **Verify the chat id value.** The note lists `5277968108`, but that's a *positive
> 10-digit* number — the shape of a **user** id, not a group id. Real group/supergroup ids
> are **negative** (e.g. `-100xxxxxxxxxxx`). Confirm the actual group id (e.g. via
> `getUpdates` or a `getChat` call) before testing; posting to `5277968108` will likely
> throw `chat not found`.

---

## Error logging

- Wrap parse / Firestore write / Telegram post in try-catch.
- On any failure, `console.error` with a clear prefix (e.g. `[create-order]`) including the
  step that failed, `from.id`, and the `rawInput`, so it's debuggable from Vercel logs.
- Never leave the admin without a reply — on internal error, send a short Uzbek "xatolik
  yuz berdi, qayta urinib ko'ring" message.

---

## Constraints / reminders

- Bot runs in **webhook mode** (serverless) — don't introduce polling.
- Reuse `transliterateCyrillic` and `fuzzySearchClients`; don't add an LLM to the parse path.
- Keep the new logic isolated (e.g. a `handleCreateOrder` flow) so existing bot features
  aren't touched.
- Firestore is the single source of truth — write the order **once**. The React app (Part 2)
  will read via `onSnapshot`; no webhook-to-app needed.

## Definition of done (Part 1)

- [ ] Non-admin is rejected before any parsing.
- [ ] Admin flow: button → type → confirmation card → ✅ → written + posted.
- [ ] Restaurant resolved via existing fuzzy matcher; ambiguous matches prompt a choice.
- [ ] Order doc written with **all** fields above; `status: 'new'`.
- [ ] Uzbek message posted to the group; `channelMessageId` saved.
- [ ] Errors logged with `[create-order]` prefix; admin always gets a reply.
