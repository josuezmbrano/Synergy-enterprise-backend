import { LoginUserCase } from 'application/use-cases/user/login-user.usecase.js';
import { AuthErrorFactory } from 'core/errors/factories/auth-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserLastnameVo } from 'core/value-objects/user/user-lastname.vo.js';
import { UserNameVo } from 'core/value-objects/user/user-name.vo.js';
import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js';
import { UserStatusVo } from 'core/value-objects/user/user-status.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedUserDefault } from 'test/utils/db-seeder.js';

describe('LoginUserCase - Integration Tests', () => {
    let useCase: LoginUserCase;
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

        useCase = containerDI.modules.auth.useCases.loginUserUseCase
    });

    describe('Credential Validations & Security Exceptions', () => {

        it('should throw an invalid credentials error if the user email does not exist in the database (with timing attack protection)', async () => {
            // Note: No user is seeded here to guarantee a database miss and verify generic error responses
            const execution = useCase.execute({
                email: 'nonexistent-email@synergy.com',
                password: 'PlainPassword123!'
            });

            await expect(execution).rejects.toThrow(AuthErrorFactory.invalidCredentials().message);
        });

        it('should throw an invalid credentials error if the user exists but the provided password does not match', async () => {
            const plainPassword = 'CorrectPassword123!';
            const wrongPassword = 'WrongPassword123!';

            // Seed an existing valid user to verify the application safely rejects invalid inputs post-lookup
            const user = await seedUserDefault(prisma, { password: UserPasswordVo.create(plainPassword) });

            const primitives = user.toPrimitives();

            const execution = useCase.execute({
                email: primitives.email,
                password: wrongPassword
            });

            await expect(execution).rejects.toThrow(AuthErrorFactory.invalidCredentials().message);
        });
    });

    describe('Account Status & Restrictions', () => {

        it('should throw a suspended/locked account error if the user status does not allow login (ensureCanLogin invariant)', async () => {
            const plainPassword = 'CorrectPassword123!';

            // Seed a user explicitly flagged as 'suspended' to evaluate core state machine login restrictions
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(plainPassword);
            const userEntity = await seedUserDefault(prisma, { password: UserPasswordVo.fromHash(hashedPassword), status: UserStatusVo.create('suspended') });

            const primitives = userEntity.toPrimitives();

            const execution = useCase.execute({
                email: primitives.email,
                password: plainPassword
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userSuspendedLocked().message);
        });
    });

    describe('Orchestration Workflow & Session Token Generation', () => {

        it('should successfully log in the user and return structural data along with a valid JWT token (Happy Path)', async () => {
            const plainPassword = 'SuperSecurePassword123!';
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(plainPassword);

            // Seed a fully active user profile to evaluate successful authentication and token minting workflows
            const userEntity = await seedUserDefault(prisma, { name: UserNameVo.create('Jane'), lastname: UserLastnameVo.create('Doe'), password: UserPasswordVo.fromHash(hashedPassword) });

            const primitives = userEntity.toPrimitives();

            const output = await useCase.execute({
                email: primitives.email,
                password: plainPassword
            });


            expect(output).toBeDefined();
            expect(output.user.id).toBe(primitives.publicId);
            expect(output.user.username).toBe(primitives.username);
            expect(output.user.fullname).toBe('Jane Doe');
            expect(output.user.email).toBe(primitives.email);
            expect(output.user.status).toBe('ACTIVE');
            expect(output.user.verifiedAt).toBeDefined();


            expect(output.token).toBeDefined();
            expect(typeof output.token).toBe('string');


            const decodedToken = await containerDI.services.jwtAuthService.verifyToken(output.token);
            expect(decodedToken.sub).toBe(output.user.id);
            expect(decodedToken.role).toBe('user');
            expect(decodedToken.verified).toBe(true);
        });

        it('should successfully log in when email is sent in a different case (Case Insensitivity Edge Case)', async () => {
            const plainPassword = 'SuperSecurePassword123!';
            const hashedPassword = await containerDI.services.bcryptPasswordHasher.hash(plainPassword);

            // Seed a target user with a standardized lower-case email address
            const userEntity = await seedUserDefault(prisma, { password: UserPasswordVo.fromHash(hashedPassword), email: UserEmailVo.create('alex.vanguard@synergy.com') });

            await containerDI.repositories.userRepository.save(userEntity);
            const primitives = userEntity.toPrimitives();


            // Trigger login with uppercase inputs to verify string normalization invariants during lookup
            const output = await useCase.execute({
                email: 'ALEX.VANGUARD@SYNERGY.COM',
                password: plainPassword
            });

            expect(output).toBeDefined();
            expect(output.user.id).toBe(primitives.publicId);
            expect(output.user.email).toBe('alex.vanguard@synergy.com');
            expect(output.token).toBeDefined();
        });
    });

});