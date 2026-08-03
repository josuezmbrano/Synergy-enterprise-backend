import { ArchiveProjectCase } from 'application/use-cases/project/status-usecases/archive-project.usecase.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { ProjectStatusVo } from 'core/value-objects/project/project-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('ArchiveProjectCase - Integration Tests', () => {
    let useCase: ArchiveProjectCase;

    beforeEach(async () => {

        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new ArchiveProjectCase(
            containerDI.repositories.projectRepository,
            containerDI.repositories.userRepository,
            containerDI.repositories.memberRepository
        );
    });

    describe('Guards & Authorization Constraints', () => {

        it('should throw userNotFound if the actorId does not exist in the system', async () => {
            // Setup an unmapped random UUID payload to guarantee an early actor lookup failure
            const execution = useCase.execute({
                actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw projectNotFound if the project to archive does not exist', async () => {
            // Seed a legitimate actor record to pass the identity guard layer safely
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1'
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw projectNotFound (obfuscated error) if the project exists but the actor is NOT a member', async () => {
            // Seed the operational actor profile who is unauthorized to view or alter external resources
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            // Seed a distinct separate user account to act as the true owner of the isolated target project
            const stranger = await seedUserRandom(prisma, {username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@gmail.com')});
            const strangerPrimitives = stranger.toPrimitives();

            // Persist a valid active project entry completely isolated from the main operational actor scope
            const project = await seedProjectRandom(prisma, strangerPrimitives.id, {
                status: ProjectStatusVo.create('in_progress')
            });
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, strangerPrimitives.id);


            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });
    });

    describe('Project State Mutation - Happy Path', () => {

        it('should successfully archive the project by setting archivedAt and status to ARCHIVED in the database', async () => {
            // Seed a functional owner record inside the clean isolated testing database schema
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();

            // Establish a valid completed project record that satisfies the transition criteria to an archived status
            const activeProject = await seedProjectRandom(prisma, ownerPrimitives.id, {
                status: ProjectStatusVo.create('completed'),
                completedAt: DateVo.create(),
                archivedAt: null
            });
            const projectPrimitives = activeProject.toPrimitives();

            // Formally attach the owner identity to the project membership directory layer
            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id);


            const preFetchDb = await prisma.project.findUnique({
                where: { id: projectPrimitives.id }
            });
            expect(preFetchDb?.archived_at).toBeNull();
            expect(preFetchDb?.status).toBe('COMPLETED');


            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });

  
            expect(result.id).toBe(projectPrimitives.publicId);
            expect(result.archivedAt).not.toBeNull(); 
            expect(result.status).toBe('ARCHIVED');


            const postFetchDb = await prisma.project.findUnique({
                where: { id: projectPrimitives.id }
            });
            
            expect(postFetchDb?.archived_at).not.toBeNull(); 
            expect(postFetchDb?.status).toBe('ARCHIVED');
            expect(postFetchDb?.completed_at).not.toBeNull()   
            expect(postFetchDb?.updated_at).toBeDefined();
        });
    });
    
});