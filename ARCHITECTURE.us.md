### 🇺🇸 English Version (`ARCHITECTURE.us.md`)

# 🏢 Synergy Enterprise Backend — Project & Task Management API

> 🇪🇸 **Español:** [Lee la versión en español de la arquitectura aquí](./docs/ARCHITECTURE.es.md)

## 1. EXECUTIVE SUMMARY & ARCHITECTURAL INTENT

### System Purpose

Synergy is an enterprise-grade platform (Enterprise Project System) designed for the comprehensive management of projects, members, invitations, and tasks. Its architecture is consolidated as a **Decoupled Modular Monolith**, carefully structured for Serverless deployments (such as AWS Lambda or Edge Containers). This is achieved through a strict separation of concerns and leveraging modern edge computing capabilities, guaranteeing elastic scalability without exhausting the relational connection pool, while preserving domain isolation that facilitates a future split into microservices if load demands it.

### Core Principles

The system is built under the highest software engineering standards:

- **Dependency Inversion (DIP):** Infrastructure and application always depend on contracts and interfaces (Ports) defined in the domain core. No use case knows about the database implementation or external frameworks.
- **Single Responsibility (SRP):** Every file, middleware, use case (`BaseUseCase`), and entity (`BaseEntity`) has a single reason to change. Repositories persist, use cases orchestrate, and entities protect invariants.
- **Strict Invariant Encapsulation:** Entities and Value Objects dictate the system's truth. Invalid states are mathematically impossible to instantiate thanks to constructor hiding (Factory Pattern) and strict Fail-Fast validations.
- **Isolated App Lifecycle:** Complete elimination of runtime global singletons. Server creation, Express application binding, and dependency injection are isolated via Factory Functions (createContainer(), createApp(), createServer()), eliminating state leakage during test suites and multi-stage builds.

### Consolidated Tech Stack

- **Runtime & Language:** Node.js (v24.x+), TypeScript 6.0 (Strict Mode).
- **Presentation:** Express.js v5.
- **Serverless & Adapter:** AWS Lambda Web Adapter (LWA), AWS API Gateway (HTTP/REST API).
- **Infrastructure as Code (IaC):** AWS CDK (TypeScript Stack) implementing IAM Least Privilege.
- **Data Validation (Boundary):** Zod (Unified and shared schemas via the `@project/common` workspace).
- **Persistence & ORM:** Prisma ORM v7. Integrates **Driver Adapters**: `@prisma/adapter-neon` via WebSockets / PgBouncer for Cloud/Serverless execution, `@prisma/adapter-pg` over native TCP for Testcontainers, and Direct Database Connections for DDL migrations.
- **Secrets & Configuration:** AWS Secrets Manager / SSM Parameter Store (Runtime decoupling), GitHub Secrets.
- **Security & CI/CD Auth:** OpenID Connect (OIDC) federated role-based deployment without long-lived static AWS keys.
- **Caching & Optimization:** Redis (infrastructure prepared for rate-limiting and data caching).
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
│    PrismaTaskRepository, ResendMailService, Factory DI │
└────────────────────────────────────────────────────────┘
                            │
                            ▼
                        Database
