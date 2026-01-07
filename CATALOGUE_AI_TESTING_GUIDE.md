# Catalogue Page AI Testing Guide

## What Was Created

I've analyzed your Catalogue page and created resources for testing with other AI coding tools:

### 1. **AI_CATALOGUE_PROMPT.md**
A comprehensive prompt for AI coding assistants that describes:
- Complete functional requirements without UI specifications
- Information hierarchy (what's important vs nice-to-have)
- All user interactions and filter logic
- Data structure and technical specifications
- 12 key functional requirements summarized

**How to use**: Copy this prompt and paste it into other AI coding tools (Cursor, Windsurf, Copilot, etc.)

### 2. **sample_catalogue_data.json**
10 realistic product samples with:
- 5 "стик" (stick) products
- 5 "саше" (sachet) products
- 4 different material types: BOPP/PE, PET/AL/PE, Glassine Paper, PET/PE
- Multiple images per product (1-5 images)
- Various gramm options
- Some products with and without paper data links

**How to use**: Use this as mock data for testing the AI-generated page

### 3. **fetchCatalogueData.mjs**
A Node.js script to fetch real data from your Firestore 'catalogue' collection

**Status**: ⚠️ Script encountered permission errors when accessing Firestore
- The Firebase client SDK requires proper authentication
- Your Firestore security rules may require user authentication to read data
- This is expected behavior for production security

---

## Understanding Your Catalogue Page

### Core Features Identified:

1. **Multi-level Filtering System**:
   - Tab-based (All/Стик/Саше) by package type
   - Material type chips (multiple selection)
   - Real-time search (by name or code)
   - Filters work cumulatively

2. **Product Display**:
   - Responsive grid (4/3/2/1 columns)
   - Image carousel (up to 5 images per product)
   - Material information
   - Available gramm options
   - Link to paper control data

3. **Interactions**:
   - Edit products via modal
   - Add new products via modal
   - Image lightbox/zoom
   - Navigation to paper control page
   - Search with clear button

### Data Structure:

```javascript
{
  id: string,                    // Firestore document ID
  productName: string,           // Product name
  productCode: string,           // Unique code
  packageType: "стик" | "саше",  // Package type
  usedMaterial: string,          // Material type
  imageURL: string,              // Primary image
  imageURL2-5: string,           // Additional images (optional)
  paperDocID: string,            // Link to paper data (can be "n/a")
  possibleGramms: number[]       // Available gramm options
}
```

---

## Testing With Other AI Tools

### Recommended Testing Approach:

1. **Give the AI the prompt** from `AI_CATALOGUE_PROMPT.md`

2. **Provide the sample data** from `sample_catalogue_data.json`

3. **Ask the AI to**:
   - Create a React component matching the requirements
   - Use Material-UI for components
   - Implement all filtering logic
   - Create responsive layout

4. **Compare**:
   - How different AIs interpret "modern and professional" design
   - Filter implementation approaches
   - Performance optimization strategies
   - Code organization and cleanliness
   - Edge case handling

### What to Look For:

**Functionality**:
- ✅ All 3 filter types work together correctly
- ✅ Search is case-insensitive and real-time
- ✅ Product counts are accurate
- ✅ Modal interactions refresh data
- ✅ Image carousel works smoothly

**Code Quality**:
- Clean component structure
- Proper state management
- Performance optimization (useMemo, useCallback)
- Error handling
- Loading states

**UX/Design**:
- Visual clarity and hierarchy
- Responsive design
- Smooth animations
- Accessible interactions
- Empty states and feedback

---

## Key Differences in Approach

The prompt intentionally:
- ❌ **Does NOT specify**: Colors, exact spacing, font sizes, specific animations
- ✅ **Does specify**: Information hierarchy, filter logic, interactions, data flow

This allows each AI to:
- Apply its own design aesthetic
- Make UX decisions independently
- Showcase its understanding of modern web design
- Demonstrate problem-solving approaches

---

## Real Data Access (For Future)

To fetch real data from Firestore in a Node.js script, you would need:

**Option 1**: Firebase Admin SDK
```javascript
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

**Option 2**: Update Firestore Rules
```javascript
// Allow read access (use with caution)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /catalogue/{document} {
      allow read: if true;  // ⚠️ Public read access
    }
  }
}
```

**Option 3**: Use the Web App
- The React app already has proper authentication
- Data fetches work fine in the browser
- Export data via browser console or developer tools

---

## Summary

You now have:
1. ✅ A comprehensive AI prompt (no UI specifications)
2. ✅ 10 realistic sample products
3. ✅ Understanding of your current implementation
4. ⚠️ Firestore script (needs authentication to work)

Use these resources to test how different AI coding assistants would approach building the same functionality with their own design interpretation.
