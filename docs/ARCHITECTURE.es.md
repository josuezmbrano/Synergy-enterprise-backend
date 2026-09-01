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
- **Aislamiento del Ciclo de Vida de la App:** Eliminación completa de singletons globales mutables en runtime. La creación del servidor, la vinculación de la aplicación Express y la inyección de dependencias están aisladas mediante funciones factoría (createContainer(), createApp(), createServer()), eliminando la fuga de estado entre suites de prueba y builds multietapa.

### Stack Técnico Consolidado

- **Runtime & Lenguaje:** Node.js (v24.x+), TypeScript 6.0 (Strict Mode).
- **Presentación:** Express.js v5.
- **Serverless & Adaptador:** AWS Lambda Web Adapter (LWA), AWS API Gateway (HTTP/REST API).
- **Infraestructura como Código (IaC):** AWS CDK (Stack en TypeScript) implementando el principio de Menor Privilegio IAM.
- **Validación de Datos (Frontera):** Zod (Esquemas unificados y compartidos vía el workspace `@project/common`).
- **Persistencia & ORM:** Prisma ORM v7. Integra la arquitectura de **Driver Adapters**: `@prisma/adapter-neon` vía WebSockets / PgBouncer para ejecución Cloud/Serverless, `@prisma/adapter-pg` sobre TCP nativo para Testcontainers, y Cadenas de Conexión Directa a Base de Datos para migraciones DDL.
- **Secretos & Configuración:** AWS Secrets Manager / SSM Parameter Store (Desacoplamiento en runtime), GitHub Secrets.
- **Seguridad & Autenticación CI/CD:** Despliegue federado basado en roles mediante OpenID Connect (OIDC) sin claves estáticas de AWS de larga duración.
- **Caché & Optimización:** Redis (infraestructura preparada para rate-limiting y data caching).
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
│    PrismaTaskRepository, ResendMailService, Factory DI │
└────────────────────────────────────────────────────────┘
                            │
                            ▼
                        Database
```

### Desglose Técnico por Capas

- **Presentation:**
  - **Controllers & Routers:** Centralizan el enrutamiento HTTP (ej. `auth.routes.ts`, `task.routes.ts`). Los controladores (`CreateTaskController`, `LoginUserController`) reciben las peticiones, desempaquetan los payloads y despachan los Casos de Uso.
  - **Middlewares:** Operaciones transversales como autenticación (`CheckAuthMiddleware` con validación JWT) y validación estructural entrada/salida (`validateRequest` utilizando esquemas `ZodType`). El manejo unificado de errores se delega a `GlobalErrorMiddleware`.
  - **Factorías:** createApp(container) vincula middlewares y rutas dinámicas utilizando el contenedor de dependencias aislado generado por createContainer().

- **Application:**
  - **Casos de Uso:** Cumplen el contrato genérico `BaseUseCase<Input, Output>`. Actúan como orquestadores coreografiando repositorios y servicios de dominio. Ejemplos: `AcceptInvitationCase`, `CompleteProjectCase`.
  - **Puertos de Integración Externa:** Contratos abstractos como `IPasswordHasher`, `IAuthService`, `IMailService`, y repositorios `I[Entity]Repository`.
  - **Inyección de Dependencias (DI):** Orquestada de forma estáticamente segura mediante factorías (createContainer() en di.config.ts), eliminando singletons globales mutables y decoradores mágicos, lo que optimiza los tiempos de cold-start y mejora el aislamiento en las pruebas.

- **Domain (Core):**
  - Libre de frameworks externos (`0 dependencies`). Todo en esta capa son clases de Typescript nativas. Define la Lógica de Negocio y reglas de comportamiento mediante Agregados (`ProjectEntityClass`, `UserEntityClass`), Value Objects (`ProjectTitleVo`, `UserEmailVo`) y Excepciones de Dominio (ej. `ProjectErrorFactory`).

- **Infrastructure:**
  - **Repositorios de Datos:** Clases como `PrismaUserRepository` y `PrismaTaskRepository` que implementan las interfaces de dominio (`IUserRepository`) utilizando la capa ORM. Aplican el Data Mapper Pattern para aislar el dominio de la persistencia.
  - **Adaptadores:** `ResendMailService`, `NodemailService`, `BcryptPasswordHasher`, `JwtAuth`.
  - **Gestión de Entorno:** El cargador centralizado del entorno (load-env.ts) garantiza la carga determinista de variables de entorno antes de ejecutar la configuración en entornos locales o CI.

---

## 3. DOMAIN-DRIVEN DESIGN (DDD) STRATEGY & CORE PATTERNS

### BaseValueObject, Identificadores & Prevención de Structural Typing

Para erradicar el _Primitive Obsession_ y prevenir colisiones debido al _Structural Typing_ de TypeScript (donde dos clases con la misma estructura son evaluadas como equivalentes aunque representen conceptos distintos), se utilizan literales de tipo discriminantes (`voType` e `identifierType`).

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
export abstract class UniqueIdentifier<
  ID extends string,
> extends BaseIdentifier<string, ID> {
  protected abstract readonly identifierType: ID; // Discriminador (ej: 'ProjectIdVo')

  protected constructor(uuid: string) {
    UniqueIdentifier.validate(uuid); // Valida formato UUIDv4
    super(uuid);
  }
}
```

