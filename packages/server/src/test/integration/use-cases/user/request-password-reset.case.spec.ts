import { RequestPasswordResetCase } from 'application/use-cases/user/request-password-reset.usecase.js';
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { mailpit } from 'test/clients/mailpit.client.js';
import { seedUserDefault } from 'test/utils/db-seeder.js';

describe('RequestPasswordResetCase - Integration Tests', () => {
    let useCase: RequestPasswordResetCase;

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new RequestPasswordResetCase(
            containerDI.repositories.userRepository,
            containerDI.repositories.verificationTokenRepository,
            containerDI.services.mailService,
            containerDI.transactionalCoordinator.unitOfWork
        );
    });

    describe('User Enumeration Protection & Silent Return', () => {

        it('should return a silent success output if the requested email account does not exist in the database', async () => {
            // Setup a completely unique, unmapped email string to guarantee isolation and check anti-enumeration guards
            const uniqueId = Math.random().toString(36).substring(2, 11);
            const targetEmail = `ghost-account-${uniqueId}@synergy.com`;

            const output = await useCase.execute({
                email: targetEmail
            });

            expect(output).toEqual({
                email: targetEmail,
                success: true
            });

            const totalTokens = await prisma.verificationToken.count();
            expect(totalTokens).toBe(0);

            // Fetch global outbox snapshot and assert that no message leak occurred for this specific target recipient
            const mailpitResponse = await mailpit.listMessages();
            const testEmails = mailpitResponse.messages.filter(msg => msg.To[0].Address === targetEmail);
            expect(testEmails.length).toBe(0);
        });

    });

    describe('Transactional Integrity (Unit of Work)', () => {

        it('should rollback transaction and throw an error if an existing token is still within the email cooldown period', async () => {
            // Seed an active target user account
            const userEntity = await seedUserDefault(prisma);
            const primitives = userEntity.toPrimitives();

            // Execute an initial valid request to create a token and trigger the application-level rate limit/cooldown window
            await useCase.execute({ email: primitives.email });

            const tokensBeforeCrash = await prisma.verificationToken.findMany({
                where: { user_id: primitives.publicId }
            });

            expect(tokensBeforeCrash.length).toBe(1);
            const originalTokenValue = tokensBeforeCrash[0].token;

            const execution = useCase.execute({ email: primitives.email });
            await expect(execution).rejects.toThrow(TokenErrorFactory.tokenCooldownLimit().message);

            const tokensAfterCrash = await prisma.verificationToken.findMany({
                where: { user_id: primitives.publicId }
            });

            expect(tokensAfterCrash.length).toBe(1);
            expect(tokensAfterCrash[0].token).toBe(originalTokenValue);
        });

        it('should rollback transaction and not save the new token if deleteToken fails inside the execution scope', async () => {
            // Seed a valid target user account
            const userEntity = await seedUserDefault(prisma);
            const primitives = userEntity.toPrimitives();

            // Establish an initial active security token within the database bounds
            await useCase.execute({ email: primitives.email });

            // Fast-forward system time beyond the rate-limiting threshold to allow subsequent mutation cycles
            vi.useFakeTimers();
            vi.advanceTimersByTime(61 * 1000);

            // Spy on the transaction operations and simulate an intentional deadlocking failure during the initial cleanup statement
            vi.spyOn(containerDI.repositories.verificationTokenRepository, 'deleteToken').mockRejectedValueOnce(
                new Error('Database deadlock during deletion')
            );

            const execution = useCase.execute({ email: primitives.email });
            await expect(execution).rejects.toThrow('Database deadlock during deletion');

            vi.useRealTimers();

            const tokensInDb = await prisma.verificationToken.findMany({
                where: { user_id: primitives.publicId }
            });
            expect(tokensInDb.length).toBe(1);

            vi.restoreAllMocks();
        });

    });

    describe('Orchestration Workflow & Notification Delivery', () => {

        it('should successfully complete the entire password reset request workflow under normal conditions (Happy Path)', async () => {
            // Seed a legitimate active user account to execute the regular state machine branch
            const userEntity = await seedUserDefault(prisma, {email: UserEmailVo.create('someemail@gmail.com')});
            const primitives = userEntity.toPrimitives();

            const output = await useCase.execute({ email: primitives.email });

            expect(output).toEqual({
                email: primitives.email,
                success: true
            });

            const tokenInDb = await prisma.verificationToken.findFirst({
                where: { user_id: primitives.publicId }
            });
            expect(tokenInDb).toBeDefined();
            expect(tokenInDb!.type).toBe('PASSWORD_RESET');

            // Fetch the global state bucket slice concurrently and slice it exclusively by our recipient email
            const mailpitResponse = await mailpit.listMessages();
            const testEmails = mailpitResponse.messages.filter(msg => msg.To[0].Address === primitives.email);
            expect(testEmails.length).toBe(1);

            const capturedEmail = testEmails[0];
            expect(capturedEmail.To[0].Address).toBe(primitives.email);
            expect(capturedEmail.Subject).toBeDefined();

            const detailedEmail = await mailpit.getMessageSummary(capturedEmail.ID);
            expect(detailedEmail.Text).toContain(tokenInDb!.token);
        });

        it('should complete execution successfully even if the mail server delivery fails (try/catch resilience)', async () => {
            // Seed a regular user profile to dissociate safe database commits from downstream outbox service disruptions
            const userEntity = await seedUserDefault(prisma, {email: UserEmailVo.create('otheremail@gmail.com')});
            const primitives = userEntity.toPrimitives();

            // Intercept downstream communication layers to force a simulated infrastructure timeout error
            vi.spyOn(containerDI.services.mailService, 'sendEmail').mockRejectedValueOnce(
                new Error('Mail provider timeout')
            );

            const output = await useCase.execute({ email: primitives.email });

            expect(output.success).toBe(true);

            const tokenInDb = await prisma.verificationToken.findFirst({
                where: { user_id: primitives.publicId }
            });
            expect(tokenInDb).toBeDefined();

            // Assert delivery resilience safely by checking that 0 records filtered by our specific recipient hit the actual SMTP engine
            const mailpitResponse = await mailpit.listMessages();
            const testEmails = mailpitResponse.messages.filter(msg => msg.To[0].Address === primitives.email);
            expect(testEmails.length).toBe(0);

            vi.restoreAllMocks();
        });

    });

});