import { CompleteProjectCase } from 'application/use-cases/project/status-usecases/complete-project.usecase.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { ProjectStatusVo } from 'core/value-objects/project/project-status.vo.js';
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedTaskRandom, seedUserRandom } from 'test/utils/db-seeder.js';


describe('CompleteProjectCase - Integration Tests', () => {
    let useCase: CompleteProjectCase;

    beforeEach(async () => {

        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new CompleteProjectCase(
            containerDI.repositories.projectRepository,
            containerDI.repositories.userRepository,
            containerDI.repositories.taskRepository,
            containerDI.repositories.memberRepository
        );
    });

    describe('Guards & Authorization Constraints', () => {

        it('should throw userNotFound if the actorId does not exist', async () => {
            // Setup an unmapped random UUID payload to guarantee an early actor lookup failure
            const execution = useCase.execute({
                actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw projectNotFound if the project publicId does not exist in the database', async () => {
            // Seed a legitimate actor record to pass the identity guard layer safely
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1' 
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw projectNotFound (obfuscated) if the project exists but the actor is NOT a member', async () => {
            // Seed the operational actor profile who is unauthorized to view or alter external resources
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            // Seed a distinct separate user account to act as the true owner of the isolated target project
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepito'), email: UserEmailVo.create('pepito@email.com') });
            const strangerPrimitives = stranger.toPrimitives();

            // Persist a valid project entry completely isolated from the main operational actor scope
            const project = await seedProjectRandom(prisma, strangerPrimitives.id);
            const projectPrimitives = project.toPrimitives();
            await seedMemberRandom(prisma, projectPrimitives.id, strangerPrimitives.id);

            const spyOnFindProjectMember = vi.spyOn(containerDI.repositories.memberRepository, 'findProjectMember')

            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
            expect(spyOnFindProjectMember).toHaveBeenCalled()

            vi.restoreAllMocks()
        });

        it('should throw an error if the user is a member but lacks owner or admin privileges', async () => {
            // Seed a valid project owner profile
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();

            // Seed the operational actor profile attempting the modification workflow
            const contributorUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@gmail.com') });
            const contributorPrimitives = contributorUser.toPrimitives();

            // Attaches the contributor identity to the directory with a role lacking administrative mutations
            await seedMemberRandom(prisma, projectPrimitives.id, contributorPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            const execution = useCase.execute({
                actorId: contributorPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotOwnerOrAdmin().message);
        });
    });

    describe('Business Rules Verification (External Aggregates)', () => {

        it('should throw an error if the project has pending active tasks in the database', async () => {
            // Seed a valid owner profile to cross identity validation barriers
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id, {
                status: ProjectStatusVo.create('in_progress')
            });
            const projectPrimitives = project.toPrimitives();

            // Formally attach the manager identity to the directory layout with admin rights
            const member = await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const memberPrimitives = member.toPrimitives();

            // Pre-populate the project aggregate boundary with a legacy uncompleted 'todo' task record
            await seedTaskRandom(prisma, projectPrimitives.id, memberPrimitives.id, null, {
                status: TaskStatusVo.create('todo')
            });


            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });

            
            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectCompletionPendingTasks().message);
        });

        it('should throw an error if the project has tasks in progress (e.g., IN_PROGRESS status) in the database', async () => {
            // Seed an active manager account profile
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id, {
                status: ProjectStatusVo.create('in_progress')
            });
            const projectPrimitives = project.toPrimitives();

            const member = await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const memberPrimitives = member.toPrimitives();

            // Pre-populate the persistence layer with an active 'doing' task aggregate to block project closure
            await seedTaskRandom(prisma, projectPrimitives.id, memberPrimitives.id, null, {
                status: TaskStatusVo.create('doing') 
            });

            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });


            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectCompletionPendingTasks().message);
        });
    });

    describe('Project Completion - Happy Path', () => {

        it('should successfully mark the project as completed when there are no pending tasks', async () => {
            // Seed a functional manager profile inside the clean isolated database schema
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id, {
                status: ProjectStatusVo.create('in_progress'),
                completedAt: null
            });
            const projectPrimitives = project.toPrimitives();

            const member = await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const memberPrimitives = member.toPrimitives();

            // Seed a successfully finished 'completed' task record to fulfill the business invariants
            await seedTaskRandom(prisma, projectPrimitives.id, memberPrimitives.id, null, {
                status: TaskStatusVo.create('completed')
            });


            const preFetchDb = await prisma.project.findUnique({
                where: { id: projectPrimitives.id }
            });
            expect(preFetchDb?.status).toBe('IN_PROGRESS');
            expect(preFetchDb?.completed_at).toBeNull();


            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });


            expect(result.id).toBe(projectPrimitives.publicId);
            expect(result.status).toBe('COMPLETED');
            expect(result.completedAt).not.toBeNull();


            const postFetchDb = await prisma.project.findUnique({
                where: { id: projectPrimitives.id }
            });

            expect(postFetchDb?.status).toBe('COMPLETED');
            expect(postFetchDb?.completed_at).not.toBeNull(); 
            expect(postFetchDb?.updated_at).toBeDefined();
        });
    });

});