- **`deepFreeze` Recursivo:** Implementación propia (`src/core/utils/deepFreeze.ts`) que emplea un `WeakSet` para detectar e ignorar referencias circulares, garantizando la prevención de fugas de memoria. Excluye explícitamente instancias nativas como `Date` o `RegExp`.
- **`DeepReadonly<T>`:** Tipo condicional nativo de TS para iterar recursivamente el objeto, asegurando inmutabilidad estricta en tiempo de compilación.

### Entities & Aggregates

Las entidades derivan de `BaseEntity<I, T>`, encapsulando un estado con las propiedades protegidas `_props`, `_id`, `createdAt`, y `updatedAt`.

- **Constructores Privados (Factory Pattern):** Entidades como `UserEntityClass` o `TaskEntityClass` no pueden instanciarse con `new`.
- **`.create()` vs `.reconstitute()`:**
  - `.create()` se utiliza para modelar _nuevas_ interacciones de negocio. Genera UUIDs, asigna timestamps por defecto (`DateVo.create()`) y evalúa invariantes iniciales.
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
- Estado de ejecución aislado: Las factorías (createContainer()) instancian dependencias dedicadas para las instancias de prueba, eliminando la contaminación de estado o la interferencia entre tests.

---

## 5. INFRASTRUCTURE AND RESILIENCE

### 🔄 Graceful Shutdown & Process Lifecycle (Fase 1.3)

El servidor implementa un mecanismo de apague elegante (_Graceful Shutdown_) agnóstico al orquestador de infraestructura (Docker, Kubernetes, Render).

#### Flujo de Apagado Controlado

Ante señales del sistema operativo (`SIGINT` de consola o `SIGTERM` del orquestador de contenedores):

1. **Intercepción de Señal:** `registerGracefulShutdown` detiene nuevas ejecuciones duplicadas de la señal.
2. **Cierre de Tráfico HTTP:** `server.close()` deja de aceptar tráfico entrante de inmediato y procesa solo las peticiones en vuelo (_in-flight requests_).
3. **Inversión de Control (Cleanup Callback):** Se ejecuta el callback asíncrono de limpieza (`onShutdown`) para cerrar ordenadamente las conexiones de base de datos (`PrismaClient.$disconnect()`).
4. **Timeout de Seguridad (Force Exit):** Se activa un temporizador _unref_ de 10 segundos para forzar la salida (`process.exit(1)`) si una petición o transacción queda colgada indefinidamente.
5. **Salida Limpia:** Finaliza el proceso Node.js con código de éxito `0`.

> **Nota de Infraestructura:** El servidor Node.js se mantiene en HTTP plano para operar detrás de un Reverse Proxy o Load Balancer con _TLS Termination_ (e.g., Nginx, Cloudflare, AWS ALB).

### Observabilidad y Trazabilidad de Peticiones

El sistema implementa un esquema de observabilidad agnóstico y desacoplado del framework de logging subyacente mediante el patrón Adapter.

#### Componentes Clave:

