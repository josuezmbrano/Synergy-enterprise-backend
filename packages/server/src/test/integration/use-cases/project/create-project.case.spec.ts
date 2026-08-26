import { CreateProjectCase } from 'application/use-cases/project/create-project.usecase.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedUserRandom } from 'test/utils/db-seeder.js';

describe('CreateProjectCase - Integration Tests with Unit of Work', () => {
    let useCase: CreateProjectCase;
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
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = containerDI.modules.project.useCases.createProjectUseCase
    });

    describe('Business Rules & Validations', () => {

        it('should throw projectAlreadyExists if the user tries to create a project with a title that matches an existing one (case-insensitive)', async () => {
            // Seed a legitimate user identity to serve as the project author
            const actor = await seedUserRandom(prisma);
            const primitives = actor.toPrimitives();

            // Establish the first project record using an uppercase title profile
            await useCase.execute({
                actorId: primitives.publicId,
                title: 'SISTEMA OPERATIVO',
                description: 'Primer intento',
                category: 'DEVELOPMENT/ENGINEERING'
            });

            // Prepare a second operation using a lowercase variation of the exact same title value to evaluate unique scoping constraints
            const execution = useCase.execute({
                actorId: primitives.publicId,
                title: 'sistema operativo',
                description: 'Segundo intento',
                category: 'DEVELOPMENT/ENGINEERING'
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectAlreadyExists().message);
        });

        it('should throw userNotFound if the actorId does not exist', async () => {
            // Setup an unmapped random UUID payload to guarantee an early actor lookup failure
            const execution = useCase.execute({
                actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                title: 'Cualquier Titulo',
                description: 'Cualquier desc',
                category: 'DESIGN/UX'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should allow two different users to create projects with the exact same title without collision', async () => {
            // Seed two separate distinct user accounts to verify that project title unique constraints are scoped per user
            const userA = await seedUserRandom(prisma);
            const userB = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@gmail.com') });

            const primitivesA = userA.toPrimitives();
            const primitivesB = userB.toPrimitives();

            const sharedTitle = 'PROYECTO COMPARTIDO';

            await useCase.execute({
                actorId: primitivesA.publicId,
                title: sharedTitle,
                description: 'Proyecto del usuario A',
                category: 'DEVELOPMENT/ENGINEERING'
            });

            const executionB = useCase.execute({
                actorId: primitivesB.publicId,
                title: sharedTitle,
                description: 'Proyecto del usuario B',
                category: 'DEVELOPMENT/ENGINEERING'
            });


            await expect(executionB).resolves.not.toThrow();


            const dbProjects = await prisma.project.findMany({
                where: { title: sharedTitle }
            });

            expect(dbProjects.length).toBe(2);
        });
    });

    describe('Atomic Persistence (Unit of Work)', () => {

        it('should successfully create both the project and the owner member in the same transaction', async () => {
            // Seed an active actor profile within the clean isolated database schema
            const actor = await seedUserRandom(prisma);
            const primitives = actor.toPrimitives();

            const result = await useCase.execute({
                actorId: primitives.publicId,
                title: 'Proyecto Alpha',
                description: 'Descripcion de prueba',
                category: 'DATA/ANALYSIS'
            });


            expect(result.title).toBe('Proyecto Alpha');
            expect(result.ownerId).toBe(primitives.publicId);


            const dbProject = await prisma.project.findUnique({
                where: { public_id: result.id }
            });
            expect(dbProject).not.toBeNull();
            expect(dbProject?.title).toBe('Proyecto Alpha');


            const dbMember = await prisma.member.findFirst({
                where: {
                    project_id: dbProject?.id,
                    user_id: dbProject?.owner_id
                }
            });
            expect(dbMember).not.toBeNull();
            expect(dbMember?.role).toBe('ADMIN');
            expect(dbMember?.status).toBe('ACTIVE');
        });

        it('should perform a full rollback if member persistence fails after project is already saved', async () => {
            // Seed a functional actor record before forcing a simulated database exception
            const actor = await seedUserRandom(prisma);
            const primitives = actor.toPrimitives();

            // Intercept member repository writes to inject a runtime exception during membership enrollment inside the Unit of Work transaction boundary
            vi.spyOn(containerDI.repositories.memberRepository, 'save').mockRejectedValueOnce(
                new Error('Unexpected DB crash during member creation')
            );

            const execution = useCase.execute({
                actorId: primitives.publicId,
                title: 'Proyecto Fallido',
                description: 'No debería guardarse',
                category: 'MARKETING/SALES'
            });

            await expect(execution).rejects.toThrow('Unexpected DB crash during member creation');

            const dbProject = await prisma.project.findFirst({
                where: { title: 'Proyecto Fallido' }
            });

            expect(dbProject).toBeNull();

            vi.restoreAllMocks()
        });
    });

});