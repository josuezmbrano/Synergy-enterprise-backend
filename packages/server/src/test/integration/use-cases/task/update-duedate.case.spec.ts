import { UpdateTaskDuedateCase } from 'application/use-cases/task/update-task-duedate.usecase.js';
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

describe('UpdateTaskDuedateCase - Integration Tests', () => {
    let useCase: UpdateTaskDuedateCase;

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new UpdateTaskDuedateCase(
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
                taskId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8d',
                dueDate: new Date(Date.now() + 86400000).toISOString()
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
                dueDate: new Date(Date.now() + 86400000).toISOString()
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
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('attacker'), email: UserEmailVo.create('attacker@email.com') });

            // Fire request to verify the aggregate strictly obfuscates the error to protect workspace metadata leakage
            const execution = useCase.execute({
                actorId: stranger.toPrimitives().publicId,
                taskId: task.toPrimitives().publicId,
                dueDate: new Date(Date.now() + 86400000).toISOString()
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw an error if the actor is a project member but is NEITHER the owner nor the task creator', async () => {
            // Establish legitimate administrative authority and baseline workspace profiles within the tenant boundary
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

      
            const creatorMember = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            // Persist a task aggregate bound to the creator to evaluate external modification restrictions
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creatorMember.toPrimitives().id, null);

         
            // Seed a separate admin teammate who, despite having elevated privileges, is not authorized to edit this specific task
            const spectatorUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('spectator'), email: UserEmailVo.create('spectator@email.com') });
            await seedMemberRandom(prisma, projectPrimitives.id, spectatorUser.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Dispatch command to assert that editing rights are constrained to owners and direct creators
            const execution = useCase.execute({
                actorId: spectatorUser.toPrimitives().publicId,
                taskId: task.toPrimitives().publicId,
                dueDate: new Date(Date.now() + 172800000).toISOString()
            });

         
            await expect(execution).rejects.toThrow(TaskErrorFactory.taskNotPermittedToEdit().message);
        });
    });

    describe('Business Rules & Value Object Constraints', () => {

        it('should throw an error if the new dueDate violates domain rules (e.g., past dates)', async () => {
            // Establish valid workspace configurations alongside an active administrative manager context
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creatorMember = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creatorMember.toPrimitives().id, null);

            
            // Generate an invalid payload pointing to a past date relative to the current execution timeline
            const pastDate = new Date(Date.now() - 5 * 86400000);

            // Execute the routine to ensure Value Object guards catch and reject chronological inconsistencies early
            const execution = useCase.execute({
                actorId: owner.toPrimitives().publicId,
                taskId: task.toPrimitives().publicId,
                dueDate: pastDate.toISOString()
            });

    
            await expect(execution).rejects.toThrow(TaskErrorFactory.taskDuedateInconsistency().message);
        });
    });

    describe('Update Task DueDate - Happy Paths', () => {

        it('should successfully update the dueDate if the actor is the task creator', async () => {
            // Establish authorized project workspace configurations alongside an active administrative context
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creatorMember = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creatorMember.toPrimitives().id, null);
            const taskPrimitives = task.toPrimitives();

            // Establish a valid chronological destination satisfying domain temporal conditions
            const futureDate = new Date(Date.now() + 5 * 86400000); 

            // Run the timeline adjustment under fully verified ownership and state alignment
            const result = await useCase.execute({
                actorId: owner.toPrimitives().publicId, 
                taskId: taskPrimitives.publicId,
                dueDate: futureDate.toISOString()
            });

            expect(result.id).toBe(taskPrimitives.publicId);
            expect(result.dueDate).toBe(futureDate.toISOString());

            
            // Query infrastructure directly to confirm state mutations successfully bridged domain aggregates to the database tier
            const updatedDbTask = await prisma.task.findUnique({ where: { id: taskPrimitives.id } });
            expect(updatedDbTask?.due_date.toISOString()).toBe(futureDate.toISOString());
        });

        it('should successfully update the dueDate if the actor is the project owner even if they didnt create the task', async () => {
            // Initialize infrastructure where the primary user is established as the formal system owner of the root workspace
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Setup a separate internal administrator member to act as the primary creator of the target task aggregate
            const adminUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('admin2'), email: UserEmailVo.create('admin2@email.com') });
            const adminMember = await seedMemberRandom(prisma, projectPrimitives.id, adminUser.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            
            const task = await seedTaskRandom(prisma, projectPrimitives.id, adminMember.toPrimitives().id, null);
            const taskPrimitives = task.toPrimitives();

            // Establish a valid chronological destination satisfying domain temporal conditions
            const futureDate = new Date(Date.now() + 10 * 86400000); 

            // Run command targeting the project owner's root authority to verify domain bypass privileges override creator constraints
            const result = await useCase.execute({
                actorId: owner.toPrimitives().publicId, 
                taskId: taskPrimitives.publicId,
                dueDate: futureDate.toISOString()
            });

            expect(result.dueDate).toBe(futureDate.toISOString());

            // Query infrastructure directly to confirm state mutations successfully bridged domain aggregates to the database tier
            const updatedDbTask = await prisma.task.findUnique({ where: { id: taskPrimitives.id } });
            expect(updatedDbTask?.due_date.toISOString()).toBe(futureDate.toISOString());
        });
    });
    
});