- **`LoggerPort` (Application Layer):** Contrato que define los métodos estándar de registro (`info`, `warn`, `error`, `debug`, `child`). La capa de aplicación y los casos de uso dependen exclusivamente de esta abstracción.
- **`PinoLoggerAdapter` (Infrastructure Layer):** Implementación concreta que adapta la librería `Pino` al contrato `LoggerPort`. Maneja la serialización de instancias de `Error` bajo la clave `err` y formatea la salida estructurada en JSON.
- **`requestContext` (AsyncLocalStorage):** Almacenamiento en contexto de ejecución asíncrona de Node.js. Permite propagar metadatos implícitos —como el `requestId` generado en la capa HTTP— a lo largo de todas las capas de la aplicación sin contaminación de firmas de métodos.

#### Comportamiento del logger

- **Desarrollo:** Los logs se formatean con pino-pretty para facilitar la lectura en consola (timestamps locales, colores y bloques de contexto).
- **Produccion:** Salida en JSON estructurado de alto rendimiento, optimizada para recolectores como Datadog, Grafana Loki o CloudWatch.
- **Testing:** Desactivado automáticamente (silent) para mantener limpia la salida de Vitest.

---

## 6. PIPELINE DE CI/CD, CONTENEDORIZACIÓN Y DEVSECOPS

### Resumen General

Synergy aplica un pipeline automatizado de Garantía de Calidad (QA) y Seguridad multietapa a través de **GitHub Actions**. Cada Pull Request y push a la rama `main` se somete a una validación automatizada, evitando que lleguen a producción regresiones, fugas de memoria, vulnerabilidades en la cadena de suministro o builds de contenedores mal configurados.

### Flujo de Trabajo de Integración Continua (CI)

El pipeline se estructura en 4 jobs aislados, secuenciales y paralelizados (`validate` ➔ `testing` ➔ `snyk` ➔ `docker`):

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

#### Etapas Detalladas del Pipeline

- **Etapa de Validación (`validate`):**
  - **Calidad de Código y Tipado:** Ejecuta ESLint y la comprobación estricta de tipos con TypeScript en todos los workspaces del monorepo (`@project/common`, `@project/server`).
  - **Generación del Cliente ORM:** Sintetiza el cliente de Prisma (`pnpm run server:prisma-generate`) utilizando los adaptadores de controladores (_driver adapters_).

- **Etapa de Pruebas Automatizadas (`testing`):**
  - **Suite Unitaria:** Ejecuta las especificaciones unitarias del dominio y de los casos de uso en milisegundos mediante Vitest y `vitest-mock-extended`.
  - **Suite de Integración:** Despliega contenedores reales de PostgreSQL a través de Testcontainers (`@testcontainers/postgresql`) para validar migraciones de base de datos, consultas SQL puras, restricciones (_constraints_) y transacciones ACID gestionadas por el `PrismaUnitOfWork`.

- **Etapa de Análisis de Dependencias y Seguridad Estática (`snyk`):**
  - **Análisis de Composición de Software (SCA):** Escanea el árbol de dependencias (`pnpm-lock.yaml`) en busca de vulnerabilidades conocidas (CVEs).
  - **Pruebas de Seguridad de Aplicaciones Estáticas (SAST):** Escanea el código fuente mediante Snyk Code en busca de antipatrones de seguridad y filtrado de credenciales o secretos.
  - **Sincronización con el Dashboard de Snyk:** Utiliza el indicador `--strict-out-of-sync=false` para reportar continuamente el estado de seguridad al dashboard de la organización `josuezmbrano` en Snyk y subir reportes SARIF a GitHub Code Scanning.

- **Etapa de Construcción y Endurecimiento de Contenedores (`docker`):**
  - **Dockerfile de Producción Multietapa:** Construye una imagen de producción optimizada utilizando `node:24-alpine` como entorno de ejecución (_runner_) base.
  - **Endurecimiento del SO del Contenedor:** Ejecuta `apk upgrade --no-cache` para parchear librerías a nivel de sistema operativo (por ejemplo, corrección del DoS por QUIC en OpenSSL/`libssl3` `CVE-2026-14456`).
  - **Eliminación de la Superficie de Ataque:** Remueve explícitamente `npm`, `npx` y binarios globales no utilizados de la imagen final del runner, neutralizando vulnerabilidades transitivas (`undici`, `node-tar`, `ip-address`).
  - **Escaner de Imágenes Trivy:** Escanea la imagen final del contenedor en busca de vulnerabilidades `CRITICAL` y `HIGH` en el SO o en librerías, haciendo fallar el build (`exit-code 1`) si se detecta alguna amenaza sin parchear.

