# ARCHITECTURE.md

# 🏢 Synergy Enterprise Backend — Project & Task Management API
> 🇪🇸 **Español:** [Lee la versión en español de la arquitectura aquí](./docs/ARCHITECTURE.md)

## 1. EXECUTIVE SUMMARY & ARCHITECTURAL INTENT

### System Purpose
Synergy is an enterprise-grade platform (Enterprise Project System) designed for the comprehensive management of projects, members, invitations, and tasks. Its architecture is consolidated as a **Decoupled Modular Monolith**, carefully structured for Serverless deployments (such as AWS Lambda or Edge Containers). This is achieved through a strict separation of concerns and leveraging modern edge computing capabilities, guaranteeing elastic scalability without exhausting the relational connection pool, while preserving domain isolation that facilitates a future split into microservices if load demands it.

### Core Principles
The system is built under the highest software engineering standards:
- **Dependency Inversion (DIP):** Infrastructure and application always depend on contracts and interfaces (Ports) defined in the domain core. No use case knows about the database implementation or external frameworks.
- **Single Responsibility (SRP):** Every file, middleware, use case (`BaseUseCase`), and entity (`BaseEntity`) has a single reason to change. Repositories persist, use cases orchestrate, and entities protect invariants.
- **Strict Invariant Encapsulation:** Entities and Value Objects dictate the system's truth. Invalid states are mathematically impossible to instantiate thanks to constructor hiding (Factory Pattern) and strict Fail-Fast validations.

### Consolidated Tech Stack
- **Runtime & Language:** Node.js (v24.x+), TypeScript 6.0 (Strict Mode).
- **Presentation:** Express.js v5.
- **Data Validation (Boundary):** Zod (Unified and shared schemas via the `@project/common` workspace).
- **Persistence & ORM:** Prisma ORM v7. Integrates the new **Driver Adapters** architecture: `@prisma/adapter-neon` via WebSockets for Cloud/Serverless environments, and `@prisma/adapter-pg` over native TCP for Testcontainers.
- **Caching & Optimization:** Redis (infrastructure prepared for future rate-limiting and data caching).
- **Security & Comms:** Bcrypt (`BcryptPasswordHasher`), JWT (`JwtAuth`), Resend (Prod) / Nodemailer + Mailpit API (Tests).
- **Strategic Testing:** Vitest, Testcontainers (Docker `postgres:17-alpine`, `axllent/mailpit:v1.21`), `vitest-mock-extended`.

---

## 2. SYSTEM ARCHITECTURE & LAYER FLOW

The application strictly adheres to the concentric rings pattern proposed by Uncle Bob (Clean Architecture). 

### Unidirectional Flow

```text
                        HTTP Request
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 1. PRESENTATION LAYER (Express Routers, Middlewares)   │
│    validateRequest(Zod), CheckAuthMiddleware           │
└───────────────────────────┬────────────────────────────┘
                            │ (DTOs / Primitives)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. APPLICATION LAYER (Use Cases, Orchestration)        │
│    CreateTaskCase, LoginUserCase, UpdateProfileCase    │
└───────────────────────────┬────────────────────────────┘
                            │ (Interfaces / Ports)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. DOMAIN/CORE LAYER (Entities, VOs, Errors)           │
│    TaskEntityClass, TaskPriorityVo, TaskDomainError    │
└───────────────────────────▲────────────────────────────┘
                            │ (Implements Ports)
                            │
┌───────────────────────────┴────────────────────────────┐
│ 4. INFRASTRUCTURE LAYER (Adapters, Prisma, Mailer)     │
│    PrismaTaskRepository, ResendMailService, di.config  │
└────────────────────────────────────────────────────────┘
                            │
                            ▼
                        Database
```

### Technical Layer Breakdown

- **Presentation:**
  - **Controllers & Routers:** Centralize HTTP routing (e.g., `auth.routes.ts`, `task.routes.ts`). Controllers (`CreateTaskController`, `LoginUserController`) receive requests, unpack payloads, and dispatch Use Cases.
  - **Middlewares:** Cross-cutting operations like authentication (`CheckAuthMiddleware` with JWT validation) and structural input/output validation (`validateRequest` using `ZodType` schemas). Unified error handling is delegated to `GlobalErrorMiddleware`.

