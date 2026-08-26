import { SetInactiveStatusCase } from 'application/use-cases/member/status/set-inactive-status.usecase.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedMemberRandom, seedProjectRandom, seedTaskRandom, seedUserRandom } from 'test/utils/db-seeder.js';


describe('SetInactiveStatusCase - Integration Tests', () => {
    let useCase: SetInactiveStatusCase;
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

        useCase = containerDI.modules.member.useCases.setInactiveStatusUseCase
    });

    describe('Guards & Resource Alignment', () => {

        it('should throw userNotFound if the actorId does not exist', async () => {
            // Setup an unmapped random UUID payload to guarantee an early actor lookup failure
            const execution = useCase.execute({
                actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1',
                targetMemberId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8d'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw projectNotFound if the project publicId does not exist in the database', async () => {
            // Seed a legitimate actor record to pass the identity guard layer safely
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            // Establish a valid target profile to pass baseline domain structural validation checks
            const targetUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('maria'), email: UserEmailVo.create('maria@email.com') });
            const targetUserPrimitives = targetUser.toPrimitives();

            const dummyProject = await seedProjectRandom(prisma, actorPrimitives.id);
            const targetMember = await seedMemberRandom(prisma, dummyProject.toPrimitives().id, targetUserPrimitives.id);

            // Dispatch an operation containing an unmapped project UUID to force an infrastructure lookup failure
            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1',
                targetMemberId: targetMember.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw memberNotFound if the targeted member belongs to a different project', async () => {
            // Seed the operational project manager and Project A workspace scope
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();


            const projectA = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectAPrimitives = projectA.toPrimitives();
            await seedMemberRandom(prisma, projectAPrimitives.id, ownerPrimitives.id, { role: MemberRoleVo.create('admin'), status: MemberStatusVo.create('active') });


            // Isolate a foreign account entity and a separate Project B workspace container boundary
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@email.com') });
            const strangerPrimitives = stranger.toPrimitives();
            const projectB = await seedProjectRandom(prisma, strangerPrimitives.id);
            const projectBPrimitives = projectB.toPrimitives();

            // Setup the candidate target profile strictly assigned to the foreign project context space
            const targetMemberB = await seedMemberRandom(prisma, projectBPrimitives.id, strangerPrimitives.id);
            const targetMemberBPrimitives = targetMemberB.toPrimitives();


            // Attempt an unaligned multi-tenant modification by crossing the aggregate resource fields
            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectAPrimitives.publicId,
                targetMemberId: targetMemberBPrimitives.publicId
            });

            await expect(execution).rejects.toThrow(MemberErrorFactory.memberNotFound().message);
        });

        it('should obfuscate error and throw projectNotFound if the acting user is NOT a member of the project', async () => {
            // Setup base project infrastructure structures managed by the legitimate resource owner
            const realOwner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, realOwner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();


            // Seed a distinct malicious stranger account to simulate an unauthorized security access context
            const strangerActor = await seedUserRandom(prisma, { username: UserUsernameVo.create('impostor'), email: UserEmailVo.create('impostor@email.com') });
            const strangerActorPrimitives = strangerActor.toPrimitives();

            // Persist the legitimate targeted workspace member record requiring operational state shifts
            const targetUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('maria'), email: UserEmailVo.create('maria@email.com') });
            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, targetUser.toPrimitives().id, {
                status: MemberStatusVo.create('active')
            });

            const execution = useCase.execute({
                actorId: strangerActorPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: targetMember.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });
    });

    describe('Business Rules & Ownership Constraints', () => {

        it('should throw an error if trying to deactivate a member who is the current owner of the project', async () => {
            // Setup a clear system owner context tracking early verification layers
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();


            // Reference the aggregate root creator as a member to assert absolute ownership immunity locks
            const ownerMember = await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const ownerMemberPrimitives = ownerMember.toPrimitives();


            // Dispatch an operations command targeting the system's own structural cornerstone
            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: ownerMemberPrimitives.publicId
            });


            await expect(execution).rejects.toThrow(MemberErrorFactory.memberOwnerLocked().message);
        });

        it('should throw an error if the targeted member has pending tasks within the project', async () => {
            // Seed base structural records to encapsulate standard context constraints layout
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();

            const firstAdmin = await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Setup a distinct target team profile whose operational state is under validation
            const contributorUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('juan'), email: UserEmailVo.create('juan@email.com') });
            const contributorPrimitives = contributorUser.toPrimitives();
            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, contributorPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });
            const targetMemberPrimitives = targetMember.toPrimitives();

            // Bind an active, unresolved task entity to the target member to violate relational integrity constraints
            await seedTaskRandom(prisma, projectPrimitives.id, firstAdmin.id.value, targetMemberPrimitives.id, {
                status: TaskStatusVo.create('doing')
            });


            // Attempt deactivation to ensure domain validation shields prevent unassigned orphan tasks
            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: targetMemberPrimitives.publicId
            });


            await expect(execution).rejects.toThrow(MemberErrorFactory.memberActiveTasksInactivate().message);
        });
    });

    describe('Set Inactive Status - Happy Path', () => {

        it('should successfully set the member status to INACTIVE and persist it to Postgres', async () => {
            // Seed an administrative authority context inside the schema layout to pass action clearance checks
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();


            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });


            // Setup a fully active team user profile whose member reference status is currently set to active
            const targetUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('maria'), email: UserEmailVo.create('maria@email.com') });
            const targetUserPrimitives = targetUser.toPrimitives();

            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, targetUserPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });
            const targetMemberPrimitives = targetMember.toPrimitives();


            const preDbFetch = await prisma.member.findUnique({ where: { id: targetMemberPrimitives.id } });
            expect(preDbFetch?.status).toBe('ACTIVE');


            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: targetMemberPrimitives.publicId
            });


            expect(result.id).toBe(targetMemberPrimitives.publicId);
            expect(result.status).toBe('INACTIVE');


            const postDbFetch = await prisma.member.findUnique({ where: { id: targetMemberPrimitives.id } });
            expect(postDbFetch?.status).toBe('INACTIVE');
            expect(postDbFetch?.updated_at).toBeDefined();
        });

        it('should allow an ADMIN member to successfully self-deactivate if they have no pending tasks', async () => {
            // Seed base infrastructure layout details managed by the true project owner
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();


            // Persist a secondary administrator profile who has no active operational dependencies inside the project
            const adminUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('secondary-admin'), email: UserEmailVo.create('admin2@email.com') });
            const adminPrimitives = adminUser.toPrimitives();

            const adminMember = await seedMemberRandom(prisma, projectPrimitives.id, adminPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const adminMemberPrimitives = adminMember.toPrimitives();


            // Execute the routine with matching actor and target IDs to validate the self-deactivation capability path
            const result = await useCase.execute({
                actorId: adminPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: adminMemberPrimitives.publicId
            });

            expect(result.id).toBe(adminMemberPrimitives.publicId);
            expect(result.status).toBe('INACTIVE');

            const dbMember = await prisma.member.findUnique({ where: { id: adminMemberPrimitives.id } });
            expect(dbMember?.status).toBe('INACTIVE');
        });

    });

});