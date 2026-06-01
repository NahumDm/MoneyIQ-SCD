# Personal Expense Management System (MoneyIQ-SCD)

A contract-first, microservice-based Personal Expense Management System demonstrating **Clean Architecture**, **service isolation**, and **GoF design patterns** across four backend services plus a React frontend.

**For teachers / reviewers**

- **[TECHNICAL_SPECIFICATION.md](TECHNICAL_SPECIFICATION.md)** — Full technical document: requirements, architecture, UML (component, class, sequence), provided/required interfaces, every endpoint with examples, implementation (use for PowerPoint).
- **[DESIGN_PATTERNS.md](DESIGN_PATTERNS.md)** — What each GoF pattern is, why it was chosen, and how it works in this codebase.
- **Source comments** — Each module file documents classes, interfaces, and methods (what / why / how).
- **This README** — How to run the system and every HTTP endpoint.

## Architecture Overview

```
                    ┌─────────────────────────────┐
                    │   Integration Layer (D)   │
                    │   TypeScript / Node.js    │
                    │   Port: 8080              │
                    │   Pattern: Proxy          │
                    └──────────┬────────────────┘
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Auth Service (A) │ │ Expense Svc (B)  │ │ PDF Service (C)  │
│ Spring Boot      │ │ FastAPI          │ │ Express.js       │
│ Port: 8081       │ │ Port: 8082       │ │ Port: 8083       │
│ MongoDB: auth_db │ │ MongoDB: expense │ │ Stateless        │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

| Service | Technology | Database | Responsibility |
|---------|-----------|----------|----------------|
| **A — Auth** | Java / Spring Boot | `auth_db` (MongoDB) | Registration, login, email verification, JWT issuance |
| **B — Ledger / Expense** | Python / FastAPI | `expense_db` (MongoDB) | CRUD expenses, filtering (no auth — delegated to integration layer) |
| **C — PDF Generation** | JavaScript / Express.js | None (stateless) | HTML → PDF conversion |
| **D — Integration Layer** | TypeScript / Node.js | None | Gateway proxy, auth validation via auth-service, user context forwarding |

### Design Principles

- **No shared code** — each service is fully isolated with its own models and logic
- **REST-only communication** — all inter-service calls use HTTP REST APIs
- **Contract-first** — clear API boundaries; authentication is owned exclusively by auth-service
- **Independent deployability** — each service can be replaced or redeployed without affecting others

---

## GoF Design Patterns & OOP Compliance

Each backend module implements **exactly one** GoF pattern. Full explanations (what / why / how) are in **[DESIGN_PATTERNS.md](DESIGN_PATTERNS.md)** and in multi-line comments inside each source file.

| # | Module | Pattern (GoF) | File |
|---|--------|---------------|------|
| 1 | Database | **Singleton** (Creational) | `auth-service/src/auth/DatabaseModule.java` |
| 2 | Registration | **Builder** (Creational) | `auth-service/src/auth/RegistrationModule.java` |
| 3 | Verification | **Strategy** (Behavioral) | `auth-service/src/auth/VerificationModule.java` |
| 4 | Login | **Chain of Responsibility** (Behavioral) | `auth-service/src/auth/LoginModule.java` |
| 5 | Auth Facade | **Facade** (Structural) | `auth-service/src/auth/AuthenticationFacadeModule.java` |
| 6 | Auth Main | **Adapter** (Structural) | `auth-service/src/auth/Main.java` |
| 7 | Expense | **Strategy** (Behavioral) | `expense-service/src/ExpenseModule.py` |
| 8 | PDF | **Factory Method** (Creational) | `pdf-service/src/PdfModule.js` |
| 9 | Integration | **Proxy** (Structural) | `integration-layer/src/IntegrationModule.ts` |

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java JDK | 17+ |
| Maven | 3.8+ |
| Python | 3.10+ |
| Node.js | 18+ |
| MongoDB Community Server | Local install (port 27017) |
| Gmail App Password (optional) | For email verification in production |

---

## How to Run the System

### Step 1 — Start MongoDB (local)

Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) and ensure the service is running.

Verify:

```bash
mongosh
```

Both microservices use **one local MongoDB instance** on port **27017** with separate databases:

| Service | Connection string |
|---------|-------------------|
| Auth | `mongodb://localhost:27017/auth_db` |
| Expense | `mongodb://localhost:27017/expense_db` |

These are the defaults — no extra configuration needed unless your MongoDB runs elsewhere.

### Step 2 — Configure Environment (optional)

