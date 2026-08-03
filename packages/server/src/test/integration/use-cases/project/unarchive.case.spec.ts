import { UnarchiveProjectCase } from 'application/use-cases/project/unarchive-project.usecase.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { ProjectStatusVo } from 'core/value-objects/project/project-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('UnarchiveProjectCase - Integration Tests', () => {
    let useCase: UnarchiveProjectCase;

    beforeEach(async () => {

        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new UnarchiveProjectCase(
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

        it('should throw projectNotFound if the project to unarchive does not exist', async () => {
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
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@gmail.com') });
            const strangerPrimitives = stranger.toPrimitives();

            // Persist an explicitly archived project entry completely isolated from the main operational actor scope
            const archivedProject = await seedProjectRandom(prisma, strangerPrimitives.id, {
                archivedAt: DateVo.create(),
                status: ProjectStatusVo.create('archived')
            });
            const projectPrimitives = archivedProject.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, strangerPrimitives.id);

            const spyOnIsMember = vi.spyOn(containerDI.repositories.memberRepository, 'isMember')

            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });


            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
            expect(spyOnIsMember).toHaveBeenCalled()
            
            vi.restoreAllMocks()
        });
    });

    describe('Project State Mutation - Happy Path', () => {

        it('should successfully unarchive the project by setting archivedAt to null in memory and database', async () => {
            // Seed a functional owner profile inside the clean isolated database schema
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();

            // Establish a baseline archived project aggregate instance ready for state restoration transitions
            const currentArchivedProject = await seedProjectRandom(prisma, ownerPrimitives.id, {
                archivedAt: DateVo.create(),
                status: ProjectStatusVo.create('archived')
            });
            const projectPrimitives = currentArchivedProject.toPrimitives();

            // Formally attach the manager identity to the directory layout to grant authorized access
            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id);

            
            const preFetchDb = await prisma.project.findUnique({
                where: { id: projectPrimitives.id }
            });
            expect(preFetchDb?.archived_at).not.toBeNull();


            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });


            expect(result.id).toBe(projectPrimitives.publicId);
            expect(result.archivedAt).toBeNull();

            const postFetchDb = await prisma.project.findUnique({
                where: { id: projectPrimitives.id }
            });

            expect(postFetchDb?.archived_at).toBeNull(); 
            expect(postFetchDb?.updated_at).toBeDefined();
            expect(postFetchDb?.status).toBe('PLANNED')
        });
    });
    
});