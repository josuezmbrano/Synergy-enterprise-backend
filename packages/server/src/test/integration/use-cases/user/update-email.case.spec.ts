import { UpdateEmailCase } from 'application/use-cases/user/update-email.usecase.js';
import { AuthErrorFactory } from 'core/errors/factories/auth-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { TokenExpirationVo } from 'core/value-objects/token/token-expiration.vo.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { mailpit } from 'test/clients/mailpit.client.js';
import { seedTokenDefault, seedUserDefault, seedUserRandom } from 'test/utils/db-seeder.js';


describe('UpdateEmailCase - Integration Tests', () => {
    let useCase: UpdateEmailCase;
    let containerDI: ApplicationContainer
    let prisma: PrismaClient

    beforeAll(() => {
        const env = getEnv()
        containerDI = createContainer(env)
        prisma = containerDI.prisma
    })

    beforeEach(async () => {
        vi.useRealTimers();

        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = containerDI.modules.user.useCases.updateEmailUseCase
    });

    describe('Actor & Identity Validations', () => {

        it('should throw an error if the actor requesting the email update does not exist', async () => {
            // Setup an unmapped random UUID payload to guarantee a database lookup miss
            const execution = useCase.execute({
                actorId: '3c8d1976-5e58-472e-848e-d91ab2d8c30c',
                currentPassword: 'AnyPassword123!',
                newEmail: 'new-email@synergy.com'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw an invalid credentials error if the current password verification fails', async () => {
            const correctPassword = 'CorrectPassword123!';
            const wrongPassword = 'WrongPassword123!';

            // Seed a legitimate user account with a specifically hashed password profile
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(correctPassword);
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(hashedPassword)
            });
            const primitives = userEntity.toPrimitives();

            const execution = useCase.execute({
                actorId: primitives.publicId,
                currentPassword: wrongPassword,
                newEmail: 'new-email@synergy.com'
            });

            await expect(execution).rejects.toThrow(
                AuthErrorFactory.invalidCredentials({
                    reason: 'INVALID_CURRENT_PASSWORD',
                    constraint: 'password_must_match_current',
                    description: 'The password provided does not match your current password.'
                }).message
            );
        });

    });

    describe('Email Uniqueness Constraints', () => {

        it('should throw an error if the new email is already registered by another user', async () => {
            const passwordPlane = 'SecurePass123!';
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(passwordPlane);

            // Isolate concurrent execution variants using unique identification anchors
            const uniqueId = Math.random().toString(36).substring(2, 11);
            const emailTarget = `already-taken-${uniqueId}@synergy.com`;

            await seedUserDefault(prisma, {
                email: UserEmailVo.create(emailTarget)
            });

            // Seed the operational actor profile attempting the modification workflow
            const actorUser = await seedUserRandom(prisma, {
                password: UserPasswordVo.fromHash(hashedPassword),
                username: UserUsernameVo.create(`anotherusername_${uniqueId}`)
            });
            const actorPrimitives = actorUser.toPrimitives();

            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                currentPassword: passwordPlane,
                newEmail: emailTarget
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.emailAlreadyExists().message);
        });

        it('should handle gracefully or throw an error if the new email is identical to the users current email', async () => {
            const passwordPlane = 'SecurePass123!';
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(passwordPlane);

            // Seed a target user whose baseline operational email matches the requested update field input
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(hashedPassword)
            });
            const primitives = userEntity.toPrimitives();

            const execution = useCase.execute({
                actorId: primitives.publicId,
                currentPassword: passwordPlane,
                newEmail: primitives.email
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.emailAlreadyExists().message);
        });

    });

    describe('Transactional Integrity (Unit of Work)', () => {

        it('should rollback user changes and token persistence if saveToken fails inside the transaction scope', async () => {
            const passwordPlane = 'SecurePass123!';
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(passwordPlane);

            // Seed a valid starting user entry record inside the clean isolated database schema
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(hashedPassword)
            });
            const primitives = userEntity.toPrimitives();

            // Intercept database writes to inject an unexpected technical exception during downstream token allocation
            vi.spyOn(containerDI.repositories.verificationTokenRepository, 'saveToken').mockRejectedValueOnce(
                new Error('Database connection drop during token insert')
            );

            const execution = useCase.execute({
                actorId: primitives.publicId,
                currentPassword: passwordPlane,
                newEmail: 'rollback-test@synergy.com'
            });
            await expect(execution).rejects.toThrow('Database connection drop during token insert');

            const userInDb = await prisma.user.findUnique({ where: { id: primitives.id } });
            expect(userInDb!.email).toBe(primitives.email);

            const tokenCount = await prisma.verificationToken.count();
            expect(tokenCount).toBe(0);

            vi.restoreAllMocks();
        });

        it('should successfully clean existing old verification tokens if they exist, before saving the new one (Sad path rollback inside clean)', async () => {
            const passwordPlane = 'SecurePass123!';
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(passwordPlane);

            // Seed the operational actor profile record
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(hashedPassword)
            });
            const primitives = userEntity.toPrimitives();

            // Pre-populate the token persistence layer with a legacy pending email confirmation record
            const oldToken = await seedTokenDefault(prisma, primitives.publicId, {
                type: TokenTypeVo.createEmailVerification(),
                expiresAt: TokenExpirationVo.fromDatabase(new Date(Date.now() + 10 * 60 * 1000))
            });

            // Force a record locking infrastructure failure during old entry removal inside the Unit of Work scope
            vi.spyOn(containerDI.repositories.verificationTokenRepository, 'deleteToken').mockRejectedValueOnce(
                new Error('Lock error on old token row')
            );

            const execution = useCase.execute({
                actorId: primitives.publicId,
                currentPassword: passwordPlane,
                newEmail: 'clean-rollback-test@synergy.com'
            });

            await expect(execution).rejects.toThrow('Lock error on old token row');

            const oldTokenCount = await prisma.verificationToken.count({ where: { token: oldToken.id.value } });
            expect(oldTokenCount).toBe(1);

            vi.restoreAllMocks();
        });
    });

    describe('Orchestration Workflow & Notification Delivery', () => {

        it('should successfully update the email, clean old tokens, save the new one, generate a new session token, and deliver email notification (Happy Path)', async () => {
            const passwordPlane = 'SecurePass123!';
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(passwordPlane);

            // Seed a completely functional target actor account profile
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(hashedPassword)
            });
            const primitives = userEntity.toPrimitives();

            // Setup dynamic parameter payloads to secure outbox context isolation from external side-effects
            const uniqueId = Math.random().toString(36).substring(2, 11);
            const targetNewEmail = `brand-new-email-${uniqueId}@synergy.com`;

            // Establish a legacy validation link template attached to the initialized user entity
            await seedTokenDefault(prisma, primitives.publicId, {
                type: TokenTypeVo.createEmailVerification(),
                expiresAt: TokenExpirationVo.fromDatabase(new Date(Date.now() + 10 * 60 * 1000))
            });

            const output = await useCase.execute({
                actorId: primitives.publicId,
                currentPassword: passwordPlane,
                newEmail: targetNewEmail
            });

            expect(output.user.id).toBe(primitives.publicId);
            expect(output.user.email).toBe(targetNewEmail);
            expect(output.token).toBeDefined();

            const userInDb = await prisma.user.findUnique({ where: { id: primitives.id } });
            expect(userInDb!.email).toBe(targetNewEmail);

            const finalTokens = await prisma.verificationToken.findMany({ where: { user_id: primitives.publicId } });
            expect(finalTokens.length).toBe(1);
            expect(finalTokens[0].type).toBe('EMAIL_VERIFICATION');

            // Extract only the outbound messages belonging to the current execution thread scope
            const mailpitResponse = await mailpit.listMessages();
            const testEmails = mailpitResponse.messages.filter(msg => msg.To[0].Address === targetNewEmail);
            expect(testEmails.length).toBe(1);

            const capturedEmail = testEmails[0];
            expect(capturedEmail.To[0].Address).toBe(targetNewEmail);

            const detailedEmail = await mailpit.getMessageSummary(capturedEmail.ID);
            expect(detailedEmail.Text).toContain(finalTokens[0].token);
        });

        it('should complete execution successfully and return new session token even if SMTP delivery crashes (try/catch resilience)', async () => {
            const passwordPlane = 'SecurePass123!';
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(passwordPlane);

            // Seed a functional actor record to evaluate execution limits against outer gateway disruptions
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(hashedPassword)
            });
            const primitives = userEntity.toPrimitives();

            // Setup dynamic parameter payloads to secure outbox context isolation from external side-effects
            const uniqueId = Math.random().toString(36).substring(2, 11);
            const targetNewEmail = `smtp-failure-test-${uniqueId}@synergy.com`;

            // Simulate an external communication boundary dropout by intercepting and rejecting SMTP dispatches
            vi.spyOn(containerDI.services.mailService, 'sendEmail').mockRejectedValueOnce(
                new Error('SMTP Connection refused')
            );

            const output = await useCase.execute({
                actorId: primitives.publicId,
                currentPassword: passwordPlane,
                newEmail: targetNewEmail
            });

            expect(output.user.email).toBe(targetNewEmail);
            expect(output.token).toBeDefined();

            const finalTokensCount = await prisma.verificationToken.count({ where: { user_id: primitives.publicId } });
            expect(finalTokensCount).toBe(1);

            // Assert delivery resilience safely by checking that 0 records filtered by our specific recipient hit the actual SMTP engine
            const mailpitResponse = await mailpit.listMessages();
            const testEmails = mailpitResponse.messages.filter(msg => msg.To[0].Address === targetNewEmail);
            expect(testEmails.length).toBe(0);

            vi.restoreAllMocks();
        });

    });

});