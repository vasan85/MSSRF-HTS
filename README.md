# MIS-HITS — Household Impact Tracking System
### M.S. Swaminathan Research Foundation (MSSRF)

A full-stack web application for tracking household-level impact across development projects.

---

## Tech Stack

| Layer      | Technology               |
|------------|--------------------------|
| Frontend   | Vue 3 + Vite + Pinia     |
| Backend    | Node.js + Express        |
| Database   | MySQL 8.x                |
| Auth       | JWT (jsonwebtoken)       |
| Styling    | Custom CSS (MSSRF brand) |

---

## Project Structure

```
mis-hits/
├── backend/
│   ├── db/
│   │   ├── pool.js          # MySQL connection pool
│   │   └── schema.sql       # Full DB schema + seed data
│   ├── middleware/
│   │   └── auth.js          # JWT auth + role guard
│   ├── routes/
│   │   ├── auth.js          # Login / me
│   │   ├── masters.js       # State/District/Block/Village
│   │   ├── households.js    # CRUD + dedup + GPS
│   │   ├── projects.js      # Project CRUD
│   │   ├── links.js         # Project-HH linking
│   │   ├── dashboard.js     # KPIs, charts, GIS data
│   │   └── audit.js         # Audit log
│   ├── server.js            # Express entry point
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── api.js           # Axios client
    │   ├── main.js
    │   ├── App.vue
    │   ├── assets/
    │   │   └── main.css     # Global MSSRF brand styles
    │   ├── stores/
    │   │   └── auth.js      # Pinia auth store
    │   ├── router/
    │   │   └── index.js     # Vue Router + role guards
    │   ├── components/
    │   │   └── SidebarItem.vue
    │   └── views/
    │       ├── LoginView.vue
    │       ├── LayoutView.vue
    │       ├── DashboardView.vue
    │       ├── VillageDashView.vue
    │       ├── ProjectDashView.vue
    │       ├── HouseholdsView.vue
    │       ├── HHFormView.vue
    │       ├── ProjectsView.vue
    │       ├── LinkingView.vue
    │       ├── GISMapView.vue
    │       ├── GISHouseholdView.vue
    │       ├── MastersView.vue
    │       ├── ReportsView.vue
    │       ├── SettingsView.vue
    │       └── AuditView.vue
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Setup Instructions

### Prerequisites
- Node.js ≥ 18
- MySQL 8.x running locally
- npm ≥ 9

---

### Step 1 — Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Run the schema + seed file
source /path/to/mis-hits/backend/db/schema.sql
```

This creates the `mis_hits` database with all tables and loads:
- 3 States, 4 Districts, 4 Blocks, 4 Villages
- 100 Households with realistic Tamil Nadu data
- 3 Projects (Livelihood, Nutrition, Water)
- 50 Project-Household benefit link records
- 4 User accounts

---

### Step 2 — Backend Setup

```bash
cd mis-hits/backend

# Copy and configure environment
cp .env.example .env
# Edit .env — set DB_PASSWORD to your MySQL root password

# Install dependencies
npm install

# Start dev server
npm run dev
# → API running at http://localhost:3000
```

---

### Step 3 — Frontend Setup

```bash
cd mis-hits/frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
# → App running at http://localhost:5173
```

---

## Login Accounts

All accounts use password: **`password`**

| Role             | Email                   | Access |
|------------------|-------------------------|--------|
| Admin            | admin@mssrf.org         | Full system access |
| Project Manager  | pm@mssrf.org            | Assigned projects only |
| Field Enumerator | enumerator@mssrf.org    | Household entry + linking |
| M&E Team         | me@mssrf.org            | Reports, exports, GIS |

---

## API Endpoints

### Auth
| Method | Endpoint        | Description    |
|--------|-----------------|----------------|
| POST   | /api/auth/login | Login, returns JWT |
| GET    | /api/auth/me    | Get current user |

### Households
| Method | Endpoint                              | Description |
|--------|---------------------------------------|-------------|
| GET    | /api/households                       | List with search/filter/pagination |
| GET    | /api/households/:id                   | Single household with links |
| POST   | /api/households/check-duplicate       | Dedup check |
| GET    | /api/households/next-id/:village_id   | Generate next HH ID |
| POST   | /api/households                       | Create |
| PUT    | /api/households/:id                   | Update |
| DELETE | /api/households/:id                   | Delete (admin only) |

