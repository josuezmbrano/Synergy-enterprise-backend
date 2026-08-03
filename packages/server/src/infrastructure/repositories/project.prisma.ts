import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { ProjectMapper } from 'infrastructure/mappers/project.mapper.js';
import { BasePrismaRepository } from 'infrastructure/persistence/base.prisma-repository.js';

export class PrismaProjectRepository extends BasePrismaRepository implements IProjectRepository {

    constructor(prisma: PrismaClient) { super(prisma) }

    async save(project: ProjectEntityClass): Promise<ProjectEntityClass> {

        try {

            const persistenceData = ProjectMapper.toPersistence(project)

            const { id, public_id, owner, category, ...mutableFields } = persistenceData

            const result = await this.getClient().project.upsert({
                where: {
                    id: id
                },
                update: {
                    ...mutableFields
                },
                create: {
                    ...mutableFields,
                    owner,
                    id,
                    public_id,
                    category
                },
                include: {
                    owner: { select: { public_id: true } }
                }
            })

            return ProjectMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaProjectRepository.save',
                error instanceof Error ? error.message : 'Unexpected Error during project saving',
                { projectId: project.id.value }
            )
        }
    }

    async findByPublicId(id: ProjectIdVo): Promise<ProjectEntityClass | null> {

        try {

            const primitiveId = id.value

            if (!primitiveId) return null

            const result = await this.getClient().project.findUnique({
                where: {
                    public_id: primitiveId
                },
                include: {
                    owner: { select: { public_id: true } }
                }
            })

            if (!result) return null

            return ProjectMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaProjectRepository.findByPublicId',
                error instanceof Error ? error.message : 'Unexpected Error finding project by public id',
                { projectId: id.value }
            )
        }
    }

    async findById(id: ProjectIdVo): Promise<ProjectEntityClass | null> {

        try {

            const primitiveId = id.value

            if (!primitiveId) return null

            const result = await this.getClient().project.findUnique({
                where: {
                    id: primitiveId
                },
                include: {
                    owner: { select: { public_id: true } }
                }
            })

            if (!result) return null

            return ProjectMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaProjectRepository.findById',
                error instanceof Error ? error.message : 'Unexpected Error finding project by id',
                { projectId: id.value }
            )
        }
    }

    async findAllVisibleForUser(InternalProjectIds: ProjectIdVo[], internalUserId: UserIdVo): Promise<ProjectEntityClass[]> {

        try {

            const primitivesProjectIds = InternalProjectIds.map(id => id.value)
            const primitiveUserId = internalUserId.value

            const results = await this.getClient().project.findMany({
                where: {
                    OR: [
                        { id: { in: primitivesProjectIds } },
                        { owner_id: primitiveUserId }
                    ]
                },
                orderBy: {
                    created_at: 'desc'
                },
                include: {
                    owner: { select: { public_id: true } }
                }
            })

            return results.map(result => ProjectMapper.toDomain(result))

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaProjectRepository.findAllVisibleForUser',
                error instanceof Error ? error.message : 'Unexpected Error finding projects by user',
                { userId: internalUserId.value }
            )
        }
    }

    async exists(internalUserId: UserIdVo, projectTitle: ProjectTitleVo): Promise<boolean> {

        try {

            const primitiveUserId = internalUserId.value
            const primitiveProjectTitle = projectTitle.value

            if (!primitiveUserId || !primitiveProjectTitle) return false

            const count = await this.getClient().project.count({
                where: {
                    owner_id: primitiveUserId,
                    title: {
                        equals: primitiveProjectTitle,
                        mode: 'insensitive'
                    }
                }
            })

            return count > 0

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaProjectRepository.exists',
                error instanceof Error ? error.message : 'Unexpected Error checking project existence',
                { userId: internalUserId.value }
            )
        }
    }

    async findAllByIds(internalProjectIds: ProjectIdVo[]): Promise<ProjectEntityClass[]> {

        try {

            const primitivesProjectIds = internalProjectIds.map(id => id.value)

            const results = await this.getClient().project.findMany({
                where: {
                    id: { in: primitivesProjectIds }
                },
                include: {
                    owner: { select: { public_id: true } }
                }
            })

            return results.map(result => ProjectMapper.toDomain(result))

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaProjectRepository.findAllByIds',
                error instanceof Error ? error.message : 'Unexpected Error finding projects by ids'
            )
        }

    }

}