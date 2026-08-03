import { SetContributorRoleCase } from 'application/use-cases/member/role/set-contributor-role.usecase.js';
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


describe('SetContributorRoleCase - Integration Tests', () => {
    let useCase: SetContributorRoleCase;

    beforeEach(async () => {

        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new SetContributorRoleCase(
            containerDI.repositories.memberRepository,
            containerDI.repositories.userRepository,
            containerDI.repositories.projectRepository
        );
    });

    describe('Guards & Authorization Constraints', () => {

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

        it('should throw memberNotFound if the targeted member exists but is linked to a different project', async () => {
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
            const projectB = await seedProjectRandom(prisma, stranger.toPrimitives().id);
            
            // Setup the candidate target profile strictly assigned to the foreign project context space
            const targetMemberB = await seedMemberRandom(prisma, projectB.toPrimitives().id, stranger.toPrimitives().id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Attempt an unaligned multi-tenant modification by crossing the aggregate resource fields
            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectAPrimitives.publicId,
                targetMemberId: targetMemberB.toPrimitives().publicId
            });

            await expect(execution).rejects.toThrow(MemberErrorFactory.memberNotFound().message);
        });

        it('should throw an error if the acting user is NOT the owner of the project', async () => {
            // Establish the legitimate project manager profile and resource inside the directory structure
            const realOwner = await seedUserRandom(prisma);
            const realOwnerPrimitives = realOwner.toPrimitives();
            const project = await seedProjectRandom(prisma, realOwnerPrimitives.id);
            const projectPrimitives = project.toPrimitives();


            // Seed a separate malicious actor profile acting as the unmapped system breach context
            const attacker = await seedUserRandom(prisma, { username: UserUsernameVo.create('malicioso'), email: UserEmailVo.create('hacker@email.com') });
            const attackerPrimitives = attacker.toPrimitives();
            await seedMemberRandom(prisma, projectPrimitives.id, attackerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });


            // Persist the legitimate targeted workspace member record requiring operational role downgrades
            const targetUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('maria'), email: UserEmailVo.create('maria@email.com') });
            const targetUserPrimitives = targetUser.toPrimitives();
            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, targetUserPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const targetMemberPrimitives = targetMember.toPrimitives();

            const execution = useCase.execute({
                actorId: attackerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: targetMemberPrimitives.publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotOwner().message);
        });
    });

    describe('Business Rules & Ownership Safety', () => {

        it('should throw an error if the targeted member is the project owner', async () => {
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
    });

    describe('Set Contributor Role - Happy Path', () => {

        it('should successfully update an admin member to contributor role when executed by the owner', async () => {
            // Seed an administrative authority context inside the schema layout to pass action clearance checks
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Setup a fully active team user profile whose member reference role is currently set to admin
            const targetUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('juan'), email: UserEmailVo.create('juan@email.com') });
            const targetUserPrimitives = targetUser.toPrimitives();
            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, targetUserPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const targetMemberPrimitives = targetMember.toPrimitives();

            const preDbFetch = await prisma.member.findUnique({ where: { id: targetMemberPrimitives.id } });
            expect(preDbFetch?.role).toBe('ADMIN');

            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: targetMemberPrimitives.publicId
            });

            expect(result.id).toBe(targetMemberPrimitives.publicId);
            expect(result.role).toBe('CONTRIBUTOR');

            const postDbFetch = await prisma.member.findUnique({ where: { id: targetMemberPrimitives.id } });
            expect(postDbFetch?.role).toBe('CONTRIBUTOR');
            expect(postDbFetch?.updated_at).toBeDefined();
        });

        it('should remain idempotent and successfully return the output if the member is ALREADY a contributor', async () => {
            // Seed base infrastructure layout details managed by the true project owner
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            // Persist a targeted teammate record who already possesses the target privilege level
            const contributorUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('pedro'), email: UserEmailVo.create('pedro@email.com') });
            const contributorMember = await seedMemberRandom(prisma, projectPrimitives.id, contributorUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'), 
                status: MemberStatusVo.create('active')
            });
            const contributorMemberPrimitives = contributorMember.toPrimitives();

            // Fire the execution to guarantee the domain tier safely bypasses re-updating redundant states
            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: contributorMemberPrimitives.publicId
            });

            expect(result.id).toBe(contributorMemberPrimitives.publicId);
            expect(result.role).toBe('CONTRIBUTOR');

            const dbCheck = await prisma.member.findUnique({ where: { id: contributorMemberPrimitives.id } });
            expect(dbCheck?.role).toBe('CONTRIBUTOR');
        });

    });
    
});