import { MemberEntityClass } from 'core/entities/classes/member-entity.class.js';
import { InfraDomainError } from 'core/errors/domain/domain-classes.error.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { getEnv } from 'infrastructure/config/env.config.js';
import { ApplicationContainer, createContainer } from 'infrastructure/container/di.config.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { PrismaMemberRepository } from 'infrastructure/repositories/member.prisma.js';
import { seedMemberDefault, seedMemberRandom, seedProjectRandom, seedUserRandom } from 'test/utils/db-seeder.js';

describe('PrismaMemberRepository - Integration Tests', () => {
    let memberRepository: PrismaMemberRepository;
    let containerDI: ApplicationContainer
    let prisma: PrismaClient

    beforeAll(() => {
        const env = getEnv()
        containerDI = createContainer(env);
        prisma = containerDI.prisma
    })

    beforeEach(async () => {

        await prisma.member.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        memberRepository = new PrismaMemberRepository(prisma);
    });

    describe('save()', () => {

        it('should successfully INSERT a new member when it does not exist', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);


            const member = await seedMemberRandom(prisma, project.id.value, user.id.value);


            const savedMember = await memberRepository.save(member);

            expect(savedMember).toBeDefined();
            expect(savedMember.id.value).toBe(member.id.value);


            const dbCheck = await prisma.member.findUnique({ where: { id: member.id.value } });
            expect(dbCheck).not.toBeNull();
        });

        it('should successfully UPDATE an existing member role/status (Upsert)', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);

            const member = await seedMemberRandom(prisma, project.id.value, user.id.value, { role: MemberRoleVo.create('contributor'), status: MemberStatusVo.create('active') })

            await memberRepository.save(member);


            member.moveToAdmin();
            const updatedMember = await memberRepository.save(member);

            expect(updatedMember.role.value).toBe('ADMIN');

            const dbCheck = await prisma.member.findUnique({ where: { id: member.id.value } });
            expect(dbCheck?.role).toBe('ADMIN');
        });

        it('should successfully UPDATE an existing member state and persist changes like role and transition dates', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);


            const member = await seedMemberRandom(prisma, project.id.value, user.id.value, {
                role: MemberRoleVo.create('CONTRIBUTOR'),
                status: MemberStatusVo.create('INACTIVE'),
            });


            const now = DateVo.create();
            const updatedDomainMember = MemberEntityClass.reconstitute({
                publicId: member.publicId,
                projectId: member.projectId,
                userId: member.userId,
                role: MemberRoleVo.create('ADMIN'),
                status: MemberStatusVo.create('ACTIVE'),
                joinedAt: now
            }, member.id, member.createdAtDate, DateVo.create(), user.publicId);


            const result = await memberRepository.save(updatedDomainMember);

            expect(result.role.value).toBe('ADMIN');
            expect(result.status.value).toBe('ACTIVE');
            expect(result.joinedAtDate).toBeTruthy();


            const dbCheck = await prisma.member.findUnique({ where: { id: member.id.value } });
            expect(dbCheck?.role).toBe('ADMIN');
            expect(dbCheck?.status).toBe('ACTIVE');
            expect(dbCheck?.joined_at).not.toBeNull();
        });

    });

    describe('findById() and findByPublicId()', () => {

        it('should return the mapped member domain entity with its user aggregate when ids exist', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value)


            const foundById = await memberRepository.findById(MemberIdVo.fromId(member.id.value));
            expect(foundById).not.toBeNull();
            expect(foundById?.id.value).toBe(member.id.value);
            expect(foundById?.userPublicId?.value).toBe(user.publicId.value);


            const foundByPublicId = await memberRepository.findByPublicId(MemberIdVo.fromId(member.publicId.value));
            expect(foundByPublicId).not.toBeNull();
            expect(foundByPublicId?.publicId.value).toBe(member.publicId.value);
            expect(foundByPublicId?.userPublicId?.value).toBe(user.publicId.value);
        });

        it('should return null cleanly when the searched id does not exist', async () => {
            const randomId = MemberIdVo.fromId('d3723234-4b14-4504-a535-75775b902f82');
            const result = await memberRepository.findById(randomId);
            expect(result).toBeNull();
        });

    });

    describe('findProjectMember()', () => {

        it('should return a specific member matching project_id and user_id compound unique key', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const member = await seedMemberRandom(prisma, project.id.value, user.id.value)

            const result = await memberRepository.findProjectMember(
                ProjectIdVo.fromId(project.id.value),
                UserIdVo.fromId(user.id.value)
            );

            expect(result).not.toBeNull();
            expect(result?.id.value).toBe(member.id.value);
        });

    });

    describe('findAllProjectMembers()', () => {

        it('should return all members of a project', async () => {
            const user1 = await seedUserRandom(prisma, { username: UserUsernameVo.create('usr1'), email: UserEmailVo.create('u1@email.com') });
            const user2 = await seedUserRandom(prisma, { username: UserUsernameVo.create('usr2'), email: UserEmailVo.create('u2@email.com') });
            const project = await seedProjectRandom(prisma, user1.id.value);

            await seedMemberRandom(prisma, project.id.value, user1.id.value, { status: MemberStatusVo.create('active') });
            await seedMemberRandom(prisma, project.id.value, user2.id.value, { status: MemberStatusVo.create('inactive') });

            const allMembers = await memberRepository.findAllProjectMembers(ProjectIdVo.fromId(project.id.value));
            expect(allMembers.length).toBe(2);
        });
    });

    describe('findAllMembershipsByUser()', () => {

        it('should return all memberships associated with a specific user account', async () => {
            const user = await seedUserRandom(prisma);
            const project1 = await seedProjectRandom(prisma, user.id.value);
            const project2 = await seedProjectRandom(prisma, user.id.value);

            await seedMemberRandom(prisma, project1.id.value, user.id.value, { status: MemberStatusVo.create('active') });
            await seedMemberRandom(prisma, project2.id.value, user.id.value, { status: MemberStatusVo.create('inactive') });

            const totalMemberships = await memberRepository.findAllMembershipsByUser(UserIdVo.fromId(user.id.value));
            expect(totalMemberships.length).toBe(2);

            const onlyActive = await memberRepository.findAllMembershipsByUser(UserIdVo.fromId(user.id.value), { onlyActive: true });
            expect(onlyActive.length).toBe(1);
            expect(onlyActive[0].status.value).toBe('ACTIVE');
        });
    });

    describe('isMember()', () => {

        it('should evaluate true if user has a membership row in the project, false otherwise', async () => {
            const user = await seedUserRandom(prisma);
            const project = await seedProjectRandom(prisma, user.id.value);
            const projectIdVo = ProjectIdVo.fromId(project.id.value);
            const userIdVo = UserIdVo.fromId(user.id.value);

            let isMember = await memberRepository.isMember(projectIdVo, userIdVo);
            expect(isMember).toBe(false);

            await seedMemberRandom(prisma, project.id.value, user.id.value);

            isMember = await memberRepository.isMember(projectIdVo, userIdVo);
            expect(isMember).toBe(true);
        });
    });

    describe('countActiveAdmins()', () => {

        it('should correctly count active admins inside a specific project', async () => {
            const user1 = await seedUserRandom(prisma, { username: UserUsernameVo.create('joshakazaam'), email: UserEmailVo.create('joshakazaam@email.com') });
            const project = await seedProjectRandom(prisma, user1.id.value);

            await seedMemberDefault(prisma, project.id.value, user1.id.value, { role: MemberRoleVo.create('admin'), status: MemberStatusVo.create('active') })

            const adminCount = await memberRepository.countActiveAdmins(ProjectIdVo.fromId(project.id.value));

            expect(adminCount).toBe(1);
        });
    });

    describe('countActiveContributors()', () => {

        it('should correctly count active contributors inside a specific project', async () => {
            const user2 = await seedUserRandom(prisma, { username: UserUsernameVo.create('moisekazaam'), email: UserEmailVo.create('moisekazaam@email.com') });
            const project = await seedProjectRandom(prisma, user2.id.value);

            await seedMemberRandom(prisma, project.id.value, user2.id.value, { role: MemberRoleVo.create('contributor'), status: MemberStatusVo.create('active') })

            const contributorCount = await memberRepository.countActiveContributors(ProjectIdVo.fromId(project.id.value));

            expect(contributorCount).toBe(1);
        });
    })

    describe('hasTeamMembers()', () => {

        it('should evaluate hasTeamMembers as true only if there are 2 or more active members', async () => {
            const user1 = await seedUserRandom(prisma, { username: UserUsernameVo.create('joshakazaam'), email: UserEmailVo.create('joshakazaam@email.com') });
            const project = await seedProjectRandom(prisma, user1.id.value);
            const projectIdVo = ProjectIdVo.fromId(project.id.value);

            await seedMemberRandom(prisma, projectIdVo.value, user1.id.value, { status: MemberStatusVo.create('active') })

            let hasTeam = await memberRepository.hasTeamMembers(projectIdVo);
            expect(hasTeam).toBe(false);


            const user2 = await seedUserRandom(prisma, { username: UserUsernameVo.create('moisekazaam'), email: UserEmailVo.create('moisekazaam@email.com') });
            await seedMemberRandom(prisma, projectIdVo.value, user2.id.value, { status: MemberStatusVo.create('active') })

            hasTeam = await memberRepository.hasTeamMembers(projectIdVo);
            expect(hasTeam).toBe(true);
        });
    })

    describe('countAdminRolesByUser()', () => {

        it('should return total admin positions held by user, excluding inactive memberships', async () => {
            const user = await seedUserRandom(prisma);
            const project1 = await seedProjectRandom(prisma, user.id.value);
            const project2 = await seedProjectRandom(prisma, user.id.value);

            await seedMemberRandom(prisma, project1.id.value, user.id.value, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('active')
            });

            await seedMemberRandom(prisma, project2.id.value, user.id.value, {
                role: MemberRoleVo.create('admin'),
                status: MemberStatusVo.create('inactive')
            });

            const adminRolesCount = await memberRepository.countAdminRolesByUser(UserIdVo.fromId(user.id.value));
            expect(adminRolesCount).toBe(1);
        });
    });

    describe('Repository Exception Handling', () => {

        it('should throw a custom persistence error when database client fails unexpectedly', async () => {
            const brokenPrisma = new Proxy(prisma, {
                get: () => { throw new Error('Database cluster connection timeout'); }
            });
            const brokenRepository = new PrismaMemberRepository(brokenPrisma);

            const dummyId = MemberIdVo.create();

            await expect(brokenRepository.findById(dummyId))
                .rejects
                .toBeInstanceOf(InfraDomainError);
        });
    });

});