import { CreateTaskCase } from 'application/use-cases/task/create-task.usecase.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('CreateTaskCase - Integration Tests', () => {
    let useCase: CreateTaskCase;

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new CreateTaskCase(
            containerDI.repositories.taskRepository,
            containerDI.repositories.userRepository,
            containerDI.repositories.projectRepository,
            containerDI.repositories.memberRepository
        );
    });

    describe('Guards & Authorization Constraints', () => {

        it('should throw userNotFound if the actingUserId does not exist', async () => {
            // Setup an unmapped random UUID payload to guarantee an early actor lookup failure
            const execution = useCase.execute({
                actingUserId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1',
                objective: 'Diseñar arquitectura de persistencia',
                description: 'Definir interfaces para repositorios en core',
                priority: 'HIGH',
                dueDate: new Date(Date.now() + 86400000).toISOString()
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw projectNotFound if the project publicId does not exist', async () => {
            // Seed a legitimate actor record to pass the initial identity guard layer safely
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            // Dispatch an operation containing an unmapped project UUID to force an infrastructure lookup failure
            const execution = useCase.execute({
                actingUserId: actorPrimitives.publicId,
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1',
                objective: 'Diseñar arquitectura de persistencia',
                description: 'Definir interfaces para repositorios en core',
                priority: 'HIGH',
                dueDate: new Date(Date.now() + 86400000).toISOString()
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should obfuscate error and throw projectNotFound if the actor is NOT a member of the project', async () => {
            // Setup base project infrastructure structures managed by the legitimate resource owner
            const realOwner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, realOwner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            // Seed a distinct malicious stranger account to simulate an unauthorized security access context
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('impostor'), email: UserEmailVo.create('impostor@email.com') });

            // Fire request to verify the aggregate strictly obfuscates the error to protect workspace metadata leakage
            const execution = useCase.execute({
                actingUserId: stranger.toPrimitives().publicId,
                projectId: projectPrimitives.publicId,
                objective: 'Hackear el sistema',
                description: 'Inyección de datos',
                priority: 'HIGH',
                dueDate: new Date(Date.now() + 86400000).toISOString()
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw an error if the acting member is part of the project but does NOT have admin privileges', async () => {
            // Setup base workspace parameters linked to a valid infrastructure owner account
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            // Persist a restricted contributor teammate record within the targeted project boundaries
            const contributorUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@email.com') });
            await seedMemberRandom(prisma, projectPrimitives.id, contributorUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            // Dispatch execution to verify RBAC shields intercept the transaction before mutation steps
            const execution = useCase.execute({
                actingUserId: contributorUser.toPrimitives().publicId,
                projectId: projectPrimitives.publicId,
                objective: 'Crear tarea sin permisos',
                description: 'Debería fallar por jerarquía',
                priority: 'LOW',
                dueDate: new Date(Date.now() + 86400000).toISOString()
            });

            
            await expect(execution).rejects.toThrow(MemberErrorFactory.memberCreateForbidden().message);
        });
    });

    describe('Resource Alignment & Assignee Validation', () => {

        it('should throw memberNotFound if the assigneeMemberId belongs to a completely different project', async () => {
            // Seed the operational administrative authority and the legitimate Project A workspace container
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

  
            // Isolate a separate Project B workspace container boundary and a foreign account record
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('stranger'), email: UserEmailVo.create('stranger@email.com') });
            const projectB = await seedProjectRandom(prisma, stranger.toPrimitives().id);
            const targetMemberB = await seedMemberRandom(prisma, projectB.toPrimitives().id, stranger.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            // Attempt an unaligned multi-tenant cross-contamination task assignment across distinct aggregate contexts
            const execution = useCase.execute({
                actingUserId: owner.toPrimitives().publicId,
                projectId: projectPrimitives.publicId,
                assigneeMemberId: targetMemberB.toPrimitives().publicId, 
                objective: 'Asignar tarea cruzada',
                description: 'Debería lanzar error de desalineación',
                priority: 'MEDIUM',
                dueDate: new Date(Date.now() + 86400000).toISOString()
            });

            await expect(execution).rejects.toThrow(MemberErrorFactory.memberNotFound().message);
        });

        it('should throw an error if the assignee member exists in the project but is NOT active (e.g. ON_LEAVE)', async () => {
            // Setup base project infrastructure structures managed by the legitimate resource owner
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Seed a team user whose membership reference status is explicitly set to an inactive domain state
            const sickUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('maria'), email: UserEmailVo.create('maria@email.com') });
            const inactiveMember = await seedMemberRandom(prisma, projectPrimitives.id, sickUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('on_leave')
            });

            // Attempt assignment to enforce the domain validation rule ensuring tasks are only routed to operational staff
            const execution = useCase.execute({
                actingUserId: owner.toPrimitives().publicId,
                projectId: projectPrimitives.publicId,
                assigneeMemberId: inactiveMember.toPrimitives().publicId,
                objective: 'Asignar a alguien de licencia',
                description: 'Rompe regla ensureisActive',
                priority: 'MEDIUM',
                dueDate: new Date(Date.now() + 86400000).toISOString()
            });

       
            await expect(execution).rejects.toThrow(MemberErrorFactory.memberNotActive().message);
        });
    });

    describe('Create Task - Happy Path', () => {

        it('should successfully create and persist a task with a valid assignee active in the project', async () => {
            // Establish authorized project workspace configurations alongside an active administrative manager
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            const creatorMember = await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Setup a fully active, legitimate team contributor profile to handle task assignment fulfillment
            const developerUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('dev'), email: UserEmailVo.create('dev@email.com') });
            const developerMember = await seedMemberRandom(prisma, projectPrimitives.id, developerUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });
            const developerPrimitives = developerMember.toPrimitives();

            const targetDueDate = new Date(Date.now() + 86400000);

            // Execute the routine under fully satisfied security, alignment, and status safety constraints
            const result = await useCase.execute({
                actingUserId: owner.toPrimitives().publicId,
                projectId: projectPrimitives.publicId,
                assigneeMemberId: developerPrimitives.publicId,
                objective: 'Implementar CreateTaskCase',
                description: 'Aplicar guardas y mapeadores limpios',
                priority: 'HIGH',
                dueDate: targetDueDate.toISOString()
            });


            expect(result.id).toBeDefined();
            expect(result.projectId).toBe(projectPrimitives.publicId);
            expect(result.creatorId).toBe(creatorMember.toPrimitives().publicId);
            expect(result.assignedTo).toBe(developerPrimitives.publicId);
            expect(result.status).toBe('TODO');
            expect(result.priority).toBe('HIGH');
            expect(result.dueDate).toBe(targetDueDate.toISOString());

     
            const postDbFetch = await prisma.task.findFirst({ where: { objective: 'Implementar CreateTaskCase' } });
            expect(postDbFetch).toBeTruthy();
            expect(postDbFetch?.status).toBe('TODO');
            expect(postDbFetch?.assigned_to).toBe(developerPrimitives.id);
        });

        it('should successfully create a task without an assignee (assignedTo as null)', async () => {
            // Establish legitimate administrative authority and baseline workspace profiles
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, owner.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Dispatch execution bypassing optional assignment properties to assert unassigned backlog capabilities
            const result = await useCase.execute({
                actingUserId: owner.toPrimitives().publicId,
                projectId: projectPrimitives.publicId,
                assigneeMemberId: undefined, 
                objective: 'Tarea del Backlog Global',
                description: 'Nadie la ha tomado aún',
                priority: 'LOW',
                dueDate: new Date(Date.now() + 86400000).toISOString()
            });

            expect(result.assignedTo).toBeNull();

            const postDbFetch = await prisma.task.findFirst({ where: { objective: 'Tarea del Backlog Global' } });
            expect(postDbFetch?.assigned_to).toBeNull();
        });
    });

});