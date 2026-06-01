# GoF Design Patterns — MoneyIQ-SCD

This project applies **nine** Gang of Four (GoF) design patterns—one per backend module. Each pattern solves a specific design problem. Source files contain inline comments on **what**, **why**, and **how** at class and method level.

> The GoF catalog defines **23** patterns total (creational, structural, behavioral). This system intentionally uses **one pattern per microservice module** to keep responsibilities clear for teaching and review.

---

## Pattern map

| # | Service | Module file | Pattern | Category |
|---|---------|-------------|---------|----------|
| 1 | Auth | `DatabaseModule.java` | Singleton | Creational |
| 2 | Auth | `RegistrationModule.java` | Builder | Creational |
| 3 | Auth | `VerificationModule.java` | Strategy | Behavioral |
| 4 | Auth | `LoginModule.java` | Chain of Responsibility | Behavioral |
| 5 | Auth | `AuthenticationFacadeModule.java` | Facade | Structural |
| 6 | Auth | `Main.java` | Adapter | Structural |
| 7 | Expense | `ExpenseModule.py` | Strategy | Behavioral |
| 8 | PDF | `PdfModule.js` | Factory Method | Creational |
| 9 | Integration | `IntegrationModule.ts` | Proxy | Structural |

---

## 1. Singleton (DatabaseModule)

### What it is
Singleton ensures a class has **only one instance** and provides a global access point to it.

### Why we use it
Creating a new `MongoClient` for every request is expensive and can exhaust connections. Auth service needs **one shared client** for the JVM process.

### How it works here
- `DatabaseModule` stores `mongoClient` in a `static volatile` field.
- `getClient()` uses **double-checked locking** so the client is created once, thread-safely, on first use.
- Spring injects `DatabaseModule` as a `@Component`; repositories use Spring Data MongoDB (separate auto-configured client). This module demonstrates the pattern for explicit client lifecycle teaching.

### OOP principles
- **Encapsulation** — URI and client hidden behind `getClient()`.
- **Single responsibility** — connectivity only; `User` entity and `UserRepository` live in the same file for cohesion.

---

## 2. Builder (RegistrationModule)

### What it is
Builder separates **construction** of a complex object from its representation, allowing step-by-step assembly.

### Why we use it
Registration accepts **dynamic fields** (email, password, name, phone, metadata). A telescoping constructor (`User(email, password, name, phone, ...)`) would be brittle. Builder adds fields incrementally and validates before `build()`.

### How it works here
1. `RegistrationModule.register()` receives a `Map<String, String>` from HTTP.
2. It creates `UserRegistrationBuilder`, maps known keys (`email`, `password`, `name`), puts extras in `metadata`.
3. `build()` validates required fields, hashes password, sets timestamps, returns `User`.
4. User is saved; `VerificationModule` sends OTP/link.

### OOP principles
- **Encapsulation** — build steps hidden inside builder.
- **Composition** — registration delegates verification to another module.

---

## 3. Strategy (VerificationModule)

### What it is
Strategy defines a family of algorithms, encapsulates each one, and makes them **interchangeable** at runtime.

### Why we use it
Email verification can be **OTP** (six-digit code) or **link** (UUID token). Switching algorithms via `if/else` in one class violates Open/Closed principle. Strategy isolates each algorithm.

### How it works here
- Interface `VerificationStrategy`: `sendVerification()`, `verify()`.
- `OtpVerificationStrategy` — generates OTP, emails or logs it, checks expiry.
- `LinkVerificationStrategy` — generates token, emails link, validates token.
- `VerificationModule` picks implementation from `verification.strategy` config (`otp` | `link`).

### OOP principles
- **Polymorphism** — same interface, different behavior.
- **Open/Closed** — add new strategy class without changing callers.

---

## 4. Chain of Responsibility (LoginModule)

### What it is
Chain of Responsibility passes a request along a **chain of handlers** until one handles it or all fail.

### Why we use it
Login requires ordered checks: user exists → email verified → password matches. One giant method is hard to extend. Each handler is one class; new steps (e.g. lockout) insert into the chain.

### How it works here
- Abstract `LoginHandler` with `setNext()` and `handle()`.
- `UserExistenceHandler` loads user into `LoginRequest`, passes on.
- `EmailVerificationHandler` rejects unverified accounts.
- `CredentialValidationHandler` checks BCrypt password, returns `User` (stops chain).
- `LoginModule` wires chain in constructor, then issues JWT after success.

### OOP principles
- **Inheritance** — concrete handlers extend `LoginHandler`.
- **Single responsibility** — one validation per handler.

