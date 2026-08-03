import { UpdateTaskInfoOutput } from 'application/dtos/task/update-task-info.dto.js';
import { UpdateTaskInfoInput } from '@project/common/schemas/task.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { ITaskRepository } from 'core/repositories/task.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js';
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { TaskObjectiveVo } from 'core/value-objects/task/task-objective.vo.js';
import { TaskDescriptionVo } from 'core/value-objects/task/task-description.vo.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { TaskEntityClass } from 'core/entities/classes/task-entity.class.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';

export class UpdateTaskInfoCase implements BaseUseCase<UpdateTaskInfoInput, UpdateTaskInfoOutput> {

    constructor(
        private readonly taskRepository: ITaskRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly userRepository: IUserRepository,
        private readonly memberRepository: IMemberRepository
    ) { }

    async execute(input: UpdateTaskInfoInput): Promise<UpdateTaskInfoOutput> {

        // INSTANTIATE VOs
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const taskId = TaskIdVo.fromId(input.taskId)
        const newObjective = input.objective ? TaskObjectiveVo.create(input.objective) : null
        const newDescription = input.description ? TaskDescriptionVo.create(input.description) : null


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


        // VALIDATE MEMBER PERMISSION TO EDIT TASK INFO
        const isCreatedByMember = task.isCreatedBy(member.id)
        const isProjectOwner = project.isOwner(userAccount.id)
        
        if (!isCreatedByMember && !isProjectOwner) throw TaskErrorFactory.taskNotPermittedToEdit()


        const assignedToPublicId = task.assignedToPublicId
        const creatorPublicId = task.creatorPublicId

        if (!creatorPublicId) {
            throw CommonErrorFactory.commonDataInconsistency(
                `Internal server error: Required public id data in ${task.publicId.value} is missing.`
            )
        }


        if (!newObjective && !newDescription) return this.mapToOutput(task, project.publicId, creatorPublicId, assignedToPublicId)


        // CHECK UPDATE INPUTS, CREATE VOs AND CALL THE SPECIFIC METHOD
        if (newObjective) {
            task.updateObjective(newObjective)
        }

        if (newDescription) {
            task.updateDescription(newDescription)
        }


        // PERSIST CHANGES TO REPOSITORY AND OUTPUT PRIMITIVES TO CLIENT
        const taskUpdated = await this.taskRepository.save(task)

        return this.mapToOutput(taskUpdated, project.publicId, creatorPublicId, assignedToPublicId)
    }

    private mapToOutput(task: TaskEntityClass, projectPublicId: ProjectIdVo, creatorPublicId: MemberIdVo, assignedToPublicId: MemberIdVo | undefined): UpdateTaskInfoOutput {
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