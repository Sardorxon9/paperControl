# AI Prompt: Build a Product Catalogue Page

## Project Context
You are building a **Product Catalogue Page** for a packaging/paper products company. This is a React application using Material-UI (MUI) components and Firebase Firestore as the backend database.

## Core Requirements

### 1. Data Source & Structure
- Fetch product data from Firestore collection named `'catalogue'`
- Each product document contains:
  - `id` - unique identifier
  - `productName` - product name (string)
  - `productCode` - unique product code (string)
  - `packageType` - type of package: "стик" or "саше" (string)
  - `usedMaterial` - material type used (string)
  - `imageURL`, `imageURL2`, `imageURL3`, `imageURL4`, `imageURL5` - optional image URLs (strings)
  - `paperDocID` - optional reference to paper data document (string, can be "n/a")
  - `possibleGramms` - optional array of available gramm options (array of numbers)

### 2. Page Layout Hierarchy (Top to Bottom)

#### A. Header Section (High Priority)
- **Back Navigation Button**: Navigate to home page ('/')
- **Page Title**: "Каталог продукции" (Product Catalogue)
- **User Info Display**: Show user's name and email
- **Add Product Button**: Opens modal to add new product
- **Logout Button**: Triggers logout functionality

#### B. Search Section (High Priority)
- **Search Input Field**:
  - Placeholder: "Поиск по названию или коду продукта..." (Search by name or code...)
  - Search icon on the left side
  - Clear button (X) on the right side when there's text
  - Real-time filtering as user types
  - Should search in both `productName` and `productCode` fields
  - Case-insensitive search

#### C. Filter Section (High Priority)

**Tab Filters** (3 tabs):
1. **"Все"** (All) - Shows all products + count
2. **"Стик"** (Stick) - Shows only products where `packageType === "стик"` + count
3. **"Саше"** (Sachet) - Shows only products where `packageType === "саше"` + count

**Material Type Filters**:
- Display clickable chips/buttons for each unique material type found in products (`usedMaterial` field)
- Allow multiple material selections (filter is cumulative with other filters)
- Selected materials should be visually highlighted
- Materials should be sorted alphabetically
- Show label "Сырье:" (Raw Material:)

**Results Count Display**:
- Show "Найдено продуктов: X" (Found products: X) with the current filtered count

#### D. Products Grid (High Priority)
- Display products in a responsive grid layout
- Grid should be 4 columns on large screens, 3 on medium, 2 on small, 1 on mobile
- Show loading spinner while fetching data
- Show "Продукты не найдены" (No products found) message when filter results are empty

### 3. Product Card Component (Critical)

Each product card should display:

**Image Section** (Top):
- Display product image (use `imageURL` as primary, fall back to placeholder if missing)
- Support multiple images (`imageURL`, `imageURL2`, etc.) with indicators
- Clickable image to open lightbox/full-screen view
- Show zoom icon overlay on hover
- Image carousel indicators (dots) at bottom if multiple images exist
- Edit button (icon) in top-right corner

**Information Section** (Middle):
- **Product Name**: Prominent, bold, 2-line max with ellipsis
- **Package Type**: Smaller, secondary text
- **Product Code**: Highlighted/badge style
- **Material Used**: If exists, show in a box with label "Используемый материал" (Material Used)
- **Available Gramms**: If `possibleGramms` array exists, display as small chips showing each gramm value + " гр" suffix

**Action Section** (Bottom):
- **"Показать данные бумаги"** (Show Paper Data) button
  - Enabled only if `paperDocID` exists and is not "n/a"
  - When clicked, navigate to `/paper-control?tab=1&highlight={paperDocID}`
  - Disabled state should be visually clear

**Interactions**:
- Hover effect on card (slight lift/elevation change)
- Edit button click opens edit modal for that product
- Image click opens lightbox with all product images
- Image carousel: click indicator dots to switch between images

### 4. Modal Interactions (Medium Priority)

**Edit Product Modal**:
- Opens when edit button clicked on any product card
- Should receive the selected product data
- After successful update, refresh the products list

