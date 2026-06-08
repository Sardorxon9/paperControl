# Orders Screen Prototype — Build Spec

Build a **desktop web prototype** of the **Orders (Buyurtmalar)** screen for a small
sugar‑packaging workshop. Use `mockData.json` (in this folder) as the data source.
This is a front‑end prototype only — no backend, no real persistence. Status changes
update local state in memory.

---

## 0. Scope (do ONLY this)

- Orders **list** view (the main screen).
- Order **detail** view (opened from a card).
- Order **management**: changing an order's status, and "Распечатать накладной" (print).

Do **not** build: order creation, clients screen, catalogue, settings, auth, navigation
to other modules. Just orders.

---

## 1. The user (design for this one person)

A **mid‑40s workshop operator**. Not tech‑savvy. Every morning he opens his laptop and
this screen is the first thing he sees. His real daily questions, in order:

1. **What do I make/pack today?**
2. **Which orders are done, which still need work?**
3. **Where is the paper, and is there enough?**
4. **Can I look up an order if the boss asks?** (mostly *was it delivered? what's it
   marked as?*)
5. **Print the delivery note** so it's ready when he delivers.

**He works almost entirely between YESTERDAY (Кеча) and TODAY (Бугун).** The #1 design
goal: he should see **all of yesterday's and today's orders in a single glance**, clearly
separated, without clutter or scrolling fatigue.

---

## 2. Platform & aesthetic

- **Desktop only.** Wide layout. Invest in the desktop experience — do not design
  mobile‑first. Assume ~1440px width.
- **Apple‑like aesthetic:** clean, calm, lots of whitespace, soft rounded corners,
  subtle shadows/dividers, restrained color, system‑style typography (SF Pro / Inter).
  Minimal chrome. Nothing looks busy.
- **Hierarchy is everything.** Important **numbers and buttons are BIG and BOLD.**
  Secondary info is quiet and smaller. The eye should land on the right thing instantly.
- **No tiny text. No dense data tables.** Large, comfortable click targets — built for a
  non‑techy 40‑something.

---

## 3. Language

Uzbek base, with specific Russian terms the user is used to. Use these EXACT strings:

| Meaning | Use this label |
|---|---|
| Screen title | **Buyurtmalar** |
| Today | **Бугун** |
| Yesterday | **Кеча** |
| Status: new | **Янги** |
| Status: ready/made | **Тайёр** |
| Status: delivered | **Етказилди** |
| Advance to ready | **Тайёр деб белгилаш** |
| Advance to delivered | **Етказилди деб белгилаш** |
| Undo / step back | **Орқага** |
| Shelf location | **Полка номер: {value}** |
| Standard design badge | **СТАНДАРТ** |
| Paper amount | **Қоғоз: {kg} kg** |
| Low‑paper warning | **⚠️ Қоғоз кам: {kg} kg** |
| Print delivery note | **Распечатать накладной** |
| Quantity unit | **{n} ta** + secondary **({n×1000} dona)** |
| Created by / received | **Қабул қилинди: {date}, {time} · {operator}** |

---

## 4. Core data rules (from `mockData.json`)

- **Quantity:** `1 ta = 1000 dona`. ALWAYS show both: big "**14 ta**" with smaller
  "**(14 000 dona)**" beneath it. The user must never do mental math.
