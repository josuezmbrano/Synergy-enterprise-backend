import { SetCriticalPriorityCase } from 'application/use-cases/task/priority/set-critical-priority.usecase.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { TaskPriorityVo } from 'core/value-objects/task/task-priority.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedTaskRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('SetCriticalPriorityCase - Integration Tests', () => {
    let useCase: SetCriticalPriorityCase;

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new SetCriticalPriorityCase(
            containerDI.repositories.taskRepository,
            containerDI.repositories.userRepository,
            containerDI.repositories.projectRepository,
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

        it('should throw taskNotFound if the taskId does not exist', async () => {
            // Seed a legitimate actor record to pass the initial identity guard layer safely
            const actor = await seedUserRandom(prisma);

            // Dispatch an operation containing an unmapped task UUID to force an infrastructure lookup failure
            const execution = useCase.execute({
                actorId: actor.toPrimitives().publicId, 
                taskId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8d' 
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
                taskId: task.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw an error if the actor is a contributor but NEITHER the creator nor the project owner', async () => {
            // Establish legitimate administrative authority and baseline workspace profiles within the tenant boundary
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const managerMember = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

        
            // Persist a task aggregate created by the manager to evaluate external modification restrictions
            const task = await seedTaskRandom(prisma, projectPrimitives.id, managerMember.toPrimitives().id, null);

         
            // Seed a base contributor profile lacking elevated privileges or ownership bonds to this resource
            const plebUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('pleb'), email: UserEmailVo.create('pleb@email.com') });
            await seedMemberRandom(prisma, projectPrimitives.id, plebUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            // Dispatch command to assert that standard contributors are barred from mutating core task fields like priority escalation
            const execution = useCase.execute({
                actorId: plebUser.toPrimitives().publicId, 
                taskId: task.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(TaskErrorFactory.taskNotPermittedToEdit().message);
        });
    });

    describe('Set Critical Priority - Happy Path', () => {

        it('should successfully update task priority to CRITICAL and persist changes when executed by authorized member', async () => {
            // Establish authorized project workspace configurations alongside an active administrative manager context
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creatorMember = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

         
            // Persist the targeted task aggregate instance explicitly configured with a baseline LOW priority state
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creatorMember.toPrimitives().id, null, {
                priority: TaskPriorityVo.create('LOW')
            });
            const taskPrimitives = task.toPrimitives();

            // Run the state escalation routine under fully satisfied identity, tenant, and role-based permissions
            const result = await useCase.execute({
                actorId: owner.toPrimitives().publicId, 
                taskId: taskPrimitives.publicId
            });

            expect(result.priority).toBe('CRITICAL');
            expect(result.assignedTo).toBeNull();

            
            // Query infrastructure directly to confirm state mutations successfully bridged domain aggregates to the database tier
            const dbTask = await prisma.task.findUnique({ where: { id: taskPrimitives.id } });
            expect(dbTask?.priority).toBe('CRITICAL');
        });
    });

});