- **Application:**
  - **Use Cases:** Fulfill the generic `BaseUseCase<Input, Output>` contract. They act as orchestrators choreographing repositories and domain services. Examples: `AcceptInvitationCase`, `CompleteProjectCase`.
  - **External Integration Ports:** Abstract contracts like `IPasswordHasher`, `IAuthService`, `IMailService`, and `I[Entity]Repository` repositories.
  - **Dependency Injection (DI):** Manually and statically type-safe orchestrated via the **Composition Root** pattern (centralized in `containerDI` within `di.config.ts`), eliminating the need for magic decorators and improving cold-start times in lambda functions.

- **Domain (Core):**
  - Free of external frameworks (`0 dependencies`). Everything in this layer are native TypeScript classes. Defines Business Logic and behavioral rules through Aggregates (`ProjectEntityClass`, `UserEntityClass`), Value Objects (`ProjectTitleVo`, `UserEmailVo`), and Domain Exceptions (e.g., `ProjectErrorFactory`).

- **Infrastructure:**
  - **Data Repositories:** Classes like `PrismaUserRepository` and `PrismaTaskRepository` that implement domain interfaces (`IUserRepository`) using the ORM layer. They apply the Data Mapper Pattern to isolate the domain from persistence.
  - **Adapters:** `ResendMailService`, `NodemailService`, `BcryptPasswordHasher`, `JwtAuth`.

---

## 3. DOMAIN-DRIVEN DESIGN (DDD) STRATEGY & CORE PATTERNS

### BaseValueObject, Identifiers & Structural Typing Prevention
To eradicate *Primitive Obsession* and prevent collisions due to TypeScript's *Structural Typing* (where two classes with the same structure are evaluated as equivalent even if they represent different concepts), discriminating type literals are used (`voType` and `identifierType`).

```typescript
// 1. Base for attribute Value Objects (e.g., Emails, Passwords, Titles)
export abstract class BaseValueObject<T, V extends string> {
    protected abstract readonly voType: V; // Discriminator (e.g., 'UserEmailVo')
    protected readonly _props: DeepReadonly<T>;
    
    protected constructor(props: T) {
        this._props = deepFreeze(props); // Guaranteed immutability
    }
    // ... deep equals() methods
}

// 2. Base for Unique Identifiers (UUIDs)
export abstract class UniqueIdentifier<ID extends string> extends BaseIdentifier<string, ID> {
    protected abstract readonly identifierType: ID; // Discriminator (e.g., 'ProjectIdVo')
    
    protected constructor(uuid: string) {
        UniqueIdentifier.validate(uuid); // Validates UUIDv4 format
        super(uuid);
    }
}
```
* **Recursive `deepFreeze`:** Custom implementation (`src/core/utils/deepFreeze.ts`) employing a `WeakSet` to detect and ignore circular references, guaranteeing memory leak prevention. Explicitly excludes native instances like `Date` or `RegExp` to avoid freezing their prototypes, ultimately applying a deep `Object.freeze()`.
* **`DeepReadonly<T>`:** Native TS conditional type to recursively iterate the inferred object, ensuring strict immutability at compile time for any `T` received by a Value Object.
* **Strong vs. General Typing:** Identifiers extend from `UniqueIdentifier<ID>` (with a specific `identifierType`, e.g., `'UserIdVo'`), while attribute values are identified with `voType`. This prevents a `MemberIdVo` from mistakenly being passed where a `ProjectIdVo` is expected due to classic TypeScript Structural Typing.

### Entities & Aggregates
Entities derive from `BaseEntity<I, T>`, encapsulating state with protected properties `_props`, `_id`, `createdAt`, and `updatedAt`.
- **Private Constructors (Factory Pattern):** Entities like `UserEntityClass` or `TaskEntityClass` cannot be instantiated with the `new` keyword from the outside. 
- **`.create()` vs `.reconstitute()`:** 
  - `.create()` is used to model *new* business interactions (e.g., from a Controller). It generates UUIDs, assigns default timestamps (`DateVo.create()`), and evaluates initial invariants.
  - `.reconstitute()` is exclusively used for the Infrastructure layer (**Mappers**, e.g., `ProjectMapper.toDomain()`). It hydrates entities retrieved from the database preserving their exact historical IDs and Timestamps intact.
- **Audited Mutability:** Aggregate state is only altered through behavioral methods (e.g., `moveToInProgress()`, `extendDueDate()`), which internally invoke `this.markAsUpdated()`, cryptographically registering the temporal modification of the aggregate.

