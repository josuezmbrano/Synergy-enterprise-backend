import { UpdateTaskInfoCase } from 'application/use-cases/task/update-task-info.usecase.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { TaskDescriptionVo } from 'core/value-objects/task/task-description.vo.js';
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedTaskRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('UpdateTaskInfoCase - Integration Tests', () => {
    let useCase: UpdateTaskInfoCase;

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new UpdateTaskInfoCase(
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
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creator.toPrimitives().id, null);

            // Seed a distinct malicious stranger account to simulate an unauthorized security access context
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('stranger'), email: UserEmailVo.create('stranger@email.com') });

            // Fire request to verify the aggregate strictly obfuscates the error to protect workspace metadata leakage
            const execution = useCase.execute({
                actorId: stranger.toPrimitives().publicId,
                taskId: task.toPrimitives().publicId,
                objective: 'Intento de hack'
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw an error if the actor is a member but is NEITHER project owner NOR task creator', async () => {
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

            // Dispatch command to assert that editing rights are strictly constrained to owners and direct creators
            const execution = useCase.execute({
                actorId: spectatorUser.toPrimitives().publicId,
                taskId: task.toPrimitives().publicId,
                objective: 'Cambiar titulo ajeno'
            });

            await expect(execution).rejects.toThrow(TaskErrorFactory.taskNotPermittedToEdit().message);
        });
    });

    describe('Fast Return & Partial Inputs', () => {

        it('should trigger fast return and NOT modify data if objective and description are absent', async () => {
            // Establish valid workspace configurations alongside an active administrative manager context
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creatorMember = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Persist the targeted task aggregate instance explicitly configured with baseline informational metadata fields
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creatorMember.toPrimitives().id, null, {
                objective: TaskObjectiveVo.create('Original Objective'),
                description: TaskDescriptionVo.create('Original Description')
            });
            const taskPrimitives = task.toPrimitives();

            // Fire an empty payload update request to ensure the application layer short-circuits early before executing database logic
            const result = await useCase.execute({
                actorId: owner.toPrimitives().publicId,
                taskId: taskPrimitives.publicId,
                objective: undefined,
                description: undefined
            });

            expect(result.objective).toBe('Original Objective');
            expect(result.description).toBe('Original Description');
        });

        it('should partially update ONLY the objective and keep the old description intact', async () => {
            // Establish valid workspace configurations alongside an active administrative manager context
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creatorMember = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Persist the task aggregate instance holding structural placeholders to evaluate differential patching
            const task = await seedTaskRandom(prisma, projectPrimitives.id, creatorMember.toPrimitives().id, null, {
                objective: TaskObjectiveVo.create('Old Title'),
                description: TaskDescriptionVo.create('Keep This Description')
            });
            const taskPrimitives = task.toPrimitives();

            // Run a partial info routine to verify that unsupplied properties preserve their original persisted domain states
            const result = await useCase.execute({
                actorId: owner.toPrimitives().publicId,
                taskId: taskPrimitives.publicId,
                objective: 'Brand New Title'
            });

            expect(result.objective).toBe('Brand New Title');
            expect(result.description).toBe('Keep This Description'); 
        });
    });

    describe('Update Task Info - Happy Path', () => {

        it('should successfully update both objective and description and persist them in the database', async () => {
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

            // Run the metadata modification routine under fully satisfied identity, tenant, and role-based permissions
            const result = await useCase.execute({
                actorId: owner.toPrimitives().publicId,
                taskId: taskPrimitives.publicId,
                objective: 'Refactorizar Controladores',
                description: 'Migrar lógicas repetidas hacia middlewares limpios'
            });

            expect(result.objective).toBe('Refactorizar Controladores');
            expect(result.description).toBe('Migrar lógicas repetidas hacia middlewares limpios');

            // Query infrastructure directly to confirm state mutations successfully bridged domain aggregates to the database tier
            const dbTask = await prisma.task.findUnique({ where: { id: taskPrimitives.id } });
            expect(dbTask?.objective).toBe('Refactorizar Controladores');
            expect(dbTask?.description).toBe('Migrar lógicas repetidas hacia middlewares limpios');
        });
    });

});