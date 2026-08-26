import { FindProjectCase } from 'application/use-cases/project/find-project.usecase.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedMemberRandom, seedProjectRandom, seedUserRandom } from 'test/utils/db-seeder.js';


describe('FindProjectCase - Integration Tests', () => {
    let useCase: FindProjectCase;
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

        useCase = containerDI.modules.project.useCases.findProjectUseCase
    });

    describe('Guards & Authorization Constraints', () => {

        it('should throw userNotFound if the actorId does not exist in the system', async () => {
            // Setup an unmapped random UUID payload to guarantee an early actor lookup failure
            const execution = useCase.execute({
                actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw projectNotFound if the project publicId does not exist', async () => {
            // Seed a legitimate actor record to pass the identity guard layer safely
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1'
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw projectNotFound (obfuscated error) if the project exists but the user is NOT a member', async () => {
            // Seed the operational actor profile who is unauthorized to view or alter external resources
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            // Seed a distinct separate user account to act as the true owner of the isolated target project
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@gmail.com') });
            const strangerPrimitives = stranger.toPrimitives();

            // Persist a valid project entry completely isolated from the main operational actor scope
            const foreignProject = await seedProjectRandom(prisma, strangerPrimitives.id);
            const foreignProjectPrimitives = foreignProject.toPrimitives();

            await seedMemberRandom(prisma, foreignProjectPrimitives.id, strangerPrimitives.id);

            const spyOnFindProjectMember = vi.spyOn(containerDI.repositories.memberRepository, 'findProjectMember')

            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: foreignProjectPrimitives.publicId
            });


            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
            expect(spyOnFindProjectMember).toHaveBeenCalled()

            vi.restoreAllMocks()
        });

        it('should throw projectNotFound if the user has a member record but their status is INACTIVE', async () => {
            // Seed a standard manager profile to attach ownership properties
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();

            // Seed the target actor profile trying to execute the resource lookup operation
            const targetUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('testuser'), email: UserEmailVo.create('test@email.com') });
            const targetPrimitives = targetUser.toPrimitives();

            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();


            // Establish an unauthorized membership record state to test the perimeter isolation logic
            await seedMemberRandom(prisma, projectPrimitives.id, targetPrimitives.id, {
                status: MemberStatusVo.create('inactive')
            });


            const execution = useCase.execute({
                actorId: targetPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });
    });

    describe('Project Query - Happy Path', () => {

        it('should successfully return the project details if the user is an active valid member', async () => {
            // Seed a functional manager profile inside the clean isolated database schema
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();

            // Establish a valid project record instance ready for retrieval testing
            const project = await seedProjectRandom(prisma, ownerPrimitives.id);
            const projectPrimitives = project.toPrimitives();

            // Formally register the actor identity with an allowed active configuration state (ON_LEAVE)
            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, { status: MemberStatusVo.create('on_leave') });


            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });


            expect(result.id).toBe(projectPrimitives.publicId);
            expect(result.title).toBe(projectPrimitives.title);
            expect(result.description).toBe(projectPrimitives.description);
            expect(result.status).toBe(projectPrimitives.status);
            expect(result.category).toBe(projectPrimitives.category);
            expect(result.ownerId).toBe(ownerPrimitives.publicId);
            expect(result.createdAt).toBeDefined();
            expect(result.updatedAt).toBeDefined();
        });
    });

});