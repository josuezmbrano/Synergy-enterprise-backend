import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { PrismaUserRepository } from 'infrastructure/repositories/user.prisma.js';
import { UserMother } from 'test/builders/user.mother.js';
import { seedUserDefault } from 'test/utils/db-seeder.js';

describe('PrismaUserRepository - Integration Tests', () => {
    let userRepository: PrismaUserRepository;
    let containerDI: ApplicationContainer
    let prisma: PrismaClient


    beforeAll(() => {
        const env = getEnv()
        containerDI = createContainer(env);
        prisma = containerDI.prisma
    })


    beforeEach(async () => {
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        userRepository = new PrismaUserRepository(prisma);
    });


    describe('save()', () => {

        it('should successfully INSERT a new user when it does not exist', async () => {
            const newUser = UserMother.create()

            const savedUser = await userRepository.save(newUser);

            expect(savedUser.id.value).toBe(newUser.id.value);

            const dbUser = await prisma.user.findUnique({
                where: { id: newUser.id.value },
            });

            expect(dbUser).toBeTruthy();
            expect(dbUser?.email).toBe(newUser.email.value);
            expect(dbUser?.username).toBe(newUser.username.value);
            expect(dbUser?.public_id).toBe(newUser.publicId.value);
        });

        it('should successfully UPDATE an existing user when save() is called again (Upsert)', async () => {
            const storedUser = await seedUserDefault(prisma)

            const updatedUser = UserMother.reconstituteDefault({
                username: UserUsernameVo.create('updated_username'),
                email: UserEmailVo.create('updated_email@example.com')
            })

            await userRepository.save(updatedUser);

            const dbUser = await prisma.user.findUnique({
                where: { id: storedUser.id.value },
            });

            expect(dbUser).toBeTruthy();
            expect(dbUser?.email).toBe('updated_email@example.com');
            expect(dbUser?.username).toBe('updated_username');
        });

    });

    describe('findByPublicId()', () => {

        it('should return the mapped user domain entity when the public_id exists in the database', async () => {
            const storedUser = await seedUserDefault(prisma)

            const result = await userRepository.findByPublicId(storedUser.publicId)

            expect(result).toBeInstanceOf(UserEntityClass)
            expect(result?.email.value).toBe(storedUser.email.value)
            expect(result?.publicId.value).toBe(storedUser.publicId.value)
        })

        it('should return null cleanly when the searched public_id does not exist', async () => {
            const result = await userRepository.findByPublicId(UserIdVo.create())

            expect(result).toBeNull()
        })

    })

    describe('findById()', () => {

        it('should return the mapped user domain entity when the internal id exists in the database', async () => {
            const storedUser = await seedUserDefault(prisma)

            const result = await userRepository.findById(storedUser.id)

            expect(result).toBeInstanceOf(UserEntityClass)
            expect(result?.id.value).toBe(storedUser.id.value)
            expect(result?.email.value).toBe(storedUser.email.value)
        })

        it('should return null cleanly when the searched internal id does not exist', async () => {
            const result = await userRepository.findById(UserIdVo.create())

            expect(result).toBeNull()
        })

    })

    describe('findByUsername()', () => {

        it('should return the mapped user domain entity when the username exists in the database', async () => {
            const storedUser = await seedUserDefault(prisma);

            const result = await userRepository.findByUsername(storedUser.username);

            expect(result).toBeInstanceOf(UserEntityClass);
            expect(result?.username.value).toBe(storedUser.username.value);
        });

        it('should return null cleanly when the searched username does not exist', async () => {
            const result = await userRepository.findByUsername(UserUsernameVo.create('non_existent_username'));
            expect(result).toBeNull();
        });

    });

    describe('findByEmail()', () => {

        it('should return the mapped user domain entity when the email exists in the database', async () => {
            const storedUser = await seedUserDefault(prisma);

            const result = await userRepository.findByEmail(storedUser.email);

            expect(result).toBeInstanceOf(UserEntityClass);
            expect(result?.email.value).toBe(storedUser.email.value);
        });

        it('should return null cleanly when the searched email does not exist', async () => {
            const result = await userRepository.findByEmail(UserEmailVo.create('ghost@example.com'));
            expect(result).toBeNull();
        });

    });

    describe('emailExists()', () => {

        it('should return true if the email is registered in the database', async () => {
            const storedUser = await seedUserDefault(prisma);

            const exists = await userRepository.emailExists(storedUser.email);
            expect(exists).toBe(true);
        });

        it('should return false if the email does not exist in the database', async () => {
            const exists = await userRepository.emailExists(UserEmailVo.create('available_email@example.com'));
            expect(exists).toBe(false);
        });

    });

    describe('usernameExists()', () => {

        it('should return true if the username is registered in the database', async () => {
            const storedUser = await seedUserDefault(prisma);

            const exists = await userRepository.usernameExists(storedUser.username);
            expect(exists).toBe(true);
        });

        it('should return false if the username does not exist in the database', async () => {
            const exists = await userRepository.usernameExists(UserUsernameVo.create('available_username'));
            expect(exists).toBe(false);
        });

    });

})