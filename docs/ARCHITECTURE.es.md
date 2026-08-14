### 🇪🇸 Versión en Español (`ARCHITECTURE.es.md`)

# 🏢 Synergy Enterprise Backend — Project & Task Management API
> en-US **English:** [Read the English version here](../ARCHITECTURE.us.md)

## 1. EXECUTIVE SUMMARY & ARCHITECTURAL INTENT

### Propósito del Sistema
Synergy es una plataforma de grado empresarial (Enterprise Project System) diseñada para la gestión integral de proyectos, miembros, invitaciones y tareas. Su arquitectura se consolida como un **Monolito Modular Desacoplado**, cuidadosamente estructurado para despliegues Serverless (como AWS Lambda o Edge Containers). Esto se logra mediante una separación estricta de responsabilidades y el aprovechamiento de las capacidades de edge computing modernas, garantizando escalabilidad elástica sin agotar el pool de conexiones relacionales, al tiempo que preserva un aislamiento del dominio que facilita una futura escisión a microservicios si la carga lo demanda.

### Principios Fundamentales
El sistema está construido bajo los más altos estándares de ingeniería de software:
- **Inversión de Dependencias (DIP):** La infraestructura y la aplicación dependen siempre de contratos e interfaces (Puertos) definidos en el núcleo del dominio. Ningún caso de uso conoce la implementación de la base de datos o de frameworks externos.
- **Single Responsibility (SRP):** Cada archivo, middleware, caso de uso (`BaseUseCase`) y entidad (`BaseEntity`) tiene una única razón de cambio. Los repositorios persisten, los casos de uso orquestan y las entidades protegen invariantes.
- **Encapsulamiento Estricto de Invariantes:** Las entidades y Value Objects dictan la verdad del sistema. Estados inválidos son matemáticamente imposibles de instanciar gracias al ocultamiento de constructores (Patrón Factory) y validaciones estrictas tipo Fail-Fast.

### Stack Técnico Consolidado
- **Runtime & Lenguaje:** Node.js (v24.x+), TypeScript 6.0 (Strict Mode).
- **Presentation:** Express.js v5.
- **Validación de Datos (Frontera):** Zod (Esquemas unificados y compartidos vía workspace `@project/common`).
- **Persistencia & ORM:** Prisma ORM v7. Integra la nueva arquitectura de **Driver Adapters**: `@prisma/adapter-neon` vía WebSockets para entornos Cloud/Serverless, y `@prisma/adapter-pg` sobre TCP nativo para Testcontainers.
- **Caché & Optimización:** Redis (infraestructura preparada para rate-limiting y data caching a futuro).
- **Seguridad & Comms:** Bcrypt (`BcryptPasswordHasher`), JWT (`JwtAuth`), Resend (Prod) / Nodemailer + Mailpit API (Tests).
- **Testing Estratégico:** Vitest, Testcontainers (Docker `postgres:17-alpine`, `axllent/mailpit:v1.21`), `vitest-mock-extended`.

---

## 2. SYSTEM ARCHITECTURE & LAYER FLOW

La aplicación respeta el patrón de anillos concéntricos propuesto por Uncle Bob (Clean Architecture). 

### Flujo Unidireccional

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

### Desglose Técnico por Capas

- **Presentation:**
  - **Controllers & Routers:** Centralizan el enrutamiento HTTP (ej. `auth.routes.ts`, `task.routes.ts`). Los controladores (`CreateTaskController`, `LoginUserController`) reciben las peticiones, desempaquetan los payloads y despachan los Casos de Uso.
  - **Middlewares:** Operaciones transversales como autenticación (`CheckAuthMiddleware` con validación JWT) y validación estructural entrada/salida (`validateRequest` utilizando esquemas `ZodType`). El manejo unificado de errores se delega a `GlobalErrorMiddleware`.

- **Application:**
  - **Casos de Uso:** Cumplen el contrato genérico `BaseUseCase<Input, Output>`. Actúan como orquestadores coreografiando repositorios y servicios de dominio. Ejemplos: `AcceptInvitationCase`, `CompleteProjectCase`.
  - **Puertos de Integración Externa:** Contratos abstractos como `IPasswordHasher`, `IAuthService`, `IMailService`, y repositorios `I[Entity]Repository`.
  - **Inyección de Dependencias (DI):** Orquestada de forma manual y estáticamente segura mediante el patrón **Composition Root** (centralizado en `containerDI` dentro de `di.config.ts`), eliminando la necesidad de decoradores mágicos y mejorando los tiempos de cold-start en funciones lambda.