```

### Technical Layer Breakdown

- **Presentation:**
  - **Controllers & Routers:** Centralize HTTP routing (e.g., `auth.routes.ts`, `task.routes.ts`). Controllers (`CreateTaskController`, `LoginUserController`) receive requests, unpack payloads, and dispatch Use Cases.
  - **Middlewares:** Cross-cutting operations like authentication (`CheckAuthMiddleware` with JWT validation) and structural input/output validation (`validateRequest` using `ZodType` schemas). Unified error handling is delegated to `GlobalErrorMiddleware`.
  - **Factories:** createApp(container) binds middlewares and dynamic routers using the isolated dependency container created by createContainer().

- **Application:**
  - **Use Cases:** Fulfill the generic `BaseUseCase<Input, Output>` contract. They act as orchestrators choreographing repositories and domain services. Examples: `AcceptInvitationCase`, `CompleteProjectCase`.
  - **External Integration Ports:** Abstract contracts like `IPasswordHasher`, `IAuthService`, `IMailService`, and `I[Entity]Repository` repositories.
  - **Dependency Injection (DI):** Factory-based statically type-safe composition via createContainer() (in di.config.ts), eliminating top-level mutable singletons, magic decorators, and improving test isolation and cold-start times.

- **Domain (Core):**
  - Free of external frameworks (`0 dependencies`). Everything in this layer are native TypeScript classes. Defines Business Logic and behavioral rules through Aggregates (`ProjectEntityClass`, `UserEntityClass`), Value Objects (`ProjectTitleVo`, `UserEmailVo`), and Domain Exceptions (e.g., `ProjectErrorFactory`).

- **Infrastructure:**
  - **Data Repositories:** Classes like `PrismaUserRepository` and `PrismaTaskRepository` that implement domain interfaces (`IUserRepository`) using the ORM layer. They apply the Data Mapper Pattern to isolate the domain from persistence.
  - **Adapters:** `ResendMailService`, `NodemailService`, `BcryptPasswordHasher`, `JwtAuth`.
  - **Environment Management:** Centralized environment loader (load-env.ts) guarantees deterministic lifecycle loading of process environment variables prior to setup execution in local and CI runner environments.

---

## 3. DOMAIN-DRIVEN DESIGN (DDD) STRATEGY & CORE PATTERNS

### BaseValueObject, Identifiers & Structural Typing Prevention

To eradicate _Primitive Obsession_ and prevent collisions due to TypeScript's _Structural Typing_ (where two classes with the same structure are evaluated as equivalent even if they represent different concepts), discriminating type literals are used (`voType` and `identifierType`).

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
export abstract class UniqueIdentifier<
  ID extends string,
> extends BaseIdentifier<string, ID> {
  protected abstract readonly identifierType: ID; // Discriminator (e.g., 'ProjectIdVo')

  protected constructor(uuid: string) {
    UniqueIdentifier.validate(uuid); // Validates UUIDv4 format
    super(uuid);
  }
}
```

- **Recursive `deepFreeze`:** Custom implementation (`src/core/utils/deepFreeze.ts`) employing a `WeakSet` to detect and ignore circular references, guaranteeing memory leak prevention. Explicitly excludes native instances like `Date` or `RegExp` to avoid freezing their prototypes, ultimately applying a deep `Object.freeze()`.
- **`DeepReadonly<T>`:** Native TS conditional type to recursively iterate the inferred object, ensuring strict immutability at compile time for any `T` received by a Value Object.
- **Strong vs. General Typing:** Identifiers extend from `UniqueIdentifier<ID>` (with a specific `identifierType`, e.g., `'UserIdVo'`), while attribute values are identified with `voType`. This prevents a `MemberIdVo` from mistakenly being passed where a `ProjectIdVo` is expected due to classic TypeScript Structural Typing.

### Entities & Aggregates

Entities derive from `BaseEntity<I, T>`, encapsulating state with protected properties `_props`, `_id`, `createdAt`, and `updatedAt`.

- **Private Constructors (Factory Pattern):** Entities like `UserEntityClass` or `TaskEntityClass` cannot be instantiated with the `new` keyword from the outside.
- **`.create()` vs `.reconstitute()`:**
  - `.create()` is used to model _new_ business interactions (e.g., from a Controller). It generates UUIDs, assigns default timestamps (`DateVo.create()`), and evaluates initial invariants.
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
- Isolated state execution: Factories (createContainer()) instantiate dedicated dependencies for test instances, eliminating state pollution or cross-test interference.
- Tests strictly validate ACID transactional rollbacks (due to locking or failure) by forcing exceptions at the `UnitOfWork` level.

---

## 5. INFRASTRUCTURE AND RESILIENCE

### 🔄 Graceful Shutdown & Process Lifecycle (Phase 1.3)

The server implements an orchestrator-agnostic graceful shutdown mechanism designed for cloud-native deployment environments (e.g., Docker, Kubernetes, Render).

#### Controlled Shutdown Workflow

Upon receiving operating system termination signals (`SIGINT` from terminal or `SIGTERM` from container orchestrators):

1. **Signal Interception:** `registerGracefulShutdown` guards against redundant execution if duplicate signals are received.
2. **HTTP Traffic Draining:** `server.close()` immediately stops accepting new incoming HTTP connections while processing active in-flight requests.
3. **Inversion of Control (Cleanup Callback):** Executes the asynchronous cleanup callback (`onShutdown`) to gracefully close underlying infrastructure connections (`PrismaClient.$disconnect()`).
4. **Safety Fallback Timeout:** Activates an unreferenced (`unref`) 10-second timer to forcibly exit the process (`process.exit(1)`) if hanging requests or queries exceed the threshold.
5. **Clean Exit:** Terminates the Node.js process cleanly with success exit code `0`.

> **Infrastructure Note:** The Node.js server operates over plain HTTP to leverage TLS Termination at the Reverse Proxy or Load Balancer level (e.g., Nginx, Cloudflare, AWS ALB).

