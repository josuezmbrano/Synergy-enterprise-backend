import { createPrismaClient } from 'infrastructure/lib/prisma.js';
import { PrismaUserRepository } from 'infrastructure/repositories/user.prisma.js';
import { PrismaProjectRepository } from 'infrastructure/repositories/project.prisma.js';
import { PrismaMemberRepository } from 'infrastructure/repositories/member.prisma.js';
import { PrismaTaskRepository } from 'infrastructure/repositories/task.prisma.js';
import { PrismaVerificationTokenRepository } from 'infrastructure/repositories/token.prisma.js';
import { PrismaUnitOfWork } from 'infrastructure/persistence/prisma/prisma-unit-of-work.js';
import { BcryptPasswordHasher } from 'infrastructure/security/bcrypt/bcrypt-password-hasher.service.js';
import { getSaltRounds } from 'infrastructure/config/modules/salt-rounds.config.js';
import { JwtAuth } from 'infrastructure/security/jwt/jwt-auth.service.js';
import { getJwtInternalConfig } from 'infrastructure/config/modules/jwt-config.js';
import { ResendMailService } from 'infrastructure/mailing/resend/resend-mail.service.js';
import { getResendConfig } from 'infrastructure/config/modules/resend-config.js';
import { NodemailService } from 'infrastructure/mailing/nodemailer/nodemailer-testing.service.js';
import { getNodemailerConfig } from 'infrastructure/config/modules/nodemailer-testing.config.js';
import { CheckAuthMiddleware } from 'infrastructure/http/middlewares/check-auth.middleware.js';
import { PrismaInvitationRepository } from 'infrastructure/repositories/invitation.prisma.js';
import { DatabasePinger } from 'infrastructure/lib/database-pinger.js';
import { PinoLoggerAdapter } from 'infrastructure/logging/pino-logger.adapter.js';
import { createPinoOptions } from 'infrastructure/config/modules/logger.config.js';
import { Env } from 'infrastructure/config/env.schema.js';
import pino from 'pino';
import { InMemoryEventBus } from 'infrastructure/events/in-memory-bus.event.js';

export const createContainerBase = (env: Env) => {

    // UNIQUE PRISMA CLIENT INSTANCE
    const prisma = createPrismaClient(env)


    // HEALTH MONITORING INSTANCE
    const databasePinger = new DatabasePinger(prisma)


    // LOGGER MONITOR INSTANCE
    const pinoLogger = new PinoLoggerAdapter(pino(createPinoOptions(env)))


    // INFRASTRUCTURE REPOSITORY INSTANCES
    const userRepository = new PrismaUserRepository(prisma)
    const projectRepository = new PrismaProjectRepository(prisma)
    const memberRepository = new PrismaMemberRepository(prisma)
    const taskRepository = new PrismaTaskRepository(prisma)
    const verificationTokenRepository = new PrismaVerificationTokenRepository(prisma)
    const invitationRepository = new PrismaInvitationRepository(prisma)


    // TRANSACTION COORDINATOR
    const unitOfWork = new PrismaUnitOfWork(prisma)


    // INFRASTRUCTURE SERVICE INSTANCES
    const bcryptPasswordHasher = new BcryptPasswordHasher(getSaltRounds(env))
    const jwtAuthService = new JwtAuth(getJwtInternalConfig(env))
    const mailService = env.NODE_ENV === 'test' ? new NodemailService(getNodemailerConfig(env)) : new ResendMailService(getResendConfig(env))


    // INFRASTRUCTURE MIDDLEWARE INSTANCES
    const checkAuth = new CheckAuthMiddleware(jwtAuthService)

    const eventBus = new InMemoryEventBus(pinoLogger)


    return {

        prisma,

        // BASE TOOL INSTANCES (FOR TESTING OR MIDDLEWARES)
        environment: {
            env
        },

        repositories: {
            userRepository,
            projectRepository,
            memberRepository,
            taskRepository,
            verificationTokenRepository,
            invitationRepository
        },

        healthMonitorResource: {
            databasePinger
        },

        loggerMonitorInstance: {
            pinoLogger
        },

        transactionalCoordinator: {
            unitOfWork
        },

        services: {
            bcryptPasswordHasher,
            jwtAuthService,
            mailService,
        },

        middlewares: {
            checkAuth
        },

        eda: {
            eventBus
        }
    } as const
}

export type ContainerBase = ReturnType<typeof createContainerBase>