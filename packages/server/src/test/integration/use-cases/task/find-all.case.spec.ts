import { FindAllTasksCase } from 'application/use-cases/task/find-all-tasks.usecase.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedTaskRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('FindAllTasksCase - Integration Tests', () => {
    let useCase: FindAllTasksCase;

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new FindAllTasksCase(
            containerDI.repositories.taskRepository,
            containerDI.repositories.projectRepository,
            containerDI.repositories.userRepository,
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

        it('should throw projectNotFound if the project publicId does not exist', async () => {
            // Seed a legitimate actor record to pass the initial identity guard layer safely
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            // Dispatch an operation containing an unmapped project UUID to force an infrastructure lookup failure
            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1'
            });

            await expect(expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message));
        });

        it('should obfuscate error and throw projectNotFound if the actor is NOT a member of the project', async () => {
            // Setup base project infrastructure structures managed by the legitimate resource owner
            const realOwner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, realOwner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            // Seed a distinct malicious stranger account to simulate an unauthorized security access context
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('stranger'), email: UserEmailVo.create('stranger@email.com') });

            // Fire request to verify the aggregate strictly obfuscates the error to protect workspace metadata leakage
            const execution = useCase.execute({
                actorId: stranger.toPrimitives().publicId,
                projectId: projectPrimitives.publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should obfuscate error and throw projectNotFound if the actor is a member but has their access revoked', async () => {
            // Setup base project components linked to a valid infrastructure owner account
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            // Seed a team user whose membership reference status is explicitly set to suspended/inactive
            const suspendedUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('banned'), email: UserEmailVo.create('banned@email.com') });
            
            await seedMemberRandom(prisma, projectPrimitives.id, suspendedUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('inactive')
            });

            // Dispatch execution to verify access filters deny collection data extraction to inactive profiles
            const execution = useCase.execute({
                actorId: suspendedUser.toPrimitives().publicId,
                projectId: projectPrimitives.publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });
    });

    describe('Find All Tasks - Execution Paths', () => {

        it('should successfully return an empty array if the project has no tasks registered', async () => {
            // Setup an active, valid workspace context with a registered teammate profile
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            // Dispatch retrieval request over a fresh project container holding zero tasks
            const result = await useCase.execute({
                actorId: owner.toPrimitives().publicId,
                projectId: projectPrimitives.publicId
            });

            expect(result.tasks).toBeDefined();
            expect(result.tasks).toBeInstanceOf(Array);
            expect(result.tasks.length).toBe(0);
        });

        it('should successfully return all tasks from the project mapped into primitives', async () => {
            // Establish authorized project workspace configurations alongside an active administrative manager
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const member = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const memberPrimitives = member.toPrimitives();

            // Setup a fully active team contributor profile to handle assigned task testing
            const developerUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('dev'), email: UserEmailVo.create('dev@email.com') });
            const developerMember = await seedMemberRandom(prisma, projectPrimitives.id, developerUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });
            const developerPrimitives = developerMember.toPrimitives();

            // Persist multiple heterogeneous task entities (fully assigned vs backlog unassigned) to validate structural collection maps
            await seedTaskRandom(prisma, projectPrimitives.id, memberPrimitives.id, developerPrimitives.id, { objective: TaskObjectiveVo.create('Task One') });
            await seedTaskRandom(prisma, projectPrimitives.id, memberPrimitives.id, null, { objective: TaskObjectiveVo.create('Task Two Backlog') });

            // Execute retrieval query under fully satisfied identity and tenant data boundary constraints
            const result = await useCase.execute({
                actorId: owner.toPrimitives().publicId,
                projectId: projectPrimitives.publicId
            });

            expect(result.tasks.length).toBe(2);
            
            const taskOne = result.tasks.find(t => t.objective === 'Task One');
            expect(taskOne).toBeTruthy();
            expect(taskOne?.projectId).toBe(projectPrimitives.publicId);
            expect(taskOne?.creatorId).toBe(memberPrimitives.publicId);
            expect(taskOne?.assignedTo).toBe(developerPrimitives.publicId);
            expect(taskOne?.status).toBeDefined();

            const taskTwo = result.tasks.find(t => t.objective === 'Task Two Backlog');
            expect(taskTwo).toBeTruthy();
            expect(taskTwo?.assignedTo).toBeNull();
        });

    });

});