### Despliegue Serverless en AWS y Migraciones de Esquema

El pipeline incorpora despliegue continuo en AWS utilizando federación de identidad sin contraseñas:

- **Autenticación mediante OpenID Connect (OIDC):** Elimina el uso de credenciales estáticas de larga duración (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) en GitHub Secrets. AWS emite tokens temporales de corta duración vinculados exclusivamente al ciclo de vida del runner del pipeline.
- **Migraciones DDL Idempotentes (`prisma migrate deploy`):** Utiliza una **URL de Conexión Directa a la Base de Datos** dedicada (omitiendo las restricciones de pooling de PgBouncer) para aplicar cambios estructurales en SQL antes del despliegue del código. Si las migraciones fallan, el despliegue se aborta inmediatamente para proteger la integridad del entorno productivo.
- **Despliegue del Stack con AWS CDK:** Sintetiza y despliega la infraestructura como código, vinculando la imagen del contenedor Docker construida en ECR a AWS Lambda detrás de API Gateway.

---

## 7. ARCHITECTURAL DECISION RECORDS (ADRs)

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
- **Consecuencias Positivas:** _Single Source of Truth_ (Única Fuente de Verdad). Type-safety end-to-end. Se detienen ataques y malformaciones en la periferia de la API con coste computacional O(1).
- **Trade-offs:** Incrementa ligeramente la complejidad del manejo de dependencias en el Monorepo (pnpm workspaces).

### ADR-007: Adopción de Driver Adapters en Prisma v7 (Cloud Serverless / Local Test)

- **Contexto:** El uso tradicional de Prisma con su Query Engine nativo (Rust) levanta pools de conexiones persistentes que resultan fatales en entornos Serverless/Lambda, agotando los límites de conexión de PostgreSQL.
- **Decisión:** Incorporar los Driver Adapters de Prisma v7. Se utiliza `@prisma/adapter-neon` (vía WebSockets) para el entorno productivo/desarrollo y se inyecta dinámicamente `@prisma/adapter-pg` (TCP local nativo) para las pruebas locales con Testcontainers (`lib/prisma.ts`).
- **Consecuencias Positivas:** Compatibilidad total con Edge Computing (Cold starts ultrarrápidos, bypass de los límites de conexión de PgBouncer) sin sacrificar la capacidad de realizar TDD local con Docker nativo.
- **Trade-offs:** Dualidad de configuración y la necesidad de inyectar dependencias condicionales al inicializar el Singleton del cliente ORM.

### ADR-008: Validación de variables de entorno y estrategia ante fallos (Fail-fast) en el inicio (Hardening para producción).

- **Contexto:** Una aplicación que opera sin una validación estricta de variables de entorno al arrancar corre el riesgo de sufrir fallos silenciosos en _runtime_, configuraciones _fallback_ inseguras o errores de red confusos en capas profundas de la lógica de negocio (por ejemplo, intentar ejecutar consultas con una `DATABASE_URL` no inicializada).
  Además, los _integration tests_ que utilizan contenedores dinámicos (_Testcontainers_) inyectan puertos y cadenas de conexión en tiempo de ejecución, lo que crea potenciales _race conditions_ con la _top-level module evaluation_ de Node.js.
- **Decisión:** Implementar un patrón de **Fail-Fast Environment Validation** utilizando **Zod** (`envSchema`), separando el _runtime_ de configuración de la aplicación del entorno dinámico de infraestructura del proceso.
- **Consecuencias Positivas:** La aplicación falla en el segundo 0 si está mal configurada, evitando estados corruptos en _runtime_. Proporciona mensajes de error de validación claros y descriptivos al arrancar (_boot_), y el código de producción se mantiene 100% _type-safe_ y desacoplado de las dinámicas de orquestación de pruebas.
- **Trade-offs:** Los desarrolladores deben mantener tanto el archivo `.env.example` como el `envSchema` al agregar nuevas integraciones de servicios externos.

