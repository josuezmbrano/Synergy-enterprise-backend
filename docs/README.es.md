### 🇪🇸 Versión en Español (`README.es.md`)

# 🏢 Synergy Enterprise Backend — Project & Task Management API
> 🇬🇧 **English:** [Read the English version here](../README.md)

[![Node.js](https://img.shields.io/badge/Node.js-v24.16.0+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v6.0.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-v5.2.1-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-v7.7.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![pnpm](https://img.shields.io/badge/pnpm-v10.21.0-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Vitest](https://img.shields.io/badge/Vitest-v4.1.5-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

Una API RESTful de grado de producción construida con **TypeScript**, **Node.js** y **Express**, adhiriéndose estrictamente a los principios de **Clean Architecture** y **Domain-Driven Design (DDD)**. Diseñada con type-safety extremo, Inyección de Dependencias manual (Composition Root), patrón transaccional Unit of Work y pruebas de integración exhaustivas.

> 📖 **Documentación Profunda:** Para un análisis detallado de las decisiones arquitectónicas, prevención de tipado estructural y ADRs (Architectural Decision Records), por favor revisa el archivo [ARCHITECTURE.md](./ARCHITECTURE.es.md).

## 📐 Visión General de la Arquitectura

El sistema respeta estrictamente los límites concéntricos de **Clean Architecture**. Las dependencias apuntan exclusivamente **hacia el interior**: La Infraestructura depende de la Aplicación, y la Aplicación depende del Dominio.

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
                            └─────── HACIA ADENTRO ┘
                            (Dirección de Dependencias)
```

## 🚀 Patrones de Diseño Clave y Puntos Fuertes

* **Domain-Driven Design e Inmutabilidad Profunda:** Modelos de dominio ricos y encapsulados usando clases `BaseValueObject` fortificadas con inmutabilidad recursiva (`deepFreeze`) y literales discriminantes (`voType`, `identifierType`) para evitar colisiones por el *Structural Typing* de TypeScript.
* **Inyección de Dependencias Manual (Composition Root):** Contenedor IoC estático personalizado (`di.config.ts`), evitando la magia de frameworks pesados, decoradores o sobrecarga por reflexión (optimizando tiempos de *cold start* en Serverless).
* **Unit of Work & Transacciones:** Manejo implícito de transacciones ACID respaldado por `AsyncLocalStorage` (`tx-storage`) de Node.js, logrando operaciones de base de datos seguras sin filtrar Prisma en el Dominio.
* **Validación de Frontera en Monorepo (Fail-Fast):** Las cargas útiles (payloads) son sanitizadas y validadas a través de **Zod** compartiendo esquemas desde el workspace `@project/common`, aplicando seguridad perimetral antes de llegar a los controladores.
* **Prisma Driver Adapters (v7):** Configurado para usar dinámicamente `@prisma/adapter-neon` (WebSockets) en entornos de producción/desarrollo, y TCP nativo (`@prisma/adapter-pg`) para pruebas de integración con Testcontainers.
* **Flujo Centralizado de Errores:** Pipeline personalizado `BaseDomainError` conectado a un `GlobalErrorMiddleware` unificado para un mapeo predecible de códigos HTTP y salida JSON estructurada.

---

## 🛠️ Stack Técnico y Herramientas

* **Entorno y Lenguaje:** Node.js (v24.x+), TypeScript 6.0 (Strict), Pnpm Workspaces.
* **Framework HTTP:** Express.js v5, Cors, Cookie Parser, Helmet.
* **DB & Persistencia:** Prisma ORM v7, PostgreSQL, Neon Serverless Driver.
* **Seguridad & Autenticación:** JSON Web Tokens (JWT), Bcrypt, Express XSS Sanitizer.
* **Mailing & Comms:** Resend (Prod), Nodemailer + Mailpit API (Dev/Testing).
* **Testing:** Vitest, Testcontainers (PostgreSQL & Mailpit), `vitest-mock-extended`.

---

## 📁 Estructura del Repositorio

```text
src/
├── core/                        # Reglas Core de Negocio (Puras, sin deps externas)
│   ├── entities/                # Agregados y Entidades (User, Project, Task...)
│   ├── value-objects/           # Objetos de Valor encapsulados (deepFrozen)
│   ├── errors/                  # Excepciones de Dominio y Factorías
│   ├── repositories/            # Contratos de Repositorios (Puertos de Salida)
│   └── ... 
│
├── application/                 # Reglas de Aplicación (Casos de Uso y Orquestación)
│   ├── use-cases/               # Casos de uso aislados (Command Handlers)
│   ├── dtos/                    # Objetos de Transferencia de Datos (Salida)
│
├── infrastructure/              # Adapters, Frameworks y Herramientas Externas
│   ├── lib/                     # Configuración cliente ORM (Prisma Adapters)
│   ├── http/                    # Express Routers, Controladores, Middlewares
│   ├── services/                # JWT Token Adapters, Hasher (Bcrypt)
│   ├── container/               # Composition Root & Contenedores DI
│   └── ... 
```

## 🗄️ Estrategia de Conexión a Base de Datos

La capa de persistencia adapta dinámicamente su adaptador de conexión según el entorno activo mediante **Prisma Driver Adapters**:

* **Producción y Desarrollo (`Neon Serverless`):** Emplea pooling vía WebSockets a través de `@prisma/adapter-neon` para máxima escalabilidad en arquitecturas serverless.
  ```env
  DATABASE_URL="postgres://user:password@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
  ```  
* **Pruebas de Integración (`Testcontainers + PrismaPg`):** Cambia automáticamente a TCP nativo mediante `@prisma/adapter-pg` para comunicarse directamente con contenedores Docker efímeros creados para cada suite de tests.

## ⚙️ Primeros Pasos

### 📋 Requisitos Previos

Asegúrate de contar con las siguientes dependencias del sistema:

* **Node.js:** `>= 22.x` (Se recomienda `v24.x`)
* **pnpm:** `>= 10.x`
* **Docker Engine / Docker Desktop:** Requerido para levantar los contenedores aislados de PostgreSQL y Mailpit durante las **pruebas de integración**.
* **Git:** Para control de versiones.

> 💡 **Usuarios de Windows:** Si no usas Docker Desktop, correr el proyecto dentro de **WSL2 (Ubuntu)** con Docker Engine instalado de forma nativa en Linux funcionará perfectamente con Testcontainers.

### Instalación y Configuración

1) Clona el repositorio:
```bash
git clone https://github.com/josuezmbrano/Synergy-enterprise-backend.git
cd Synergy-enterprise-backend
```

2) Instala las dependencias (Monorepo):
```bash
pnpm install
```

3) Configura las variables de entorno:
Crea y actualiza los archivos `.env` tanto en la raíz como dentro de `packages/server` guiándote por el archivo `.env.example`.

4) Ejecuta las migraciones de Base de Datos:
```bash
pnpm prisma migrate dev
```

5) Inicia el servidor en modo desarrollo:
```bash
pnpm --filter @project/server dev
```

### 🧪 Ejecución de Pruebas

Vitest está configurado *out-of-the-box* tanto para pruebas unitarias aisladas como para pruebas de integración reales.

| Comando | Descripción |
| :--- | :--- |
| `pnpm --filter @project/server test` | Corre toda la suite de pruebas de Vitest |
| `pnpm --filter @project/server test:unit` | Corre pruebas unitarias (lógica del dominio aislada mediante Mocks) |
| `pnpm --filter @project/server test:integration` | Corre pruebas de integración completas mediante contenedores efímeros |

## 📑 Colección de Postman

Se incluye una Colección de Postman exportada en el directorio raíz para explorar todos los endpoints de inmediato:
* 📄 Archivo: `./postman/Enterprise Project System.postman_collection.json`
* Variable Base URL: `{{base_url}}` (por defecto `http://localhost:3000`)
