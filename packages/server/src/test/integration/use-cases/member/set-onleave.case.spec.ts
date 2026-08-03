import { SetOnLeaveStatusCase } from 'application/use-cases/member/status/set-onleave-status.usecase.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { containerDI } from 'infrastructure/container/di.config.js';
import prisma from 'infrastructure/lib/prisma.js';
import { seedMemberRandom, seedProjectRandom, seedTaskRandom, seedUserRandom } from 'test/utils/db-seeder.js';


describe('SetOnLeaveStatusCase - Integration Tests', () => {
    let useCase: SetOnLeaveStatusCase;

    beforeEach(async () => {

        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = new SetOnLeaveStatusCase(
            containerDI.repositories.memberRepository,
            containerDI.repositories.userRepository,
            containerDI.repositories.projectRepository,
            containerDI.repositories.taskRepository
        );
    });

    describe('Guards & Resource Matching Constraints', () => {

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

        it('should throw memberNotFound if the targeted member is assigned to a different project', async () => {
            // Seed the operational project manager and Project A workspace scope
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();


            const projectA = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectAPrimitives = projectA.toPrimitives();
            await seedMemberRandom(prisma, projectAPrimitives.id, ownerPrimitives.id, { role: MemberRoleVo.create('admin') });


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

    describe('Business Rules & Infrastructure Quotas', () => {

        it('should throw an error if the target is the ONLY active admin in the project', async () => {
            // Setup a project workspace where the current owner stands as the solitary administrative authority
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();


            const ownerMember = await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const ownerMemberPrimitives = ownerMember.toPrimitives();

            // Fire execution targeting the sole admin to assert the domain locks project leadership from becoming unmanaged
            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: ownerMemberPrimitives.publicId
            });


            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNoBackupAdmin().message);
        });

        it('should throw an error if the target member has pending tasks assigned in the project', async () => {
            // Seed base structural records to encapsulate standard context constraints layout
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();


            const firstAdminUser = await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });


            // Setup a backup admin target user profile whose operational state is under validation
            const secondAdminUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('juan'), email: UserEmailVo.create('juan@email.com') });
            const secondAdminPrimitives = secondAdminUser.toPrimitives();
            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, secondAdminPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const targetMemberPrimitives = targetMember.toPrimitives();


            // Bind an active, unresolved task entity to the target member to violate relational integrity constraints
            await seedTaskRandom(prisma, projectPrimitives.id, firstAdminUser.id.value, targetMemberPrimitives.id, { status: TaskStatusVo.create('doing') });


            // Attempt transition to ON_LEAVE to ensure domain validation blocks active personnel from leaving tasks stranded
            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: targetMemberPrimitives.publicId
            });

            await expect(execution).rejects.toThrow(MemberErrorFactory.memberActiveTasksOnLeave().message);
        });

        it('should throw an error if trying to set ON_LEAVE a contributor and it breaches the minimum contributor quota', async () => {
            // Establish the project boundary under strict minimum staff quota policies
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();


            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });


            // Seed the target contributor teammate whose departure would violate minimum structural thresholds
            const contributorUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('solo-worker'), email: UserEmailVo.create('worker@email.com') });
            const contributorPrimitives = contributorUser.toPrimitives();
            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, contributorPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });


            // Add fewer active teammates than required to meet the systemic workforce backup limits
            const contributors = [
                { username: UserUsernameVo.create('solo-worker-two'), email: UserEmailVo.create('luis@ejemplo.com') },
                { username: UserUsernameVo.create('solo-worker-three'), email: UserEmailVo.create('maria@ejemplo.com') },
            ]

            for (const contributor of contributors) {
                const contributorUser = await seedUserRandom(prisma, {username: contributor.username, email: contributor.email})
                const primitives = contributorUser.toPrimitives()
                await seedMemberRandom(prisma, projectPrimitives.id, primitives.id, {
                    role: MemberRoleVo.create('contributor'),
                    status: MemberStatusVo.create('active')
                })
            }


            // Execute the routine expecting a quota business rule rejection
            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: targetMember.toPrimitives().publicId
            });


            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNoBackupContributors().message);
        });
    });

    describe('Set On Leave - Happy Path', () => {

        it('should successfully update the member status to ON_LEAVE when all conditions and quotas are satisfied', async () => {
            // Seed a project workspace with a multi-admin setup to satisfy administrative coverage policies
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();


            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });


            // Setup a distinct secondary admin teammate profile without any pending task blockages
            const targetUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('maria'), email: UserEmailVo.create('maria@email.com') });
            const targetUserPrimitives = targetUser.toPrimitives();

            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, targetUserPrimitives.id, {
                role: MemberRoleVo.create('admin'),
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
            expect(result.status).toBe('ON_LEAVE');


            const postDbFetch = await prisma.member.findUnique({ where: { id: targetMemberPrimitives.id } });
            expect(postDbFetch?.status).toBe('ON_LEAVE');
            expect(postDbFetch?.updated_at).toBeDefined();
        });

        it('should successfully set status to ON_LEAVE for a CONTRIBUTOR if the project quota is satisfied', async () => {
            // Establish base infrastructure layout details managed by the true project owner
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });


            const backupUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('backup'), email: UserEmailVo.create('backup@email.com') });
            await seedMemberRandom(prisma, projectPrimitives.id, backupUser.toPrimitives().id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });


            // Persist a target contributor teammate alongside an abundant pool of active personnel
            const targetUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('maria'), email: UserEmailVo.create('maria@email.com') });
            const targetUserPrimitives = targetUser.toPrimitives();
            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, targetUserPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            const contributors = [
                { username: UserUsernameVo.create('solo-worker-two'), email: UserEmailVo.create('luis@ejemplo.com') },
                { username: UserUsernameVo.create('solo-worker-three'), email: UserEmailVo.create('maria@ejemplo.com') },
                { username: UserUsernameVo.create('solo-worker-four'), email: UserEmailVo.create('juan@ejemplo.com') }
            ]

            for (const contributor of contributors) {
                const contributorUser = await seedUserRandom(prisma, {username: contributor.username, email: contributor.email})
                const primitives = contributorUser.toPrimitives()
                await seedMemberRandom(prisma, projectPrimitives.id, primitives.id, {
                    role: MemberRoleVo.create('contributor'),
                    status: MemberStatusVo.create('active')
                })
            }

         
            // Execute the operational update under fully satisfied system safety margins
            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                targetMemberId: targetMember.toPrimitives().publicId
            });

            expect(result.id).toBe(targetMember.toPrimitives().publicId);
            expect(result.status).toBe('ON_LEAVE');
            expect(result.role).toBe('CONTRIBUTOR');
        });

    });

});