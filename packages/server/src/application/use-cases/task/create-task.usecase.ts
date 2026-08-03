import { CreateTaskOutput } from 'application/dtos/task/create-task.dto.js';
import { CreateTaskInput } from '@project/common/schemas/task.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { ITaskRepository } from 'core/repositories/task.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { TaskEntityClass } from 'core/entities/classes/task-entity.class.js';
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js';
import { TaskDescriptionVo } from 'core/value-objects/task/task-description.vo.js';
import { TaskPriorityVo } from 'core/value-objects/task/task-priority.vo.js';
import { TaskStatusVo } from 'core/value-objects/task/task-status.vo.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';


export class CreateTaskCase implements BaseUseCase<CreateTaskInput, CreateTaskOutput> {

    constructor(
        private readonly taskRepository: ITaskRepository,
        private readonly userRepository: IUserRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly memberRepository: IMemberRepository
    ) { }


    async execute(input: CreateTaskInput): Promise<CreateTaskOutput> {


        // INITIALIZE VOs
        const internalId = TaskIdVo.create()
        const publicId = TaskIdVo.create()
        const objective = TaskObjectiveVo.create(input.objective)
        const description = TaskDescriptionVo.create(input.description)
        const priority = TaskPriorityVo.create(input.priority)
        const status = TaskStatusVo.create('todo')
        const dueDate = DateVo.create(input.dueDate)


        // INSTANTIATE IDENTIFICATOR VOs
        const actingUserPublicId = UserIdVo.fromId(input.actingUserId)
        const projectId = ProjectIdVo.fromId(input.projectId)


        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanOperate()


        // VALIDATE PROJECT EXISTENCE AND CURRENT STATUS
        const project = await this.projectRepository.findByPublicId(projectId)

        if (!project) throw ProjectErrorFactory.projectNotFound()

        project.ensureIsWritable()


        // VALIDATE MEMBER EXISTENCE RELATED TO THE CURRENT PROJECT
        // CHECK FOR ADMIN PRIVILEGES TO PERFORM CREATION
        const member = await this.memberRepository.findProjectMember(project.id, userAccount.id)
        if (!member || !member.canAccessProject()) throw ProjectErrorFactory.projectNotFound()

        member.ensureIsAdmin()


        // VALIDATE ASSIGNED TO EXISTENCE IN PROJECT 
        const internalAssignedId = input.assigneeMemberId ? await this.getAssignedInternalId(project.id, MemberIdVo.fromId(input.assigneeMemberId)) : null


        // CREATE TASK ENTITY
        const task = TaskEntityClass.create({
            publicId: publicId,
            objective: objective,
            description: description,
            priority: priority,
            status: status,
            assignedTo: internalAssignedId,
            creatorId: member.id,
            projectId: project.id,
            completedAt: null,
            dueDate: dueDate
        }, internalId)


        // PERSIST ENTITY IN REPOSITORY AND OUTPUT PRIMITIVES TO CLIENT
        const newTaskPersisted = await this.taskRepository.save(task)

        return this.mapToOutput(newTaskPersisted, project.publicId, member.publicId, input.assigneeMemberId)
    }

    private mapToOutput(task: TaskEntityClass, projectPublicId: ProjectIdVo, creatorPublicId: MemberIdVo, assigneePublicMemberId: string | undefined): CreateTaskOutput {
        const primitives = task.toPrimitives()

        return {
            id: primitives.publicId,
            projectId: projectPublicId.value,
            creatorId: creatorPublicId.value,
            assignedTo: assigneePublicMemberId ?? null,
            objective: primitives.objective,
            description: primitives.description,
            status: primitives.status,
            priority: primitives.priority,
            dueDate: primitives.dueDate.toISOString(),
            completedAt: task.completedAtDate?.toISO() ?? null,
            createdAt: task.createdAtDate.toISO(),
            updatedAt: task.updatedAtDate.toISO()
        }
    }

    private async getAssignedInternalId(internalProjectId: ProjectIdVo, publicAssigneeId: MemberIdVo): Promise<MemberIdVo> {

        const targetMemberAssigned = await this.memberRepository.findByPublicId(publicAssigneeId)

        if (!targetMemberAssigned) throw MemberErrorFactory.memberNotFound()
        if (!targetMemberAssigned.projectId.equals(internalProjectId)) throw MemberErrorFactory.memberNotFound()

        targetMemberAssigned.ensureisActive()

        // VALIDATE MEMBER USER ACCOUNT EXISTENCE AND PERMISSIONS
        const targetUserAccount = await this.userRepository.findById(targetMemberAssigned.userId)

        if (!targetUserAccount) throw UserErrorFactory.userNotFound()

        targetUserAccount.ensureCanOperate()

        return targetMemberAssigned.id
    }

}