### ADR-009: Sondas de Salud de Dos Niveles y Resiliencia en Pruebas de Base de Datos (Liveness vs. Readiness)

- **Contexto:** Acoplar la salud general de la aplicación a la disponibilidad de la base de datos en una sola sonda genera falsos positivos: picos transitorios de latencia en la base de datos hacen que los orquestadores (Render, AWS ECS, Kubernetes) destruyan y reicien prematuramente instancias de la app que están sanas.
  Además, los _integration tests_ que utilizan contenedores dinámicos (_Testcontainers_) inyectan puertos y cadenas de conexión en tiempo de ejecución, lo que crea potenciales _race conditions_ con la _top-level module evaluation_ de Node.js.
- **Decisión:** Implementar una estrategia de salud desacoplada en dos niveles bajo /health. /liveness verifica métricas del proceso (rssMB, heapUsedMB, uptime) sin dependencias externas. /readiness ejecuta un DatabasePinger aislado (SELECT 1) limitado por un timeout estricto de 2000ms mediante Promise.race y limpieza con clearTimeout en finally.
- **Consecuencias Positivas:** Evita bucles de reinicio en cascada de contenedores durante caídas de la base de datos al pausar temporalmente el tráfico en lugar de destruir instancias. Elimina fugas de memoria (timer leaks) bajo monitoreo de alta frecuencia.
- **Trade-offs:** Incrementa ligeramente la complejidad del enrutamiento al requerir controladores dedicados y abstracciones para el pinger.

### ADR 010: Adopción de AsyncLocalStorage y Logger Agnóstico para Observabilidad

- **Contexto:** Para rastrear peticiones concurrentes a través de controladores, casos de uso, repositorios y servicios externos, necesitábamos asociar un identificador único (`requestId`) a cada registro de log. Pasar manualmente el `requestId` como parámetro en cada función del dominio y aplicación generaba acoplamiento innecesario y contaminación de firmas (_signature pollution_).
- **Decisión:** Utilizar `AsyncLocalStorage` de Node.js para mantener el contexto de la petición (`requestId`) de forma asíncrona e implícita. Inyectar `LoggerPort` mediante Inversión de Dependencias en los Casos de Uso que requieran resiliencia (ej. fallos en servicios de notificación que no deben abortar la transacción principal).
- **Consecuencias Positivas:** Peticiones 100% trazables en entornos distribuidos; los Casos de Uso no conocen el framework de logging; refactorización limpia sin alterar firmas de métodos.
- **Trade-offs:** Ligero sobrecosto de memoria por el contexto asíncrono, mitigado por el alto rendimiento nativo del API `async_hooks` en Node.js moderno.

### ADR-011: Migración de Singletons Globales a Funciones Factoría para Inyección de Dependencias

- **Contexto:** Los singletons globales a nivel de módulo para contenedores (containerDI), la aplicación Express (app) y clientes ORM causaban fugas de estado compartido entre ejecuciones de pruebas en Vitest. Además, la importación de singletons a nivel superior provocaba la evaluación prematura de variables de entorno antes de que Testcontainers o load-env.ts pudieran inyectar configuraciones dinámicas en runtime.
- **Decisión:** Convertir todos los singletons globales de la aplicación en Funciones Factoría (createContainer(), createApp(), y createServer()).
- **Consecuencias Positivas:** Aislamiento absoluto de estado entre contextos de ejecución de pruebas de integración. Garantiza la inicialización determinista de variables de entorno (load-env.ts) previa al binding de infraestructura. Previene fallos en las builds multietapa de Docker causados por intentos prematuros de conexión a la BD durante la fase de análisis estático.
- **Trade-offs:** Los puntos de entrada del servidor deben invocar explícitamente los constructores factoría (createServer()) durante el arranque.

### ADR-012: Adopción de AWS Lambda Web Adapter para Entrypoint Serverless