**Add Product Modal**:
- Opens when "Добавить дизайн" (Add Design) button clicked in header
- After successful addition, refresh the products list

### 5. Filter Logic (Critical)

**Filtering Order**:
1. First apply tab filter (All/Стик/Саше) based on `packageType`
2. Then apply material type filters if any selected
3. Finally apply search filter on the resulting products

**Search Behavior**:
- Case-insensitive
- Search in both `productName` and `productCode`
- Update results in real-time as user types
- Works in combination with tab and material filters

### 6. State Management Requirements

Manage these states:
- Products list (fetched from Firestore)
- Loading state
- Search query
- Current active tab (0=All, 1=Стик, 2=Саше)
- Selected material types (array)
- Edit modal open/closed + selected product
- Add modal open/closed

### 7. User Experience Priorities

**Critical**:
- Fast, responsive filtering (no lag on typing)
- Clear visual feedback for selected filters
- Loading states during data fetch
- Proper empty states (no products found)

**Important**:
- Smooth transitions and animations
- Accessible keyboard navigation
- Mobile-responsive design
- Clear visual hierarchy

**Nice to Have**:
- Smooth card hover effects
- Image zoom on hover
- Graceful image loading

## Technical Specifications

### Tech Stack:
- React with Hooks (useState, useEffect)
- React Router (useNavigate hook)
- Material-UI (MUI) v5+
- Firebase Firestore v9+ (modular SDK)

### Required MUI Components:
Container, Typography, Box, TextField, Tabs, Tab, Grid, InputAdornment, CircularProgress, Paper, Stack, Button, IconButton, Chip, Card, CardContent, CardMedia

### Required Icons:
SearchIcon, ClearIcon, ArrowBackIcon, AddIcon, ArrowForwardIcon, EditIcon, ZoomInIcon

### Firebase Setup:
```javascript
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
```

### Props Expected:
```javascript
{ user, userRole, onLogout }
```
Where:
- `user` object has: `{ name, email }`
- `onLogout` is a function to call when logout button clicked

## Sample Data Structure

Use this JSON structure for testing:

```json
[
  {
    "id": "prod001",
    "productName": "Premium Coffee Stick",
    "productCode": "PCF-2024-001",
    "packageType": "стик",
    "usedMaterial": "BOPP/PE",
    "imageURL": "https://example.com/image1.jpg",
    "paperDocID": "paper123",
    "possibleGramms": [5, 10, 15, 20]
  }
]
```

## Key Functional Requirements Summary

1. **On Page Load**: Fetch all products from Firestore 'catalogue' collection
2. **Tab Click**: Filter products by packageType
3. **Material Chip Click**: Toggle material filter (allow multiple)
4. **Search Input**: Real-time filter by productName or productCode
5. **Clear Search**: Reset search query
6. **Edit Button Click**: Open edit modal with selected product
7. **Add Button Click**: Open add product modal
8. **Image Click**: Open lightbox with all product images
9. **Paper Data Button Click**: Navigate to paper control page with query params
10. **Logout Click**: Call onLogout function
11. **Back Click**: Navigate to home page
12. **After Modal Success**: Re-fetch products from Firestore

## Important Notes

- All filters work together (cumulative filtering)
- Product count in tabs should reflect total products of that type, NOT filtered count
- Results count should show current filtered results
- Material filter chips should be dynamically generated from available products
- Maintain good performance even with 100+ products
- Handle edge cases: no products, no images, missing fields

## You have creative freedom for:
- Color scheme and styling
- Spacing and layout proportions
- Animation timing and effects
- Modal design and fields
- Lightbox implementation
- Error handling UI
- Loading animation style
- Typography scale
- Border radius and shadows
- Hover effects and transitions

## Do NOT specify:
- Exact colors, padding, margins
- Specific animation durations
- Font families or exact font sizes
- Detailed styling rules

Focus on functionality, user interactions, and information hierarchy. Make it look professional and modern.
