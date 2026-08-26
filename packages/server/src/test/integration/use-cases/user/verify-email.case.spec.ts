import { VerifyEmailCase } from 'application/use-cases/user/verify-email.usecase.js';
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js';
import { TokenExpirationVo } from 'core/value-objects/token/token-expiration.vo.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';
import { UserStatusVo } from 'core/value-objects/user/user-status.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedTokenDefault, seedUserRandom } from 'test/utils/db-seeder.js';

describe('VerifyEmailCase - Integration Tests with Unit of Work', () => {
    let useCase: VerifyEmailCase;
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

        useCase = containerDI.modules.auth.useCases.verifyEmailUseCase
    });

    describe('Token & User Validations', () => {

        it('should throw a tokenNotFound error if the verification token string does not exist', async () => {
            // Setup an unmapped random token string to guarantee a database lookup miss
            const execution = useCase.execute({ token: 'a11bc20c-58cc-4372-a567-0e02b2c3d478' });
            await expect(execution).rejects.toThrow(TokenErrorFactory.tokenNotFound().message);
        });

        it('should throw an error if the token exists in the database but its expiration date has already passed', async () => {
            // Seed a target user profile locked under the registration verification phase
            const actor = await seedUserRandom(prisma, {
                status: UserStatusVo.create('pending_verification'),
                verifiedAt: null
            });
            const primitives = actor.toPrimitives();

            // Persist an email verification token with an expiration timestamp explicitly forced into the past
            const token = await seedTokenDefault(prisma, primitives.publicId, {
                type: TokenTypeVo.createEmailVerification(),
                expiresAt: TokenExpirationVo.fromDatabase(new Date(Date.now() - 1000 * 60 * 60 * 1))
            })

            const execution = useCase.execute({ token: token.id.value });

            await expect(execution).rejects.toThrow(TokenErrorFactory.tokenExpired().message);
        });

    });

    describe('Atomic Execution (Happy Path & Rollback)', () => {

        it('should successfully verify the user and delete the token in a single successful transaction', async () => {
            // Seed a standard pending user record ready to undergo status mutation invariants
            const actor = await seedUserRandom(prisma, {
                verifiedAt: null,
                status: UserStatusVo.create('pending_verification')
            });
            const primitives = actor.toPrimitives();

            // Establish a valid, unexpired email verification token bound to the initialized user profile
            const token = await seedTokenDefault(prisma, primitives.publicId, {
                type: TokenTypeVo.createEmailVerification()
            })

            const result = await useCase.execute({ token: token.id.value });

            expect(result.success).toBe(true);
            expect(result.id).toBe(primitives.publicId);

            const updatedUser = await prisma.user.findUnique({ where: { public_id: primitives.publicId } });
            const deletedToken = await prisma.verificationToken.findUnique({ where: { token: token.id.value } });

            expect(updatedUser?.verified_at).not.toBeNull();
            expect(deletedToken).toBeNull();
        });

        it('should execute a rollback and leave the user unverified if the token deletion fails midway', async () => {
            // Seed a target pending account state within the clean isolated database schema
            const actor = await seedUserRandom(prisma, {
                status: UserStatusVo.create('pending_verification'),
                verifiedAt: null
            });
            const primitives = actor.toPrimitives();

            // Persist a valid confirmation link entity before provoking infrastructure failure simulation
            const token = await seedTokenDefault(prisma, primitives.publicId, {
                type: TokenTypeVo.createEmailVerification()
            })

            // Intercept data operations to simulate a critical database deadlock during token consumption inside the Unit of Work
            vi.spyOn(containerDI.repositories.verificationTokenRepository, 'deleteToken').mockRejectedValueOnce(
                new Error('Database crash during token deletion')
            );

            const execution = useCase.execute({ token: token.id.value });
            await expect(execution).rejects.toThrow('Database crash during token deletion');

            const dbUser = await prisma.user.findUnique({ where: { public_id: primitives.publicId } });
            const dbToken = await prisma.verificationToken.findUnique({ where: { token: token.id.value } });

            expect(dbUser?.verified_at).toBeNull();
            expect(dbUser?.status).toBe('PENDING_VERIFICATION')
            expect(dbToken).not.toBeNull();

            vi.restoreAllMocks()
        });
    });

});