- **Contexto:** Desacoplar la aplicación Express de manejadores propietarios de AWS (`@codegenie/serverless-express`) para evitar el acoplamiento de la lógica de dominio con interfaces específicas del proveedor Cloud.
- **Decisión:** Utilizar AWS Lambda Web Adapter (LWA) dentro de la imagen de contenedor Docker para traducir las peticiones HTTP de API Gateway directamente en llamadas HTTP locales al puerto 3000.
- **Consecuencias Positivas:** Preserva los invariantes de Clean Architecture. La aplicación arranca de forma nativa tanto localmente como dentro de AWS Lambda sin modificaciones en el código. Permite inicialización perezosa (lazy) y ajuste de readiness en Cold Starts vía `AWS_LWA_READINESS_CHECK_TIMEOUT=5000`.
- **Trade-offs:** Añade un ligero sobrecosto en la ejecución del binario base dentro del contenedor runner.

### ADR-013: Estrategia de Conexión Dual para PostgreSQL Serverless (Neon)

- **Contexto:** El escalado horizontal en arquitecturas Serverless agota los límites de conexiones de PostgreSQL (`max_connections`) bajo picos de tráfico, mientras que los proxies transaccionales (PgBouncer) rechazan migraciones de esquema DDL (`ALTER TABLE`).
- **Decisión:** Aplicar un patrón de doble cadena de conexión: el runtime de ejecución de Lambda se conecta vía **Conexión con Pool** (PgBouncer/WebSockets), mientras que las migraciones en CI/CD (`prisma migrate deploy`) se conectan vía **Conexión Directa a Base de Datos**.
- **Consecuencias Positivas:** Garantiza la seguridad del pool de conexiones ante picos de tráfico al tiempo que permite aplicar migraciones de esquema SQL sin interrupciones durante la integración continua.
- **Trade-offs:** Requiere administrar dos URIs de conexión independientes en AWS Secrets Manager y GitHub Secrets.

### ADR-014: Gestión Zero-Trust de IAM y Secretos con AWS Secrets Manager / SSM

- **Contexto:** Definir contraseñas de base de datos, tokens JWT o claves de API externas directamente en código o variables de entorno convencionales crea riesgos severos de seguridad y violaciones de cumplimiento.
- **Decisión:** Centralizar las credenciales en AWS Secrets Manager / SSM Parameter Store, recuperándolas al arranque/runtime bajo políticas de Menor Privilegio de IAM gestionadas mediante AWS CDK.
- **Consecuencias Positivas:** Desacoplamiento total de los secretos de configuración con respecto a los artefactos de código. Facilita la rotación de credenciales sin requerir re-compilaciones o despliegues de la aplicación.
- **Trade-offs:** Introduce una pequeña latencia de inicialización en los arranques en frío (Cold Starts) al consultar los valores remotos de los secretos.

### ADR-015: Infraestructura como Código (IaC) mediante AWS CDK en TypeScript

- **Contexto:** La configuración manual de infraestructura ("ClickOps") a través de la consola web de AWS genera deriva de configuración (_configuration drift_), fallos de seguridad no rastreados y entornos no reproducibles.
- **Decisión:** Definir la totalidad de los recursos cloud (Funciones Lambda, API Gateway, Grupos de Logs en CloudWatch, Repositorios ECR y Roles IAM) estrictamente mediante AWS CDK en TypeScript.
- **Consecuencias Positivas:** El 100% de la infraestructura está versionada, es testeable y reproducible mediante pipelines automatizados. Aplica de forma nativa el principio de Menor Privilegio de IAM.
- **Trade-offs:** Requiere pasos adicionales de síntesis de CDK y compilación de stacks de CloudFormation en el pipeline de CI/CD.

### ADR-016: Autenticación en AWS sin Claves Estáticas vía OpenID Connect (OIDC)

- **Contexto:** Almacenar claves de acceso estáticas de usuarios IAM de AWS en GitHub Secrets supone un riesgo de seguridad elevado en caso de filtración o compromiso de credenciales.
- **Decisión:** Autenticar los flujos de trabajo de GitHub Actions con AWS utilizando federación de identidad basada en OpenID Connect (OIDC).
- **Consecuencias Positivas:** Cero credenciales estáticas de AWS almacenadas en repositorios de terceros. Los tokens de acceso se generan dinámicamente, son de corta duración y expiran automáticamente al finalizar la ejecución del pipeline.
- **Trade-offs:** Complejidad de configuración inicial al establecer las relaciones de confianza del Proveedor OIDC en AWS IAM.
