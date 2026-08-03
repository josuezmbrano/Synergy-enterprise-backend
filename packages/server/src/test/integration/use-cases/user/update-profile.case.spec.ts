import { UpdateProfileCase } from 'application/use-cases/user/update-profile.usecase.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserNameVo } from 'core/value-objects/user/user-name.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedUserRandom } from 'test/utils/db-seeder.js';

describe('UpdateProfileCase - Integration Tests', () => {
    let useCase: UpdateProfileCase;

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new UpdateProfileCase(containerDI.repositories.userRepository);
    });

    describe('Permissions & Guard Clauses', () => {

        it('should throw userNotFound if the acting user does not exist', async () => {
            // Setup an unmapped random UUID payload to guarantee a database lookup miss
            const execution = useCase.execute({
                actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                name: 'New Name'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should return the unmodified user instantly if no update fields are provided in the input', async () => {
            // Seed a legitimate random user record to verify the short-circuit optimization bypasses data mutation layers
            const actor = await seedUserRandom(prisma);
            const primitives = actor.toPrimitives();

            const result = await useCase.execute({
                actorId: primitives.publicId
            });

            expect(result.fullname).toBe(actor.fullname);
            expect(result.username).toBe(primitives.username);
        });
    });

    describe('Profile Updates & Case-Insensitive Uniqueness', () => {

        it('should successfully update partial fields (name and lastname) leaving username intact', async () => {
            // Seed a functional target user profile to evaluate standard partial delta changes
            const actor = await seedUserRandom(prisma);
            const primitives = actor.toPrimitives();

            const result = await useCase.execute({
                actorId: primitives.publicId,
                name: 'Alejandro',
                lastname: 'Sanz'
            });

            expect(result.fullname).toBe('Alejandro Sanz');
            expect(result.username).toBe(primitives.username);

            const dbUser = await prisma.user.findUnique({ where: { public_id: primitives.publicId } });
            expect(dbUser?.name).toBe('Alejandro');
            expect(dbUser?.lastname).toBe('Sanz');
        });

        it('should successfully update the username if it is unique and valid', async () => {
            // Seed a target user with a clean username alteration availability state
            const actor = await seedUserRandom(prisma, { usernameUpdatedAt: null });
            const primitives = actor.toPrimitives();

            const result = await useCase.execute({
                actorId: primitives.publicId,
                username: 'new_unique_username'
            });

            expect(result.username).toBe('new_unique_username');

            const dbUser = await prisma.user.findUnique({ where: { public_id: primitives.publicId } });
            expect(dbUser?.username).toBe('new_unique_username');
        });

        it('should throw usernameAlreadyExists if the new username matches another users username case-insensitively', async () => {
            // Seed the operational actor profile record
            const actor = await seedUserRandom(prisma);

            // Pre-populate the persistence layer with a different user to force a case-insensitive unique collision error
            await seedUserRandom(prisma, {
                username: UserUsernameVo.create('Pepe'),
                email: UserEmailVo.create('pepe@gmail.com')
            });

            const execution = useCase.execute({
                actorId: actor.toPrimitives().publicId,
                username: 'pePE'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.usernameAlreadyExists().message);
        });

        it('should successfully update profile fields and skip username uniqueness checks if the provided username is exactly identical to the current one', async () => {
            // Seed a user record featuring specific uppercase/lowercase structural constraints
            const actor = await seedUserRandom(prisma, {
                username: UserUsernameVo.create('YoShi'),
                name: UserNameVo.create('Original Name')
            });
            const primitives = actor.toPrimitives();

            const result = await useCase.execute({
                actorId: primitives.publicId,
                name: 'Nuevo Nombre',
                username: 'YoShi' 
            });

            expect(result.fullname).toContain('Nuevo Nombre');
            expect(result.username).toBe('YoShi');

            const dbUser = await prisma.user.findUnique({ where: { public_id: primitives.publicId } });
            expect(dbUser?.name).toBe('Nuevo Nombre');
            expect(dbUser?.username).toBe('YoShi'); 
        });

        it('should allow updating the username if the user is only changing the casing style of their own username', async () => {
            // Seed an active user profile whose current casing properties match the requested update target in value but not case style
            const actor = await seedUserRandom(prisma, {
                username: UserUsernameVo.create('YoShi'),
                usernameUpdatedAt: null
            });
            const primitives = actor.toPrimitives();


            const result = await useCase.execute({
                actorId: primitives.publicId,
                username: 'yoshi'
            });

            expect(result.username).toBe('yoshi');

            const dbUser = await prisma.user.findUnique({ where: { public_id: primitives.publicId } });
            expect(dbUser?.username).toBe('yoshi');
        });
    });

});