### Observability and Request Traceability

The system implements an agnostic observability design decoupled from the underlying logging framework via the Adapter Pattern.

#### Key Components:

- **`LoggerPort` (Application Layer):** Contract defining standard logging methods (`info`, `warn`, `error`, `debug`, `child`). The application layer and use cases depend strictly on this abstraction.
- **`PinoLoggerAdapter` (Infrastructure Layer):** Concrete implementation adapting the `Pino` library to the `LoggerPort` contract. Handles serialization of `Error` instances under the `err` key and formats JSON structured outputs.
- **`requestContext` (AsyncLocalStorage):** Node.js asynchronous execution context store. Allows implicit propagation of request metadata—such as the `requestId` generated at the HTTP layer—across all application layers without polluting method signatures.

#### Logger Behavior:

- **Development:** Logs are formatted using pino-pretty for terminal readability (local timestamps, color highlights, and context blocks).
- **Production:** High-performance structured JSON output, optimized for log aggregators like Datadog, Grafana Loki, or CloudWatch.
- **Testing:** Muted automatically (silent) to maintain a clean Vitest output.

---

## 6. CI/CD, CONTAINERIZATION & DEVSECOPS PIPELINE

### Overview

Synergy enforces an automated, multi-stage Quality Assurance and Security pipeline via **GitHub Actions**. Every Pull Request and push to the `main` branch undergoes automated validation, preventing regressions, memory leaks, supply-chain vulnerabilities, and misconfigured container builds from entering production.

### Continuous Integration Workflow

The pipeline is structured into 4 isolated, sequential, and parallelized jobs (`validate` ➔ `testing` ➔ `snyk` ➔ `docker`):

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. VALIDATE JOB                                                         │
│    Lint ➔ Typecheck (TS 6.0) ➔ Prisma Client ➔ Build Monorepo
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. TESTING JOB                                                          │
│    Unit Tests (Vitest Mocks) ➔ Integration Tests (Testcontainers + PG)
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. SNYK SECURITY JOB                                                    │
│    SCA (Dependency Audit) ➔ SAST (Code Analysis) ➔ Snyk Dashboard Sync
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. DOCKER & CONTAINER SECURITY JOB                                      │
│    Multi-stage Build ➔ Alpine OS Hardening ➔ Trivy Vulnerability Scan
└─────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Pipeline Stages

- **Validation Stage (`validate`):**
  - **Code Quality & Typing:** Runs ESLint and strict TypeScript typechecking across all monorepo workspaces (`@project/common`, `@project/server`).
  - **ORM Client Generation:** Synthesizes the Prisma Client (`pnpm run server:prisma-generate`) using driver adapters.

- **Automated Testing Stage (`testing`):**
  - **Unit Suite:** Executes domain and use case unit specifications in milliseconds using Vitest and `vitest-mock-extended`.
  - **Integration Suite:** Spins up real PostgreSQL containers via Testcontainers (`@testcontainers/postgresql`) to validate database migrations, raw queries, constraints, and ACID transactions managed by the `PrismaUnitOfWork`.

- **Dependency & Static Security Analysis Stage (`snyk`):**
  - **Software Composition Analysis (SCA):** Scans the dependency tree (`pnpm-lock.yaml`) for known CVEs.
  - **Static Application Security Testing (SAST):** Scans source code for security anti-patterns and secrets leaks using Snyk Code.
  - **Snyk Dashboard Synchronization:** Uses `--strict-out-of-sync=false` to continuously report the security state to the `josuezmbrano` Snyk organization dashboard and upload SARIF reports to GitHub Code Scanning.

- **Container Building & Hardening Stage (`docker`):**
  - **Multi-stage Production Dockerfile:** Builds an optimized production image using `node:24-alpine` as the base runner.
  - **Container OS Hardening:** Executes `apk upgrade --no-cache` to patch system-level libraries (e.g., OpenSSL/`libssl3` `CVE-2026-14456` QUIC DoS fix).
  - **Attack Surface Elimination:** Explicitly strips `npm`, `npx`, and unused global binaries from the final runner image, neutralizing transitive vulnerabilities (`undici`, `node-tar`, `ip-address`).
  - **Trivy Image Scanner:** Scans the final container image for `CRITICAL` and `HIGH` OS or library vulnerabilities, failing the build (`exit-code 1`) if any unpatched threat is detected.

### AWS Serverless Deployment & Schema Migrations

The pipeline incorporates continuous deployment to AWS using passwordless federation:

