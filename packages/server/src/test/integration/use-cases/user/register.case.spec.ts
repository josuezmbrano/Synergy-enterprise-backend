import { RegisterUserCase } from 'application/use-cases/user/register-user.usecase.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserRegisteredEvent } from 'core/events/user-events/user-registered.event.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { UserMother } from 'test/builders/user.mother.js';
import { seedUserDefault } from 'test/utils/db-seeder.js';

describe('RegisterUserCase - Integration Tests', () => {
    let useCase: RegisterUserCase;
    let containerDI: ApplicationContainer
    let prisma: PrismaClient

    beforeAll(() => {
        const env = getEnv()
        containerDI = createContainer(env)
        prisma = containerDI.prisma
    })

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = containerDI.modules.auth.useCases.registerUserUseCase
    });

    describe('Uniqueness Invariant Validations', () => {

        it('should throw an error when attempting to register a username that already exists', async () => {
            // Seed a default collision target to block the username uniqueness constraint
            const existingUser = await seedUserDefault(prisma);
            const primitives = existingUser.toPrimitives();

            const execution = useCase.execute({
                username: primitives.username,
                email: 'different-email@synergy.com',
                name: primitives.name,
                lastname: primitives.lastname,
                password: 'SomePassword123!'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.usernameAlreadyExists().message);
        });

        it('should throw an error when attempting to register an email that already exists', async () => {
            // Seed a default collision target to block the email uniqueness constraint
            const existingUser = await seedUserDefault(prisma);
            const primitives = existingUser.toPrimitives();

            const execution = useCase.execute({
                username: 'completely_new_username',
                email: primitives.email,
                name: primitives.name,
                lastname: primitives.lastname,
                password: 'SomePassword123!'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.emailAlreadyExists().message);
        });
    });

    describe('Transactional Integrity (Unit of Work)', () => {

        it('should rollback transaction and not persist anything if an error occurs inside the Unit of Work execution', async () => {
            // Initialize an unpersisted baseline entity template using the object mother pattern
            const userTemplate = UserMother.createDefault();
            const primitives = userTemplate.toPrimitives();

            // Intercept the token save operations to trigger a simulated infrastructure crash within the Unit of Work context
            vi.spyOn(containerDI.repositories.verificationTokenRepository, 'saveToken').mockRejectedValueOnce(
                new Error('Database crash during token persistence')
            );

            await expect(useCase.execute({
                username: primitives.username,
                email: primitives.email,
                name: primitives.name,
                lastname: primitives.lastname,
                password: 'SomePassword123!'
            })).rejects.toThrow('Database crash during token persistence');

            const userInDb = await prisma.user.findFirst({
                where: { email: primitives.email }
            });

            expect(userInDb).toBeNull();
        });
    });

    describe('Orchestration Workflow & External Side-Effects', () => {

        it('should successfully complete the entire registration workflow (Happy Path)', async () => {
            const spyEventBus = vi.spyOn(containerDI.eda.eventBus, 'publish');
            // Setup dynamic parameters with unique string components to completely isolate parallel outbox evaluation
            const uniqueId = Math.random().toString(36).substring(2, 11);
            const input = {
                name: 'John',
                lastname: 'Doe',
                email: `johndoe-${uniqueId}@synergy.com`,
                username: `newuser_${uniqueId}`,
                password: 'Somepassword123!'
            };

            const output = await useCase.execute(input);

            expect(output).toBeDefined();
            expect(output.user.id).toBeDefined();
            expect(output.user.username).toBe(input.username);
            expect(output.user.fullname).toBe('John Doe');
            expect(output.user.email).toBe(input.email);
            expect(output.user.status).toBe('PENDING_VERIFICATION');
            expect(output.user.verifiedAt).toBeNull();

            expect(output.token).toBeDefined();
            typeof output.token === 'string';

            const decodedToken = await containerDI.services.jwtAuthService.verifyToken(output.token);
            expect(decodedToken.sub).toBe(output.user.id);
            expect(decodedToken.role).toBe('user');
            expect(decodedToken.verified).toBe(false);

            const userInDb = await prisma.user.findUnique({ where: { public_id: output.user.id } });
            expect(userInDb?.status).toBe('PENDING_VERIFICATION');

            const isPasswordHashed = await containerDI.services.bcryptPasswordHasher.compare(input.password, userInDb!.password);
            expect(isPasswordHashed).toBe(true);

            const tokenInDb = await prisma.verificationToken.findFirst({
                where: { user_id: output.user.id }
            });
            expect(tokenInDb).toBeDefined();
            
            // Domain event emition verification
            expect(spyEventBus).toHaveBeenCalledTimes(1);
            expect(spyEventBus).toHaveBeenCalledWith(expect.any(UserRegisteredEvent));

            const publishedEvent = spyEventBus.mock.calls[0][0] as UserRegisteredEvent;
            expect(publishedEvent.aggregateId).toBe(output.user.id);
            expect(publishedEvent.payload.email).toBe(output.user.email);
            expect(publishedEvent.payload.fullname).toBe(output.user.fullname);
            expect(publishedEvent.payload.verificationToken).toBe(tokenInDb!.token);
        });

        it('should generate a verification token with a valid future expiration date', async () => {
            // Setup dynamic parameters with unique string components to completely isolate parallel outbox evaluation
            const uniqueId = Math.random().toString(36).substring(2, 11);
            const input = {
                name: 'John',
                lastname: 'Doe',
                email: `johndoe-${uniqueId}@synergy.com`,
                username: `newuser_${uniqueId}`,
                password: 'Somepassword123!'
            };

            const output = await useCase.execute(input);

            const tokenInDb = await prisma.verificationToken.findFirst({
                where: { user_id: output.user.id }
            });

            expect(tokenInDb).toBeDefined();

            const now = new Date();
            expect(new Date(tokenInDb!.expires_at).getTime()).toBeGreaterThan(now.getTime());
        });
    });

});