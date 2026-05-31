# Personal Expense Management System

A contract-first, microservice-based Personal Expense Management System demonstrating **Clean Architecture**, **service isolation**, and **GoF design patterns** across four independently deployable services.

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

Every module is fully object-oriented (encapsulation, abstraction, inheritance, polymorphism where applicable) and implements exactly one GoF pattern with documented reason in source comments.

| # | Module | Pattern (GoF) | File | Reason |
|---|--------|---------------|------|--------|
| 1 | Database | **Singleton** (Creational) | `DatabaseModule.java` | One shared MongoDB client avoids duplicate connections and resource waste |
| 2 | Registration | **Builder** (Creational) | `RegistrationModule.java` | Dynamic user fields without telescoping constructors |
| 3 | Verification | **Strategy** (Behavioral) | `VerificationModule.java` | OTP vs link algorithms swappable at runtime via config |
| 4 | Login | **Chain of Responsibility** (Behavioral) | `LoginModule.java` | Sequential validation steps decoupled into independent handlers |
| 5 | Auth Facade | **Facade** (Structural) | `AuthenticationFacadeModule.java` | Single unified interface over register / verify / login subsystems |
| 6 | Auth Main | **Adapter** (Structural) | `Main.java` | Adapts HTTP/REST requests to the facade's domain interface |
| 7 | Expense | **Strategy** (Behavioral) | `ExpenseModule.py` | Date, amount, category filters as interchangeable query strategies |
| 8 | PDF | **Factory Method** (Creational) | `PdfModule.js` | Creates renderer implementations without coupling callers to Puppeteer |
| 9 | Integration | **Proxy** (Structural) | `IntegrationModule.ts` | Surrogate gateway controlling access, auth validation, and header injection |

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

```bash
cd auth-service
mvn spring-boot:run
```

**Terminal 2 — Expense Service (port 8082)**

```bash
cd expense-service
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python run.py
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

> **Gateway base URL:** `http://localhost:8080`  
> All client requests should go through the Integration Layer unless testing a service directly.

---

### Auth Service Endpoints

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

### Expense Service Endpoints

Expense endpoints require a valid JWT **when called through the integration layer** (`http://localhost:8080`). The gateway validates the token with auth-service and forwards `X-User-Id` to the expense service. Direct calls to expense-service (port 8082) must include `X-User-Id` manually for testing.

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

### PDF Service Endpoints

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
SCD/
├── auth-service/          # Spring Boot — 6 flat source files
│   ├── src/
│   │   ├── Main.java                      # Entry point + REST API
│   │   ├── DatabaseModule.java            # Module 1: Singleton
│   │   ├── RegistrationModule.java        # Module 2: Builder
│   │   ├── VerificationModule.java        # Module 3: Strategy
│   │   ├── LoginModule.java               # Module 4: Chain of Responsibility
│   │   ├── AuthenticationFacadeModule.java # Module 5: Facade
│   │   └── application.properties
│   └── target/            # Compiled object code (Maven output)
├── expense-service/       # FastAPI — single module
│   └── src/
│       └── ExpenseModule.py   # Strategy pattern for filtering
├── pdf-service/           # Express.js — single module
│   └── src/
│       └── PdfModule.js       # Factory Method pattern
├── integration-layer/     # TypeScript gateway
│   └── src/
│       ├── IntegrationModule.ts  # Proxy pattern
│       └── index.ts
├── frontend/              # React UI
└── README.md
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
