import { FindTaskCase } from 'application/use-cases/task/find-task.usecase.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedTaskRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('FindTaskCase - Integration Tests', () => {
    let useCase: FindTaskCase;

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new FindTaskCase(
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
                taskId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8d'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw taskNotFound if the taskId publicId does not exist', async () => {
            // Seed a legitimate actor record to pass the initial identity guard layer safely
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            // Dispatch an unmapped task UUID to force a lookup failure at the infrastructure layer
            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                taskId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8d'
            });

            await expect(execution).rejects.toThrow(TaskErrorFactory.taskNotFound().message);
        });

        it('should obfuscate error and throw projectNotFound if the task exists but the actor is NOT a member of its project', async () => {
            // Setup base project infrastructure structures managed by the legitimate resource owner
            const realOwner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, realOwner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creatorMember = await seedMemberRandom(prisma, projectPrimitives.id, realOwner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Persist the targeted task linked to the authentic project workspace container
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creatorMember.toPrimitives().id, null, {
                objective: TaskObjectiveVo.create('Tarea Secreta')
            });

            // Seed a distinct malicious stranger account to simulate an unauthorized security access context
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('stranger'), email: UserEmailVo.create('stranger@email.com') });

            // Fire request to verify the aggregate strictly obfuscates the error to protect workspace metadata leakage
            const execution = useCase.execute({
                actorId: stranger.toPrimitives().publicId,
                taskId: task.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should obfuscate error and throw projectNotFound if the actor is a member but has their access revoked (inactive)', async () => {
            // Setup base project components linked to a valid infrastructure owner account
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creatorMember = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            const task = await seedTaskRandom(prisma, projectPrimitives.id, creatorMember.toPrimitives().id, null, {
                objective: TaskObjectiveVo.create('Tarea de Desarrollo')
            });

            // Seed a team user whose membership reference status is explicitly set to suspended/inactive
            const suspendedUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('banned'), email: UserEmailVo.create('banned@email.com') });

            await seedMemberRandom(prisma, projectPrimitives.id, suspendedUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('inactive')
            });

            // Dispatch execution to verify access filters deny task metadata view to inactive profiles
            const execution = useCase.execute({
                actorId: suspendedUser.toPrimitives().publicId,
                taskId: task.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });
    });

    describe('Find Task - Happy Path', () => {

        it('should successfully return the mapped primitives of a specific task when queried by an active member', async () => {
            // Establish authorized project workspace configurations alongside an active administrative manager
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const member = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const memberPrimitives = member.toPrimitives();

            // Setup a fully active team contributor profile to act as the authorized querying client
            const developerUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('dev'), email: UserEmailVo.create('dev@email.com') });
            const developerMember = await seedMemberRandom(prisma, projectPrimitives.id, developerUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });
            const developerPrimitives = developerMember.toPrimitives();

            const targetDueDate = new Date(Date.now() + 86400000);
            
            // Persist the specific task aggregate instance to be fetched during the verification phase
            const task = await seedTaskRandom(prisma, projectPrimitives.id, memberPrimitives.id, developerPrimitives.id, {
                objective: TaskObjectiveVo.create('Auditar Queries'),
                dueDate: DateVo.create(targetDueDate)
            });
            const taskPrimitives = task.toPrimitives();

            // Execute query lookup under fully satisfied multi-tenant, identity, and status constraints
            const result = await useCase.execute({
                actorId: developerUser.toPrimitives().publicId, 
                taskId: taskPrimitives.publicId
            });


            expect(result.id).toBe(taskPrimitives.publicId);
            expect(result.projectId).toBe(projectPrimitives.publicId);
            expect(result.creatorId).toBe(memberPrimitives.publicId);
            expect(result.assignedTo).toBe(developerPrimitives.publicId);
            expect(result.objective).toBe('Auditar Queries');
            expect(result.status).toBeDefined();
            expect(result.priority).toBeDefined();
            expect(result.dueDate).toBe(targetDueDate.toISOString());
            expect(result.createdAt).toBeDefined();
            expect(result.updatedAt).toBeDefined();
        });
    });

});