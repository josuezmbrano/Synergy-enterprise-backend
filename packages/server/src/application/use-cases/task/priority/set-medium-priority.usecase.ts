
import { SetMediumPriorityOutput } from 'application/dtos/task/priority-dtos/set-medium-priority.dto.js'
import { SetMediumPriorityInput } from '@project/common/schemas/task.schema.js'
import { BaseUseCase } from 'application/use-cases/base.use-case.js'
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js'
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js'
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js'
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js'
import { IMemberRepository } from 'core/repositories/member.repository.js'
import { IProjectRepository } from 'core/repositories/project.repository.js'
import { ITaskRepository } from 'core/repositories/task.repository.js'
import { IUserRepository } from 'core/repositories/user.repository.js'
import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js'
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js'
import { TaskEntityClass } from 'core/entities/classes/task-entity.class.js'
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js'
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js'

export class SetMediumPriorityCase implements BaseUseCase<SetMediumPriorityInput, SetMediumPriorityOutput> {

    constructor(
        private readonly taskRepository: ITaskRepository,
        private readonly userRepository: IUserRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly memberRepository: IMemberRepository
    ) { }

    async execute(input: SetMediumPriorityInput): Promise<SetMediumPriorityOutput> {

        // INSTANTIATE VOs
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const taskId = TaskIdVo.fromId(input.taskId)


        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanOperate()


        // VALIDATE TASK EXISTENCE AND EXTRACT PROJECT ID
        const task = await this.taskRepository.findByPublicId(taskId)

        if (!task) throw TaskErrorFactory.taskNotFound()


        // VALIDATE PROJECT EXISTENCE BY ITS TASK PROJECT ID
        const project = await this.projectRepository.findById(task.projectId)

        if (!project) throw ProjectErrorFactory.projectNotFound()


        // VALIDATE MEMBER EXISTENCE AND LINKAGE TO PROJECT
        const member = await this.memberRepository.findProjectMember(project.id, userAccount.id)

        if (!member || !member.canAccessProject()) throw ProjectErrorFactory.projectNotFound()


        project.ensureIsWritable()


        // VALIDATE MEMBER PERMISSION TO EDIT TASK PRIORITY
        const isCreatedByMember = task.isCreatedBy(member.id)
        const isProjectOwner = project.isOwner(userAccount.id)

        if (!isCreatedByMember && !isProjectOwner) throw TaskErrorFactory.taskNotPermittedToEdit()


        // CALL THE CORRESPONDING METHOD
        task.moveToMedium()


        const assignedToPublicId = task.assignedToPublicId
        const creatorPublicId = task.creatorPublicId

        if (!creatorPublicId) {
            throw CommonErrorFactory.commonDataInconsistency(
                `Internal server error: Required public id data in ${task.publicId.value} is missing.`
            )
        }


        // PERSIST CHANGES TO REPOSITORY AND OUTPUT PRIMITIVES TO CLIENT
        const taskUpdated = await this.taskRepository.save(task)

        return this.mapToOutput(taskUpdated, project.publicId, creatorPublicId, assignedToPublicId)
    }

    private mapToOutput(task: TaskEntityClass, projectPublicId: ProjectIdVo, creatorPublicId: MemberIdVo, assignedToPublicId: MemberIdVo | undefined): SetMediumPriorityOutput {
        const primitives = task.toPrimitives()

        return {
            id: primitives.publicId,
            creatorId: creatorPublicId.value,
            assignedTo: assignedToPublicId?.value ?? null,
            projectId: projectPublicId.value,
            objective: primitives.objective,
            description: primitives.description,
            status: primitives.status,
            priority: primitives.priority,
            updatedAt: task.updatedAtDate.toISO(),
            createdAt: task.createdAtDate.toISO(),
            dueDate: primitives.dueDate.toISOString(),
            completedAt: task.completedAtDate?.toISO() ?? null
        }
    }

}