### Transactional Persistence Pattern (UOW + ALS + Repositories)
The problem of leaking the database access layer into use cases has been mitigated using Node.js **AsyncLocalStorage (ALS)** and the Unit of Work pattern.
- **`TransactionStorage<T>` (ALS):** A singleton of `AsyncLocalStorage` (`txStorage` in `tx-storage.ts`) is declared. It keeps the transactional client context alive during the async thread lifespan.
- **`PrismaUnitOfWork`:** Implements the `IBaseUnitOfWork` port. Opens a transaction with `prisma.$transaction` and injects the transactional `tx` handler into the asynchronous pipeline using `txStorage.run(tx, work)`.
- **`BasePrismaRepository`:** All concrete repositories invoke `this.getClient()`. This method dynamically resolves `txStorage.getStore() ?? this.prisma`. If a Use Case (like `AcceptInvitationCase`) initiates the Unit Of Work, all reads and writes detect and automatically use the underlying transactional client. This completely avoids injecting Prisma Client or Transactions at the Application level.

### Domain Error Handling
A robust error architecture to prevent leaking internal stack traces to clients:
- **`BaseDomainError`:** Models a controlled exception with its own state (`errorType`, `internalCode`, `isOperational = true`).
- **Error Factories (E.g., `UserErrorFactory`):** Centralize the domain failure glossary. They trigger errors ensuring consistency with human-readable and internal tracking codes.
- **StackTrace Profiling:** Implementation of `Error.captureStackTrace(this, this.constructor)` isolating the exact origin of the failure without polluting the log with the generic instantiation.
- **Semantic HTTP Mapping:** The `GlobalErrorMiddleware` catches these errors and uses an `ErrorMapper` (`mapper.error.ts`) to dynamically resolve the appropriate HTTP Status Code (400, 401, 403, 404, 409, 422, 423) according to the category.

---

## 4. TESTING STRATEGY (917 TESTS REGRESSION SUITE)

The Quality Assurance (QA) strategy is aggressive and covers the entirety of transactional and domain logic, separated into specific suites in Vitest (`vitest.config.ts` vs `vitest.integration.config.ts`).

### Testing Philosophy
Validate that Invariants (Business Rules) do not emit false positives, ensuring that the DDD design restricts impossible state transitions (e.g., Completing a project that has pending tasks) by using exhaustive "Happy Paths" combined with "Guard & Authorization Constraints" in every specification.

### Unit Testing (Domain & Application)
- Ultra-fast isolated tests using **Vitest**.
- **Mocks & Stubs:** Use of `vitest-mock-extended` (e.g., `mock<IUserRepository>()`) to instantiate repositories and external services without real DB persistence.
- **Object Mother Pattern** (`UserMother`, `ProjectMother`): Centralizes the creation of complex aggregates in specific states (e.g., `reconstituteArchived()`, `createSuspended()`), eliminating boilerplate code in assertions.

### Integration Testing (Infrastructure & Database)
- End-to-end testing in the persistence layer validating complex queries, relational Unique Constraints, and cascades.
- Fully orchestrated via **Testcontainers** (see ADR-005 for more details).
- Tests strictly validate ACID transactional rollbacks (due to locking or failure) by forcing exceptions at the `UnitOfWork` level.

---

## 5. ARCHITECTURAL DECISION RECORDS (ADRs)

### ADR-001: Clean Architecture + DDD vs Conventional MVC
- **Context:** Synergy needs to accommodate complex and intertwined logics (Invitations modifying Members, Projects restricting Tasks) in an environment where multiple teams could intervene simultaneously, without risk of cross-corruption. Classic MVC tends to generate "Fat Controllers" or "Anemic Models", coupling the ORM to business rules.
- **Decision:** Implement Clean Architecture paired with Domain-Driven Design (DDD).
- **Positive Consequences:** Absolute domain independence from the Database (Prisma) or the router (Express). Domain code can be executed and tested in isolation (entities and UseCases are tested in milliseconds).
- **Trade-offs:** Higher verbosity (boilerplate), need for Bidirectional Mappers to transfer data to/from infrastructure, and a steeper technical learning curve for new developers.

### ADR-002: Transactional Context via AsyncLocalStorage (ALS) + Unit of Work
- **Context:** Compound operations (e.g., Creating a Project and simultaneously creating the Admin Member) demand ACID integrity. Passing the database client or Prisma transaction object to Use Cases destroyed DIP (Dependency Inversion Principle), leaking infrastructure to the Application layer.
- **Decision:** Wrap the Unit of Work using native Node.js `AsyncLocalStorage` (`tx-storage.ts`).
- **Positive Consequences:** The Application layer code is ORM-agnostic. It invokes standard Repository methods, and if the UoW has been initiated, it inherits and automatically adheres to the ACID session.
- **Trade-offs:** Error tracking is slightly more complex if un-awaited asynchronous promises escape the ALS context due to losing the Node execution thread.

