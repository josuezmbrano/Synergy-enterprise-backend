import { TaskEntityClass } from 'core/entities/classes/task-entity.class.js';
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js';
import { TaskDescriptionVo } from 'core/value-objects/task/task-description.vo.js';
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js';
import { TaskPriorityVo } from 'core/value-objects/task/task-priority.vo.js';
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js';
import { Task as PrismaTask, Prisma, TaskStatus, TaskPriority } from 'infrastructure/generated/prisma/client.js';

export class TaskMapper {

    static toDomain(raw: PrismaTask & { creator: { public_id: string }, assigned?: { public_id: string } | null }): TaskEntityClass {

        try {

            // INSTANTIATE ENTITY VOs
            const id = TaskIdVo.fromId(raw.id)
            const publicId = TaskIdVo.fromId(raw.public_id)
            const objective = TaskObjectiveVo.create(raw.objective)
            const description = TaskDescriptionVo.create(raw.description)
            const status = TaskStatusVo.create(raw.status)
            const priority = TaskPriorityVo.create(raw.priority)
            const assignedTo = raw.assigned_to ? MemberIdVo.fromId(raw.assigned_to) : null
            const creatorId = MemberIdVo.fromId(raw.creator_id)
            const projectId = ProjectIdVo.fromId(raw.project_id)
            const createdAt = DateVo.create(raw.created_at)
            const updatedAt = DateVo.create(raw.updated_at)
            const completedAt = raw.completed_at ? DateVo.create(raw.completed_at) : null
            const dueDate = DateVo.create(raw.due_date)
            const assignToPublicId = raw.assigned ? MemberIdVo.fromId(raw.assigned.public_id) : undefined
            const creatorPublicId = MemberIdVo.fromId(raw.creator.public_id)

            return TaskEntityClass.reconstitute({
                publicId,
                objective,
                description,
                status,
                priority,
                assignedTo,
                creatorId,
                projectId,
                completedAt,
                dueDate
            }, id, createdAt, updatedAt, assignToPublicId, creatorPublicId)


        } catch (error) {
            throw InfraErrorFactory.mappingError(
                'TaskMapper.toDomain',
                error instanceof Error ? error.message : 'Failed to instantiate Value Objects from the DB',
                {
                    task: raw.id
                }
            )
        }
    }

    static toPersistence(task: TaskEntityClass): Prisma.TaskCreateInput {

        try {

            // USE PRIMITIVES RAW DATA INTO DB
            const taskPrimitives = task.toPrimitives()

            return {
                id: taskPrimitives.id,
                public_id: taskPrimitives.publicId,
                objective: taskPrimitives.objective,
                description: taskPrimitives.description,
                status: taskPrimitives.status as TaskStatus,
                priority: taskPrimitives.priority as TaskPriority,
                assigned: taskPrimitives.assignedTo ? { connect: { id: taskPrimitives.assignedTo } } : undefined,
                creator: { connect: { id: taskPrimitives.creatorId } },
                project: { connect: { id: taskPrimitives.projectId } },
                completed_at: taskPrimitives.completedAt ?? null,
                due_date: taskPrimitives.dueDate
            }


        } catch (error) {
            throw InfraErrorFactory.mappingError(
                'TaskMapper.toPersistence',
                error instanceof Error ? error.message : 'Failed to persistence entity into DB: Error transforming data',
                {
                    task: task.id.value
                }
            )
        }
    }

    static toUpdatePersistence(task: TaskEntityClass): Prisma.TaskUpdateInput {
        try {
            const taskPrimitives = task.toPrimitives();

            return {
                objective: taskPrimitives.objective,
                description: taskPrimitives.description,
                status: taskPrimitives.status as TaskStatus,
                priority: taskPrimitives.priority as TaskPriority,
                completed_at: taskPrimitives.completedAt ?? null,
                due_date: taskPrimitives.dueDate,
                assigned: taskPrimitives.assignedTo 
                    ? { connect: { id: taskPrimitives.assignedTo } } 
                    : { disconnect: true }
            };
        } catch (error) {
            throw InfraErrorFactory.mappingError(
                'TaskMapper.toUpdatePersistence',
                error instanceof Error? error.message : 'Failed to persist entity update into DB: Error transformin data',
                {
                    tasK: task.id.value
                }
            );
        }
    }

}