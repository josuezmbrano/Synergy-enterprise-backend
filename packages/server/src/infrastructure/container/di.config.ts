import prisma from 'infrastructure/lib/prisma.js';
import { PrismaUserRepository } from 'infrastructure/repositories/user.prisma.js';
import { PrismaProjectRepository } from 'infrastructure/repositories/project.prisma.js';
import { PrismaMemberRepository } from 'infrastructure/repositories/member.prisma.js';
import { PrismaTaskRepository } from 'infrastructure/repositories/task.prisma.js';
import { PrismaVerificationTokenRepository } from 'infrastructure/repositories/token.prisma.js';
import { PrismaUnitOfWork } from 'infrastructure/persistence/prisma/prisma-unit-of-work.js';
import { BcryptPasswordHasher } from 'infrastructure/services/bcrypt/bcrypt-password-hasher.service.js';
import { saltRounds } from 'infrastructure/services/bcrypt/salt-rounds.config.js';
import { JwtAuth } from 'infrastructure/services/jwt/jwt-auth.service.js';
import { jwtInternalConfig } from 'infrastructure/services/jwt/jwt-config.js';
import { ResendMailService } from 'infrastructure/services/resend/resend-mail.service.js';
import { resendConfig } from 'infrastructure/services/resend/resend-config.js';
import { NodemailService } from 'infrastructure/services/nodemailer/nodemailer-testing.service.js';
import { nodemailerConfig } from 'infrastructure/services/nodemailer/nodemailer-testing.config.js';
import { CheckAuthMiddleware } from 'infrastructure/http/middlewares/check-auth.middleware.js';
import { PrismaInvitationRepository } from 'infrastructure/repositories/invitation.prisma.js';
import { env } from 'infrastructure/config/env.config.js';


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