import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { PrismaProjectRepository } from 'infrastructure/repositories/project.prisma.js';
import { ProjectMother } from 'test/builders/project.mother.js';
import { seedProjectDefault, seedProjectRandom, seedUserDefault, seedUserRandom } from 'test/utils/db-seeder.js';
import { ProjectCategoryVo } from 'core/value-objects/project/project-category.vo.js';
import { InfraDomainError } from 'core/errors/domain/domain-classes.error.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { getEnv } from 'infrastructure/config/env.config.js';

describe('PrismaProjectRepository - Integration Tests', () => {
    let projectRepository: PrismaProjectRepository;
    let containerDI: ApplicationContainer
    let prisma: PrismaClient

    beforeAll(() => {
        const env = getEnv()
        containerDI = createContainer(env);
        prisma = containerDI.prisma
    })

    beforeEach(async () => {
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        projectRepository = new PrismaProjectRepository(prisma);

    });

    describe('save()', () => {

        it('should successfully INSERT a new project when it does not exist', async () => {
            const owner = await seedUserDefault(prisma);
            const newProject = ProjectMother.createWithPersonalizedProps({ ownerId: owner.id });

            const savedProject = await projectRepository.save(newProject);

            expect(savedProject.id.value).toBe(newProject.id.value);

            const dbProject = await prisma.project.findUnique({
                where: { id: newProject.id.value },
                include: { owner: true }
            });

            expect(dbProject).toBeTruthy();
            expect(dbProject?.title).toBe(newProject.title.value);
            expect(dbProject?.owner_id).toBe(owner.id.value);
            expect(dbProject?.owner).toBeTruthy();
        });

        it('should successfully UPDATE an existing project when save() is called again (Upsert)', async () => {
            const owner = await seedUserDefault(prisma);
            const storedProject = await seedProjectDefault(prisma, owner.id.value);

            const updatedProject = ProjectMother.reconstituteDefault({
                ownerId: owner.id,
                title: ProjectTitleVo.create('Updated Project Title')
            });

            await projectRepository.save(updatedProject);

            const dbProject = await prisma.project.findUnique({
                where: { id: storedProject.id.value },
            });

            expect(dbProject).toBeTruthy();
            expect(dbProject?.title).toBe('Updated Project Title');
        });

        it('should successfully UPDATE mutable fields, ignore immutable ones, and retain the owner public id', async () => {
            const owner = await seedUserDefault(prisma);
            const storedProject = await seedProjectDefault(prisma, owner.id.value);


            const domainProjectWithChanges = ProjectEntityClass.reconstitute(
                {
                    publicId: storedProject.publicId,
                    title: ProjectTitleVo.create('Strictly Updated Title'),
                    description: storedProject.description,
                    category: ProjectCategoryVo.create(ProjectCategoryVo.MAINTENANCE_SUPPORT),
                    status: storedProject.status,
                    ownerId: owner.id,
                    completedAt: null,
                    archivedAt: null
                },
                storedProject.id,
                storedProject.createdAtDate,
                storedProject.updatedAtDate,
                owner.publicId
            );

            const savedProject = await projectRepository.save(domainProjectWithChanges);

            expect(savedProject.ownerPublicId).toBeTruthy();
            expect(savedProject.ownerPublicId?.value).toBe(owner.publicId.value);

            const dbProject = await prisma.project.findUnique({
                where: { id: storedProject.id.value },
            });


            expect(dbProject?.title).toBe('Strictly Updated Title');
        });
    });

    describe('findByPublicId()', () => {

        it('should return the mapped project domain entity when the public_id exists', async () => {
            const owner = await seedUserDefault(prisma);
            const storedProject = await seedProjectDefault(prisma, owner.id.value);

            const result = await projectRepository.findByPublicId(storedProject.publicId);

            expect(result).toBeInstanceOf(ProjectEntityClass);
            expect(result?.title.value).toBe(storedProject.title.value);
            expect(result?.id.value).toBe(storedProject.id.value);
            expect(result?.ownerPublicId).toBeTruthy();
            expect(result?.ownerPublicId?.value).toBe(owner.publicId.value);
        });

        it('should return null cleanly when the searched public_id does not exist', async () => {
            const result = await projectRepository.findByPublicId(ProjectIdVo.create());
            expect(result).toBeNull();
        });

    });

    describe('findById()', () => {

        it('should return the mapped project domain entity when the internal id exists', async () => {
            const owner = await seedUserDefault(prisma);
            const storedProject = await seedProjectDefault(prisma, owner.id.value);

            const result = await projectRepository.findById(storedProject.id);

            expect(result).toBeInstanceOf(ProjectEntityClass);
            expect(result?.id.value).toBe(storedProject.id.value);
            expect(result?.ownerPublicId).toBeTruthy();
            expect(result?.ownerPublicId?.value).toBe(owner.publicId.value);
        });

        it('should return null cleanly when the searched internal id does not exist', async () => {
            const result = await projectRepository.findById(ProjectIdVo.create());
            expect(result).toBeNull();
        });

    });

    describe('findAllVisibleForUser()', () => {

        it('should return projects where the user is the owner OR the project ID is in the allowed list', async () => {

            const primaryUser = await seedUserDefault(prisma);
            const externalUser = await seedUserRandom(prisma, { username: UserUsernameVo.create('another'), email: UserEmailVo.create('otheremail@gmail.com') });

            const projectOwned = await seedProjectDefault(prisma, primaryUser.id.value);

            const projectShared = await seedProjectRandom(prisma, externalUser.id.value);

            const projectHidden = await seedProjectRandom(prisma, externalUser.id.value);

            const allowedIds = [projectShared.id];

            const results = await projectRepository.findAllVisibleForUser(allowedIds, primaryUser.id);

            expect(results).toHaveLength(2);

            const resultIds = results.map(p => p.id.value);
            expect(resultIds).toContain(projectOwned.id.value);
            expect(resultIds).toContain(projectShared.id.value);
            expect(resultIds).not.toContain(projectHidden.id.value);
        });

        it('should return an empty array if no projects match the conditions', async () => {
            const user = await seedUserDefault(prisma);

            const results = await projectRepository.findAllVisibleForUser([], user.id);
            expect(results).toEqual([]);
        });

        it('should return ONLY owned projects if the allowed IDs array is empty but user has active projects', async () => {
            const primaryUser = await seedUserDefault(prisma);
            const externalUser = await seedUserRandom(prisma, {
                username: UserUsernameVo.create('another'),
                email: UserEmailVo.create('otheremail@gmail.com')
            });

            const projectOwned = await seedProjectDefault(prisma, primaryUser.id.value);
            await seedProjectRandom(prisma, externalUser.id.value);

            const results = await projectRepository.findAllVisibleForUser([], primaryUser.id);

            expect(results).toHaveLength(1);
            expect(results[0].id.value).toBe(projectOwned.id.value);

            expect(results[0].ownerPublicId?.value).toBe(primaryUser.publicId.value);
        });

    });

    describe('exists()', () => {

        it('should return true if a project with the same title exists for the user (case-insensitive)', async () => {
            const owner = await seedUserDefault(prisma);

            const titleMixed = ProjectTitleVo.create('mY-aWeSoMe-pRoJeCt');
            await seedProjectDefault(prisma, owner.id.value, { title: titleMixed });

            const searchTitle = ProjectTitleVo.create('MY-AWESOME-PROJECT');
            const exists = await projectRepository.exists(owner.id, searchTitle);

            expect(exists).toBe(true);
        });

        it('should return false if the title matches but belongs to a different owner', async () => {
            const ownerA = await seedUserDefault(prisma);
            const ownerB = await seedUserRandom(prisma, { username: UserUsernameVo.create('another'), email: UserEmailVo.create('otheremail@gmail.com') });

            const title = ProjectTitleVo.create('shared-title');
            await seedProjectDefault(prisma, ownerA.id.value, { title });

            const exists = await projectRepository.exists(ownerB.id, title);

            expect(exists).toBe(false);
        });

        it('should return false if the project title does not exist in the system', async () => {
            const owner = await seedUserDefault(prisma);
            const title = ProjectTitleVo.create('ghost-project');

            const exists = await projectRepository.exists(owner.id, title);
            expect(exists).toBe(false);
        });

    });

    describe('Repository Exception Handling', () => {

        it('should throw a custom persistence error when database client fails unexpectedly', async () => {
            const brokenPrisma = new Proxy(prisma, {
                get: () => { throw new Error('Database connection timeout'); }
            });
            const brokenRepository = new PrismaProjectRepository(brokenPrisma);

            const dummyId = ProjectIdVo.create();

            await expect(brokenRepository.findById(dummyId))
                .rejects
                .toBeInstanceOf(InfraDomainError);
        });
    });

});