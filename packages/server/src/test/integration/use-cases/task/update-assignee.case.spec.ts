import { UpdateAssigneeCase } from 'application/use-cases/task/assignee/update-assignee.usecase.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedTaskRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('UpdateAssigneeCase - Integration Tests', () => {
    let useCase: UpdateAssigneeCase;

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new UpdateAssigneeCase(
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
                taskId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8d',
                assigneeId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8e'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw taskNotFound if the taskId does not exist', async () => {
            // Seed a legitimate actor record to pass the initial identity guard layer safely
            const actor = await seedUserRandom(prisma);
            
            // Dispatch an operation containing an unmapped task UUID to force an infrastructure lookup failure
            const execution = useCase.execute({
                actorId: actor.toPrimitives().publicId,
                taskId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8d',
                assigneeId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8e'
            });

            await expect(execution).rejects.toThrow(TaskErrorFactory.taskNotFound().message);
        });

        it('should obfuscate error and throw projectNotFound if the actor is NOT a member of the project', async () => {
            // Setup base project infrastructure structures managed by the legitimate resource owner
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creator = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creator.toPrimitives().id, null);

            // Seed a distinct malicious stranger account to simulate an unauthorized security access context
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('stranger'), email: UserEmailVo.create('stranger@email.com') });

            // Fire request to verify the aggregate strictly obfuscates the error to protect workspace metadata leakage
            const execution = useCase.execute({
                actorId: stranger.toPrimitives().publicId,
                taskId: task.toPrimitives().publicId,
                assigneeId: creator.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });
    });

    describe('Assignee Boundary Validation (Resource Alignment)', () => {

        it('should throw memberNotFound if the assignee target member exists but belongs to a different project', async () => {
            // Establish the primary multi-tenant workspace context (Project Alpha) hosting the targeted task aggregate
            const ownerAlpha = await seedUserRandom(prisma);
            const projectAlpha = await seedProjectRandom(prisma, ownerAlpha.toPrimitives().id);
            const creatorAlpha = await seedMemberRandom(prisma, projectAlpha.toPrimitives().id, ownerAlpha.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const taskAlpha = await seedTaskRandom(prisma, projectAlpha.toPrimitives().id, creatorAlpha.toPrimitives().id, null);

            // Isolate an independent parallel workspace container (Project Beta) hosting an unrelated active member profile
            const ownerBeta = await seedUserRandom(prisma, { username: UserUsernameVo.create('betaowner'), email: UserEmailVo.create('betaowner@email.com') });
            const projectBeta = await seedProjectRandom(prisma, ownerBeta.toPrimitives().id);
            const memberBeta = await seedMemberRandom(prisma, projectBeta.toPrimitives().id, ownerBeta.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            // Trigger execution with cross-project parameters to assert strict aggregate boundary checking intercepts the call
            const execution = useCase.execute({
                actorId: ownerAlpha.toPrimitives().publicId,
                taskId: taskAlpha.toPrimitives().publicId,
                assigneeId: memberBeta.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(MemberErrorFactory.memberNotFound().message);
        });

        it('should throw an error if the target member is registered in the project but is currently INACTIVE', async () => {
            // Establish authorized project workspace configurations alongside an active administrative manager context
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creator = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creator.toPrimitives().id, null);

            // Seed a team member profile within the project boundary whose active structural lifecycle has been explicitly terminated
            const inactiveUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('inactive'), email: UserEmailVo.create('inactive@email.com') });
            const inactiveMember = await seedMemberRandom(prisma, projectPrimitives.id, inactiveUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('inactive')
            });

            // Dispatch command targeting the inactive resource to assert that lifecycle verification guards block the assignment
            const execution = useCase.execute({
                actorId: owner.toPrimitives().publicId,
                taskId: task.toPrimitives().publicId,
                assigneeId: inactiveMember.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(MemberErrorFactory.memberNotActive().message);
        });
    });

    describe('Update Task Assignee - Happy Path', () => {

        it('should successfully change the assignee of the task and persist it in the repository', async () => {
            // Establish authorized project workspace configurations alongside an active administrative manager context
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creator = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            
            // Persist the targeted task aggregate instance explicitly configured with an unassigned status (null)
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creator.toPrimitives().id, null);
            const taskPrimitives = task.toPrimitives();

            // Setup a fully active team contributor profile inside the same tenant boundary to receive the workload assignment
            const developerUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('dev'), email: UserEmailVo.create('dev@email.com') });
            const developerMember = await seedMemberRandom(prisma, projectPrimitives.id, developerUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });
            const developerPrimitives = developerMember.toPrimitives();

            // Run the workload reassignment routine under fully satisfied identity, tenant capacity, and structural lifecycle parameters
            const result = await useCase.execute({
                actorId: owner.toPrimitives().publicId,
                taskId: taskPrimitives.publicId,
                assigneeId: developerPrimitives.publicId
            });

            expect(result.assignedTo).toBe(developerPrimitives.publicId);

   
            // Query infrastructure directly to confirm state mutations successfully bridged domain aggregates to the database tier
            const dbTask = await prisma.task.findUnique({ where: { id: taskPrimitives.id } });
            expect(dbTask?.assigned_to).toBe(developerPrimitives.id);
        });
    });

});