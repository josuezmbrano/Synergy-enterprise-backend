import { FindUserCase } from 'application/use-cases/user/find-user.usecase.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserStatusVo } from 'core/value-objects/user/user-status.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedUserRandom } from 'test/utils/db-seeder.js';

describe('FindUserCase - Integration Tests', () => {
    let useCase: FindUserCase;
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

        useCase = containerDI.modules.user.useCases.findUserUseCase
    });

    describe('Actor Validation & Permissions', () => {

        it('should throw an error if the acting user (actorId) does not exist in the database', async () => {
            // Setup an unmapped random UUID to simulate a missing or unauthorized actor session
            const randomUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

            const execution = useCase.execute({
                actorId: randomUuid,
                query: 'any_query'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });
    });

    describe('Self Search Optimization (Short-circuit)', () => {

        it('should intercept and return own data when query matches own email case-insensitively', async () => {
            // Seed a single user to act as both the searcher and the search target
            const actor = await seedUserRandom(prisma);
            const primitives = actor.toPrimitives();

            // Convert email to uppercase to verify the system standardizes inputs for short-circuiting
            const mixedCaseEmail = primitives.email.toUpperCase();

            const result = await useCase.execute({
                actorId: primitives.publicId,
                query: mixedCaseEmail
            });

            expect(result.id).toBe(primitives.publicId);
            expect(result.username).toBe(primitives.username);
            expect(result.email).toBe(primitives.email);
        });

        it('should intercept and return own data when query matches own username case-insensitively', async () => {
            // Seed a single user with mixed-case credentials to assert domain-level normalization
            const actor = await seedUserRandom(prisma, {
                username: UserUsernameVo.create('YoShi'),
                email: UserEmailVo.create('yoshi@gmail.com')
            });
            const primitives = actor.toPrimitives();

            const result = await useCase.execute({
                actorId: primitives.publicId,
                query: 'yosHi'
            });

            expect(result.id).toBe(primitives.publicId);
            expect(result.username).toBe('YoShi');
            expect(result.email).toBe(primitives.email);
        });
    });

    describe('Intent Routing & Privacy Rules (Target Searches)', () => {

        it('should route to findByEmail and return unverified target user with full email because it was a direct email query', async () => {
            const actor = await seedUserRandom(prisma);

            // Seed a separate unverified target user whose profile requires direct email matching to expose contact details
            const target = await seedUserRandom(prisma, {
                username: UserUsernameVo.create('targetuser'),
                email: UserEmailVo.create('target@gmail.com'),
                status: UserStatusVo.create('pending_verification'),
                verifiedAt: null
            });
            const targetPrimitives = target.toPrimitives();

            const result = await useCase.execute({
                actorId: actor.toPrimitives().publicId,
                query: 'TARGET@GMAIL.COM'
            });

            expect(result.id).toBe(targetPrimitives.publicId);
            expect(result.email).toBe(targetPrimitives.email);
            expect(result.status).toBe('UNVERIFIED');
        });

        it('should route to findByUsername and return unverified target user with obfuscated email when searched by username', async () => {
            const actor = await seedUserRandom(prisma);

            // Seed an unverified user to verify data masking invariants when located via username lookup
            const target = await seedUserRandom(prisma, {
                username: UserUsernameVo.create('JohnDoe'),
                email: UserEmailVo.create('johndoe@gmail.com'),
                status: UserStatusVo.create('pending_verification'),
                verifiedAt: null
            });
            const targetPrimitives = target.toPrimitives();

            const result = await useCase.execute({
                actorId: actor.toPrimitives().publicId,
                query: 'johndoe'
            });

            expect(result.id).toBe(targetPrimitives.publicId);
            expect(result.username).toBe('JohnDoe');
            expect(result.email).toBe('•••@••••.com');
            expect(result.status).toBe('UNVERIFIED');
        });

        it('should route to findByUsername and return verified target user with full email when searched by username', async () => {
            const actor = await seedUserRandom(prisma);

            // Seed an active/verified target user to confirm privacy bypass rules for verified accounts
            await seedUserRandom(prisma, {
                username: UserUsernameVo.create('ActiveUser'),
                email: UserEmailVo.create('active@gmail.com')
            });

            const result = await useCase.execute({
                actorId: actor.toPrimitives().publicId,
                query: 'activeuser'
            });

            expect(result.status).toBe('ACTIVE');
            expect(result.email).toBe('active@gmail.com');
        });

        it('should throw an error when the target user does not exist in the database', async () => {
            const actor = await seedUserRandom(prisma);

            const execution = useCase.execute({
                actorId: actor.toPrimitives().publicId,
                query: 'nonexistent_user'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });
    });

});