- **Domain (Core):**
  - Libre de frameworks externos (`0 dependencies`). Todo en esta capa son clases de Typescript nativas. Define la Lógica de Negocio y reglas de comportamiento mediante Agregados (`ProjectEntityClass`, `UserEntityClass`), Value Objects (`ProjectTitleVo`, `UserEmailVo`) y Excepciones de Dominio (ej. `ProjectErrorFactory`).

- **Infrastructure:**
  - **Repositorios de Datos:** Clases como `PrismaUserRepository` y `PrismaTaskRepository` que implementan las interfaces de dominio (`IUserRepository`) utilizando la capa ORM. Aplican el Data Mapper Pattern para aislar el dominio de la persistencia.
  - **Adaptadores:** `ResendMailService`, `NodemailService`, `BcryptPasswordHasher`, `JwtAuth`.

---

## 3. DOMAIN-DRIVEN DESIGN (DDD) STRATEGY & CORE PATTERNS

### BaseValueObject, Identificadores & Prevención de Structural Typing
Para erradicar el *Primitive Obsession* y prevenir colisiones debido al *Structural Typing* de TypeScript (donde dos clases con la misma estructura son evaluadas como equivalentes aunque representen conceptos distintos), se utilizan literales de tipo discriminantes (`voType` e `identifierType`).

```typescript
// 1. Base para Value Objects de atributos (ej. Emails, Passwords, Titles)
export abstract class BaseValueObject<T, V extends string> {
    protected abstract readonly voType: V; // Discriminador (ej: 'UserEmailVo')
    protected readonly _props: DeepReadonly<T>;
    
    protected constructor(props: T) {
        this._props = deepFreeze(props); // Inmutabilidad garantizada
    }
    // ... métodos equals() profundos
}

// 2. Base para Identificadores Únicos (UUIDs)
export abstract class UniqueIdentifier<ID extends string> extends BaseIdentifier<string, ID> {
    protected abstract readonly identifierType: ID; // Discriminador (ej: 'ProjectIdVo')
    
    protected constructor(uuid: string) {
        UniqueIdentifier.validate(uuid); // Valida formato UUIDv4
        super(uuid);
    }
}
```
* **`deepFreeze` Recursivo:** Implementación propia (`src/core/utils/deepFreeze.ts`) que emplea un `WeakSet` para detectar e ignorar referencias circulares, garantizando la prevención de fugas de memoria. Excluye explícitamente instancias nativas como `Date` o `RegExp`.
* **`DeepReadonly<T>`:** Tipo condicional nativo de TS para iterar recursivamente el objeto, asegurando inmutabilidad estricta en tiempo de compilación.

### Entities & Aggregates
Las entidades derivan de `BaseEntity<I, T>`, encapsulando un estado con las propiedades protegidas `_props`, `_id`, `createdAt`, y `updatedAt`.
- **Constructores Privados (Factory Pattern):** Entidades como `UserEntityClass` o `TaskEntityClass` no pueden instanciarse con `new`. 
- **`.create()` vs `.reconstitute()`:** 
  - `.create()` se utiliza para modelar *nuevas* interacciones de negocio. Genera UUIDs, asigna timestamps por defecto (`DateVo.create()`) y evalúa invariantes iniciales.
  - `.reconstitute()` es de uso exclusivo para la capa de Infraestructura (**Mappers**). Hidrata entidades recuperadas de la base de datos preservando intactos sus IDs y Timestamps históricos.
- **Mutabilidad Auditada:** Cualquier alteración del estado (ej. `moveToInProgress()`) invoca internamente `this.markAsUpdated()`, registrando criptográficamente la modificación temporal del agregado.

### Pattern de Persistencia Transaccional (UOW + ALS + Repositories)
La propagación de transacciones sin acoplar la capa de Aplicación a Prisma se logró mediante **AsyncLocalStorage (ALS)** de Node.js.
- **`TransactionStorage<T>` (ALS):** Singleton (`txStorage` en `tx-storage.ts`) que mantiene vivo el contexto del cliente transaccional durante la vigencia del hilo asíncrono.
- **`PrismaUnitOfWork`:** Implementa el puerto `IBaseUnitOfWork`. Abre una transacción con `prisma.$transaction` e inyecta el manejador `tx` en el pipeline usando `txStorage.run(tx, work)`.
- **`BasePrismaRepository`:** Todos los repositorios invocan `this.getClient()`, el cual resuelve dinámicamente `txStorage.getStore() ?? this.prisma`. Si un Caso de Uso inicia el Unit of Work, todos los repositorios llamados dentro de ese scope usarán el mismo cliente transaccional automáticamente, logrando completitud ACID sin fugas de abstracción.

