import { FindAllMembersCase } from 'application/use-cases/member/find-all-members.usecase.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedMemberRandom, seedProjectRandom, seedUserRandom } from 'test/utils/db-seeder.js';



describe('FindAllMembersCase - Integration Tests', () => {
    let useCase: FindAllMembersCase;
    let containerDI: ApplicationContainer
    let prisma: PrismaClient

    beforeAll(() => {
        const env = getEnv()
        containerDI = createContainer(env);
        prisma = containerDI.prisma
    })

    beforeEach(async () => {

        await prisma.verificationToken.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        useCase = containerDI.modules.member.useCases.findAllMembersUseCase
    });

    describe('Guards & Security Constraints', () => {

        it('should throw userNotFound if the actorId does not exist in the system', async () => {
            // Setup an unmapped random UUID payload to guarantee an early actor lookup failure
            const execution = useCase.execute({
                actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw projectNotFound if the project publicId does not exist in the database', async () => {
            // Seed a legitimate actor record to pass the identity guard layer safely
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1'
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw projectNotFound (obfuscated error) if the actor is not a member of the project', async () => {
            // Seed the operational actor profile who is unauthorized to view or alter external resources
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            // Seed a distinct separate user account to act as the true owner of the isolated target project
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@gmail.com') });
            const strangerPrimitives = stranger.toPrimitives();

            // Persist a valid project entry completely isolated from the main operational actor scope
            const project = await seedProjectRandom(prisma, strangerPrimitives.id);
            const projectPrimitives = project.toPrimitives();


            await seedMemberRandom(prisma, projectPrimitives.id, strangerPrimitives.id);

            const spyOnFindProjectMember = vi.spyOn(containerDI.repositories.memberRepository, 'findProjectMember')

            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
            expect(spyOnFindProjectMember).toHaveBeenCalled()
        });
    });

});