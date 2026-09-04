import { ResendEmailVerificationCase } from 'application/use-cases/user/resend-email-verification.usecase.js';
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserResentEmailVerificationEvent } from 'core/events/user-events/user.resent-email-verification.event.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserStatusVo } from 'core/value-objects/user/user-status.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedUserDefault } from 'test/utils/db-seeder.js';


describe('ResendEmailVerificationCase - Integration Tests', () => {
    let useCase: ResendEmailVerificationCase;
    let containerDI: ApplicationContainer
    let prisma: PrismaClient
    let spyEventBus: ReturnType<typeof vi.spyOn>;

    beforeAll(() => {
        const env = getEnv()
        containerDI = createContainer(env)
        prisma = containerDI.prisma
    })

    beforeEach(async () => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.clearAllMocks();

        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.user.deleteMany({});
        
        if (containerDI.eda?.eventBus?.clear) {
            containerDI.eda.eventBus.clear();
        }

        spyEventBus = vi.spyOn(containerDI.eda.eventBus, 'publish');

        useCase = containerDI.modules.auth.useCases.resendEmailVerificationUseCase
    });

    describe('Actor Validation & Preconditions', () => {

        it('should throw an error if the user attempting the resend does not exist in the database', async () => {
            // Setup an unmapped random UUID to confirm lookups safely fail on missing accounts
            const randomUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

            const execution = useCase.execute({ userId: randomUuid });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
            expect(spyEventBus).not.toHaveBeenCalled()
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
            expect(spyEventBus).not.toHaveBeenCalled()
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
            expect(spyEventBus).toHaveBeenCalledTimes(1);
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
            expect(spyEventBus).toHaveBeenCalledTimes(2);
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
            expect(spyEventBus).toHaveBeenCalledTimes(1);

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

            // Domain event emition verification
            expect(spyEventBus).toHaveBeenCalledTimes(1);
            expect(spyEventBus).toHaveBeenCalledWith(expect.any(UserResentEmailVerificationEvent));

            const publishedEvent = spyEventBus.mock.calls[0][0] as UserResentEmailVerificationEvent;
            expect(publishedEvent.aggregateId).toBe(primitives.publicId)
            expect(publishedEvent.payload.fullname).toBe(userEntity.fullname);
            expect(publishedEvent.payload.email).toBe(primitives.email);
            expect(publishedEvent.payload.verificationToken).toBe(tokenInDb!.token);
        });
    });

});