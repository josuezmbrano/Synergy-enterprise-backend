import { ResetPasswordCase } from 'application/use-cases/user/reset-password.usecase.js';
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { TokenExpirationVo } from 'core/value-objects/token/token-expiration.vo.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';
import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedTokenDefault, seedUserDefault } from 'test/utils/db-seeder.js';

describe('ResetPasswordCase - Integration Tests', () => {
    let useCase: ResetPasswordCase;
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

        useCase = containerDI.modules.auth.useCases.resetPasswordUseCase
    });

    describe('Token Validations & Preconditions', () => {

        it('should throw an error if the verification token does not exist in the database', async () => {
            // Setup an unmapped random UUID to confirm database misses trigger clean domain exceptions
            const nonExistentToken = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

            const execution = useCase.execute({
                token: nonExistentToken,
                newPassword: 'NewSecurePassword123!'
            });

            await expect(execution).rejects.toThrow(TokenErrorFactory.tokenNotFound().message);
        });

        it('should throw an error if the token has expired (ensureCanBeValidated invariant)', async () => {
            // Seed a legitimate user profile to anchor the verification token record
            const userEntity = await seedUserDefault(prisma);
            const primitives = userEntity.toPrimitives();

            // Persist a password reset token with an expiration timestamp set 24 hours in the past
            const token = await seedTokenDefault(prisma, primitives.publicId, {
                type: TokenTypeVo.createPasswordReset(),
                expiresAt: TokenExpirationVo.fromDatabase(new Date(Date.now() - 24 * 60 * 60 * 1000))
            })

            const execution = useCase.execute({
                token: token.id.value,
                newPassword: 'NewSecurePassword123!'
            });


            await expect(execution).rejects.toThrow(TokenErrorFactory.tokenExpired().message);
        });
    });

    describe('User Validations & Password Constraints', () => {

        it('should throw a reuse error if the new password is identical to the current stored password', async () => {
            const plainPassword = 'IdenticalPassword123!';
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(plainPassword);

            // Seed a user profile with a specific known pre-hashed credential state
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(hashedPassword)
            });

            const primitives = userEntity.toPrimitives();

            // Establish an active, valid password reset token for the target account
            const token = await seedTokenDefault(prisma, primitives.publicId, {
                type: TokenTypeVo.createPasswordReset(),
                expiresAt: TokenExpirationVo.fromDatabase(new Date(Date.now() + 60 * 60 * 1000))
            })

            const execution = useCase.execute({
                token: token.id.value,
                newPassword: plainPassword
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userPasswordReuse().message);
        });

    });

    describe('Transactional Integrity (Unit of Work)', () => {

        it('should rollback entire transaction if deleting the verification token fails inside the execution scope', async () => {
            const oldPlainPassword = 'OldPassword123!';
            const newPlainPassword = 'NewPassword123!';

            const oldHashedPassword = await containerDI.services.bcryptPasswordHasher.hash(oldPlainPassword);
            // Seed the user account with the original legacy password hashing profile
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(oldHashedPassword)
            });

            const primitives = userEntity.toPrimitives();


            // Establish the single-use recovery token bound to the initialized account profile
            const token = await seedTokenDefault(prisma, primitives.publicId, {
                type: TokenTypeVo.createPasswordReset(),
                expiresAt: TokenExpirationVo.fromDatabase(new Date(Date.now() + 60 * 60 * 1000))
            })


            // Spy on storage layers and force an infrastructure fault during token combustion to evaluate rolling back password mutations
            vi.spyOn(containerDI.repositories.verificationTokenRepository, 'deleteToken').mockRejectedValueOnce(
                new Error('Database write deadlock')
            );

            const execution = useCase.execute({
                token: token.id.value,
                newPassword: newPlainPassword
            });

            await expect(execution).rejects.toThrow('Database write deadlock');

            const tokenStillExists = await prisma.verificationToken.findFirst({ where: { token: token.id.value } });
            expect(tokenStillExists).toBeDefined();

            const userInDb = await prisma.user.findUnique({ where: { id: primitives.id } });
            expect(userInDb!.password).toBe(oldHashedPassword);

            vi.restoreAllMocks();
        });

    });

    describe('Orchestration Workflow', () => {

        it('should successfully update user password and destroy the single-use token under normal conditions (Happy Path)', async () => {
            const oldPlainPassword = 'OldPassword123!';
            const newPlainPassword = 'BrandNewPassword123!';

            const oldHashedPassword = await containerDI.services.bcryptPasswordHasher.hash(oldPlainPassword);
            // Seed an active target user record with the old hashed password profile
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(oldHashedPassword)
            });

            const primitives = userEntity.toPrimitives();


            // Construct a pristine active single-use token to satisfy lookup invariants
            const token = await seedTokenDefault(prisma, primitives.publicId, {
                type: TokenTypeVo.createPasswordReset(),
                expiresAt: TokenExpirationVo.fromDatabase(new Date(Date.now() + 60 * 60 * 1000))
            })


            const output = await useCase.execute({
                token: token.id.value,
                newPassword: newPlainPassword
            });

            expect(output).toEqual({ success: true });

            const tokenCount = await prisma.verificationToken.count({ where: { token: token.id.value } });
            expect(tokenCount).toBe(0);

            const updatedUser = await prisma.user.findUnique({ where: { id: primitives.id } });
            expect(updatedUser!.password).not.toBe(oldHashedPassword);

            const isNewPasswordMatch = await containerDI.services.bcryptPasswordHasher.compare(
                newPlainPassword,
                updatedUser!.password
            );
            expect(isNewPasswordMatch).toBe(true);
        });

    });

});