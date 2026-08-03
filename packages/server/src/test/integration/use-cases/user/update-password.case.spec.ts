import { UpdatePasswordCase } from 'application/use-cases/user/update-password.usecase.js';
import { AuthErrorFactory } from 'core/errors/factories/auth-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedUserDefault } from 'test/utils/db-seeder.js';

describe('UpdatePasswordCase - Integration Tests', () => {
    let useCase: UpdatePasswordCase;

    beforeEach(async () => {
        vi.useRealTimers();

        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new UpdatePasswordCase(
            containerDI.repositories.userRepository,
            containerDI.services.bcryptPasswordHasher
        );
    });

    describe('Identity & Actor Validations', () => {

        it('should throw an error if the user attempting the password change does not exist', async () => {
            // Setup an unmapped random UUID payload to guarantee a database lookup miss
            const nonExistentActorId = '3c8d1976-5e58-472e-848e-d91ab2d8c30c';

            const execution = useCase.execute({
                actorId: nonExistentActorId,
                oldPassword: 'CurrentPassword123!',
                newPassword: 'BrandNewPassword123!'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw an invalid credentials error if oldPassword does not match the stored user password', async () => {
            const correctOldPassword = 'CorrectOldPassword123!';
            const incorrectOldPassword = 'WrongOldPassword123!';
            
            // Seed a legitimate user account with a specifically hashed password profile
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(correctOldPassword);
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(hashedPassword)
            });
            const primitives = userEntity.toPrimitives();

            const execution = useCase.execute({
                actorId: primitives.publicId,
                oldPassword: incorrectOldPassword,
                newPassword: 'BrandNewPassword123!'
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

    describe('Business Rules & Security Constraints', () => {

        it('should throw a password reuse error if the new password is raw text identical to the old password', async () => {
            const currentPasswordPlane = 'SamePassword123!';
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(currentPasswordPlane);
            
            // Seed a user profile whose active credential record matches the incoming mutation criteria
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(hashedPassword)
            });
            const primitives = userEntity.toPrimitives();

            const execution = useCase.execute({
                actorId: primitives.publicId,
                oldPassword: currentPasswordPlane,
                newPassword: currentPasswordPlane
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userPasswordReuse().message);
        });
    });

    describe('Infrastructure Resilience & Error Propagation', () => {

        it('should propagate database errors and leave stored credentials unchanged if repository save fails', async () => {
            const oldPasswordPlane = 'OldPassword123!';
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(oldPasswordPlane);
            
            // Seed a valid starting user record inside the clean isolated database schema
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(hashedPassword)
            });
            const primitives = userEntity.toPrimitives();

            // Intercept database writes to inject an unexpected technical exception during repository persistence
            vi.spyOn(containerDI.repositories.userRepository, 'save').mockRejectedValueOnce(
                new Error('PostgreSQL connection timeout during update statement')
            );

            const execution = useCase.execute({
                actorId: primitives.publicId,
                oldPassword: oldPasswordPlane,
                newPassword: 'ValidNewPassword123!'
            });

            await expect(execution).rejects.toThrow('PostgreSQL connection timeout during update statement');

            const userInDb = await prisma.user.findUnique({ where: { id: primitives.id } });
            expect(userInDb!.password).toBe(hashedPassword);

            vi.restoreAllMocks();
        });
    });

    describe('Orchestration Workflow', () => {

        it('should successfully hash the new password, persist changes in PostgreSQL and map out the user primitive fields (Happy Path)', async () => {
            const oldPasswordPlane = 'OldPassword123!';
            const newPasswordPlane = 'BrandNewSuperPassword123!';

            // Seed a functional actor record with a pre-hashed password to evaluate the full mutation cycle
            const oldHashedPassword = await containerDI.services.bcryptPasswordHasher.hash(oldPasswordPlane);
            const userEntity = await seedUserDefault(prisma, {
                password: UserPasswordVo.fromHash(oldHashedPassword)
            });
            const primitives = userEntity.toPrimitives();

            await useCase.execute({
                actorId: primitives.publicId,
                oldPassword: oldPasswordPlane,
                newPassword: newPasswordPlane
            });

            const updatedUserInDb = await prisma.user.findUnique({ where: { id: primitives.id } });
            
            expect(updatedUserInDb!.password).not.toBe(oldHashedPassword);

            const isMatchWithNewPassword = await containerDI.services.bcryptPasswordHasher.compare(
                newPasswordPlane,
                updatedUserInDb!.password
            );
            expect(isMatchWithNewPassword).toBe(true);
        });
        
    });

});