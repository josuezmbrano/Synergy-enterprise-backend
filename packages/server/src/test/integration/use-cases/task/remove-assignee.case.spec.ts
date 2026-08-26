import { RemoveAssigneeCase } from 'application/use-cases/task/assignee/remove-assignee.usecase.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedMemberRandom, seedProjectRandom, seedTaskRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('RemoveAssigneeCase - Integration Tests', () => {
    let useCase: RemoveAssigneeCase;
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

        useCase = containerDI.modules.task.useCases.removeAssigneeUseCase
    });

    describe('Guards & Authorization Constraints', () => {

        it('should throw userNotFound if the actorId does not exist', async () => {
            // Setup an unmapped random UUID payload to guarantee an early actor lookup failure
            const execution = useCase.execute({
                actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                taskId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8d',
                targetMemberId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8e'
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
                targetMemberId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8e'
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
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creator.toPrimitives().id, creator.toPrimitives().id);

            // Seed a distinct malicious stranger account to simulate an unauthorized security access context
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('stranger'), email: UserEmailVo.create('stranger@email.com') });

            // Fire request to verify the aggregate strictly obfuscates the error to protect workspace metadata leakage
            const execution = useCase.execute({
                actorId: stranger.toPrimitives().publicId,
                taskId: task.toPrimitives().publicId,
                targetMemberId: creator.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });
    });

    describe('Target Member Boundary Validations', () => {

        it('should throw memberNotFound if the targetMemberId exists but belongs to a different project', async () => {
            // Establish the primary multi-tenant workspace context (Project Alpha) with its internal task
            const ownerAlpha = await seedUserRandom(prisma);
            const projectAlpha = await seedProjectRandom(prisma, ownerAlpha.toPrimitives().id);
            const creatorAlpha = await seedMemberRandom(prisma, projectAlpha.toPrimitives().id, ownerAlpha.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const taskAlpha = await seedTaskRandom(prisma, projectAlpha.toPrimitives().id, creatorAlpha.toPrimitives().id, creatorAlpha.toPrimitives().id);

            // Isolate an independent parallel workspace container (Project Beta) hosting an unrelated member profile
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
                targetMemberId: memberBeta.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(MemberErrorFactory.memberNotFound().message);
        });

        it('should throw an error if the target member is part of the project but is NOT the actual assignee of that task', async () => {
            // Establish legitimate administrative authority and baseline workspace profiles within the tenant boundary
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creator = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Seed legitimate team member profile A and bind them directly as the active assignee of the task aggregate
            const devAUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('deva'), email: UserEmailVo.create('deva@email.com') });
            const devAMember = await seedMemberRandom(prisma, projectPrimitives.id, devAUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            const task = await seedTaskRandom(prisma, projectPrimitives.id, creator.toPrimitives().id, devAMember.toPrimitives().id);

            // Seed an unaligned teammate profile B inside the same project who has no relational bonds to this specific task instance
            const devBUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('devb'), email: UserEmailVo.create('devb@email.com') });
            const devBMember = await seedMemberRandom(prisma, projectPrimitives.id, devBUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            // Dispatch command targeting teammate B to assert the domain rule prevents mutating mismatched assignment nodes
            const execution = useCase.execute({
                actorId: owner.toPrimitives().publicId,
                taskId: task.toPrimitives().publicId,
                targetMemberId: devBMember.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(TaskErrorFactory.taskAssignmentMismatch().message);
        });
    });

    describe('Remove Task Assignee - Happy Path', () => {

        it('should successfully remove the assignee, transition task to backlog and persist null in database', async () => {
            // Establish authorized project workspace configurations alongside an active administrative manager
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creator = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Setup a fully active team contributor profile currently handling task assignment fulfillment
            const developerUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('worker'), email: UserEmailVo.create('worker@email.com') });
            const developerMember = await seedMemberRandom(prisma, projectPrimitives.id, developerUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });
            const developerPrimitives = developerMember.toPrimitives();

            // Persist the specific task entity instance with the active assignee bounds established
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creator.toPrimitives().id, developerPrimitives.id);
            const taskPrimitives = task.toPrimitives();

            // Run the mutation process under fully satisfied identity, tenant, and relationship safety alignment rules
            const result = await useCase.execute({
                actorId: owner.toPrimitives().publicId,
                taskId: taskPrimitives.publicId,
                targetMemberId: developerPrimitives.publicId
            });

            expect(result.assignedTo).toBeNull();

            const dbTask = await prisma.task.findUnique({ where: { id: taskPrimitives.id } });
            expect(dbTask?.assigned_to).toBeNull();
        });
    });

});