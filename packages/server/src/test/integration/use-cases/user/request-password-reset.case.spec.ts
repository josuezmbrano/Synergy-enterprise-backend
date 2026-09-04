import { RequestPasswordResetCase } from 'application/use-cases/user/request-password-reset.usecase.js';
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js';
import { UserRequestedPasswordResetEvent } from 'core/events/user-events/user-requested-password-reset.event.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedUserDefault } from 'test/utils/db-seeder.js';

describe('RequestPasswordResetCase - Integration Tests', () => {
    let useCase: RequestPasswordResetCase;
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

        useCase = containerDI.modules.auth.useCases.requestPasswordResetUseCase
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

            expect(spyEventBus).not.toHaveBeenCalled();
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
            expect(spyEventBus).toHaveBeenCalledTimes(1);
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
            expect(spyEventBus).toHaveBeenCalledTimes(1);

            vi.restoreAllMocks();
        });

    });

    describe('Orchestration Workflow & Notification Delivery', () => {

        it('should successfully complete the entire password reset request workflow under normal conditions (Happy Path)', async () => {
            // Seed a legitimate active user account to execute the regular state machine branch
            const userEntity = await seedUserDefault(prisma, { email: UserEmailVo.create('someemail@gmail.com') });
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

            // Domain event emition verification
            expect(spyEventBus).toHaveBeenCalledTimes(1);
            expect(spyEventBus).toHaveBeenCalledWith(expect.any(UserRequestedPasswordResetEvent));

            const publishedEvent = spyEventBus.mock.calls[0][0] as UserRequestedPasswordResetEvent;
            expect(publishedEvent.aggregateId).toBe(primitives.publicId)
            expect(publishedEvent.payload.fullname).toBe(userEntity.fullname);
            expect(publishedEvent.payload.email).toBe(primitives.email);
            expect(publishedEvent.payload.verificationToken).toBe(tokenInDb!.token);
        });
    });

});