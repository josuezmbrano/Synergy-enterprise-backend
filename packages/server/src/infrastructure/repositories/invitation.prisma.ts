import { InvitationEntityClass } from 'core/entities/classes/invitation-entity.class.js';
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js';
import { IInvitationRepository } from 'core/repositories/invitation.repository.js';
import { InvitationIdVo } from 'core/value-objects/common/identifiers/invitation-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { InvitationMapper } from 'infrastructure/mappers/invitation.mapper.js';
import { BasePrismaRepository } from 'infrastructure/persistence/base.prisma-repository.js';

export class PrismaInvitationRepository extends BasePrismaRepository implements IInvitationRepository {

    constructor(prisma: PrismaClient) { super(prisma) }

    async save(invitation: InvitationEntityClass): Promise<InvitationEntityClass> {

        try {

            const persistenceData = InvitationMapper.toPersistence(invitation)

            const { id, public_id, project, invited_by, invited_user, message, expires_at, target_role, ...mutableFields } = persistenceData

            const result = await this.getClient().invitation.upsert({
                where: {
                    id: id
                },
                create: {
                    ...mutableFields,
                    id,
                    public_id,
                    message,
                    target_role,
                    expires_at,
                    project,
                    invited_by,
                    invited_user
                },
                update: {
                    ...mutableFields
                }
            })

            return InvitationMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaInvitationRepository.save',
                error instanceof Error ? error.message : 'Unexpected Error during invitation saving',
                {
                    invitation: invitation.id.value
                }
            )
        }

    }

    async findByPublicId(id: InvitationIdVo): Promise<InvitationEntityClass | null> {

        try {

            const primitiveId = id.value

            if (!primitiveId) return null

            const result = await this.getClient().invitation.findUnique({
                where: {
                    public_id: primitiveId
                }
            })

            if (!result) return null

            return InvitationMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaInvitationRepository.findByPublicId',
                error instanceof Error ? error.message : 'Unexpected Error finding invitation by public id',
                { invitation: id.value }
            )
        }

    }

    async findById(id: InvitationIdVo): Promise<InvitationEntityClass | null> {

        try {

            const primitiveId = id.value

            if (!primitiveId) return null

            const result = await this.getClient().invitation.findUnique({
                where: {
                    id: primitiveId
                }
            })

            if (!result) return null

            return InvitationMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaInvitationRepository.findById',
                error instanceof Error ? error.message : 'Unexpected Error finding invitation by id',
                { invitation: id.value }
            )
        }

    }

    async findAllInvitationsByUser(internalUserId: UserIdVo): Promise<InvitationEntityClass[]> {

        try {

            const primitiveId = internalUserId.value


            const results = await this.getClient().invitation.findMany({
                where: {
                    invited_user_id: primitiveId
                },
                orderBy: {
                    created_at: 'desc'
                }
            })

            return results.map(result => InvitationMapper.toDomain(result))

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaInvitationRepository.findAllInvitationsByUser',
                error instanceof Error ? error.message : 'Unexpected Error finding invitations by user',
                { userId: internalUserId.value }
            )
        }
    }


}