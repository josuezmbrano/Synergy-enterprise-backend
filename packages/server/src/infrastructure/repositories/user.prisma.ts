
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { UserMapper } from 'infrastructure/mappers/user.mapper.js';
import { BasePrismaRepository } from 'infrastructure/persistence/base.prisma-repository.js';

export class PrismaUserRepository extends BasePrismaRepository implements IUserRepository {

    constructor(prisma: PrismaClient) { super(prisma) }

    async save(user: UserEntityClass): Promise<UserEntityClass> {

        try {

            const { id, public_id, ...data } = UserMapper.toPersistence(user)

            const result = await this.getClient().user.upsert({
                where: {
                    id: id
                },
                update: {
                    ...data
                },
                create: {
                    ...data,
                    id,
                    public_id
                }
            })

            return UserMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaUserRepository.save',
                error instanceof Error ? error.message : 'Unexpected Error during user saving',
                { userId: user.id.value }
            )
        }
    }

    async findByPublicId(id: UserIdVo): Promise<UserEntityClass | null> {

        try {

            const primitiveId = id.value

            if (!primitiveId) return null

            const result = await this.getClient().user.findUnique({
                where: {
                    public_id: primitiveId
                }
            })

            if (!result) return null

            return UserMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaUserRepository.findByPublicId',
                error instanceof Error ? error.message : 'Unexpected Error finding user by public id',
                { userId: id.value }
            )
        }
    }

    async findById(id: UserIdVo): Promise<UserEntityClass | null> {

        try {

            const primitiveId = id.value

            if (!primitiveId) return null

            const result = await this.getClient().user.findUnique({
                where: {
                    id: primitiveId
                }
            })

            if (!result) return null


            return UserMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaUserRepository.findById',
                error instanceof Error ? error.message : 'Unexpected Error finding user by id',
                { userId: id.value }
            )
        }
    }

    async findByUsername(username: UserUsernameVo): Promise<UserEntityClass | null> {

        try {

            const primitiveUsername = username.value

            if (!primitiveUsername) return null

            const result = await this.getClient().user.findFirst({
                where: {
                    username: { equals: primitiveUsername, mode: 'insensitive' },
                }
            })

            if (!result) return null

            return UserMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaUserRepository.findByUsername',
                error instanceof Error ? error.message : 'Unexpected Error finding user by username',
                { username: username.value }
            )
        }
    }

    async findByEmail(email: UserEmailVo): Promise<UserEntityClass | null> {

        try {

            const primitiveEmail = email.value

            if (!primitiveEmail) return null

            const result = await this.getClient().user.findUnique({
                where: {
                    email: primitiveEmail
                }
            })

            if (!result) return null

            return UserMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaUserRepository.findByEmail',
                error instanceof Error ? error.message : 'Unexpected Error finding user by email',
                { userEmail: email.value }
            )
        }
    }

    async emailExists(email: UserEmailVo): Promise<boolean> {

        try {

            const primitiveEmail = email.value

            if (!primitiveEmail) return false

            const count = await this.getClient().user.count({
                where: {
                    email: primitiveEmail
                }
            })

            return count > 0

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaUserRepository.emailExists',
                error instanceof Error ? error.message : 'Unexpected Error checking user email existence',
                { userEmail: email.value }
            )
        }
    }

    async usernameExists(username: UserUsernameVo): Promise<boolean> {

        try {

            const primitiveUsername = username.value

            if (!primitiveUsername) return false

            const count = await this.getClient().user.count({
                where: {
                    username: { equals: primitiveUsername, mode: 'insensitive' }
                }
            })

            return count > 0

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaUserRepository.usernameExists',
                error instanceof Error ? error.message : 'Unexpected Error checking user username existence',
                { username: username.value }
            )
        }
    }

    async findAllUsersByIds(internalUserIds: UserIdVo[]): Promise<UserEntityClass[]> {

        try {

            const primitivesUserIds = internalUserIds.map(id => id.value)

            const results = await this.getClient().user.findMany({
                where: {
                    id: { in: primitivesUserIds }
                }
            })

            return results.map(result => UserMapper.toDomain(result))

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaUserRepository.findAllUsersByIds',
                error instanceof Error ? error.message : 'Unexpected Error finding all users by ids',
            )
        }
    }

}