```bash
# Gmail (optional — without it, OTP/link is printed to auth service console)
GMAIL_USERNAME=your@gmail.com
GMAIL_APP_PASSWORD=your-app-password
VERIFICATION_STRATEGY=otp   # or "link"
```

### Step 3 — Start Each Service (4 terminals)

**Terminal 1 — Auth Service (port 8081)**

```powershell
cd auth-service
.\run-auth.ps1
```

**Terminal 2 — Expense Service (port 8082)**

```powershell
cd expense-service
.\run-expense.ps1
```

**Terminal 3 — PDF Service (port 8083)**

```bash
cd pdf-service
npm install
npm start
```

**Terminal 4 — Integration Layer (port 8080)**

```bash
cd integration-layer
npm install
npm run build
npm start
```

### Step 4 — Verify All Services

```bash
curl http://localhost:8080/health
curl http://localhost:8081/health
curl http://localhost:8082/health
curl http://localhost:8083/health
```

---

## API Reference

> **Gateway base URL (use for UI and curl):** `http://localhost:8080`  
> **Frontend (dev):** `http://localhost:5173` — Vite proxies `/api` → gateway.

| Service | Direct URL (testing only) | Port |
|---------|---------------------------|------|
| Integration gateway | `http://localhost:8080` | 8080 |
| Auth | `http://localhost:8081` | 8081 |
| Expense | `http://localhost:8082` | 8082 |
| PDF | `http://localhost:8083` | 8083 |

### Health checks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Gateway status + upstream URLs |
| GET | `http://localhost:8081/health` | No | Auth service |
| GET | `http://localhost:8082/health` | No | Expense service |
| GET | `http://localhost:8083/health` | No | PDF service |

---

### Auth endpoints (via gateway)

All paths below are relative to `http://localhost:8080`.

#### POST `/api/auth/register`

Register a new user. Supports flexible fields via the Builder pattern.

**Request:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "555-0100"
}
```

**Response (201):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0d",
  "email": "john@example.com",
  "name": "John Doe",
  "verified": false,
  "message": "Registration successful. Please verify your email."
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"john@example.com\",\"password\":\"SecurePass123!\",\"name\":\"John Doe\"}"
```

> Without Gmail configured, check the auth service console for: `[DEV] Verification OTP for john@example.com: 123456`

---

#### POST `/api/auth/verify`

Verify email using OTP (when `VERIFICATION_STRATEGY=otp`).

**Request:**

```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

**Response (200):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0d",
  "email": "john@example.com",
  "verified": true,
  "message": "Email verified successfully."
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/auth/verify \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"john@example.com\",\"code\":\"123456\"}"
```

---

#### GET `/api/auth/verify/link?token={token}`

Verify email via clickable link (when `VERIFICATION_STRATEGY=link`).

**Example:**

```bash
curl "http://localhost:8080/api/auth/verify/link?token=abc123-def456-..."
```

---

#### POST `/api/auth/login`

Authenticate and receive a JWT.

**Request:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "665f1a2b3c4d5e6f7a8b9c0d",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"john@example.com\",\"password\":\"SecurePass123!\"}"
```

---

#### GET `/api/auth/validate`

Validate a JWT and return the authenticated user. Used by the integration layer before forwarding expense requests.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0d",
  "email": "john@example.com",
  "name": "John Doe"
}
```

---

### Expense endpoints (via gateway — JWT required)

The gateway validates `Authorization: Bearer <token>` with auth-service, then forwards `X-User-Id` to expense-service. Direct calls to port **8082** must include header `X-User-Id` manually (testing only).

```
Authorization: Bearer <token>   # via integration layer only
```

#### POST `/api/expenses`

Create a new expense entry.

**Request:**

```json
{
  "amount": 45.99,
  "category": "Food",
  "reason": "Team lunch",
  "location": "Downtown Cafe",
  "date": "2026-05-30T12:30:00Z"
}
```

**Response (201):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0e",
  "user_id": "665f1a2b3c4d5e6f7a8b9c0d",
  "amount": 45.99,
  "category": "Food",
  "reason": "Team lunch",
  "location": "Downtown Cafe",
  "date": "2026-05-30T12:30:00.000000",
  "created_at": "2026-05-31T10:00:00.000000",
  "updated_at": "2026-05-31T10:00:00.000000"
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"amount\":45.99,\"category\":\"Food\",\"reason\":\"Team lunch\",\"location\":\"Downtown Cafe\",\"date\":\"2026-05-30T12:30:00Z\"}"
```

---

#### GET `/api/expenses`

List all expenses for the authenticated user.

**Example:**

```bash
curl http://localhost:8080/api/expenses \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### GET `/api/expenses?category=Food&min_amount=10&max_amount=100&start_date=2026-05-01T00:00:00Z&end_date=2026-05-31T23:59:59Z`

