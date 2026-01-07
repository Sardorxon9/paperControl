# Paper Control UI Prototype - Design Brief

## Project Context
You are building a UI prototype for a paper roll inventory management system used by a label printing company. The system tracks paper rolls for restaurant clients who order custom labels for their food packaging.

## What This Page Does
The "Клиенты и этикетки" (Clients & Labels) page helps warehouse staff track which clients have how much label paper in stock, manage their paper rolls, and record when paper is added or used.

---

## Data Requirements

### Main Table: Clients List
**Data to Display (in order of importance):**
1. **Client Name** - The restaurant name (most important - this is how staff identify clients)
2. **Paper Remaining** - Total kg of paper available (CRITICAL - determines if client needs restocking)
3. **Total Rolls** - Number of paper rolls in inventory
4. **Product** - What type of product they order labels for (e.g., "Сахар 5г", "Сахар 10г")
5. **Packaging** - Type of packaging (e.g., "Стик", "Саше")
6. **Shelf #** - Physical warehouse location where their paper is stored
7. **Organization Name** - Legal entity name (less important, but needed)

**Important UI Behavior:**
- Clients with low paper (paperRemaining < notifyWhen threshold) should be visually highlighted - this is CRITICAL for operations
- The table should feel scannable - staff need to quickly check paper levels for 20-30 clients

**User Operations on Table:**
- Search by client name or organization
- Filter by packaging type (dropdown)
- Filter by product type (multi-select)
- Sort by name, paper remaining, or shelf number
- Click a row to open detailed modal

---

### Modal: Client Details & Paper Roll Management
When a user clicks a client from the table, they need to:

**View Client Information:**
- Restaurant name and location
- Product and packaging details
- Organization name
- Shelf number
- Client's label design image (important for identifying the right labels)
- Total paper ever purchased (lifetime statistic in kg)
- Send location via Telegram button (UI only - doesn't need to work)

**Manage Paper Rolls (CORE FUNCTIONALITY - Most Used Feature):**
- See all individual paper rolls with their weights (e.g., Roll #1: 45.2 kg, Roll #2: 23.8 kg)
- Each roll shows:
  - Roll number (for physical identification)
  - Current weight in kg (LARGE and readable - staff check this constantly)
  - Edit button to update the weight

**Update Roll Weight:**
When editing a roll, staff need to:
- Enter the new current weight after usage
- See the old weight for reference
- Optionally mark it as "correction mode" (checkbox) - used when fixing data entry errors
- Save changes

**Add New Paper:**
Staff receive new paper deliveries and need to:
- Click "Add Paper" or "Приемка" button
- Enter the weight of the new roll
- Submit to create a new roll entry

**View Paper History:**
- See a log of all paper movements (intake, usage, corrections)
- Each entry shows: date, action type, amount, who did it
- Action types:
  - Paper intake (new delivery)
  - Paper usage (consumed by production)
  - Correction (fixing errors)

---

## User Experience Priorities

**What Staff Do Most Often (in order):**
1. Check which clients are running low on paper (scan the table)
2. Update paper roll weights after production uses paper (edit roll in modal)
3. Add new paper when deliveries arrive (add paper in modal)
4. Look up where a client's paper is stored (shelf number)
5. Search for a specific client
6. Filter to find all clients using a specific product type

**Critical UX Requirements:**
- Paper amounts must be large and readable (staff are often in the warehouse, checking on phones)
- Low paper warnings must be VERY visible (clients can't have production delays)
- Updating a roll weight should be FAST (staff do this 20+ times per day)
- The modal should feel organized but not cramped - lots of data, needs breathing room

---

## Technical Requirements

**Use shadcn components** - you have full creative freedom to design the best UI

**Style Guide:**
- **Primary Color:** #00796B (teal/emerald green)
- **Supporting Colors:** Black, dark gray, white
- **Font:** SF Pro Display
- **Design Principles:** Clean, modern, spacious, professional

**Navigation Bar Should Include:**
- Logo or app name "Paper Control" or similar
- "Add New Client" button (UI only - doesn't need to work)
- User profile/account section
- Any other elements you think make sense for navigation

**Buttons That Are UI-Only (don't need functionality):**
- "Add New Client" in navbar
- "Send Location via Telegram" in modal
- "Edit Client Info" button
- Export/print buttons if you add them

**Must Be Functional (for prototype purposes):**
- Opening the modal when clicking a table row
- Switching between view/edit mode for paper rolls
- "Add Paper" form in modal
- Search and filter controls in the table
- Sorting the table

---

## Mock Data

Use the provided `mockData.json` file which contains:
- 5 restaurant clients
- Each client has 2-4 paper rolls with varying weights
- Mix of different products (Sugar 5g, Sugar 10g, Salt 1g, Pepper 1g)
- Mix of packaging types (Стик, Саше)
- Some clients have low paper (should trigger the low paper warning)
- Paper history logs for each client

---

## Deliverable

Create a clean, modern, functional UI prototype that feels professional and purpose-built for warehouse inventory management. The design should make it obvious which clients need attention (low paper), make common operations fast (updating rolls), and present complex information (multiple rolls, history logs) in an organized, scannable way.

Focus on creating excellent information hierarchy and user experience - you have complete creative control over layout, component choices, animations, spacing, and visual design within the style guide.
