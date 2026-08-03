import { TaskEntityClass } from 'core/entities/classes/task-entity.class.js';
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js';
import { ITaskRepository } from 'core/repositories/task.repository.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js';
import { PrismaClient } from 'infrastructure/generated/prisma/client.js';
import { TaskMapper } from 'infrastructure/mappers/task.mapper.js';
import { BasePrismaRepository } from 'infrastructure/persistence/base.prisma-repository.js';

export class PrismaTaskRepository extends BasePrismaRepository implements ITaskRepository {

    constructor(prisma: PrismaClient) { super(prisma) }

    async save(task: TaskEntityClass): Promise<TaskEntityClass> {

        try {

            const taskPersisted = TaskMapper.toPersistence(task)

            const { id, public_id, creator, project, ...mutableFields } = taskPersisted

            const result = await this.getClient().task.upsert({
                where: {
                    id: id
                },
                update: TaskMapper.toUpdatePersistence(task),
                create: {
                    ...mutableFields,
                    id,
                    public_id,
                    creator,
                    project
                },
                include: {
                    creator: { select: { public_id: true } },
                    assigned: { select: { public_id: true } }
                }
            })

            return TaskMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTaskRepository.save',
                error instanceof Error ? error.message : 'Unexpected Error during task saving',
                { taskId: task.id.value }
            )
        }
    }

    async findByPublicId(id: TaskIdVo): Promise<TaskEntityClass | null> {

        try {

            const primitiveId = id.value

            if (!primitiveId) return null

            const result = await this.getClient().task.findUnique({
                where: {
                    public_id: primitiveId
                },
                include: {
                    creator: { select: { public_id: true } },
                    assigned: { select: { public_id: true } }
                }
            })

            if (!result) return null

            return TaskMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTaskRepository.findByPublicId',
                error instanceof Error ? error.message : 'Unexpected Error finding task by public id',
                { taskPublicId: id.value }
            )
        }
    }

    async findById(id: TaskIdVo): Promise<TaskEntityClass | null> {

        try {

            const primitiveId = id.value

            if (!primitiveId) return null

            const result = await this.getClient().task.findUnique({
                where: {
                    id: primitiveId
                },
                include: {
                    creator: { select: { public_id: true } },
                    assigned: { select: { public_id: true } }
                }
            })

            if (!result) return null

            return TaskMapper.toDomain(result)

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTaskRepository.findById',
                error instanceof Error ? error.message : 'Unexpected Error finding task by id',
                { taskId: id.value }
            )
        }
    }

    async findByProject(internalProjectId: ProjectIdVo): Promise<TaskEntityClass[]> {

        try {

            const primitiveId = internalProjectId.value

            const results = await this.getClient().task.findMany({
                where: {
                    project_id: primitiveId
                },
                include: {
                    creator: { select: { public_id: true } },
                    assigned: { select: { public_id: true } }
                },
                orderBy: {
                    created_at: 'desc'
                }
            })

            return results.map(result => TaskMapper.toDomain(result))

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTaskRepository.findByProject',
                error instanceof Error ? error.message : 'Unexpected Error finding tasks by project',
                { projectId: internalProjectId.value }
            )
        }
    }

    async hasUserTaskPendings(internalProjectId: ProjectIdVo, internalMemberId: MemberIdVo): Promise<boolean> {

        try {

            const primitiveId = internalProjectId.value
            const primitiveMemberId = internalMemberId.value

            if (!primitiveId || !primitiveMemberId) return false

            const result = await this.getClient().task.count({
                where: {
                    project_id: primitiveId,
                    assigned_to: primitiveMemberId,
                    status: { notIn: ['COMPLETED', 'TODO'] }
                }
            })

            return result > 0

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTaskRepository.hasUserTaskPendings',
                error instanceof Error ? error.message : 'Unexpected Error checking pending tasks by user',
                {
                    projectId: internalProjectId.value,
                    memberId: internalMemberId.value
                }
            )
        }
    }

    async hasPendingTasks(internalProjectId: ProjectIdVo): Promise<boolean> {

        try {

            const primitiveId = internalProjectId.value

            if (!primitiveId) return false

            const result = await this.getClient().task.count({
                where: {
                    project_id: primitiveId,
                    status: { notIn: ['COMPLETED'] }
                }
            })

            return result > 0

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTaskRepository.hasPendingTasks',
                error instanceof Error ? error.message : 'Unexpected Error checking pending tasks in project',
                {
                    projectId: internalProjectId.value,
                }
            )
        }
    }

    async hasTasks(internalProjectId: ProjectIdVo): Promise<boolean> {

        try {

            const primitiveId = internalProjectId.value

            if (!primitiveId) return false

            const result = await this.getClient().task.count({
                where: {
                    project_id: primitiveId,
                }
            })

            return result > 0

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTaskRepository.hasTasks',
                error instanceof Error ? error.message : 'Unexpected Error checking for tasks existence in project',
                {
                    projectId: internalProjectId.value,
                }
            )
        }
    }

    async countActiveTaskByUser(internalProjectId: ProjectIdVo, internalMemberId: MemberIdVo): Promise<number> {

        try {

            const primitiveId = internalProjectId.value
            const primitiveMemberId = internalMemberId.value

            if (!primitiveId) return 0

            const result = await this.getClient().task.count({
                where: {
                    project_id: primitiveId,
                    assigned_to: primitiveMemberId,
                    status: { in: ['DOING', 'REVIEW', 'OVERDUE'] }
                }
            })

            return result

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTaskRepository.countActiveTaskByUser',
                error instanceof Error ? error.message : 'Unexpected Error counting active tasks by user in project',
                {
                    projectId: internalProjectId.value,
                    memberId: internalMemberId.value
                }
            )
        }
    }

    async countTasksByProject(internalProjectId: ProjectIdVo): Promise<number> {

        try {

            const primitiveId = internalProjectId.value

            if (!primitiveId) return 0

            const result = await this.getClient().task.count({
                where: {
                    project_id: primitiveId,
                }
            })

            return result

        } catch (error) {
            throw InfraErrorFactory.persistenceError(
                'PrismaTaskRepository.countTasksByProject',
                error instanceof Error ? error.message : 'Unexpected Error counting tasks by project',
                {
                    projectId: internalProjectId.value,
                }
            )
        }

    }

}