### Manejo de Errores de Dominio
- **`BaseDomainError`:** Modela excepciones predecibles (`errorType`, `internalCode`, `isOperational = true`).
- **Factorías de Errores (Ej. `ProjectErrorFactory`):** Catálogo centralizado que construye los errores con nomenclatura y códigos de estado trazables.
- **Optimización de StackTrace:** Usa `Error.captureStackTrace(this, this.constructor)` aislando el origen exacto de la falla sin contaminar el log con la instanciación genérica.
- **Mapeo Semántico a HTTP:** El `GlobalErrorMiddleware` captura estos errores y utiliza un `ErrorMapper` (`mapper.error.ts`) para resolver dinámicamente el Status Code HTTP adecuado (400, 401, 403, 404, 409, 422, 423).

---

## 4. TESTING STRATEGY (917 TESTS REGRESSION SUITE)

La estrategia de Quality Assurance (QA) despliega una suite de 917 pruebas que valida desde la pureza algorítmica hasta la consistencia I/O real en base de datos.

### Filosofía de Testing
Validar que las Invariantes (Business Rules) no emitan falsos positivos, garantizando que el diseño DDD restrinja transiciones de estados imposibles (ej. Completar un proyecto que tiene tareas pendientes) mediante el uso de "Happy Paths" exhaustivos combinados con "Guard & Authorization Constraints" en cada capa.

### Unit Testing (Domain & Application)
- Pruebas ultrarrápidas aisladas usando **Vitest**.
- **Mocks & Stubs:** Uso de `vitest-mock-extended` para falsear interfaces de repositorios (`MockProxy<IUserRepository>`).
- Patrón **Object Mother** (`UserMother`, `ProjectMother`): Centraliza la creación de agregados complejos en estados específicos (ej. `reconstituteArchived()`, `createSuspended()`), eliminando código boilerplate en las aserciones.

### Integration Testing (Infrastructure & Database)
- Pruebas de extremo a extremo en la capa de persistencia validando consultas complejas, Unique Constraints relacionales y cascadas.
- Orquestado completamente mediante **Testcontainers** (ver ADR-005 para más detalles).

---

## 5. ARCHITECTURAL DECISION RECORDS (ADRs)

### ADR-001: Clean Architecture + DDD vs MVC Convencional
- **Contexto:** Synergy requiere acomodar lógicas complejas y entrelazadas (Invitaciones que modifican Miembros, Proyectos que restringen Tareas) en un entorno donde múltiples equipos podrían intervenir. El MVC clásico tiende a generar "Controladores Engordados" o "Modelos Anémicos", acoplando el ORM a las reglas de negocio.
- **Decisión:** Implementar Clean Architecture emparejado con Domain-Driven Design (DDD).
- **Consecuencias Positivas:** Independencia absoluta del dominio. La lógica puede validarse en milisegundos sin levantar la base de datos. El framework HTTP (Express) es tratado como un simple mecanismo de entrega.
- **Trade-offs:** Mayor verbosidad (boilerplate), necesidad de Mappers bidireccionales y una curva de aprendizaje técnica superior para nuevos desarrolladores.

### ADR-002: Transactional Context mediante AsyncLocalStorage (ALS) + Unit of Work
- **Contexto:** Operaciones compuestas (ej. Crear un Proyecto y simultáneamente crear al Miembro Administrador) exigen integridad ACID. Pasar el cliente `tx` de Prisma a los Casos de Uso destruye la DIP (Inversión de Dependencias) acoplando el core al ORM.
- **Decisión:** Envolver el Unit of Work utilizando `AsyncLocalStorage` nativo de Node.js (`tx-storage.ts`).
- **Consecuencias Positivas:** El Caso de Uso orquesta la transacción llamando a `this.unitOfWork.run()`, mientras que los Repositorios detectan estáticamente si están dentro de un contexto transaccional, aislando la complejidad infraestructural.
- **Trade-offs:** Las operaciones asíncronas no await-eadas que pierdan el contexto del Event Loop podrían perder el hilo de la transacción, requiriendo rigor en el manejo del async/await.

