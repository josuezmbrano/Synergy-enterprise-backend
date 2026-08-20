import { ResendEmailVerificationCase } from 'application/use-cases/user/resend-email-verification.usecase.js';
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserStatusVo } from 'core/value-objects/user/user-status.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { mailpit } from 'test/clients/mailpit.client.js';
import { seedUserDefault } from 'test/utils/db-seeder.js';


describe('ResendEmailVerificationCase - Integration Tests', () => {
    let useCase: ResendEmailVerificationCase;

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new ResendEmailVerificationCase(
            containerDI.repositories.userRepository,
            containerDI.repositories.verificationTokenRepository,
            containerDI.services.mailService,
            containerDI.transactionalCoordinator.unitOfWork,
            containerDI.loggerMonitorInstance.pinoLogger
        );
    });

    describe('Actor Validation & Preconditions', () => {

        it('should throw an error if the user attempting the resend does not exist in the database', async () => {
            // Setup an unmapped random UUID to confirm lookups safely fail on missing accounts
            const randomUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

            const execution = useCase.execute({ userId: randomUuid });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw an error if the user is already ACTIVE (ensureIsStillPending invariant)', async () => {
            // Seed a user profile with an 'active' status to verify state machine transitions reject unnecessary token issuance
            const activeUser = await seedUserDefault(prisma, {
                status: UserStatusVo.create('active')
            });
            const primitives = activeUser.toPrimitives();

            const execution = useCase.execute({ userId: primitives.publicId });

            await expect(execution).rejects.toThrow(UserErrorFactory.userAlreadyActive().message);

            const tokensCount = await prisma.verificationToken.count();
            expect(tokensCount).toBe(0);
        });

    });

    describe('Transactional Integrity (Unit of Work)', () => {

        it('should rollback transaction and throw an error if an email verification token already exists and is in cooldown', async () => {
            // Seed a user profile still locked under verification phases
            const userEntity = await seedUserDefault(prisma, { status: UserStatusVo.create('pending_verification') });
            const primitives = userEntity.toPrimitives();

            // Trigger an initial execution path to instantiate an active token lifecycle inside the DB boundaries
            await useCase.execute({ userId: primitives.publicId });

            const tokensBeforeCrash = await prisma.verificationToken.findMany({
                where: { user_id: primitives.publicId }
            });
            expect(tokensBeforeCrash.length).toBe(1);
            const originalTokenValue = tokensBeforeCrash[0].token;

            // Fire an immediate secondary request to check rate-limiting cooldown boundaries and invariant errors
            const execution = useCase.execute({ userId: primitives.publicId });
            await expect(execution).rejects.toThrow(TokenErrorFactory.tokenCooldownLimit().message);

            const tokensAfterCrash = await prisma.verificationToken.findMany({
                where: { user_id: primitives.publicId }
            });
            expect(tokensAfterCrash.length).toBe(1);
            expect(tokensAfterCrash[0].token).toBe(originalTokenValue);
        });

        it('should bypass cooldown, delete the previous token, and save the new one if the 60s period has passed', async () => {
            // Seed a target user profile requiring confirmation sequences
            const userEntity = await seedUserDefault(prisma, { status: UserStatusVo.create('pending_verification') });
            const primitives = userEntity.toPrimitives();

            // Establish the primary active security link inside the environment
            await useCase.execute({ userId: primitives.publicId });

            // Swap out native timers to manually step beyond rate-limiting cooldown thresholds without idle latency
            vi.useFakeTimers({ toFake: ['Date'] });

            vi.advanceTimersByTime(61 * 1000);

            const output = await useCase.execute({ userId: primitives.publicId });
            expect(output.success).toBe(true);

            vi.useRealTimers();

            const tokensInDb = await prisma.verificationToken.findMany({
                where: { user_id: primitives.publicId }
            });

            expect(tokensInDb.length).toBe(1);
        });

        it('should rollback transaction if deleteToken fails within the unit of work scope', async () => {
            // Seed a user profile awaiting validation commands
            const userEntity = await seedUserDefault(prisma, { status: UserStatusVo.create('pending_verification') });
            const primitives = userEntity.toPrimitives();

            // Persist the starting token structure
            await useCase.execute({ userId: primitives.publicId });

            // Fast-forward system clocks past token locking windows using virtual ticks
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.advanceTimersByTime(61 * 1000);

            // Spy on storage mutations and fake an infrastructure lock deadlock during entry housecleaning steps
            vi.spyOn(containerDI.repositories.verificationTokenRepository, 'deleteToken').mockRejectedValueOnce(
                new Error('Database lock error during deletion')
            );

            const execution = useCase.execute({ userId: primitives.publicId });
            await expect(execution).rejects.toThrow('Database lock error during deletion');

            vi.useRealTimers();

            const tokensInDb = await prisma.verificationToken.findMany({
                where: { user_id: primitives.publicId }
            });
            expect(tokensInDb.length).toBe(1);

            vi.restoreAllMocks();
        });

    });

    describe('Orchestration Workflow & Notification Delivery', () => {

        it('should successfully complete the entire email verification resend workflow under normal conditions (Happy Path)', async () => {
            // Seed a pristine unverified account target to trigger regular generation pathways
            const userEntity = await seedUserDefault(prisma, { status: UserStatusVo.create('pending_verification'), email: UserEmailVo.create('anotheremail@gmail.com') });
            const primitives = userEntity.toPrimitives();

            const output = await useCase.execute({ userId: primitives.publicId });

            expect(output).toEqual({
                id: primitives.publicId,
                success: true,
                username: primitives.username
            });

            const tokenInDb = await prisma.verificationToken.findFirst({
                where: { user_id: primitives.publicId }
            });
            expect(tokenInDb).toBeDefined();
            expect(tokenInDb!.type).toBe('EMAIL_VERIFICATION');

            // Fetch the global state bucket slice concurrently and isolate it exclusively by our recipient email
            const mailpitResponse = await mailpit.listMessages();
            const testEmails = mailpitResponse.messages.filter(msg => msg.To[0].Address === primitives.email);
            expect(testEmails.length).toBe(1);

            const capturedEmail = testEmails[0];
            expect(capturedEmail.To[0].Address).toBe(primitives.email);

            const detailedEmail = await mailpit.getMessageSummary(capturedEmail.ID);
            expect(detailedEmail.Text).toContain(tokenInDb!.token);
        });

        it('should complete execution successfully even if the mail service delivery fails (try/catch resilience)', async () => {
            // Seed an unverified target profile to verify outbox notification handling boundaries are decoupled from core data commits
            const userEntity = await seedUserDefault(prisma, { status: UserStatusVo.create('pending_verification'), email: UserEmailVo.create('randomemail@gmail.com') });
            const primitives = userEntity.toPrimitives();

            // Simulate external service blackouts by intercepting and rejecting notification dispatches
            vi.spyOn(containerDI.services.mailService, 'sendEmail').mockRejectedValueOnce(
                new Error('SMTP Gateway Timeout')
            );

            const output = await useCase.execute({ userId: primitives.publicId });

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