Filter expenses using Strategy-based query composition.

| Query Param | Type | Description |
|-------------|------|-------------|
| `category` | string | Case-insensitive category match |
| `min_amount` | float | Minimum expense amount |
| `max_amount` | float | Maximum expense amount |
| `start_date` | ISO 8601 | Expenses on or after this date |
| `end_date` | ISO 8601 | Expenses on or before this date |

**Example:**

```bash
curl "http://localhost:8080/api/expenses?category=Food&min_amount=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### GET `/api/expenses/{id}`

Get a single expense by ID.

**Example:**

```bash
curl http://localhost:8080/api/expenses/665f1a2b3c4d5e6f7a8b9c0e \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### PUT `/api/expenses/{id}`

Update an expense (partial update supported).

**Request:**

```json
{
  "amount": 49.99,
  "reason": "Updated team lunch"
}
```

**Example:**

```bash
curl -X PUT http://localhost:8080/api/expenses/665f1a2b3c4d5e6f7a8b9c0e \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"amount\":49.99,\"reason\":\"Updated team lunch\"}"
```

---

#### DELETE `/api/expenses/{id}`

Delete an expense by ID. Returns `204 No Content`.

**Example:**

```bash
curl -X DELETE http://localhost:8080/api/expenses/665f1a2b3c4d5e6f7a8b9c0e \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### PDF endpoints (via gateway)

#### POST `/api/pdf/generate`

Convert HTML to PDF and return the binary PDF response.

**Request (JSON):**

```json
{
  "html": "<html><body><h1>Expense Report</h1><p>Total: $45.99</p></body></html>",
  "options": {
    "format": "A4"
  }
}
```

**Response:** `application/pdf` binary stream

**Example:**

```bash
curl -X POST http://localhost:8080/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d "{\"html\":\"<html><body><h1>Expense Report</h1><p>Total: $45.99</p></body></html>\"}" \
  --output report.pdf
```

**Alternative — raw HTML body:**

```bash
curl -X POST http://localhost:8080/api/pdf/generate \
  -H "Content-Type: text/html" \
  -d "<html><body><h1>Hello PDF</h1></body></html>" \
  --output report.pdf
```

---

## End-to-End Flow Example

```bash
# 1. Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"jane@example.com\",\"password\":\"Pass123!\",\"name\":\"Jane\"}"

# 2. Verify (use OTP from auth service console or email)
curl -X POST http://localhost:8080/api/auth/verify \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"jane@example.com\",\"code\":\"123456\"}"

# 3. Login and save token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"jane@example.com\",\"password\":\"Pass123!\"}"

# 4. Create expense (replace TOKEN)
curl -X POST http://localhost:8080/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d "{\"amount\":25.50,\"category\":\"Transport\",\"reason\":\"Bus fare\",\"location\":\"City Center\",\"date\":\"2026-05-31T08:00:00Z\"}"

# 5. Generate PDF report
curl -X POST http://localhost:8080/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d "{\"html\":\"<html><body><h1>May Expenses</h1></body></html>\"}" \
  --output may-expenses.pdf
```

---

## Service Directory Structure

```
MoneyIQ-SCD/
├── auth-service/src/auth/     # 6 Java modules + AppConfig (GoF patterns 1–6)
├── expense-service/src/       # ExpenseModule.py (Strategy)
├── pdf-service/src/           # PdfModule.js (Factory Method)
├── integration-layer/src/     # IntegrationModule.ts (Proxy)
├── frontend/                  # React UI (port 5173)
├── DESIGN_PATTERNS.md         # Pattern theory for presentation
├── README.md                  # This file — endpoints & run guide
└── start-all.ps1              # Start all services (Windows)
```

---

## Error Handling

| HTTP Status | Scenario |
|-------------|----------|
| `400` | Validation errors, duplicate email, invalid credentials |
| `401` | Missing/invalid/expired JWT |
| `404` | Expense not found |
| `502` | Upstream microservice unavailable (gateway) |
| `500` | Internal server error (e.g., PDF generation failure) |

All error responses follow a consistent JSON format:

```json
{ "error": "Human-readable error message" }
```

---

## Security Notes

- JWT is issued and validated exclusively by the Auth Service
- The integration layer calls `GET /api/auth/validate` before proxying expense requests
- Expense Service trusts `X-User-Id` from the integration layer (internal service boundary) and performs no authentication itself
- Expense endpoints are protected at the gateway level (401 if token missing or invalid)
- Passwords are hashed with BCrypt before storage

---

## License

Academic / system design exercise.
