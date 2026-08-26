import { StartProjectCase } from 'application/use-cases/project/status-usecases/start-project.usecase.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { ProjectStatusVo } from 'core/value-objects/project/project-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedMemberRandom, seedProjectRandom, seedTaskRandom, seedUserRandom } from 'test/utils/db-seeder.js';


describe('StartProjectCase - Integration Tests', () => {
    let useCase: StartProjectCase;
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

        useCase = containerDI.modules.project.useCases.startProjectUseCase
    });

    describe('Guards & Authorization Constraints', () => {

        it('should throw userNotFound if the actorId does not exist', async () => {
            // Setup an unmapped random UUID payload to guarantee an early actor lookup failure
            const execution = useCase.execute({
                actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1'
            });

            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });

        it('should throw projectNotFound if the project publicId does not exist in the system', async () => {
            // Seed a legitimate actor record to pass the identity guard layer safely
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            const execution = useCase.execute({
                actorId: actorPrimitives.publicId,
                projectId: '4f0a20f7-0749-4fb5-9f56-6a56f6fb05b1'
            });

            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectNotFound().message);
        });

        it('should throw projectNotFound (obfuscated) if the actor is not a member', async () => {
            // Seed the operational actor profile who is unauthorized to view or alter external resources
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            // Seed a distinct separate user account to act as the true owner of the isolated target project
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@email.com') });
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

            vi.restoreAllMocks()
        });
    });

    describe('Business Rules Verification (External Aggregates)', () => {

        it('should throw an error if the project has no team members outside of the owner', async () => {
            // Seed a functional owner profile to cross early verification barriers
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();

            // Establish a new project record initialized with a 'planned' staging status state
            const project = await seedProjectRandom(prisma, ownerPrimitives.id, {
                status: ProjectStatusVo.create('planned')
            });
            const projectPrimitives = project.toPrimitives();

            // Attach the manager identity to the directory layout with admin rights
            const ownerMember = await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const ownerMemberPrimitives = ownerMember.toPrimitives();

            // Seed an isolated task record without registering extra workforce participants to violate team requirements
            await seedTaskRandom(prisma, projectPrimitives.id, ownerMemberPrimitives.id, null);

            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });


            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectMembersRequired().message);
        });

        it('should throw an error if the project has team members but has NO tasks seeded', async () => {
            // Seed a legitimate administrator account context
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();

            const project = await seedProjectRandom(prisma, ownerPrimitives.id, { status: ProjectStatusVo.create('planned') });
            const projectPrimitives = project.toPrimitives();

            await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, { role: MemberRoleVo.create('admin'), status: MemberStatusVo.create('active') });

            // Seed an additional valid team participant to fulfill membership invariants while keeping the task registry completely blank
            const collaborator = await seedUserRandom(prisma, { username: UserUsernameVo.create('maria'), email: UserEmailVo.create('maria@email.com') });
            await seedMemberRandom(prisma, projectPrimitives.id, collaborator.id.value, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });


            const execution = useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });


            await expect(execution).rejects.toThrow(ProjectErrorFactory.projectTasksRequired().message);
        });
    });

    describe('Project In Progress - Happy Path', () => {

        it('should successfully change the project status to IN_PROGRESS when it has tasks and team members', async () => {
            // Seed a functional administrative actor inside the clean isolated database schema
            const owner = await seedUserRandom(prisma);
            const ownerPrimitives = owner.toPrimitives();

            // Establish a baseline planned project aggregate instance ready for initialization transitions
            const project = await seedProjectRandom(prisma, ownerPrimitives.id, {
                status: ProjectStatusVo.create('planned')
            });
            const projectPrimitives = project.toPrimitives();

            const ownerMember = await seedMemberRandom(prisma, projectPrimitives.id, ownerPrimitives.id, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });
            const ownerMemberPrimitives = ownerMember.toPrimitives();


            // Register an active operational worker to satisfy structural team size constraints
            const collaborator = await seedUserRandom(prisma, { username: UserUsernameVo.create('colab'), email: UserEmailVo.create('colab@email.com') });
            const collaboratorPrimitives = collaborator.toPrimitives();
            await seedMemberRandom(prisma, projectPrimitives.id, collaboratorPrimitives.id, {
                role: MemberRoleVo.create('contributor'),
                status: MemberStatusVo.create('active')
            });

            // Populate the entity aggregate perimeter with an initial operational task setup
            await seedTaskRandom(prisma, projectPrimitives.id, ownerMemberPrimitives.id, null);


            const preFetchDb = await prisma.project.findUnique({
                where: { id: projectPrimitives.id }
            });
            expect(preFetchDb?.status).toBe('PLANNED');


            const result = await useCase.execute({
                actorId: ownerPrimitives.publicId,
                projectId: projectPrimitives.publicId
            });


            expect(result.id).toBe(projectPrimitives.publicId);
            expect(result.status).toBe('IN_PROGRESS');


            const postFetchDb = await prisma.project.findUnique({
                where: { id: projectPrimitives.id }
            });

            expect(postFetchDb?.status).toBe('IN_PROGRESS');
            expect(postFetchDb?.updated_at).toBeDefined();
        });
    });

});