import { FindAllTasksOutput } from 'application/dtos/task/find-all-tasks.dto.js';
import { FindAllTasksInput } from '@project/common/schemas/task.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { ITaskRepository } from 'core/repositories/task.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { FindTaskOutput } from 'application/dtos/task/find-task.dto.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { TaskEntityClass } from 'core/entities/classes/task-entity.class.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';

export class FindAllTasksCase implements BaseUseCase<FindAllTasksInput, FindAllTasksOutput> {

    constructor(
        private readonly taskRepository: ITaskRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly userRepository: IUserRepository,
        private readonly memberRepository: IMemberRepository
    ) { }

    async execute(input: FindAllTasksInput): Promise<FindAllTasksOutput> {

        // INSTANTIATE IDENTIFICATOR VOs
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const projectId = ProjectIdVo.fromId(input.projectId)


        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanViewPlatform()


        // VALIDATE PROJECT EXISTENCE
        const project = await this.projectRepository.findByPublicId(projectId)

        if (!project) throw ProjectErrorFactory.projectNotFound()


        // VALIDATE USER PERMISSION TO SEE IF PROJECT IS ARCHIVED
        project.ensureIsVisible(userAccount.id)


        // VALIDATE ACTING USER MEMBERSHIP CONNECTION TO PROJECT
        const member = await this.memberRepository.findProjectMember(project.id, userAccount.id)

        if (!member || !member.canAccessProject()) throw ProjectErrorFactory.projectNotFound()


        // RETRIEVE ALL TASKS THAT MATCHED THE PROJECT ID
        const tasks = await this.taskRepository.findByProject(project.id)


        // MAPPED THROUGH EVERY TASK TO GET PRIMITIVES AND OUTPUT THE RESULT TO CLIENT
        const tasksPrimitives: FindTaskOutput[] = tasks.map(task => {

            const assignedToPublicId = task.assignedToPublicId
            const creatorPublicId = task.creatorPublicId

            if (!creatorPublicId) {
                throw CommonErrorFactory.commonDataInconsistency(
                    `Internal server error: Required public id data in ${task.publicId.value} is missing.`
                )
            }

            return this.mapToOutput(task, project.publicId, creatorPublicId, assignedToPublicId)
        })

        return { tasks: tasksPrimitives }
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
            createdAt: task.createdAtDate.toISO(),
            updatedAt: task.updatedAtDate.toISO(),
            completedAt: task.completedAtDate?.toISO() ?? null,
            dueDate: primitives.dueDate.toISOString()
        }
    }

}