### ADR-003: Deep Immutability with `deepFreeze` and `DeepReadonly<T>` in Value Objects
- **Context:** Value Objects (VOs) by definition have no lifecycle or alterable state; two VOs with the same content represent the same thing. However, in JavaScript, passing complex objects as properties leaves them susceptible to accidental mutation by reference.
- **Decision:** Integrate strict immutability combining TypeScript typing (`DeepReadonly`) and runtime freezing (`deepFreeze` backed by `WeakSet`) in the abstract constructor `BaseValueObject`.
- **Positive Consequences:** Strong architectural security guarantee. It is mathematically impossible to corrupt a VO after validation. Vulnerabilities and side-effects where an external layer mutates sub-references are eliminated by design.
- **Trade-offs:** Marginal computational performance penalty in massive CPU instantiations, and iterations that must strictly ignore native JavaScript objects (`Date`, `RegExp`).

### ADR-004: Dependency Injection (DI) via Composition Root vs Magic IoC Containers
- **Context:** Popular frameworks in the TypeScript ecosystem (Inversify, TSyringe, NestJS) impose the heavy use of `reflect-metadata` and decorators (`@Injectable`, `@Inject`), which clutters domain code and dramatically increases Cold Start time in Serverless architectures.
- **Decision:** Adopt the **Composition Root** pattern for static injection, exporting rigid frozen containers, such as the `containerDI` dictionary or `projectModulesContainer`.
- **Positive Consequences:** Zero runtime performance penalty, easy navigation through the dependency tree, strict TypeScript typing. Allows dispensing entirely with libraries, minimizing the attack surface and bundle size for AWS Serverless environments.
- **Trade-offs:** Imperative requirement to manually instantiate sequentially every repository, use case, and controller (`new Case(repo)`), which can be tedious when scaling horizontally.

### ADR-005: Integration Testing Strategy with Testcontainers vs DB Mocks
- **Context:** Mocking the database (e.g., `prisma-mock`) for integration tests generates false positives, as it does not replicate SQL restrictions (Constraints, Cascades, Triggers) nor check for true transactional deadlocks.
- **Decision:** Implement **Testcontainers** (`@testcontainers/postgresql` and `axllent/mailpit`) in the Vitest pipeline (`database.setup.ts`).
- **Positive Consequences:** Absolute confidence in assertions. Real transactions, Prisma migrations, and SMTP communication are validated in an environment identical to production. Each test operates on an isolated schema (dynamic `search_path`).
- **Trade-offs:** Requires Docker Engine locally, and execution times for the integration test suite are longer compared to in-memory mocks.

### ADR-006: Zod + `@project/common` Workspace for Shared Schemas & Boundary Validation (Fail-Fast)
- **Context:** Duplication of structural validation logic between the client (Frontend) and the server (Backend), causing desynchronization and vulnerabilities.
- **Decision:** Extract all contracts, constants, and Zod validation schemas to an independent monorepo workspace (`packages/common`). The Backend uses the `validateRequest` middleware to apply the Fail-Fast principle before the malformed payload reaches the controller.
- **Positive Consequences:** *Single Source of Truth*. End-to-end type-safety. Attacks and malformations are stopped at the API periphery with O(1) computational cost.
- **Trade-offs:** Slightly increases the complexity of dependency management in the Monorepo (pnpm workspaces).

### ADR-007: Adoption of Driver Adapters in Prisma v7 (Cloud Serverless / Local Test)
- **Context:** Traditional Prisma usage with its native Query Engine (Rust) spins up persistent connection pools that are fatal in Serverless/Lambda environments, exhausting PostgreSQL connection limits.
- **Decision:** Incorporate Prisma v7 Driver Adapters. `@prisma/adapter-neon` (via WebSockets) is used for the production/development environment, and `@prisma/adapter-pg` (native local TCP) is dynamically injected for local tests with Testcontainers (`lib/prisma.ts`).
- **Positive Consequences:** Full Edge Computing compatibility (Ultra-fast cold starts, bypassing PgBouncer connection limits) without sacrificing the ability to perform local TDD with native Docker.
- **Trade-offs:** Dual configuration and the need to inject conditional dependencies when initializing the ORM client Singleton.