- **OpenID Connect (OIDC) Authentication:** Eliminates long-lived `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` credentials in GitHub. AWS issues short-lived temporary tokens bound exclusively to the pipeline runner lifecycle.
- **Idempotent DDL Migrations (`prisma migrate deploy`):** Uses a dedicated **Direct Database Connection URL** (bypassing PgBouncer pooling restrictions) to apply structural SQL changes prior to code deployment. If migrations fail, the deployment is aborted immediately to protect production integrity.
- **AWS CDK Stack Deployment:** Synthesizes and deploys the Infrastructure as Code stack, binding the Docker container image built in ECR to AWS Lambda behind API Gateway.

---

## 7. ARCHITECTURAL DECISION RECORDS (ADRs)

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
- **Positive Consequences:** _Single Source of Truth_. End-to-end type-safety. Attacks and malformations are stopped at the API periphery with O(1) computational cost.
- **Trade-offs:** Slightly increases the complexity of dependency management in the Monorepo (pnpm workspaces).

### ADR-007: Adoption of Driver Adapters in Prisma v7 (Cloud Serverless / Local Test)

- **Context:** Traditional Prisma usage with its native Query Engine (Rust) spins up persistent connection pools that are fatal in Serverless/Lambda environments, exhausting PostgreSQL connection limits.
- **Decision:** Incorporate Prisma v7 Driver Adapters. `@prisma/adapter-neon` (via WebSockets) is used for the production/development environment, and `@prisma/adapter-pg` (native local TCP) is dynamically injected for local tests with Testcontainers (`lib/prisma.ts`).
- **Positive Consequences:** Full Edge Computing compatibility (Ultra-fast cold starts, bypassing PgBouncer connection limits) without sacrificing the ability to perform local TDD with native Docker.
- **Trade-offs:** Dual configuration and the need to inject conditional dependencies when initializing the ORM client Singleton.

### ADR-008: Environment Variable Validation & Fail-Fast Startup Strategy (Production Hardening)

- **Context:** An application operating without strict environment variable validation at startup risks silent runtime failures, insecure fallback configurations, or confusing network errors deep within business logic (e.g., trying to run queries with an uninitialized `DATABASE_URL`).
  Additionally, integration tests using dynamic containers (Testcontainers) inject ports and connection strings at runtime, creating potential race conditions with Node.js top-level module evaluation.
- **Decision:** implement a **Fail-Fast Environment Validation** pattern using **Zod** (`envSchema`), separating the application's configuration runtime from the process's dynamic infrastructure environment.
- **Positive Consequences:** The app fails at second 0 if misconfigured, avoiding corrupted runtime states. Clear, descriptive validation error messages on boot and production code is 100% type-safe and decoupled from test orchestration dynamics.
- **Trade-offs:** Developers must maintain both `.env.example` and `envSchema` when adding new external service integrations.

### ADR-009: Two-Tiered Health Checks & Database Probe Resilience (Liveness vs. Readiness)

- **Context:** Coupling overall application health to database availability in a single probe causes false positives: transient database latency spikes trigger orchestrators (Render, AWS ECS, Kubernetes) to prematurely kill and restart healthy application instances.
- **Decision:** Implement a decoupled two-tiered health strategy under /health. /liveness checks process metrics (rssMB, heapUsedMB, uptime) without external dependencies. /readiness executes an isolated DatabasePinger (SELECT 1) capped by a strict 2000ms Promise.race timeout with clearTimeout cleanup in finally.
- **Positive Consequences:** Prevents cascading container restart loops during database outages by temporarily pausing traffic instead of killing instances. Eliminates Node.js timer leaks under high-frequency polling.
- **Trade-offs:** Slightly increases routing setup complexity by requiring separate controllers and pinger abstractions.

### ADR-010: Adoption of AsyncLocalStorage and Agnostic Logger for Observability

- **Context:** To trace concurrent requests across controllers, use cases, repositories, and external services, we needed to correlate a unique identifier (`requestId`) with every log entry. Passing `requestId` manually as an argument through domain and application functions caused unnecessary coupling and signature pollution.
- **Decision:** Use Node.js `AsyncLocalStorage` to maintain request context (`requestId`) implicitly and asynchronously. Inject `LoggerPort` via Dependency Inversion into Use Cases requiring resilience (e.g., non-critical notification failures that must not roll back main business transactions).
- **Positive Consequences:** 100% traceable requests in distributed environments; Use Cases remain ignorant of the underlying logger library; clean refactoring without modifying method signatures.
- **Trade-offs** Slight memory overhead from async context tracking, mitigated by the high native performance of the `async_hooks` API in modern Node.js.

