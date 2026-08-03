import { SetReviewStatusCase } from 'application/use-cases/task/status/set-review-status.usecase.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedTaskRandom, seedUserRandom } from 'test/utils/db-seeder.js';


describe('SetReviewStatusCase - Integration Tests', () => {
    let useCase: SetReviewStatusCase;

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new SetReviewStatusCase(
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

    describe('Boundary Target Validations & Domain State Rules', () => {

        it('should throw memberNotFound if the targetMemberId belongs to a different project', async () => {
            // Establish the primary multi-tenant workspace context (Project Alpha) alongside its active task state
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

        it('should throw an error if the targetMemberId is NOT the actual assignee of the task', async () => {
            // Establish legitimate administrative authority and baseline workspace profiles within the tenant boundary
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creator = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Seed legitimate team member profile A and bind them directly as the active assignee of the targeted task context
            const devAUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('deva'), email: UserEmailVo.create('deva@email.com') });
            const devAMember = await seedMemberRandom(prisma, projectPrimitives.id, devAUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            const task = await seedTaskRandom(prisma, projectPrimitives.id, creator.toPrimitives().id, devAMember.toPrimitives().id, { status: TaskStatusVo.create('DOING') });

            // Seed an unaligned teammate profile B inside the same project who has no relational bonds to this specific task instance
            const devBUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('devb'), email: UserEmailVo.create('devb@email.com') });
            const devBMember = await seedMemberRandom(prisma, projectPrimitives.id, devBUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            // Dispatch status mutation command targeting teammate B to assert that assignment mismatch checks block the lifecycle shift
            const execution = useCase.execute({
                actorId: owner.publicId.value,
                taskId: task.toPrimitives().publicId,
                targetMemberId: devBMember.toPrimitives().publicId 
            });

            await expect(execution).rejects.toThrow(TaskErrorFactory.taskAssignmentMismatch().message);
        });

    });

    describe('Set Review Status - Happy Path', () => {

        it('should successfully update task status to REVIEW and persist changes in the database', async () => {
            // Establish authorized project workspace configurations alongside an active administrative manager context
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            // Setup a fully active team contributor profile to handle task execution and active lane transition operations
            const developerUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('reviewer'), email: UserEmailVo.create('reviewer@email.com') });
            const developerUserPrimitives = developerUser.toPrimitives();

            const developerMember = await seedMemberRandom(prisma, projectPrimitives.id, developerUserPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });
            const developerPrimitives = developerMember.toPrimitives();

            // Persist the targeted task aggregate instance explicitly configured in an ongoing status lane within verified project limits
            const task = await seedTaskRandom(prisma, projectPrimitives.id, developerPrimitives.id, developerPrimitives.id, { status: TaskStatusVo.create('DOING') });
            const taskPrimitives = task.toPrimitives();

            // Run the state mutation routine under fully satisfied identity, tenant capacity lane, and structural assignment rules
            const result = await useCase.execute({
                actorId: developerUserPrimitives.publicId, 
                taskId: taskPrimitives.publicId,
                targetMemberId: developerPrimitives.publicId 
            });

            expect(result.status).toBe('REVIEW');

            // Query infrastructure directly to confirm state mutations successfully bridged domain aggregates to the database tier
            const dbTask = await prisma.task.findUnique({ where: { id: taskPrimitives.id } });
            expect(dbTask?.status).toBe('REVIEW');
        });
    });

});