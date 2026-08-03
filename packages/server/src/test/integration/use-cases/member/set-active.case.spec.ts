import { SetActiveStatusCase } from 'application/use-cases/member/status/set-active-status.usecase.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserStatusVo } from 'core/value-objects/user/user-status.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedUserRandom } from 'test/utils/db-seeder.js';


describe('SetActiveStatusCase - Integration Tests', () => {
    let useCase: SetActiveStatusCase;

    beforeEach(async () => {

        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new SetActiveStatusCase(
            containerDI.repositories.memberRepository,
            containerDI.repositories.userRepository,
            containerDI.repositories.projectRepository
        );
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
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1', // ID inexistente
                targetMemberId: targetMember.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw memberNotFound if the target member belongs to a different project', async () => {
            // Seed the operational project manager and Project A workspace scope
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();

            const projectA = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectAPrimitives = projectA.toPrimitives();
            await seedMemberRandom(prisma, projectAPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Isolate a foreign account entity and a separate Project B workspace container boundary
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@email.com') });
            const strangerPrimitives = stranger.toPrimitives();
            const projectB = await seedProjectRandom(prisma, strangerPrimitives.id);
            const projectBPrimitives = projectB.toPrimitives();

            // Setup the candidate target profile strictly assigned to the foreign project context space
            const targetMemberB = await seedMemberRandom(prisma, projectBPrimitives.id, strangerPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('inactive')
            });
            const targetMemberBPrimitives = targetMemberB.toPrimitives();

            // Attempt an unaligned multi-tenant modification by crossing the aggregate resource fields
            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectAPrimitives.publicId,
                targetMemberId: targetMemberBPrimitives.publicId
            });

            await expect(execution).rejects.toThrow(MemberErrorFactory.memberNotFound().message);
        });

        it('should obfuscate error and throw projectNotFound if the acting user is NOT a member of the specified project', async () => {
            // Setup base project infrastructure structures managed by the legitimate resource owner
            const realOwner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, realOwner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();


            // Seed a distinct malicious stranger account to simulate an unauthorized security access context
            const strangerActor = await seedUserRandom(prisma, { username: UserUsernameVo.create('impostor'), email: UserEmailVo.create('impostor@email.com') });
            const strangerActorPrimitives = strangerActor.toPrimitives();


            // Persist the legitimate targeted workspace member record requiring operational status shifts
            const targetUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('maria'), email: UserEmailVo.create('maria@email.com') });
            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, targetUser.toPrimitives().id, {
                status: MemberStatusVo.create('inactive')
            });

            const spyOnFindProjectMember = vi.spyOn(containerDI.repositories.memberRepository, 'findProjectMember')

            const execution = useCase.execute({
                actorId: strangerActorPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: targetMember.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
            expect(spyOnFindProjectMember).toHaveBeenCalled()
        });

        it('should throw an error if the acting member is part of the project but lacks ADMIN or OWNER privileges', async () => {
            // Seed base structural records to encapsulate standard context constraints layout
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.toPrimitives().id);
            const projectPrimitives = project.toPrimitives();


            // Seed the operational actor identity restricted to basic contributor system authorization
            const contributorActor = await seedUserRandom(prisma, { username: UserUsernameVo.create('contributor'), email: UserEmailVo.create('contrib@email.com') });
            const contributorActorPrimitives = contributorActor.toPrimitives();
            await seedMemberRandom(prisma, projectPrimitives.id, contributorActorPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            // Setup a distinct target team profile whose state should only be manageable by authority figures
            const targetUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('maria'), email: UserEmailVo.create('maria@email.com') });
            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, targetUser.toPrimitives().id, {
                status: MemberStatusVo.create('inactive')
            });

            const execution = useCase.execute({
                actorId: contributorActorPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: targetMember.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotOwnerOrAdmin().message);
        });

    });

    describe('Business Rules & Target Constraints', () => {

        it('should throw an error if the target user account fails ensureCanOperate constraints', async () => {
            // Seed a functional manager profile to act as the authorized administrative query context
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();


            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });


            // Establish a flawed target user account explicitly violating standard platform operational status conditions
            const targetUser = await seedUserRandom(prisma, {
                username: UserUsernameVo.create('banned'),
                email: UserEmailVo.create('banned@email.com'),
                status: UserStatusVo.create('suspended')
            });
            const targetUserPrimitives = targetUser.toPrimitives();

            // Link the non-operational account to a member instance context requiring clearance changes
            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, targetUserPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('inactive')
            });
            const targetMemberPrimitives = targetMember.toPrimitives();


            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: targetMemberPrimitives.publicId
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotActiveForAction().message)
        });

    });

    describe('Set Active Status - Happy Path', () => {

        it('should successfully change the member status from INACTIVE to ACTIVE and persist it', async () => {
            // Seed an administrative authority context inside the schema layout to pass action clearance checks
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();


            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });


            // Setup a fully active team user profile whose member reference status is currently set to inactive
            const targetUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('maria'), email: UserEmailVo.create('maria@email.com') });
            const targetUserPrimitives = targetUser.toPrimitives();

            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, targetUserPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('inactive')
            });
            const targetMemberPrimitives = targetMember.toPrimitives();


            const preDbFetch = await prisma.member.findUnique({ where: { id: targetMemberPrimitives.id } });
            expect(preDbFetch?.status).toBe('INACTIVE');


            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: targetMemberPrimitives.publicId
            });


            expect(result.id).toBe(targetMemberPrimitives.publicId);
            expect(result.status).toBe('ACTIVE');


            const postDbFetch = await prisma.member.findUnique({ where: { id: targetMemberPrimitives.id } });
            expect(postDbFetch?.status).toBe('ACTIVE');
            expect(postDbFetch?.updated_at).toBeDefined();
        });
    });

});