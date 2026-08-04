# 🏢 Synergy Enterprise Backend — Project & Task Management API (General Overview)

[![Node.js](https://img.shields.io/badge/Node.js-v24.16.0+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v6.0.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-v5.2.1-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-v7.7.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![pnpm](https://img.shields.io/badge/pnpm-v10.21.0-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Vitest](https://img.shields.io/badge/Vitest-v4.1.5-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)


A production-grade RESTful API built with **TypeScript**, **Node.js**, and **Express**, adhering to **Clean Architecture** and **Domain-Driven Design (DDD)** principles. Engineered with strict type safety, manual Dependency Injection (IoC), transactional Unit of Work pattern, and comprehensive integration testing.


## 📐 Architecture Overview

The system strictly adheres to the **Clean Architecture** concentric layer boundaries. Dependencies point strictly **inward**: Infrastructure depends on Application, and Application depends on Domain.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE LAYER                              │
│  [Express Routers]   [Prisma ORM]   [Mailpit / Resend]   [DI Containers]    │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         APPLICATION LAYER                           │   │
│   │                   [Use Cases]     [Application DTOs]                │   │
│   │                                                                     │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                        CORE LAYER                           │   │   │
│   │   │                                                             │   │   │
│   │   │   • Domain Entities           • Value Objects               │   │   │
│   │   │   • Repository Contracts      • Domain Services             │   │   │
│   │   │      (Ports/Interfaces)       • Domain Errors               │   │   │
│   │   │                                                             │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                            ▲                      ▲
                            └─────── INSIDE ───────┘
                             (Dependency Direction)
```

## Key Design Patterns & Engineering Highlights

* **Domain-Driven Design (DDD):** Encapsulated rich domain models with immutable **Value Objects**, domain invariants, and semantic **Domain Errors**.
* **Manual Dependency Injection (Composition Root):** Custom IoC container using TypeScript's `as const` and module-based composition (`di.config.ts`), avoiding heavyweight framework magic or runtime reflection overhead.
* **Unit of Work & Transactions:** Implicit ACID transaction handling backed by `AsyncLocalStorage` (`tx-storage`) for seamless Prisma database operations across domain boundaries.
* **Data Mapper Pattern:** Strict bidirectional isolation (`Domain ↔ Persistence DB ↔ API DTOs`) preventing database leaking into business rules.
* **Perimeter Security & Validation:** Request payloads sanitized and validated via **Zod** schemas at entry point middlewares before hitting controllers.
* **Centralized Error Flow:** Custom `BaseDomainError` pipeline connected to a unified `GlobalErrorMiddleware` for predictable HTTP status mapping and JSON output.
* **Dual Database Adapter Strategy:** Configured Prisma v7 to dynamically use `@prisma/adapter-neon` (WebSockets) for Development & Production environments, and native TCP (`PrismaPg`) for isolated integration tests running against ephemeral Docker containers via Testcontainers.

---

## 🛠️ Tech Stack & Tooling

* **Environment & Language:** Node.js (ESM), TypeScript 6, Pnpm Workspaces
* **HTTP Framework:** Express.js v5, Cors, Cookie Parser, Helmet
* **DB & Persistence:** Prisma ORM v7, PostgreSQL (pg), Neon Serverless (@prisma/adapter-neon)
* **Security & Auth:** JSON Web Tokens (JWT), Bcrypt, Express XSS Sanitizer
* **Data Validation:** Zod (shared from @project/common), Express custom type definitions (`.d.ts`)
* **Mailing & Comms:** Resend (Prod), Nodemailer + Mailpit API (Dev/Testing), WebSockets (ws)
* **Testing:** Vitest (Integration & Domain Unit Tests), Vitest Mock Extended, Testcontainers
* **API Testing:** Postman Collection included (`/postman_collection.json`)

---

## 📁 Repository Structure overview

```text
src/
├── core/                        # Core Business Rules (Pure & Zero External Dependencies)
│   ├── entities/                # Domain Entities & Aggregates (User, Project, Task, Invitation)
│   ├── value-objects/           # Encapsulated Domain Values (Email, Password, Role)
│   ├── errors/                  # Domain-specific Error classes
│   ├── repositories/            # Repository Contracts & Interfaces (Output Ports)
│   └── ... 
│
├── application/                 # Application Business Rules (Use Cases & Orchestration)
│   ├── use-cases/               # Isolated Atomic Use Cases / Command Handlers
│   ├── dtos/                    # Output Data Transfer Objects
│
├── infrastructure/              # Frameworks, Adapters & External Tools
│   ├── lib/                     # Prisma ORM client setup
│   ├── http/                    # Express Routers, Controllers, Middlewares
│   ├── services/                # JWT Token Adapters, Bcrypt Password Hashing
│   ├── container/               # Composition Root & IoC / Dependency Injection Containers
│   └── ... 
```

Each domain feature (e.g., user, project, task) follows this modular layered architecture internally to ensure encapsulation and scalability.

## 🗄️ Database Connection Strategy

The persistence layer dynamically adapts its connection adapter based on the active runtime environment:

* **Development & Production (`Neon Serverless`):** Uses WebSocket pooling via `@prisma/adapter-neon` for serverless scalability and efficient connection pooling.
  ```env
  DATABASE_URL="postgres://user:password@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
  ```  
* **Integration Testing (Testcontainers + PrismaPg):** Automatically switches to native TCP via PrismaPg adapter (@prisma/adapter-pg) to communicate directly with isolated, ephemeral PostgreSQL Docker containers created per test suite. 


## 🚀 Getting Started

### 📋 Prerequisites

Ensure you have the following system dependencies installed before setting up the project:

* **Node.js:** `>= 22.x` (Recommended `v24.x`)
* **pnpm:** `>= 10.x`
* **Docker Engine / Docker Desktop:** Required to spin up isolated PostgreSQL containers during **integration testing** via Testcontainers.
* **Git:** For version control.

> 💡 **Windows Users:** If you don't use Docker Desktop, running the project inside **WSL2 (Ubuntu)** with Docker Engine installed directly in the Linux distribution works out of the box with Testcontainers.

### Installation & Setup

1) Clone the repository:
```bash
git clone https\://github.com/josuezmbrano/Synergy-enterprise-backend.git
cd Synergy-enterprise-backend
```

2) Install dependencies:
```bash
pnpm install
```

3) Configure Environment Variables:
Create and update a `.env` file in both the root directory and inside `packages/server` following `.env.example` variables 

4) Run Database Migrations:
```bash
pnpm prisma migrate dev
```

5) Start the Development Server:
```bash
pnpm --filter @project/server dev
```

### 🧪 Running Tests

Vitest is configured out-of-the-box for both isolated unit tests and real integration tests.

| Command | Description |
| :--- | :--- |
| `pnpm --filter @project/server test` | Runs the entire Vitest unit test suite |
| `pnpm --filter @project/server test:unit` | Runs unit tests (Domain & Application logic in isolation) |
| `pnpm --filter @project/server test:integration` | Runs integration tests via Testcontainers


## 📑 Postman Collection

An exported Postman Collection is provided in the root directory to test and explore all endpoints immediately:
* 📄 File: ./postman/Enterprise Project System.postman_collection.json
* Base URL Variable: `{{base_url}}` (defaults to http\://localhost:3000)