### Projects
| Method | Endpoint         | Description |
|--------|------------------|-------------|
| GET    | /api/projects    | All projects with HH stats |
| POST   | /api/projects    | Create (admin) |
| PUT    | /api/projects/:id| Update (admin/pm) |

### Project-HH Links
| Method | Endpoint      | Description |
|--------|---------------|-------------|
| GET    | /api/links    | List with filters |
| POST   | /api/links    | Create (validates HH-based, date, dedup) |
| PUT    | /api/links/:id| Update |

### Dashboard
| Method | Endpoint                          | Description |
|--------|-----------------------------------|-------------|
| GET    | /api/dashboard/executive          | KPI tiles |
| GET    | /api/dashboard/village-coverage   | Village stats |
| GET    | /api/dashboard/project-stats      | Per-project metrics |
| GET    | /api/dashboard/benefit-distribution | Benefit breakdown |
| GET    | /api/dashboard/org-report         | Org-wide metrics |
| GET    | /api/dashboard/gis-villages       | Village GIS data |
| GET    | /api/dashboard/gis-households     | Household GPS pins |

### Masters
| Method | Endpoint              | Description |
|--------|-----------------------|-------------|
| GET    | /api/masters/states   | All states |
| GET    | /api/masters/districts| Filtered by state_id |
| GET    | /api/masters/blocks   | Filtered by district_id |
| GET    | /api/masters/villages | Filtered by block_id |
| POST   | /api/masters/villages | Add village (admin) |

---

## Key Business Rules (Enforced in Backend)

1. **Household ID Format**: `STATECODE-VILLAGEID-HH####` — auto-generated, non-editable
2. **Deduplication**: Checked before save — same village + mobile OR same name similarity
3. **Project Linking**: Blocked if `is_household_based = false`
4. **Date Validation**: Enrollment date must fall within project start–end range
5. **Duplicate Enrollment**: Same project + household + date combination is rejected
6. **Role Guards**: Delete (admin only), Export (admin/me), Project manage (admin/pm)
7. **Audit Log**: Every CREATE, UPDATE, DELETE, EXPORT is logged with user, role, timestamp

---

## Role-Based Page Access

| Page                | Admin | PM   | Enumerator | M&E |
|---------------------|-------|------|------------|-----|
| Dashboard           | ✅    | ✅   | ❌         | ✅  |
| Village / Project   | ✅    | ✅   | ❌         | ✅  |
| Household Master    | ✅    | ✅   | ✅         | ❌  |
| Project Master      | ✅    | ✅   | ❌         | ❌  |
| Project Linking     | ✅    | ✅   | ✅         | ❌  |
| GIS Coverage Map    | ✅    | ✅   | ❌         | ✅  |
| HH Location Plot    | ✅    | ❌   | ❌         | ✅  |
| Reports             | ✅    | ❌   | ❌         | ✅  |
| Masters (CRUD)      | ✅    | ❌   | ❌         | ❌  |
| Settings / RBAC     | ✅    | ❌   | ❌         | ❌  |
| Audit Log           | ✅    | ❌   | ❌         | ✅  |

---

## Phase Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 | Master tables + Household + Project + Linking | ✅ Built |
| Phase 2 | Dashboards + Deduplication + Reports | ✅ Built |
| Phase 3 | GIS Integration (Leaflet.js) + Advanced Analytics | 🏗️ Foundation built |

### Phase 3 GIS Integration (Next Steps)
To integrate real Leaflet.js maps:
```bash
npm install leaflet
```

Replace the CSS map-container divs in `GISMapView.vue` and `GISHouseholdView.vue` with:
```javascript
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const map = L.map('map-div').setView([12.92, 80.20], 10)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
// Add village markers from /api/dashboard/gis-villages
```

---

## Data from Test Dataset

Loaded from `Test_data_set_for_Zoho.xlsx`:
- **100 households** across 4 villages (Perumbakkam, Navalur, Mudichur, Vallam)
- **3 projects**: Livelihood Enhancement (P001), Nutrition Support (P002), Water Security (P003)
- **50 benefit link records** with types: Sewing Machine, Goat Unit, Dairy Cow, Nutrition Kit
- Caste categories: SC, ST, BC, MBC
- Vulnerability types: Landless, Migrant, Widow, Disabled
- Income brackets: <5000, 5000-8000, 8000-12000

---

*MIS-HITS v2.0 · MSSRF © 2025*
