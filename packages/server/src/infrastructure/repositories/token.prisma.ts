import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js';
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js';
import { ITokenRepository } from 'core/repositories/token.repository.js';
import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { VerificationTokenMapper } from 'infrastructure/mappers/token.mapper.js';
import { BasePrismaRepository } from 'infrastructure/persistence/base.prisma-repository.js';

export class PrismaVerificationTokenRepository extends BasePrismaRepository implements ITokenRepository {

    constructor(prisma: PrismaClient) { super(prisma) }

    async saveToken(tokenEntity: VerificationTokenEntityClass): Promise<void> {

        try {

            const tokenPersisted = VerificationTokenMapper.toPersistence(tokenEntity)

            await this.getClient().verificationToken.create({
                data: {
                    ...tokenPersisted
                }
            })


        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTokenRepository.saveToken',
                error instanceof Error ? error.message : 'Unexpected Error during token saving',
                { tokenId: tokenEntity.id.value }
            )
        }
    }

    async deleteToken(token: VerificationTokenEntityClass): Promise<void> {

        try {

            const primitiveToken = token.id.value
            const primitiveUser = token.userId.value

            await this.getClient().verificationToken.delete({
                where: {
                    token: primitiveToken,
                    user_id: primitiveUser
                }
            })


        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTokenRepository.deleteToken',
                error instanceof Error ? error.message : 'Unexpected Error during token delete',
                { tokenId: token.id.value }
            )
        }
    }

    async findByToken(token: TokenIdVo): Promise<VerificationTokenEntityClass | null> {

        try {

            const primitiveToken = token.value

            if (!primitiveToken) return null

            const result = await this.getClient().verificationToken.findUnique({
                where: {
                    token: primitiveToken,
                }
            })

            if (!result) return null

            return VerificationTokenMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTokenRepository.findByToken',
                error instanceof Error ? error.message : 'Unexpected Error locating verification id by token',
                { tokenId: token.value }
            )
        }
    }

    async findByUser(publicUserId: UserIdVo): Promise<VerificationTokenEntityClass | null> {

        try {

            const primitiveUserId = publicUserId.value

            if (!primitiveUserId) return null

            const result = await this.getClient().verificationToken.findFirst({
                where: {
                    user_id: primitiveUserId
                },
                orderBy: {
                    created_at: 'desc'
                }
            })

            if (!result) return null

            return VerificationTokenMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTokenRepository.findToken',
                error instanceof Error ? error.message : 'Unexpected Error finding token by user',
                { userId: publicUserId.value }
            )
        }
    }


}