### ADR-003: Inmutabilidad Profunda con `deepFreeze` y `DeepReadonly<T>`
- **Contexto:** Los Objetos de Valor (VOs) son la base de las reglas de negocio; no poseen identidad, son definidos por su valor. Si sus propiedades internas son mutadas accidentalmente, el modelo colapsa.
- **Decisión:** Integrar inmutabilidad estricta combinando tipado de TypeScript (`DeepReadonly`) y congelamiento en runtime (`deepFreeze`).
- **Consecuencias Positivas:** Seguridad criptográfica del modelo de dominio. Previene side-effects no deseados.
- **Trade-offs:** Sobrecarga computacional marginal en la creación masiva de VOs, y la necesidad de excluir explícitamente clases nativas iterables como `Date` para evitar colapsos.

### ADR-004: Inyección de Dependencias (DI) vía Composition Root vs Contenedores IoC Mágicos
- **Contexto:** Frameworks populares en el ecosistema TypeScript (Inversify, TSyringe, NestJS) imponen el uso de `reflect-metadata` y decoradores (`@Injectable`), lo cual ensucia el código de dominio y aumenta dramáticamente el tiempo de arranque (Cold Start) en arquitecturas Serverless.
- **Decisión:** Adoptar el patrón **Composition Root**, instanciando manual y estáticamente todas las dependencias en un módulo centralizado (`di.config.ts` y sub-módulos `xxx-modules.di.ts`).
- **Consecuencias Positivas:** Cero penalización de rendimiento en runtime, código core prístino (sin imports de bibliotecas de inyección) y trazabilidad instantánea a través del IDE.
- **Trade-offs:** Requiere instanciación manual explícita (ej. `new CreateTaskCase(repoA, repoB)`), lo que añade pasos manuales al agregar un nuevo caso de uso.

### ADR-005: Estrategia de Integration Testing con Testcontainers vs Mocks de DB
- **Contexto:** Mockear la base de datos (ej. `prisma-mock`) para pruebas de integración genera falsos positivos, ya que no replica restricciones SQL (Constraints, Cascades, Triggers) ni comprueba verdaderos deadlocks transaccionales.
- **Decisión:** Implementar **Testcontainers** (`@testcontainers/postgresql` y `axllent/mailpit`) en el pipeline de Vitest (`database.setup.ts`). 
- **Consecuencias Positivas:** Confianza absoluta en las aserciones. Se validan las transacciones reales, las migraciones de Prisma y la comunicación SMTP en un entorno idéntico al de producción. Cada test opera sobre un esquema aislado (`search_path` dinámico).
- **Trade-offs:** Requiere Docker Engine localmente y los tiempos de ejecución de la suite de pruebas de integración son mayores comparados con mocks en memoria.

### ADR-006: Zod + Workspace `@project/common` para Validación de Frontera (Fail-Fast)
- **Contexto:** Duplicación de lógica de validación estructural entre el cliente (Frontend) y el servidor (Backend), provocando desincronización y vulnerabilidades.
- **Decisión:** Extraer todos los contratos, constantes y esquemas de validación Zod a un monorepo workspace independiente (`packages/common`). El Backend usa el middleware `validateRequest` para aplicar el principio Fail-Fast antes de que el payload malformado llegue al controlador.
- **Consecuencias Positivas:** *Single Source of Truth* (Única Fuente de Verdad). Type-safety end-to-end. Se detienen ataques y malformaciones en la periferia de la API con coste computacional O(1).
- **Trade-offs:** Incrementa ligeramente la complejidad del manejo de dependencias en el Monorepo (pnpm workspaces).

### ADR-007: Adopción de Driver Adapters en Prisma v7 (Cloud Serverless / Local Test)
- **Contexto:** El uso tradicional de Prisma con su Query Engine nativo (Rust) levanta pools de conexiones persistentes que resultan fatales en entornos Serverless/Lambda, agotando los límites de conexión de PostgreSQL. 
- **Decisión:** Incorporar los Driver Adapters de Prisma v7. Se utiliza `@prisma/adapter-neon` (vía WebSockets) para el entorno productivo/desarrollo y se inyecta dinámicamente `@prisma/adapter-pg` (TCP local nativo) para las pruebas locales con Testcontainers (`lib/prisma.ts`).
- **Consecuencias Positivas:** Compatibilidad total con Edge Computing (Cold starts ultrarrápidos, bypass de los límites de conexión de PgBouncer) sin sacrificar la capacidad de realizar TDD local con Docker nativo.
- **Trade-offs:** Dualidad de configuración y la necesidad de inyectar dependencias condicionales al inicializar el Singleton del cliente ORM.