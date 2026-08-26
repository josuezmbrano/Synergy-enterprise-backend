import { FindMemberCase } from 'application/use-cases/member/find-member.usecase.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedMemberRandom, seedProjectRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('FindMemberCase - Integration Tests', () => {
    let useCase: FindMemberCase;
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

        useCase = containerDI.modules.member.useCases.findMemberUseCase
    });

    describe('Guards & Global Constraints', () => {

        it('should throw userNotFound if the actorId does not exist', async () => {
            // Setup an unmapped random UUID payload to guarantee an early actor lookup failure
            const execution = useCase.execute({
                actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1',
                memberId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8d'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw projectNotFound if the project publicId does not exist in the database', async () => {
            // Seed a legitimate actor record to pass the identity guard layer safely
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1',
                memberId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8d'
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw projectNotFound if the actor is not linked to the specified project', async () => {
            // Seed the operational actor profile who is unauthorized to view or alter external resources
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            // Seed a distinct separate user account to act as the true owner of the isolated target project
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@email.com') });
            const strangerPrimitives = stranger.toPrimitives();
            const project = await seedProjectRandom(prisma, strangerPrimitives.id);
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, strangerPrimitives.id);

            const spyOnFindProjectMember = vi.spyOn(containerDI.repositories.memberRepository, 'findProjectMember')

            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                memberId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8d'
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
            expect(spyOnFindProjectMember).toHaveBeenCalled()
        });
    });

    describe('Resource Obfuscation & Security Sub-paths', () => {

        it('should throw memberNotFound if the targeted member record does not exist', async () => {
            // Seed a functional manager profile inside the clean isolated database schema
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, { status: MemberStatusVo.create('active') });

            // Dispatch a search using an unmapped random UUID for the member target to trigger standard aggregate absence logic
            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                memberId: 'db710260-e4b5-4b07-9b24-5d51dfbfbc8d'
            });

            await expect(execution).rejects.toThrow(MemberErrorFactory.memberNotFound().message);
        });

        it('should throw memberNotFound if the member exists but belongs to a totally different project', async () => {
            // Seed the authorized actor profile inside their own isolated tracking system scope
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const projectA = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectAPrimitives = projectA.toPrimitives();


            await seedMemberRandom(prisma, projectAPrimitives.id, ownerPrimitives.id, { status: MemberStatusVo.create('active') });


            // Seed an entirely separate context line to isolate cross-project aggregate references
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@email.com') });
            const strangerPrimitives = stranger.toPrimitives();
            const projectB = await seedProjectRandom(prisma, strangerPrimitives.id);
            const projectBPrimitives = projectB.toPrimitives();

            const targetMemberB = await seedMemberRandom(prisma, projectBPrimitives.id, strangerPrimitives.id);
            const targetMemberBPrimitives = targetMemberB.toPrimitives();


            // Attempt to query the separate project B member through the operational scope boundary of project A
            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectAPrimitives.publicId,
                memberId: targetMemberBPrimitives.publicId
            });


            await expect(execution).rejects.toThrow(MemberErrorFactory.memberNotFound().message);
        });

    });

    describe('Find Member - Happy Path', () => {

        it('should return the member details successfully if all criteria match and the actor has rights', async () => {
            // Seed an administrative authority context to fully allow reading pending state entries
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();


            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });


            // Establish the legitimate pending workforce profile to be recovered during query execution
            const pendingUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('juan'), email: UserEmailVo.create('juan@gmail.com') });
            const pendingUserPrimitives = pendingUser.toPrimitives();
            const pendingMember = await seedMemberRandom(prisma, projectPrimitives.id, pendingUserPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('inactive')
            });
            const pendingMemberPrimitives = pendingMember.toPrimitives();


            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                memberId: pendingMemberPrimitives.publicId
            });


            expect(result.id).toBe(pendingMemberPrimitives.publicId);
            expect(result.projectId).toBe(projectPrimitives.publicId);
            expect(result.userId).toBe(pendingUserPrimitives.publicId);
            expect(result.status).toBe('INACTIVE');
            expect(result.role).toBe('CONTRIBUTOR');
            expect(result.createdAt).toBeDefined();
            expect(result.updatedAt).toBeDefined();
        });

        it('should allow a CONTRIBUTOR to successfully fetch another ACTIVE member of the same project', async () => {
            // Seed base infrastructure layout details
            const owner = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, owner.id.value);
            const projectPrimitives = project.toPrimitives();


            // Seed a valid contributor actor profile tracking query clearances inside the shared cluster
            const contributorActor = await seedUserRandom(prisma, { username: UserUsernameVo.create('actor'), email: UserEmailVo.create('actor@email.com') });
            const contributorActorPrimitives = contributorActor.toPrimitives();
            await seedMemberRandom(prisma, projectPrimitives.id, contributorActorPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });


            // Seed a completely separate active teammate profile who can be visibility mapped by peers
            const targetUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('target'), email: UserEmailVo.create('target@email.com') });
            const targetUserPrimitives = targetUser.toPrimitives();
            const targetMember = await seedMemberRandom(prisma, projectPrimitives.id, targetUserPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });
            const targetMemberPrimitives = targetMember.toPrimitives();


            const result = await useCase.execute({
                actorId: contributorActorPrimitives.publicId,
                projectId: projectPrimitives.publicId,
                memberId: targetMemberPrimitives.publicId
            });


            expect(result.id).toBe(targetMemberPrimitives.publicId);
            expect(result.status).toBe('ACTIVE');
            expect(result.role).toBe('CONTRIBUTOR');
        });

    });

});