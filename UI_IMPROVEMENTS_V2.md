# StandardDesignPicker UI Improvements V2

## Summary of Changes

Successfully refactored the `StandardDesignPicker` component based on user feedback:

1. ✅ **Separated gramm selection** from product cards
2. ✅ **Scaled up entire component** by ~10% for better visibility
3. ✅ **Two-step selection process** for clearer user flow

---

## 🎨 New Two-Step Selection Flow

### **Step 1: Select Product**
```
┌────────────────────────────────────────────────┐
│ [📷] WR-001 | Product Name              ✓    │
│ 70px  Badge   Bold Name              Selected │
│       📦 Package • Material                    │
├────────────────────────────────────────────────┤
│ [📷] WR-002 | Product Name                   │
│       📦 Package • Material                    │
└────────────────────────────────────────────────┘
```

**User clicks on a card to select the product**
- Card shows green left border (5px)
- Light blue background (#f0f9ff)
- Checkmark icon appears on right

---

### **Step 2: Select Gramm (Appears Below)**
```
┌────────────────────────────────────────────────┐
│ Выберите граммаж для: Product Name            │
│                                                │
│  [2 гр]  [3 гр]  [4 гр]  [5 гр]  [6 гр]     │
│                                                │
└────────────────────────────────────────────────┘
```

**Gramm selection appears in a separate highlighted box**
- Blue border (2px) with light blue background
- Large clickable chips (38px height, 75px min-width)
- Selected gramm shows checkmark icon
- Positioned above quantity input fields

---

## 📏 Size Increases (~10% Scaling)

### Search Bar:
- **Height:** small → medium size
- **Font:** 0.85rem → **0.95rem**
- **Icon:** 20px → **24px**

### Material Filter Chips:
- **Font:** 0.813rem → **0.9rem**
- **Height:** 28px → **34px**
- **Spacing:** 1px → **1.2px**

### Product Cards:
- **Padding:** 1.5px → **2px**
- **Thumbnail:** 60x60px → **70x70px**
- **Product Code Font:** 0.75rem → **0.85rem**
- **Product Name Font:** 0.95rem → **1.05rem**
- **Package/Material Font:** 0.813rem → **0.9rem**
- **Border (selected):** 4px → **5px**
- **Spacing between cards:** 1.5px → **1.8px**

### Gramm Selection Section:
- **Title Font:** 0.95rem → **1.05rem**
- **Chip Height:** 28px → **38px**
- **Chip Font:** 0.75rem → **0.9rem**
- **Chip Min-Width:** 60px → **75px**
- **Chip Icon:** 16px → **20px**

### Results Counter:
- **Font:** body2 → **body1** (0.85rem → 0.95rem)

---

## 🎯 Key Improvements

### 1. **Clearer Selection Process**
**Before:**
- Gramm chips inside each product card
- Cluttered, confusing layout
- Hard to see what's selected

**After:**
- Two-step process: Product → Gramm
- Gramm selection appears only after selecting product
- Clear visual separation

### 2. **Better Visual Hierarchy**
```
Priority 1: Select Product (Click card)
         ↓
Priority 2: Select Gramm (Appears below in highlighted box)
         ↓
Priority 3: Enter Quantity (Form field below)
```

### 3. **Improved Readability**
- All text ~10% larger
- Better spacing between elements
- Larger touch/click targets
- Clearer visual feedback

### 4. **Auto-Selection for Single Gramm**
If a product has only one gramm option:
- Automatically selects it after clicking product
- Skips step 2 entirely
- Faster workflow for simple cases

---

## 🎨 Visual Design Updates

### Product Cards:
```javascript
// Increased sizes
Thumbnail:       60px → 70px
Padding:         1.5 → 2
Left Border:     4px → 5px (when selected)
Spacing:         1.5 → 1.8

// Enhanced selection state
Selected Card:
  - 5px green left border
  - Light blue background (#f0f9ff)
  - Checkmark icon (32px, right side)
  - Green border all around
```

### Gramm Selection Box:
```javascript
// New separate section
Border:          2px solid green
Background:      Light blue (#f0f9ff)
Padding:         2.5
Margin Top:      3

// Larger chips
Height:          38px (vs 28px before)
Min-Width:       75px (vs 60px before)
Font:            0.9rem (vs 0.75rem)
Icon:            20px (vs 16px)
```

---

## 💡 UX Benefits

### For Users:
✅ **Less cluttered cards** - Easier to scan products
✅ **Clearer flow** - Know what to do next
✅ **Larger text** - Better readability
✅ **Bigger buttons** - Easier clicking/tapping
✅ **Visual guidance** - Gramm section appears when ready

### For Mobile Users:
✅ **Larger touch targets** - Easier to tap
✅ **Better spacing** - Less accidental clicks
✅ **Clearer hierarchy** - Follow the flow naturally

---

## 🔄 Usage in Modals

This improved component automatically works in all 3 modals:

1. **Invoice Generation** (`Invoices.js`)
   - Select product → Select gramm → Enter quantity/price

2. **Add Standard Client** (`addClientForm.js`)
   - Select product → Select gramm → Complete client form

3. **Add Standard Roll** (`AddStandardRollModal.js`)
   - Select product → Select gramm → Add paper roll details

**No changes needed in parent components!**

---

## 📊 Comparison

| Feature | Before | After | Change |
|---------|--------|-------|--------|
| **Selection Steps** | 1 (combined) | 2 (separated) | +Clarity |
| **Card Height** | 80px | 95px | +15px |
| **Text Size** | 0.75-0.95rem | 0.85-1.05rem | +10% |
| **Gramm Location** | Inside card | Separate section | Better UX |
| **Touch Targets** | 28px | 38px | +35% |
| **Visual Clutter** | High | Low | Much cleaner |
| **Auto-Selection** | No | Yes (single gramm) | +Smart |

---

## 🚀 Technical Details

**File Modified:** `src/components/shared/StandardDesignPicker.js`

**New State:**
- `selectedItem` - Tracks which product is selected

**New Functions:**
- `handleSelectProduct()` - First step: select product
- `handleSelectGramm()` - Second step: select gramm

**New useEffect:**
- Syncs `selectedItem` with `selectedCatalogueItemId` prop
- Enables external control of selection

**Lines Changed:** ~150 lines updated
**Build Impact:** +192 bytes (minimal)

---

## ✨ Visual Examples

### Product Card (Selected):
```
┌─────────────────────────────────────────────────┐
│█ [📷]  WR-001 | Крафт пакет для бургера    ✓  │
│█  70px  Badge   Bold, Large Name        Icon   │
│█        📦 Термо пакет • Material              │
└─────────────────────────────────────────────────┘
  ↑ 5px green border
```

### Gramm Selection Box:
```
╔═════════════════════════════════════════════════╗
║ Выберите граммаж для: Крафт пакет для бургера  ║
║                                                 ║
║  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       ║
║  │ 2 гр │  │ 3 гр │  │ 4 гр │  │ 5 гр │       ║
║  └──────┘  └──────┘  └──────┘  └──────┘       ║
║                                                 ║
╚═════════════════════════════════════════════════╝
  Blue border, light background, large chips
```

---

## 🎯 User Flow Example

1. **User opens modal**
   - Sees list of products with search/filter
   - All text is ~10% larger, easier to read

2. **User clicks on a product card**
   - Card highlights with green border
   - Checkmark appears
   - Gramm selection box appears below

3. **User selects gramm from highlighted box**
   - Clicks desired gramm chip
   - Chip fills with green color + checkmark
   - Selection is complete

4. **User proceeds to quantity input**
   - Form fields are below gramm selection
   - Clear visual flow top to bottom

---

## ✅ Testing Checklist

- [x] Build successful
- [x] Component scaled up ~10%
- [x] Gramm selection separated
- [x] Two-step flow works
- [x] Auto-selection for single gramm
- [x] Selection state syncs with props
- [x] Works in all 3 modals
- [x] Responsive on mobile
- [x] Touch targets adequate (38px+)

---

**Implementation Date:** 2026-01-01
**Version:** 2.0
**Build Status:** ✅ Successful
**Ready for:** Production deployment

---

## 📝 Notes

- Gramm selection now appears **separately** from product cards
- Everything is **~10% larger** for better visibility
- **Two-step process** provides clearer user guidance
- **Smart auto-selection** saves time for single-gramm products
- All changes are **non-breaking** - existing code works as-is