---

## 5. Facade (AuthenticationFacadeModule)

### What it is
Facade provides a **unified simplified interface** to a set of interfaces in a subsystem.

### Why we use it
Auth has three subsystems: register, verify, login/validate. Controllers should not depend on all three. Facade exposes `register()`, `verifyEmail()`, `login()`, `validateToken()` as one API.

### How it works here
- Injects `RegistrationModule`, `VerificationModule`, `LoginModule`.
- Maps domain `User` objects to JSON-friendly `Map<String, Object>` responses.
- `Main` (Adapter) only talks to the facade.

### OOP principles
- **Abstraction** — hides subsystem complexity.
- **Dependency inversion** — facade depends on modules wired by Spring.

---

## 6. Adapter (Main)

### What it is
Adapter converts the interface of a class into another interface clients expect—**bridging incompatible interfaces**.

### Why we use it
HTTP/REST (JSON, status codes, headers) is incompatible with plain Java facade methods. `Main` adapts `@PostMapping` requests into facade calls and wraps results in `ResponseEntity`.

### How it works here
- `@RestController` methods parse JSON bodies and `Authorization` header.
- Delegate to `AuthenticationFacadeModule`.
- `@ExceptionHandler` maps exceptions to HTTP 400 JSON errors.

### OOP principles
- **Single responsibility** — HTTP translation only; no business rules.

---

## 7. Strategy (ExpenseModule)

### What it is
(Same pattern as Verification.) Each filter criterion is a strategy that modifies a MongoDB query.

### Why we use it
Listing expenses supports optional filters: date range, amount range, category. Adding filters without Strategy would grow one method with many `if` branches.

### How it works here
- `ExpenseFilterStrategy` ABC with `apply(query)`.
- `DateFilterStrategy`, `AmountFilterStrategy`, `CategoryFilterStrategy`.
- `ExpenseFilterContext` runs all strategies in sequence on `{ user_id: ... }`.
- FastAPI routes call `ExpenseService`; auth is **not** here—gateway sends `X-User-Id`.

### OOP principles
- **Inheritance** — strategies extend ABC.
- **Composition** — service composes repository + filter context.

---

## 8. Factory Method (PdfModule)

### What it is
Factory Method defines an interface for creating an object, but lets subclasses decide which class to instantiate.

### Why we use it
PDF rendering might use Puppeteer today and another engine tomorrow. Callers call `PdfRendererFactory.create(type)` instead of `new PuppeteerPdfRenderer()` everywhere.

### How it works here
- `PdfRenderer` base class defines `render(html, options)`.
- `PuppeteerPdfRenderer` implements with headless Chrome.
- `PdfRendererFactory.create('puppeteer')` returns the concrete renderer.
- `PdfModule` HTTP layer stays unaware of Puppeteer imports until render time.

### OOP principles
- **Polymorphism** — `render()` on any renderer.
- **Encapsulation** — browser lifecycle inside subclass.

---

## 9. Proxy (IntegrationModule)

### What it is
Proxy provides a **surrogate or placeholder** to control access to another object.

### Why we use it
Clients must not call microservices directly. The gateway must validate JWT (via auth-service), inject `X-User-Id`, forward requests, and hide internal URLs.

### How it works here
- `ServiceProxy` wraps `http-proxy-middleware` with path rewrite and header injection.
- Public routes: `/api/auth`, `/api/pdf` — proxied without login.
- `/api/expenses` — `_createAuthMiddleware()` validates Bearer token, then proxy adds `X-User-Id`.
- CORS and OPTIONS handled at gateway; body is **not** parsed with `express.json()` (would break proxy).

### OOP principles
- **Encapsulation** — clients see one host (`:8080`).
- **Single responsibility** — gateway routes only; no expense business logic.

---

## OOP summary (all services)

| Principle | Example in project |
|-----------|-------------------|
| Encapsulation | Private fields, modules hide implementation |
| Abstraction | `VerificationStrategy`, `ExpenseFilterStrategy`, `PdfRenderer` |
| Inheritance | Login handlers, filter strategies, `PdfRenderer` subclasses |
| Polymorphism | Strategy + Factory Method runtime substitution |
| Composition | Facade composes modules; services compose repository |
| Single responsibility | One pattern / concern per module file |

---

## Presenting to your teacher

1. Open the **module file** from the table above.
2. Read the **file-level** comment block (pattern name + reason).
3. Walk through **interfaces** (contract) → **concrete classes** (implementation) → **caller** (how it is selected).
4. Use this document for pattern theory; use **README.md** for API endpoints and **run scripts** for demo.