### ADR-011: Migration from Global Singletons to Dependency Injection Factory Functions

- **Context:** Top-level global singletons for containers (containerDI), Express apps (app), and ORM clients caused shared state leakages between test runs in Vitest. Furthermore, importing top-level singletons triggered premature environment variable evaluations before Testcontainers or load-env.ts could inject dynamic runtime configurations.
- **Decision:** Convert all top-level application singletons into Factory Functions (createContainer(), createApp(), and createServer()).
- **Positive Consequences:** Absolute state isolation between integration test execution contexts. Guarantees deterministic environment variable initialization (load-env.ts) prior to infrastructure binding. Prevents multi-stage Docker build failures caused by premature DB connection attempts during static analysis steps.
- **Trade-offs** Server entrypoints must explicitly invoke factory constructors (createServer()) during boot.

### ADR-012: Adoption of AWS Lambda Web Adapter for Serverless Entrypoint

- **Context:** Decoupling the Express application from AWS proprietary handlers (`@codegenie/serverless-express`) to avoid locking domain logic into cloud vendor interfaces.
- **Decision:** Use AWS Lambda Web Adapter (LWA) in Docker container images to translate incoming API Gateway HTTP events directly into local HTTP calls on port 3000.
- **Positive Consequences:** Preserves Clean Architecture invariants. The application boots natively both as a local server and inside AWS Lambda without code modifications. Enables lazy initialization and Cold Start readiness tuning via `AWS_LWA_READINESS_CHECK_TIMEOUT=5000`.
- **Trade-offs:** Adds a lightweight binary execution overhead within the Docker runner base.

### ADR-013: Dual-Mode Connection Strategy for Serverless PostgreSQL (Neon)

- **Context:** Serverless horizontal scaling exhausts PostgreSQL socket limits (`max_connections`) under burst traffic, while transactional connection proxies (PgBouncer) reject DDL schema migrations (`ALTER TABLE`).
- **Decision:** Enforce a dual-connection string pattern: Lambda execution runtime connects via **Pooled Connection** (PgBouncer/WebSockets), whereas CI/CD schema migrations (`prisma migrate deploy`) connect via **Direct Database Connection**.
- **Positive Consequences:** Guarantees connection pool safety during traffic spikes while enabling seamless SQL schema migrations during continuous deployment.
- **Trade-offs:** Requires managing two distinct environment connection URIs across AWS Secrets Manager and GitHub Secrets.

### ADR-014: Zero-Trust IAM & Secrets Management with AWS Secrets Manager / SSM

- **Context:** Hardcoding sensitive database passwords, JWT tokens, or external API keys in environment variables or code creates critical security leaks and compliance violations.
- **Decision:** Centralize credentials in AWS Secrets Manager / SSM Parameter Store, retrieved at startup/runtime under IAM Least Privilege policies managed by AWS CDK.
- **Positive Consequences:** Complete decoupling of configuration secrets from application artifacts. Facilitates secret rotation without requiring code rebuilds or deployments.
- **Trade-offs:** Introduces a minor initialization latency step on cold starts when fetching remote secret values.

### ADR-015: Infrastructure as Code (IaC) via AWS CDK TypeScript

- **Context:** Manual infrastructure setup ("ClickOps") via AWS Web Console creates configuration drift, untracked security breaches, and non-reproducible environment deployments.
- **Decision:** Define all cloud resources (Lambda Functions, API Gateway, CloudWatch Log Groups, ECR Repositories, IAM Roles) strictly using AWS CDK in TypeScript.
- **Positive Consequences:** 100% of infrastructure is version-controlled, testable, and reproducible via automated pipelines. Enforces IAM Least Privilege natively.
- **Trade-offs:** Requires CDK synth and CloudFormation stack compilation steps in CI/CD.

### ADR-016: Keyless AWS Authentication via OpenID Connect (OIDC)

- **Context:** Storing static, long-lived AWS IAM user access keys in GitHub Secrets poses a severe security risk if secrets are compromised or leaked.
- **Decision:** Authenticate GitHub Actions workflows with AWS using OpenID Connect (OIDC) identity federation.
- **Positive Consequences:** Zero static AWS credentials stored in third-party repositories. Access tokens are dynamically scoped, short-lived, and auto-expire after pipeline completion.
- **Trade-offs:** Initial setup complexity in establishing AWS IAM OIDC Provider trust relationships.

```

```
