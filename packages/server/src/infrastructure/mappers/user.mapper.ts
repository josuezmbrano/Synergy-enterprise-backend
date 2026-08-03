import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserLastnameVo } from 'core/value-objects/user/user-lastname.vo.js';
import { UserNameVo } from 'core/value-objects/user/user-name.vo.js';
import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js';
import { UserStatusVo } from 'core/value-objects/user/user-status.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { User as PrismaUser, Prisma, UserStatus } from 'infrastructure/generated/prisma/client.js';

export class UserMapper {

    static toDomain(raw: PrismaUser): UserEntityClass {

        try {

            // INSTANTIATE ENTITY VOs
            const id = UserIdVo.fromId(raw.id)
            const publicId = UserIdVo.fromId(raw.public_id)
            const username = UserUsernameVo.create(raw.username)
            const name = UserNameVo.create(raw.name)
            const lastname = UserLastnameVo.create(raw.lastname)
            const email = UserEmailVo.create(raw.email)
            const password = UserPasswordVo.fromHash(raw.password)
            const status = UserStatusVo.create(raw.status)
            const createdAt = DateVo.create(raw.created_at)
            const updatedAt = DateVo.create(raw.updated_at)
            const usernameUpdatedAt = raw.username_updated_at ? DateVo.create(raw.username_updated_at) : null
            const verifiedAt = raw.verified_at ? DateVo.create(raw.verified_at) : null

            return UserEntityClass.reconstitute({
                publicId,
                username,
                name,
                lastname,
                email,
                password,
                status,
                usernameUpdatedAt,
                verifiedAt
            }, id, createdAt, updatedAt)


        } catch (error) {
            throw InfraErrorFactory.mappingError(
                'UserMapper.toDomain',
                error instanceof Error ? error.message : 'Failed to instantiate Value Objects from the DB',
                {
                    user: raw.id
                }
            )
        }

    }

    static toPersistence(user: UserEntityClass): Prisma.UserCreateInput {

        try {

            // USE PRIMITIVES RAW DATA INTO DB
            const userPrimitives = user.toPrimitives()

            return {
                id: userPrimitives.id,
                public_id: userPrimitives.publicId,
                username: userPrimitives.username,
                name: userPrimitives.name,
                lastname: userPrimitives.lastname,
                email: userPrimitives.email,
                password: userPrimitives.password,
                status: userPrimitives.status as UserStatus,
                username_updated_at: userPrimitives.usernameUpdatedAt ?? null,
                verified_at: userPrimitives.verifiedAt ?? null
            }

        } catch (error) {

            throw InfraErrorFactory.mappingError(
                'UserMapper.toPersistence',
                error instanceof Error ? error.message : 'Failed to persistence entity into DB: Error transforming data',
                {
                    user: user.id.value
                }
            )
        }
    }

}