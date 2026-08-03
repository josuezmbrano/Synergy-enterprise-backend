import { TaskEntityClass } from 'core/entities/classes/task-entity.class.js';
import { TaskProps } from 'core/entities/props/task.props.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js';
import { TaskDescriptionVo } from 'core/value-objects/task/task-description.vo.js';
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js';
import { TaskPriorityVo } from 'core/value-objects/task/task-priority.vo.js';
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js';

export class TaskMother {


    static createDefault() {

        const futureDate = new Date()
        futureDate.setHours(futureDate.getHours() + 48)

        return TaskEntityClass.create({
            publicId: TaskIdVo.create(),
            objective: TaskObjectiveVo.create('Task objective example'),
            description: TaskDescriptionVo.create('Task description example'),
            status: TaskStatusVo.create('todo'),
            priority: TaskPriorityVo.create('low'),
            assignedTo: null,
            creatorId: MemberIdVo.create(),
            projectId: ProjectIdVo.create(),
            completedAt: null,
            dueDate: DateVo.create(futureDate)
        }, TaskIdVo.create())
    }

    static createPersonalized(overrides?: Partial<TaskProps>) {

        const futureDate = new Date()
        futureDate.setHours(futureDate.getHours() + 48)

        const defaults = {
            publicId: TaskIdVo.create(),
            objective: TaskObjectiveVo.create('Reconstituted task objective example'),
            description: TaskDescriptionVo.create('Reconstituted task description example'),
            status: TaskStatusVo.create('todo'),
            priority: TaskPriorityVo.create('low'),
            assignedTo: MemberIdVo.create(),
            creatorId: MemberIdVo.create(),
            projectId: ProjectIdVo.create(),
            completedAt: null,
            dueDate: DateVo.create(futureDate),
            ...overrides
        }

        return TaskEntityClass.create(defaults, TaskIdVo.create())
    }

    static reconstitutePersonalized(creatorPublicId?: MemberIdVo, assigneePublicId?: MemberIdVo, overrides?: Partial<TaskProps>) {

        const futureDate = new Date()
        futureDate.setHours(futureDate.getHours() + 48)

        const defaults = {
            publicId: TaskIdVo.create(),
            objective: TaskObjectiveVo.create('Reconstituted task objective example'),
            description: TaskDescriptionVo.create('Reconstituted task description example'),
            status: TaskStatusVo.create('todo'),
            priority: TaskPriorityVo.create('low'),
            assignedTo: MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2'),
            creatorId: MemberIdVo.fromId('d5a1b329-376c-4f7f-8d76-5868f76e1911'),
            projectId: ProjectIdVo.fromId('2b43b9d6-5744-468e-908c-6872559a4441'),
            completedAt: null,
            dueDate: DateVo.create(futureDate),
            ...overrides
        }

        return TaskEntityClass.reconstitute(defaults, TaskIdVo.fromId('631855a8-208b-4d4b-ae84-82559fd108a8'), DateVo.create(), DateVo.create(), assigneePublicId, creatorPublicId)
    }

    static reconstituteDefault(overrides?: Partial<TaskProps>) {

        const futureDate = new Date()
        futureDate.setHours(futureDate.getHours() + 48)

        const defaults = {
            publicId: TaskIdVo.create(),
            objective: TaskObjectiveVo.create('Reconstituted task objective example'),
            description: TaskDescriptionVo.create('Reconstituted task description example'),
            status: TaskStatusVo.create('todo'),
            priority: TaskPriorityVo.create('low'),
            assignedTo: MemberIdVo.fromId('6f3a8b41-3511-4475-b3e8-5a2a9e59d9c2'),
            creatorId: MemberIdVo.fromId('d5a1b329-376c-4f7f-8d76-5868f76e1911'),
            projectId: ProjectIdVo.fromId('2b43b9d6-5744-468e-908c-6872559a4441'),
            completedAt: null,
            dueDate: DateVo.create(futureDate),
            ...overrides
        }
        return TaskEntityClass.reconstitute(
            defaults,
            TaskIdVo.fromId('631855a8-208b-4d4b-ae84-82559fd108a7'),
            DateVo.create(),
            DateVo.create(),
            MemberIdVo.fromId('d5f577de-b1e6-42d4-ab20-a681df50259b'),
            MemberIdVo.fromId('2b4e78a6-5626-4d2c-813f-366a4f911993')
        )
    }

    static reconstituteOverdue() {

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayVo = DateVo.create(yesterday);

        return this.reconstituteDefault({
            status: TaskStatusVo.create('overdue'),
            dueDate: yesterdayVo
        })
    }

}