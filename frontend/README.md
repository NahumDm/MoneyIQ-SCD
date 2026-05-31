# ExpenseFlow — Frontend UI

Modern personal expense management interface built with **React** and **Tailwind CSS**.

## Design System

| Token | Value | Usage |
|-------|-------|--------|
| Primary Blue | `#002060` | Sidebar, buttons, headings, active states |
| Off-White | `#F7F8FA` | Page background, surfaces |
| Success | `#16A34A` | Confirmations, positive metrics |
| Warning | `#F59E0B` | Alerts, session notices |
| Error | `#DC2626` | Expense amounts, errors |
| Neutral | `#94A3B8` | Secondary text, labels |

Typography: **Inter** — bold headings, medium body, monospace numbers.

## UI Flow

```
Login / Register → Email Verification (OTP) → Dashboard
                                              ├── Expenses (CRUD + filters)
                                              └── Reports (PDF export)
```

### Authentication screens
- **Login** — split layout: dark `#002060` branding panel (desktop) + centered white card form
- **Register** — grouped sections (Personal Details → Account Setup)
- **Verify** — six OTP input boxes with success animation

### Dashboard (authenticated hub)
- Fixed **sidebar** (`#002060`) with Dashboard / Expenses / Reports
- **Top bar** — user avatar, name, logout
- **Overview cards** — total spent, monthly, top category, transaction count
- **Bar chart** section for monthly trend
- **Recent transactions** table

### Expenses
- Filter bar (date, category, amount range)
- Responsive table (desktop) / cards (mobile)
- Modal for add/edit with stacked form fields

### PDF Reports
- Toggle all expenses or date range
- Generate button with loading spinner
- Auto-download on success

## Run

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

Ensure the API gateway is running on **http://localhost:8080** (Vite proxies `/api` automatically).

## Project Structure

```
frontend/src/
├── api/           # Centralized HTTP layer (Axios)
├── components/    # Reusable UI (layout, expenses, auth)
├── context/       # Auth state (Context API)
├── hooks/         # useExpenses, useToast
├── pages/         # Route-level screens
└── utils/         # Formatters, constants
```

## Environment

Optional `.env`:

```
VITE_API_URL=http://localhost:8080/api
```

If unset, dev proxy uses `/api` → `localhost:8080`.