- **Client identity = `restaurant` name.** NEVER show `orgName` as the primary label
  (he doesn't know company names). `orgName` may appear only as faint secondary text in
  the detail view.
- **Design type:**
  - `unique` → custom printed roll → show the **paper KG indicator** and **shelf number**.
  - `standard` → show the **СТАНДАРТ** badge instead of paper KG. (Shelf shows "—".)
- **Paper indicator (unique clients only):** show `Қоғоз: {paperRemaining} kg` with a
  color dot:
  - **green** = healthy
  - **amber** = getting close to `lowPaperThreshold`
  - **red / loud warning** = `paperRemaining <= lowPaperThreshold` → show
    **⚠️ Қоғоз кам: {kg} kg** prominently on the card (impossible to miss).
- **Status:** `new → ready → delivered`. Color‑coded:
  - Янги = neutral/grey
  - Тайёр = blue
  - Етказилди = green

---

## 5. Layout — the at‑a‑glance day view (most important)

The default and primary view shows **TODAY and YESTERDAY together on one screen**,
clearly separated so he takes in both at a glance.

**Recommended desktop layout: two columns side by side.**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Buyurtmalar                                          [ 7‑kunlik ‹ ··· › ] │   ← header + week stepper (for older lookups)
├───────────────────────────────────┬──────────────────────────────────────┤
│  КЕЧА · 7‑iyun                     │  БУГУН · 8‑iyun                       │   ← two day columns
│  6 ta · ✓ hammasi етказилди       │  6 ta · 🔵 2 тайёр · ⚪ 4 янги        │   ← per‑column summary
│                                   │                                       │
│  ┌── order card ──┐               │  ┌── order card ──┐                   │
│  ┌── order card ──┐               │  ┌── order card ──┐                   │
│  ┌── order card ──┐               │  ┌── order card ──┐  ...              │
│       ...                         │       ...                             │
└───────────────────────────────────┴──────────────────────────────────────┘
```

- **Today** is the visually dominant column (slightly larger / brighter / on the right
  where the eye rests). **Yesterday** sits alongside, calmer, for quick reference.
- A small **7‑day stepper** in the header lets him jump to older days for lookups
  (boss asks about last week). When he picks an older day, it's fine to switch to a
  single focused day column. But today/yesterday is the default he returns to.
- Each column has a tiny **summary line** (count + status breakdown).

> If a two‑column layout feels cramped for the card content, an acceptable alternative is
> a single scroll with two clearly labelled, visually distinct sections (КЕЧА section,
> then a bold БУГУН section) — but the two‑column glance is preferred for desktop.

---

## 6. The order card (content & hierarchy)

Each card answers his workflow top‑to‑bottom. **Restaurant name and quantity are the two
strongest anchors.** Suggested content & priority (layout/beauty is yours):

```
┌────────────────────────────────────────────────────────────┐
│  ABI DONER                                      [ ЯНГИ ]     │  ← name BIG/BOLD · status badge (color)
│  Қабул қилинди: 8‑iyun, 11:24 · Yoqubxon                    │  ← received date/time + operator (quiet)
│                                                             │
│  15 ta                              Стик · Оқ шакар · 4 гр   │  ← qty HERO (huge) + product line
│  (15 000 dona)                                              │
│                                                             │
│  Полка номер: 1‑A              Қоғоз: 13.2 kg  🟢           │  ← shelf + paper (unique client)
│                                                             │
│  [ Тайёр деб белгилаш ]          [ Распечатать накладной ]  │  ← BIG primary action + print
└────────────────────────────────────────────────────────────┘
```

Variations the prototype MUST show:
- **Healthy custom order** (green paper) — e.g. ABI DONER, LES AILES, TATNEFT.
- **Low‑paper warning** — e.g. BRAVO: replace the paper chip with a loud
  **⚠️ Қоғоз кам: 3.9 kg** band.
- **СТАНДАРТ order** — e.g. EVOS / MAXWAY: no paper chip, show **СТАНДАРТ** badge,
  shelf "—".
- **Different statuses** — Янги (grey), Тайёр (blue), Етказилди (green) cards.

### Status interaction on the card
- One **big primary button** that **advances** the status by one step:
  - Янги → button reads **"Тайёр деб белгилаш"**
  - Тайёр → button reads **"Етказилди деб белгилаш"**
  - Етказилди → no advance button; show a calm "✓ Етказилди" state.
- Provide a small, subtle **"Орқага"** (undo) affordance to step the status back, so a
  mis‑click is recoverable (auto‑advance must feel safe).
- On status change, the card's status badge + accent color update immediately, and it
  re‑sorts within its column if you sort by status (your call — keep it gentle, no jarring
  jumps).
- **"Распечатать накладной"** is on **every card**. Clicking it opens the browser print
  dialog with a simple, clean delivery‑note layout (restaurant, qty in ta + dona, product,
  date). A basic printable view is enough for the prototype.

---

## 7. Order detail view (opened by clicking a card)

This exists for the boss's "double‑check" question. The **hero is a status timeline**
answering *what is it marked / was it delivered, and when*:

```
   ABI DONER
   15 ta (15 000 dona) · Стик · Оқ шакар · 4 гр
   ─────────────────────────────────────────────
   STATUS TARIXI
   ✅ Янги         8‑iyun · 11:24 · Yoqubxon
   ✅ Тайёр        8‑iyun · 14:02 · Baxtiyor
   ⚪ Етказилди    — ҳали эмас
   ─────────────────────────────────────────────
   Полка номер: 1‑A      Қоғоз: 13.2 kg 🟢
   ─────────────────────────────────────────────
   [ Етказилди деб белгилаш ]   [ Распечатать накладной ]
```

- Use `statusHistory` from the data to render the timeline (date, time, operator).
- Steps not yet reached show "— ҳали эмас".
- Include full details + the same status‑advance and print actions.
- A clear way to close/return to the day view.

---

## 8. Behaviour summary

- Loads on **Бугун + Кеча** glance view by default.
- Week stepper jumps to older single days for lookup.
- Status advances on click (with Орқага undo); state is in‑memory only.
- Print opens a clean printable delivery note.
- All text/labels exactly as specified in §3.

---

## 9. Definition of done

- Desktop screen showing **yesterday + today at a glance**, clean and uncluttered.
- Cards with correct **hierarchy** (name + qty dominant; status color; shelf; paper /
  warning / СТАНДАРТ; print).
- Working **status advance + undo** and **order detail with status timeline**.
- **Apple‑like**, big bold numbers/buttons, no tiny text, calm and easy for a non‑techy
  user.
- Driven entirely by `mockData.json`.
```
