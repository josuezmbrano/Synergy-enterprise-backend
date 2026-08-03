import { InvitationEntityClass } from 'core/entities/classes/invitation-entity.class.js';
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { InvitationIdVo } from 'core/value-objects/common/identifiers/invitation-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { InvitationExpirationVo } from 'core/value-objects/invitation/invitation-expiration.vo.js';
import { InvitationMessageVo } from 'core/value-objects/invitation/invitation-message.vo.js';
import { InvitationStatusVo } from 'core/value-objects/invitation/invitation-status.vo.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { Prisma, Invitation as PrismaInvitation } from 'infrastructure/generated/prisma/client.js';

export class InvitationMapper {

    static toDomain(raw: PrismaInvitation): InvitationEntityClass {

        try {

            // INSTANTIATE ENTITY VOs
            const id = InvitationIdVo.fromId(raw.id)
            const publicId = InvitationIdVo.fromId(raw.public_id)
            const projectId = ProjectIdVo.fromId(raw.project_id)
            const invitedUserId = UserIdVo.fromId(raw.invited_user_id)
            const invitedById = UserIdVo.fromId(raw.invited_by_id)
            const status = InvitationStatusVo.create(raw.status)
            const message = InvitationMessageVo.create(raw.message)
            const targetRole = MemberRoleVo.create(raw.target_role)
            const expiresAt = InvitationExpirationVo.fromDatabase(raw.expires_at)
            const createdAt = DateVo.create(raw.created_at)
            const updatedAt = DateVo.create(raw.updated_at)

            return InvitationEntityClass.reconstitute({
                publicId,
                projectId,
                invitedUserId,
                invitedById,
                status,
                message,
                targetRole,
                expiresAt
            }, id, createdAt, updatedAt)


        } catch (error) {
            throw InfraErrorFactory.mappingError(
                'InvitationMapper.toDomain',
                error instanceof Error ? error.message : 'Failed to instantiate Value Objects from the DB',
                {
                    invitation: raw.id
                }
            )
        }

    }

    static toPersistence(invitation: InvitationEntityClass): Prisma.InvitationCreateInput {

        try {

            // USE PRIMITIVES RAW DATA INTO DB
            const invitationPrimitives = invitation.toPrimitives()

            return {
                id: invitationPrimitives.id,
                public_id: invitationPrimitives.publicId,
                message: invitationPrimitives.message,
                status: invitationPrimitives.status,
                target_role: invitationPrimitives.targetRole,
                expires_at: invitationPrimitives.expiresAt,
                project: { connect: { id: invitationPrimitives.projectId } },
                invited_by: { connect: { id: invitationPrimitives.invitedById } },
                invited_user: { connect: { id: invitationPrimitives.invitedUserId } }
            }

        } catch (error) {
            throw InfraErrorFactory.mappingError(
                'InvitationMapper.toPersistence',
                error instanceof Error ? error.message : 'Failed to persistence entity into DB: Error transforming data',
                {
                    invitation: invitation.id.value
                }
            )
        }
        
    }

}