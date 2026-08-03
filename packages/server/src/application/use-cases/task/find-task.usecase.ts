import { FindTaskOutput } from 'application/dtos/task/find-task.dto.js';
import { FindTaskInput } from '@project/common/schemas/task.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { ITaskRepository } from 'core/repositories/task.repository.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js';
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { TaskEntityClass } from 'core/entities/classes/task-entity.class.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';

export class FindTaskCase implements BaseUseCase<FindTaskInput, FindTaskOutput> {

    constructor(
        private readonly taskRepository: ITaskRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly userRepository: IUserRepository,
        private readonly memberRepository: IMemberRepository
    ) { }

    async execute(input: FindTaskInput): Promise<FindTaskOutput> {

        // INSTANTIATE IDENTIFICATOR VOs
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const taskId = TaskIdVo.fromId(input.taskId)


        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSIONS
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanViewPlatform()


        // VALIDATE TASK EXISTENCE AND EXTRACT PROJECT ID
        const task = await this.taskRepository.findByPublicId(taskId)

        if (!task) throw TaskErrorFactory.taskNotFound()


        // VALIDATE PROJECT EXISTENCE
        const project = await this.projectRepository.findById(task.projectId)

        if (!project) throw ProjectErrorFactory.projectNotFound()


        // VALIDATE PERMISSION TO SEE IF PROJECT IS ARCHIVED
        project.ensureIsVisible(userAccount.id)


        // VALIDATE MEMBER EXISTENCE CONNECTION TO PROJECT
        const member = await this.memberRepository.findProjectMember(project.id, userAccount.id)
        if (!member || !member.canAccessProject()) throw ProjectErrorFactory.projectNotFound()


        const assignedToPublicId = task.assignedToPublicId
        const creatorPublicId = task.creatorPublicId

        if (!creatorPublicId) {
            throw CommonErrorFactory.commonDataInconsistency(
                `Internal server error: Required public id data in ${task.publicId.value} is missing.`
            )
        }


        // OUTPUT PRIMITIVES TO CLIENT
        return this.mapToOutput(task, project.publicId, creatorPublicId, assignedToPublicId)

    }

    private mapToOutput(task: TaskEntityClass, projectPublicId: ProjectIdVo, creatorPublicId: MemberIdVo, assignedToPublicId: MemberIdVo | undefined): FindTaskOutput {
        const primitives = task.toPrimitives()

        return {
            id: primitives.publicId,
            projectId: projectPublicId.value,
            creatorId: creatorPublicId.value,
            assignedTo: assignedToPublicId?.value ?? null,
            objective: primitives.objective,
            description: primitives.description,
            status: primitives.status,
            priority: primitives.priority,
            updatedAt: task.updatedAtDate.toISO(),
            createdAt: task.createdAtDate.toISO(),
            completedAt: task.completedAtDate?.toISO() ?? null,
            dueDate: primitives.dueDate.toISOString()
        }
    }

}