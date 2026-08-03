import { MemberEntityClass } from 'core/entities/classes/member-entity.class.js';
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { Member as PrismaMember, Prisma, MemberRole, MemberStatus } from 'infrastructure/generated/prisma/client.js';

export class MemberMapper {

    static toDomain(raw: PrismaMember & { user: { public_id: string } }): MemberEntityClass {

        try {

            // INSTANTIATE ENTITY VOs
            const id = MemberIdVo.fromId(raw.id)
            const publicId = MemberIdVo.fromId(raw.public_id)
            const projectId = ProjectIdVo.fromId(raw.project_id)
            const userId = UserIdVo.fromId(raw.user_id)
            const role = MemberRoleVo.create(raw.role)
            const status = MemberStatusVo.create(raw.status)
            const createdAt = DateVo.create(raw.created_at)
            const updatedAt = DateVo.create(raw.updated_at)
            const joinedAt = DateVo.create(raw.joined_at)
            const userPublicId = UserIdVo.fromId(raw.user.public_id)

            return MemberEntityClass.reconstitute({
                publicId,
                projectId,
                userId,
                role,
                status,
                joinedAt
            }, id, createdAt, updatedAt, userPublicId)

        } catch (error) {
            throw InfraErrorFactory.mappingError(
                'MemberMapper.toDomain',
                error instanceof Error ? error.message : 'Failed to instantiate Value Objects from the DB',
                {
                    member: raw.id
                }
            )
        }
    }

    static toPersistence(member: MemberEntityClass): Prisma.MemberCreateInput {

        try {

            // USE PRIMITIVES RAW DATA INTO DB
            const memberPrimitives = member.toPrimitives()

            return {
                id: memberPrimitives.id,
                public_id: memberPrimitives.publicId,
                project: { connect: { id: memberPrimitives.projectId } },
                user: { connect: { id: memberPrimitives.userId } },
                role: memberPrimitives.role as MemberRole,
                status: memberPrimitives.status as MemberStatus,
                joined_at: memberPrimitives.joinedAt
            }

        } catch (error) {
            throw InfraErrorFactory.mappingError(
                'MemberMapper.toPersistence',
                error instanceof Error ? error.message : 'Failed to persistence entity into DB: Error transforming data',
                {
                    member: member.id.value
                }
            )
        }
    }

}