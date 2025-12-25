# Prompt for Google AI Studio Coder: Paper Control System

## Project Overview
Create a modern web application for paper inventory management system with two main pages and client detail functionality. **All UI text must be in Russian language.**

Use your preferred UI framework and design system. Apply a professional color scheme with:
- Primary color: teal/green (rgb(60, 117, 112))
- Lighter accent: rgb(189, 220, 216)
- Dark gray for text
- Standard colors for warnings, errors, and success states

---

## Page 1: Main Dashboard (/paper-control)

### Header (Sticky at top)
**Left side:**
- Logo (clickable, navigates to home)

**Center (only visible on Клиенты tab):**
- Search input field for filtering by restaurant name
- "Сводка бумаг" button (admin only) - sends paper summary via Telegram
- "Новый клиент" button (admin only) - opens add client form
- "Стандарт диз рулон" button (admin only) - opens add standard roll form

**Right side:**
- User info display showing:
  - User name
  - Role: "Администратор" or "Сотрудник"
  - Icon (different for admin vs worker)
- "Выйти" (logout) button

### Tabs
Two tabs below header:
1. **"Клиенты и этикетки"** (Clients and labels)
2. **"Стандартные рулоны"** (Standard rolls)

---

## Tab 1: "Клиенты и этикетки"

### Filters (above table)
Two dropdown filters:
1. **"Тип упаковки"** (Package type filter)
   - Options: "Все типы упаковки", "Стик", "Сашет"

2. **"Продукт"** (Product filter - multi-select)
   - Options: "Белый сахар", "Корич сахар", "Соль"

### Clients Table
**Columns (left to right):**
1. **№** - Row number
2. **"Название ресторана"** (Restaurant name) - Sortable
   - Shows restaurant/hotel/cafe name
   - Shows organization name below in smaller text
   - Shows warning icon if paper is low
3. **"Продукт"** (Product)
   - Shows product name (Белый сахар, Корич сахар, or Соль)
   - For standard designs, shows "Стандарт [design name]" in smaller text below
4. **"Упаковка"** (Package)
   - Shows package type (Стик or Сашет)
   - Shows gram weight in parentheses after package type
5. **"Номер полки"** (Shelf number) - Sortable
   - Format: "1-A", "2-B", "3-C", etc.
6. **"Всего рулонов"** (Total rolls)
   - Shows number of paper rolls
7. **"Остаток бумаги"** (Remaining paper) - Sortable
   - Format: "XX.XX кг"
8. **"Действия"** (Actions)
   - "Подробно" button - opens client details modal

**Table features:**
- Sortable columns show sort indicator (arrows or similar)
- Clicking sortable column header toggles sort direction
- Rows with low paper have visual warning (red border or highlight)
- Alternating row colors for readability
- Hover effect on rows

---

## Tab 2: "Стандартные рулоны"

### Standard Rolls Table
**Columns (left to right):**
1. **№** - Row number
2. **"Тип продукта"** (Product type) - Sortable
   - Shows product name (line 1)
   - Shows design name in smaller text (line 2)
3. **"Упаковка"** (Package) - Shows Стик or Сашет
4. **"Граммовка"** (Gram weight) - Shows number like 5, 8, 10, 12
5. **"Количество рулонов"** (Number of rolls) - Shows count
6. **"Остаток (кг)"** (Remaining in kg) - Sortable, format: "XX.XX кг"
7. **"Номер полки"** (Shelf number) - Sortable, format like "1-A", "2-B"
8. **"Подробно"** (Details) - Button that opens product details

**Table features:**
- Same sorting and visual features as Clients table

---

## Modal: "Детали клиента" (Client Details)

Opens when clicking "Подробно" button on a client row.

### Modal Layout
Three-column layout on desktop, stacks on mobile.

### Left Column: Client Information

**Display:**
- Restaurant/cafe/hotel name (large, prominent)
- Product and package type info below name
- Client photo/image (if available) - clickable to open full-screen viewer with zoom/rotate
- Telegram button to send location (if coordinates exist)

**Information fields:**
- **Гео-локация:** Shows latitude, longitude
- **Название фирмы:** Organization name
- **Адрес:** Full address
- **Комментарий:** Comment/notes
- **Куплено за все время:** Total kg purchased lifetime (format: "XX.XX кг")

**Edit button** at top - opens edit form for this client

---

### Middle Column: Paper Rolls (Only for Unique Designs)

**Top section - Two display boxes:**
1. **"Номер полки"** (Shelf number) - Large display box showing shelf like "2-A"
2. **"В наличии имеется"** (Available) - Large display box showing total paper in kg

**Rolls list:**
Shows each paper roll as a card:
- Roll number: "Рулон 1", "Рулон 2", "Рулон 3", etc.
- Current weight: "XX.XX кг"
- "Редактировать" (Edit) button

**When editing a roll:**
- Input field: "Сколько КГ осталось" (How many kg remaining)
- Checkbox: "Исправить ошибку" (Correction mode)
- If correction checkbox is checked, show additional input: "Введите корректное КГ бумаги" (Enter correct kg) with helper text "Это исправит общий вес клиента"
- Save button (✓)
- Cancel button (✗)

**Special case - entering 0:**
When user enters 0 for roll weight, open deletion confirmation dialog:
- Title: "Удаление рулона" (Roll deletion)
- Message: "Это действие удалит рулон. Пожалуйста, введите вес футулки (картонного стержня) для подтверждения."
- Input field: "Вес футулки (в граммах)" with placeholder "Например: 400"
- Helper text: "Этот вес будет вычтен из общего веса клиента"
- Cancel button
- Confirm button: "Подтвердить удаление"

