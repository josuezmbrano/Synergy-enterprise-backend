import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js';
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { TokenExpirationVo } from 'core/value-objects/token/token-expiration.vo.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';
import { VerificationToken as PrismaVerificationToken, Prisma } from 'infrastructure/generated/prisma/client.js';

export class VerificationTokenMapper {

    static toDomain(raw: PrismaVerificationToken): VerificationTokenEntityClass {

        try {

            // INSTANTIATE ENTITY VOs
            const id = TokenIdVo.fromId(raw.token)
            const userId = UserIdVo.fromId(raw.user_id)
            const type = raw.type.includes('EMAIL') ? TokenTypeVo.createEmailVerification() : TokenTypeVo.createPasswordReset()
            const expiresAt = TokenExpirationVo.fromDatabase(raw.expires_at)
            const createdAt = DateVo.create(raw.created_at)

            return VerificationTokenEntityClass.reconstitute({
                userId,
                type,
                expiresAt
            }, id, createdAt)

        } catch (error) {
            throw InfraErrorFactory.mappingError(
                'TokenMapper.toDomain',
                error instanceof Error ? error.message : 'Failed to instantiate Value Objects from the DB',
                {
                    token: raw.token
                }
            )
        }
    }

    static toPersistence(token: VerificationTokenEntityClass): Prisma.VerificationTokenCreateInput {

        try {

            return {
                token: token.id.value,
                user: { connect: { public_id: token.userId.value } },
                type: token.type.value,
                expires_at: token.expiresAt.value
            }

        } catch (error) {
            throw InfraErrorFactory.mappingError(
                'TokenMapper.toPersistence',
                error instanceof Error ? error.message : 'Failed to persistence entity into DB: Error transforming data',
                {
                    token: token.id.value
                }
            )
        }
    }

}