import { FindAllProjectsCase } from 'application/use-cases/project/find-all-projects.usecase.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { ProjectDescriptionVo } from 'core/value-objects/project/project-description.vo.js';
import { ProjectStatusVo } from 'core/value-objects/project/project-status.vo.js';
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { seedMemberRandom, seedProjectRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('FindAllProjectsCase - Integration Tests', () => {
    let useCase: FindAllProjectsCase;
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

        useCase = containerDI.modules.project.useCases.findAllProjectsUseCase
    });

    describe('User Validations', () => {

        it('should throw userNotFound if the actorId does not exist', async () => {
            // Setup an unmapped random UUID payload to guarantee an early actor lookup failure
            const execution = useCase.execute({ actorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });
            await expect(execution).rejects.toThrow(UserErrorFactory.userNotFound().message);
        });
    });

    describe('Project Retrieval & Visibility Filter', () => {

        it('should return an empty array immediately if the user has no memberships (short-circuit path)', async () => {
            // Seed a legitimate random user record to verify that the query layer optimizes early exits when no linkages exist
            const actor = await seedUserRandom(prisma);
            const primitives = actor.toPrimitives();

            const result = await useCase.execute({ actorId: primitives.publicId });

            expect(result.projects).toBeInstanceOf(Array);
            expect(result.projects.length).toBe(0);
        });

        it('should exclude projects where the user membership status is INACTIVE', async () => {
            // Seed the operational actor profile to undergo visibility filtering constraints
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            // Seed an external user to operate as the baseline creator for the restricted mock projects
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('ramon'), email: UserEmailVo.create('ramon@email.com') });

            // Persist a project entry tied to an explicitly terminated or revoked membership scope
            const dbProjectInactive = await seedProjectRandom(prisma, stranger.id.value, {
                publicId: ProjectIdVo.create(),
                title: ProjectTitleVo.create('Proyecto Expulsado'),
                description: ProjectDescriptionVo.create('Ya no pertenece aquí'),
                ownerId: UserIdVo.fromId(stranger.id.value),
                status: ProjectStatusVo.create('IN_PROGRESS'),
            })

            await seedMemberRandom(prisma, dbProjectInactive.id.value, actor.id.value, {
                status: MemberStatusVo.create('INACTIVE'),
                role: MemberRoleVo.create('CONTRIBUTOR'),
            })

            // Persist a project entry where the user invite has not been formally acknowledged or verified
            const dbProjectPending = await seedProjectRandom(prisma, stranger.id.value, {
                publicId: ProjectIdVo.create(),
                title: ProjectTitleVo.create('Proyecto Invitado'),
                description: ProjectDescriptionVo.create('Invitación pendiente'),
                ownerId: UserIdVo.fromId(stranger.id.value),
                status: ProjectStatusVo.create('PLANNED'),
            })

            await seedMemberRandom(prisma, dbProjectPending.id.value, actor.id.value, {
                status: MemberStatusVo.create('INACTIVE'),
                role: MemberRoleVo.create('CONTRIBUTOR'),
            })

            const result = await useCase.execute({ actorId: actorPrimitives.publicId });

            expect(result.projects.length).toBe(0);

            const projectIdsResult = result.projects.map(p => p.id);
            expect(projectIdsResult).not.toContain(dbProjectInactive.publicId);
            expect(projectIdsResult).not.toContain(dbProjectPending.publicId);
        });

        it('should retrieve only the projects where the user is an active member', async () => {
            // Seed the core actor profile within the clean isolated database schema
            const actor = await seedUserRandom(prisma);
            const actorPrimitives = actor.toPrimitives();

            // Seed a separate user entity to act as an external contributor and owner
            const stranger = await seedUserRandom(prisma, { username: UserUsernameVo.create('pepe'), email: UserEmailVo.create('pepe@gmail.com') });
            const strangerPrimitives = stranger.toPrimitives();

            // Establish a native project completely owned and authorized under the actor's profile context
            const dbProject1 = await seedProjectRandom(prisma, actor.id.value, {
                publicId: ProjectIdVo.fromId('7eb8a2e7-9d7a-4293-9c88-b2a8dca2a8ad'),
                title: ProjectTitleVo.create('Proyecto Propio'),
                description: ProjectDescriptionVo.create('Admin del proyecto'),
                ownerId: UserIdVo.fromId(stranger.id.value),
                status: ProjectStatusVo.create('IN_PROGRESS'),
            })

            await seedMemberRandom(prisma, dbProject1.id.value, actor.id.value, {
                status: MemberStatusVo.create('ACTIVE'),
                role: MemberRoleVo.create('ADMIN'),
            })


            // Establish a shared project where the actor holds an alternative permitted status configuration (ON_LEAVE)
            const dbProject2 = await seedProjectRandom(prisma, stranger.id.value, {
                publicId: ProjectIdVo.fromId('f491de1e-f3b7-44f0-8c29-ec449ff08945'),
                title: ProjectTitleVo.create('Proyecto Compartido'),
                description: ProjectDescriptionVo.create('Invitado como desarrollado'),
                ownerId: UserIdVo.fromId(stranger.id.value),
                status: ProjectStatusVo.create('PLANNED'),
            })

            await seedMemberRandom(prisma, dbProject2.id.value, actor.id.value, {
                status: MemberStatusVo.create('ON_LEAVE'),
                role: MemberRoleVo.create('CONTRIBUTOR'),
            })


            // Establish a fully disconnected project record to enforce complete perimeter multi-tenant isolation boundaries
            const dbProject3 = await seedProjectRandom(prisma, stranger.id.value, {
                publicId: ProjectIdVo.fromId('ad000782-e3ad-4e89-9fa1-e6e1471b0728'),
                title: ProjectTitleVo.create('Proyecto Ajeno'),
                description: ProjectDescriptionVo.create('El actor no debería ver esto jamás'),
                ownerId: UserIdVo.fromId(stranger.id.value),
                status: ProjectStatusVo.create('PLANNED'),
            })

            await seedMemberRandom(prisma, dbProject3.id.value, stranger.id.value, {
                status: MemberStatusVo.create('ACTIVE'),
                role: MemberRoleVo.create('ADMIN'),
            })


            const result = await useCase.execute({ actorId: actorPrimitives.publicId });


            expect(result.projects.length).toBe(2);

            const projectIdsResult = result.projects.map(p => p.id);
            expect(projectIdsResult).toContain(dbProject1.publicId.value);
            expect(projectIdsResult).toContain(dbProject2.publicId.value);
            expect(projectIdsResult).not.toContain(dbProject3.publicId.value);


            const p1Data = result.projects.find(p => p.id === dbProject1.publicId.value);
            const p2Data = result.projects.find(p => p.id === dbProject2.publicId.value);
            expect(p1Data?.ownerId).toBe(actorPrimitives.publicId);
            expect(p2Data?.ownerId).toBe(strangerPrimitives.publicId);
        });
    });

});