**For Standard Designs:**
Instead of rolls section, show centered message:
"У этого клиента нет этикетки и он использует стандартный рулон для печати."

---

### Right Column: Paper Reception & History (Only for Unique Designs)

**Title:** "Приемка новой бумаги" (New paper reception)

**Add Paper section:**
- Initially shows "Добавить бумагу" (Add paper) button
- When clicked, shows:
  - Input field: "Количество (кг)" with placeholder "Например: 3.2"
  - "Сохранить" (Save) button
  - "Отмена" (Cancel) button

**History section:**
Title: "История приёмки" (Reception history)

**History table with 3 columns:**
1. **"Дата"** - Date (format: DD.MM.YYYY)
2. **"Действие"** - Action icon:
   - Green down arrow for paper added (paperIn)
   - Red up arrow for paper used (paperOut)
   - Orange rotation icon for corrections (fixing)
3. **"Количество (кг)"** - Amount:
   - Format: "+XX.XX" for additions
   - Format: "-XX.XX" for usage
   - Format: "±XX.XX" for corrections

**Empty state:** Shows "Нет записей" (No records) when history is empty

**Table is scrollable** if many entries

---

## Interactions & Behavior

### Sorting
- Click column header to sort
- Click again to reverse sort direction
- Show visual indicator of active sort and direction

### Filtering
- Package type dropdown filters clients by selected package
- Product multi-select filters clients by selected products
- Filters work together (both must match)

### Search
- Real-time filtering as user types
- Searches through restaurant names only
- Case-insensitive

### Modal
- Opens when clicking "Подробно" on any row
- Shows close button (X) at top right
- Clicking outside modal doesn't close it (prevent accidental closure)
- Can scroll within modal if content is tall

### Roll Editing
- Only one roll can be edited at a time
- Other edit buttons disabled while editing one roll
- Save validates that input is a valid number
- Correction mode shows additional field and changes behavior
- Entering 0 triggers deletion confirmation
- Cancel discards changes

### Paper Addition
- Shows input form when "Добавить бумагу" clicked
- Validates input must be > 0
- Cancel returns to button view
- Shows loading state while saving

### Image Viewer
- Click thumbnail to open full-screen viewer
- Viewer has zoom controls (+ and -)
- Viewer has rotate button (90° increments)
- Viewer has close button
- Dark overlay with controls

---

## Mockup Data Requirements

Generate realistic sample data in Russian:

### Clients Data (15-20 items)

**Restaurant/Cafe/Hotel names (mix):**
- Restaurants: "Ресторан Silk Road", "Кафе Чайхана", "Ресторан Caravan"
- Hotels: "Гостиница Узбекистан", "Отель Сити Палас", "Гостиница Премьер"
- Cafes: "Кафе Aroma", "Кофейня Central Park", "Кафе Sunrise"

**Organization names:**
- "ООО Рестораны Ташкента"
- "ИП Гостиница Сити"
- "ООО Кафе Менеджмент"
- etc.

**Products:** Randomly assign from:
- Белый сахар
- Корич сахар
- Соль

**Package types:** Randomly assign:
- Стик (with weights: 5 гр, 8 гр, or 10 гр)
- Сашет (with weights: 8 гр, 10 гр, or 12 гр)

**Shelf numbers:** Format like "1-A", "2-B", "3-C" (number 1-3, letter A-D)

**Paper remaining:** Random values between 0.5 and 25.0 kg (2 decimal places)
- Make 3-4 clients have very low paper (< 3 kg) to trigger warnings

**Total rolls:**
- Unique designs: 1-5 rolls
- Standard designs: 0

**Total purchased:** Random values between 10 and 150 kg (2 decimal places)

**Design type:**
- 70% unique (shows roll management)
- 30% standard (shows placeholder message)

**Addresses:** Tashkent addresses like:
- "ул. Навои, д. 15, Ташкент"
- "пр. Амира Темура, д. 42, Ташкент"

**Coordinates:** Tashkent area (latitude ~41.2-41.4, longitude ~69.2-69.3)

**Comments:**
- "Звонить перед доставкой"
- "Работают до 22:00"
- "Нет комментария"

**For unique design clients, generate paper rolls:**
- 1-5 rolls per client
- Each roll: weight between 2.5 and 10.0 kg

**For unique design clients, generate history logs:**
- 5-15 log entries per client
- Mix of paperIn, paperOut, fixing actions
- Random dates in past month
- Random amounts 0.5-15.0 kg

---

### Standard Rolls Data (8-12 items)

**Product types:** Белый сахар, Корич сахар, Соль

**Design names:**
- "Стандарт Дизайн А"
- "Стандарт Дизайн Б"
- "Стандарт Дизайн Эконом"
- "Стандарт Дизайн Премиум"

**Package types:** Стик or Сашет

**Gram weights:** 5, 8, 10, or 12 (just number, no "гр" suffix)

**Roll quantity:** Random 0-6

**Remaining:** Random 0-40 kg (2 decimal places)

**Shelf numbers:** Same format as clients

---

## Important Notes

✅ All text must be in Russian language
✅ Use your preferred UI framework and design approach
✅ Apply consistent color scheme (primary teal/green, lighter accents, dark gray)
✅ Make it responsive (works on desktop and tablet)
✅ Implement smooth interactions and transitions
✅ Show loading states for async operations
✅ Validate user inputs appropriately
✅ Generate enough mockup data to demonstrate all features
✅ Make it look professional and polished

Focus on creating an intuitive, clean interface that clearly presents the data and functionality described above.
