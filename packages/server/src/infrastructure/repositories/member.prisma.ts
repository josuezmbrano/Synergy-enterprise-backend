import { MemberEntityClass } from 'core/entities/classes/member-entity.class.js';
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { MemberMapper } from 'infrastructure/mappers/member.mapper.js';
import { BasePrismaRepository } from 'infrastructure/persistence/base.prisma-repository.js';

export class PrismaMemberRepository extends BasePrismaRepository implements IMemberRepository {

    constructor(prisma: PrismaClient) { super(prisma) }

    async save(member: MemberEntityClass): Promise<MemberEntityClass> {

        try {

            const { id, public_id, user, project, ...data } = MemberMapper.toPersistence(member)
            const result = await this.getClient().member.upsert({
                where: {
                    id: id
                },
                update: {
                    ...data
                },
                create: {
                    ...data,
                    id,
                    public_id,
                    user,
                    project
                },
                include: {
                    user: { select: { public_id: true } }
                }
            })

            return MemberMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaMemberRepository.save',
                error instanceof Error ? error.message : 'Unexpected Error during member saving',
                { memberId: member.id.value }
            )
        }
    }

    async findByPublicId(id: MemberIdVo): Promise<MemberEntityClass | null> {

        try {

            const primitiveId = id.value

            if (!primitiveId) return null

            const result = await this.getClient().member.findUnique({
                where: {
                    public_id: primitiveId
                },
                include: {
                    user: { select: { public_id: true } }
                }
            })

            if (!result) return null

            return MemberMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaMemberRepository.findByPublicId',
                error instanceof Error ? error.message : 'Unexpected Error finding member by public id',
                { memberId: id.value }
            )
        }
    }

    async findById(id: MemberIdVo): Promise<MemberEntityClass | null> {

        try {

            const primitiveId = id.value

            if (!primitiveId) return null

            const result = await this.getClient().member.findUnique({
                where: {
                    id: primitiveId
                },
                include: {
                    user: { select: { public_id: true } }
                }
            })

            if (!result) return null

            return MemberMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaMemberRepository.findById',
                error instanceof Error ? error.message : 'Unexpected Error finding member by id',
                { memberId: id.value }
            )
        }
    }

    async findProjectMember(internalProjectId: ProjectIdVo, internalUserId: UserIdVo): Promise<MemberEntityClass | null> {

        try {

            const primitiveProjectId = internalProjectId.value
            const primitiveUserId = internalUserId.value

            if (!primitiveProjectId || !primitiveUserId) return null

            const result = await this.getClient().member.findUnique({
                where: {
                    project_id_user_id: {
                        project_id: primitiveProjectId,
                        user_id: primitiveUserId
                    }
                },
                include: {
                    user: { select: { public_id: true } }
                }
            })

            if (!result) return null

            return MemberMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaMemberRepository.findProjectMember',
                error instanceof Error ? error.message : 'Unexpected Error finding project member',
                {
                    memberId: internalUserId.value,
                    projectId: internalProjectId.value
                }
            )
        }
    }

    async findAllProjectMembers(internalProjectId: ProjectIdVo): Promise<MemberEntityClass[]> {

        try {

            const primitiveProjectId = internalProjectId.value

            const results = await this.getClient().member.findMany({
                where: {
                    project_id: primitiveProjectId
                },
                include: {
                    user: { select: { public_id: true } }
                },
                orderBy: {
                    joined_at: 'desc'
                }
            })

            return results.map(result => MemberMapper.toDomain(result))

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaMemberRepository.findAllProjectMembers',
                error instanceof Error ? error.message : 'Unexpected Error finding project members',
                {
                    projectId: internalProjectId.value
                }
            )
        }
    }

    async findAllMembershipsByUser(internalUserId: UserIdVo, options?: { onlyActive?: boolean; }): Promise<MemberEntityClass[]> {

        try {

            const primitiveUserId = internalUserId.value

            const results = await this.getClient().member.findMany({
                where: {
                    user_id: primitiveUserId,
                    ...(options?.onlyActive ? { status: { in: ['ACTIVE', 'ON_LEAVE'] } } : {})
                },
                include: {
                    user: { select: { public_id: true } }
                }
            })

            return results.map(result => MemberMapper.toDomain(result))

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaMemberRepository.findAllMembershipsByUser',
                error instanceof Error ? error.message : 'Unexpected Error finding memberships by user',
                {
                    userId: internalUserId.value
                }
            )
        }
    }

    async isMember(internalProjectId: ProjectIdVo, internalUserId: UserIdVo): Promise<boolean> {

        try {

            const primitiveProjectId = internalProjectId.value
            const primitiveUserId = internalUserId.value

            if (!primitiveProjectId || !primitiveUserId) return false

            const count = await this.getClient().member.count({
                where: {
                    project_id: primitiveProjectId,
                    user_id: primitiveUserId
                }
            })

            return count > 0

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaMemberRepository.isMember',
                error instanceof Error ? error.message : 'Unexpected Error validating membership for user',
                {
                    userId: internalUserId.value,
                    projectId: internalProjectId.value
                }
            )
        }
    }

    async hasTeamMembers(internalProjectId: ProjectIdVo): Promise<boolean> {

        try {

            const primitiveProjectId = internalProjectId.value

            if (!primitiveProjectId) return false

            const count = await this.getClient().member.count({
                where: {
                    project_id: primitiveProjectId,
                    status: { in: ['ACTIVE', 'ON_LEAVE'] }
                }
            })

            return count >= 2

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaMemberRepository.hasTeamMembers',
                error instanceof Error ? error.message : 'Unexpected Error validating project members team existence',
                {
                    projectId: internalProjectId.value
                }
            )
        }
    }

    async countActiveAdmins(internalProjectId: ProjectIdVo): Promise<number> {

        try {

            const primitiveId = internalProjectId.value

            if (!primitiveId) return 0

            const result = await this.getClient().member.count({
                where: {
                    project_id: primitiveId,
                    role: 'ADMIN',
                    status: 'ACTIVE'
                }
            })

            return result

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaMemberRepository.countActiveAdmins',
                error instanceof Error ? error.message : 'Unexpected Error counting active admins in project',
                {
                    projectId: internalProjectId.value
                }
            )
        }
    }

    async countActiveContributors(internalProjectId: ProjectIdVo): Promise<number> {

        try {

            const primitiveId = internalProjectId.value

            if (!primitiveId) return 0

            const result = await this.getClient().member.count({
                where: {
                    project_id: primitiveId,
                    role: 'CONTRIBUTOR',
                    status: 'ACTIVE'
                }
            })

            return result

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaMemberRepository.countActiveContributors',
                error instanceof Error ? error.message : 'Unexpected Error counting active contributors in project',
                {
                    projectId: internalProjectId.value
                }
            )
        }
    }

    async countAdminRolesByUser(internalUserId: UserIdVo): Promise<number> {

        try {

            const primitiveUserId = internalUserId.value

            const result = await this.getClient().member.count({
                where: {
                    user_id: primitiveUserId,
                    role: 'ADMIN',
                    status: { not: 'INACTIVE' }
                }
            })

            return result

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaMemberRepository.countAdminRolesByUser',
                error instanceof Error ? error.message : 'Unexpected Error counting admin roles by user',
                {
                    userId: internalUserId.value
                }
            )
        }
    }

    async countActiveMembersByProject(internalProjectId: ProjectIdVo): Promise<number> {

        try {

            const primitiveProjectId = internalProjectId.value

            if (!primitiveProjectId) return 0

            const result = await this.getClient().member.count({
                where: {
                    project_id: primitiveProjectId,
                    status: {in: ['ACTIVE', 'ON_LEAVE']}
                }
            })

            return result

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaMemberRepository.countActiveMembersByProject',
                error instanceof Error ? error.message : 'Unexpected Error counting active members by project',
                {
                    projectId: internalProjectId.value
                }
            )
        }

    }

}