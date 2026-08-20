import prisma from 'infrastructure/lib/prisma.js';
import { PrismaUserRepository } from 'infrastructure/repositories/user.prisma.js';
import { PrismaProjectRepository } from 'infrastructure/repositories/project.prisma.js';
import { PrismaMemberRepository } from 'infrastructure/repositories/member.prisma.js';
import { PrismaTaskRepository } from 'infrastructure/repositories/task.prisma.js';
import { PrismaVerificationTokenRepository } from 'infrastructure/repositories/token.prisma.js';
import { PrismaUnitOfWork } from 'infrastructure/persistence/prisma/prisma-unit-of-work.js';
import { BcryptPasswordHasher } from 'infrastructure/security/bcrypt/bcrypt-password-hasher.service.js';
import { saltRounds } from 'infrastructure/config/modules/salt-rounds.config.js';
import { JwtAuth } from 'infrastructure/security/jwt/jwt-auth.service.js';
import { jwtInternalConfig } from 'infrastructure/config/modules/jwt-config.js';
import { ResendMailService } from 'infrastructure/mailing/resend/resend-mail.service.js';
import { resendConfig } from 'infrastructure/config/modules/resend-config.js';
import { NodemailService } from 'infrastructure/mailing/nodemailer/nodemailer-testing.service.js';
import { nodemailerConfig } from 'infrastructure/config/modules/nodemailer-testing.config.js';
import { CheckAuthMiddleware } from 'infrastructure/http/middlewares/check-auth.middleware.js';
import { PrismaInvitationRepository } from 'infrastructure/repositories/invitation.prisma.js';
import { env } from 'infrastructure/config/env.config.js';
import { DatabasePinger } from 'infrastructure/lib/database-pinger.js';
import { PinoLoggerAdapter } from 'infrastructure/logging/pino-logger.adapter.js';
import pino from 'pino';
import { pinoOptions } from 'infrastructure/config/modules/logger.config.js';


// HEALTH MONITORING INSTANCE
const databasePinger = new DatabasePinger(prisma)


// LOGGER MONITOR INSTANCE
const pinoLogger = new PinoLoggerAdapter(pino(pinoOptions))


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
const bcryptPasswordHasher = new BcryptPasswordHasher(saltRounds)
const jwtAuthService = new JwtAuth(jwtInternalConfig)
const mailService = env.NODE_ENV === 'test' ? new NodemailService(nodemailerConfig) : new ResendMailService(resendConfig)


// INFRASTRUCTURE MIDDLEWARE INSTANCES
const checkAuth = new CheckAuthMiddleware(jwtAuthService)


export const containerDI = {
    // BASE TOOL INSTANCES (FOR TESTING OR MIDDLEWARES)
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
    }

} as const