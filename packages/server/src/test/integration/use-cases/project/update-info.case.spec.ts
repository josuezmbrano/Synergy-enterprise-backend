import { UpdateProjectInfoCase } from 'application/use-cases/project/update-project-info.usecase.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { ProjectDescriptionVo } from 'core/value-objects/project/project-description.vo.js';
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedUserRandom } from 'test/utils/db-seeder.js';


describe('UpdateProjectInfoCase - Integration Tests', () => {
    let useCase: UpdateProjectInfoCase;

    beforeEach(async () => {

        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new UpdateProjectInfoCase(
            containerDI.repositories.projectRepository,
            containerDI.repositories.userRepository,
            containerDI.repositories.memberRepository
        );
    });

    describe('Guards & Authorization Constraints', () => {

        it('should throw userNotFound if the actorId does not exist in the database', async () => {
            // Setup an unmapped random UUID payload to guarantee an early actor lookup failure
            const execution = useCase.execute({
                actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1',
                title: 'Nuevo Titulo'
            });
            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw projectNotFound if the project publicId does not exist', async () => {
            // Seed a legitimate actor record to pass the identity guard layer safely
            const actor = await seedUserRandom(prisma);
            const execution = useCase.execute({
                actorId: actor.toPrimitives().publicId,
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1',
                title: 'Nuevo Titulo'
            });
            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw projectNotFound (obfuscated) if the project exists but the actor is NOT a member', async () => {
            // Seed the operational actor profile who is unauthorized to view or alter external resources
            const actor = await seedUserRandom(prisma);
            
            // Seed a distinct separate user account to act as the true owner of the isolated target project
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepito'), email: UserEmailVo.create('pepito@email.com') });
            
            // Persist a valid project entry completely isolated from the main operational actor scope
            const foreignProject = await seedProjectRandom(prisma, stranger.id.value);
            await seedMemberRandom(prisma, foreignProject.id.value, stranger.id.value);

            const execution = useCase.execute({
                actorId: actor.toPrimitives().publicId,
                projectId: foreignProject.toPrimitives().publicId,
                title: 'Intento de Hackeo'
            });
            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });
        
    });

    describe('Business Rules & Constraints', () => {

        it('should return the project untouched if no update inputs are provided (short-circuit path)', async () => {
            // Seed a functional manager profile to cross early verification barriers
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();

            // Establish a base project aggregate instance with static valid constraints
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id);


            // Execute the update transmission payload without passing partial metadata mutations (title/description)
            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });

            expect(result.title).toBe(projectPrimitives.title);
            expect(result.description).toBe(projectPrimitives.description);
        });

        it('should throw projectAlreadyExists if the new title collides with another project owned by the same user', async () => {
            // Seed a standard manager identity to serve as the unified authority context
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();

            // Establish the primary sibling project record configured with an uppercase title representation
            const projectA = await seedProjectRandom(prisma, ownerPrimitives.id, {
                title: ProjectTitleVo.create('PROYECTO ALPHA')
            });
            const primitivesA = projectA.toPrimitives();
            await seedMemberRandom(prisma, primitivesA.id, ownerPrimitives.id);

            // Establish the secondary sibling target project destined to trigger unique scope constraints
            const projectB = await seedProjectRandom(prisma, ownerPrimitives.id, {
                title: ProjectTitleVo.create('Proyecto Beta')
            });
            const primitivesB = projectB.toPrimitives();
            await seedMemberRandom(prisma, primitivesB.id, ownerPrimitives.id);

            // Dispatch an update instruction targeting project B using a case-insensitive match of project A's title
            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: primitivesB.publicId,
                title: 'proyecto alpha' 
            });

            await expect(execution).rejects.toThrow(
                ProjectErrorFactory.projectAlreadyExists().message
            );
        });

    });

    describe('Project Update - Happy Path', () => {

        it('should allow a user to update a title to a value that matches another users project title without collision', async () => {
            // Seed two separate user accounts to verify that cross-user title configurations do not cause collisions
            const userA = await seedUserRandom(prisma);
            const userB = await seedUserRandom(prisma, { username: UserUsernameVo.create('userb'), email: UserEmailVo.create('userb@email.com') });

            // Setup a distinct project owned by user A using the common target title
            const projectA = await seedProjectRandom(prisma, userA.id.value, { title: ProjectTitleVo.create('PROYECTO COMPARTIDO') });
            await seedMemberRandom(prisma, projectA.id.value, userA.id.value);

            // Setup a distinct project owned by user B initialized with a divergent title value
            const projectB = await seedProjectRandom(prisma, userB.id.value, { title: ProjectTitleVo.create('Titulo Viejo') });
            await seedMemberRandom(prisma, projectB.id.value, userB.id.value);

            // Execute the update instruction for user B to safely adopt the exact same title value used by user A
            const execution = useCase.execute({
                actorId: userB.toPrimitives().publicId,
                projectId: projectB.toPrimitives().publicId,
                title: 'PROYECTO COMPARTIDO'
            });

            await expect(execution).resolves.not.toThrow();
        });

        it('should successfully update the title and description in memory and persist them in the database', async () => {
            // Seed a functional manager profile inside the clean isolated database schema
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();

            // Establish a base project record initialized with outdated mock property attributes
            const currentProject = await seedProjectRandom(prisma, ownerPrimitives.id, {
                title: ProjectTitleVo.create('Titulo Viejo'),
                description: ProjectDescriptionVo.create('Descripcion Vieja')
            });
            const projectPrimitives = currentProject.toPrimitives();
            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id);

            // Dispatch a fully articulated update operational payload containing clean target metadata configurations
            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                title: 'Titulo Nuevo',
                description: 'Descripcion Nueva'
            });

            expect(result.id).toBe(projectPrimitives.publicId);
            expect(result.title).toBe('Titulo Nuevo');
            expect(result.description).toBe('Descripcion Nueva');

            const fetchDb = await prisma.project.findUnique({
                where: { id: projectPrimitives.id }
            });

            expect(fetchDb).not.toBeNull();
            expect(fetchDb?.title).toBe('Titulo Nuevo');
            expect(fetchDb?.description).toBe('Descripcion Nueva');
            expect(fetchDb?.updated_at).toBeDefined();
        });
    });
    
});