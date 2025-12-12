# Project Structure

## Overview
This document describes the organized folder structure of the Paper Control application.

## Directory Structure

```
src/
├── pages/                      # Main page components (route-level)
│   ├── Analytics.js           # Analytics dashboard with charts
│   ├── AuthPages.js           # Authentication/login page
│   ├── Dashboard.js           # Main dashboard
│   ├── InvoiceHistory.js      # Invoice history page
│   ├── Invoices.js            # Invoice management page
│   └── Welcome.js             # Welcome/home page
│
├── components/                 # Reusable React components
│   ├── modals/                # Modal dialog components
│   │   ├── AddStandardDesignModal.js
│   │   ├── ClientDetailsModal.js
│   │   ├── ClientUsageHistoryModal.js
│   │   ├── EditStandardDesignModal.js
│   │   └── ProductDetailsModal.js
│   │
│   ├── forms/                 # Form components
│   │   ├── addClientForm.js
│   │   └── EditClientForm.js
│   │
│   ├── shared/                # Shared/utility components
│   │   ├── ExportClientsCSV.js
│   │   └── ImageUploadComponent.js
│   │
│   └── ui/                    # UI framework components (existing)
│       ├── color-mode.jsx
│       ├── provider.jsx
│       ├── toaster.jsx
│       └── tooltip.jsx
│
├── services/                   # Service files (API, Firebase, etc.)
│   ├── firebase.js            # Firebase configuration
│   ├── notificationService.js # Notification handling
│   └── paperNotificationService.js # Paper stock notifications
│
├── styles/                     # CSS stylesheets
│   ├── AddClientForm.css
│   ├── App.css
│   ├── ClientDetailsModal.css
│   ├── ClientDetailsUI.css
│   ├── EditClientForm.css
│   ├── index.css
│   └── mobile-responsive.css
│
├── theme/                      # Theme configuration
│   └── colors.js              # Color palette
│
├── utils/                      # Utility functions and helpers
│   ├── resetFirestoreDefaults.js
│   └── SignUp.js
│
├── App.js                      # Main application component
├── index.js                    # Application entry point
└── reportWebVitals.js         # Performance monitoring

api/                            # Backend API endpoints (Vercel serverless)
├── auth.js                    # Authentication endpoint
├── health.js                  # Health check endpoint
├── send-location.js           # Location tracking
├── send-low-paper-alert.js    # Low paper alerts
└── send-low-paper-summary.js  # Paper summary reports
```

## Import Path Changes

After reorganization, import paths have been updated as follows:

### From Pages (src/pages/):
- Services: `from '../services/firebase'`
- Components: `from '../components/modals/ClientDetailsModal'`
- Styles: `from '../styles/App.css'`

### From Components (src/components/):
- Services: `from '../../services/firebase'`
- Other components: `from '../modals/ClientDetailsModal'`
- Styles: `from '../../styles/AddClientForm.css'`

### From Root (src/):
- Pages: `from './pages/Dashboard'`
- Services: `from './services/firebase'`
- Styles: `from './styles/index.css'`

## Best Practices

1. **Pages** - Only for route-level components that represent full pages
2. **Components** - Organized by type (modals, forms, shared)
3. **Services** - All external service integrations (Firebase, APIs, etc.)
4. **Styles** - All CSS files in one location for easy management
5. **Utils** - Helper functions and utility scripts

## Migration Notes

- All files have been moved to their appropriate folders
- All import statements have been updated
- Build verified successfully
- No breaking changes to functionality
