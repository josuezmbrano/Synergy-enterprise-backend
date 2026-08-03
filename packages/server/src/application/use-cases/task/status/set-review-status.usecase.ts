import { SetReviewStatusOutput } from 'application/dtos/task/status-dtos/set-review-status-dto.js';
import { SetReviewStatusInput } from '@project/common/schemas/task.schema.js'
import { BaseUseCase } from 'application/use-cases/base.use-case.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { TaskErrorFactory } from 'core/errors/factories/task-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { ITaskRepository } from 'core/repositories/task.repository.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { TaskIdVo } from 'core/value-objects/common/identifiers/task-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { TaskEntityClass } from 'core/entities/classes/task-entity.class.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';

export class SetReviewStatusCase implements BaseUseCase<SetReviewStatusInput, SetReviewStatusOutput> {

    constructor(
        private readonly taskRepository: ITaskRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly userRepository: IUserRepository,
        private readonly memberRepository: IMemberRepository
    ) { }

    async execute(input: SetReviewStatusInput): Promise<SetReviewStatusOutput> {

        // INSTANTIATE VOs
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const taskId = TaskIdVo.fromId(input.taskId)
        const targetMemberAssignedId = MemberIdVo.fromId(input.targetMemberId)


        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanOperate()


        // VALIDATE TASK EXISTENCE
        const task = await this.taskRepository.findByPublicId(taskId)

        if (!task) throw TaskErrorFactory.taskNotFound()


        // VALIDATE PROJECT EXISTENCE
        const project = await this.projectRepository.findById(task.projectId)

        if (!project) throw ProjectErrorFactory.projectNotFound()
        

         // VALIDATE MEMBER EXISTENCE
        const member = await this.memberRepository.findProjectMember(project.id, userAccount.id)

        if (!member || !member.canAccessProject()) throw ProjectErrorFactory.projectNotFound()


        project.ensureIsWritable()


        // CHECK ACTING MEMBER OWNERSHIP OR CREATOR PRIVILEGES
        const isCreatedByMember = task.isCreatedBy(member.id)
        const isProjectOwner = project.isOwner(userAccount.id)

        if (!isCreatedByMember && !isProjectOwner) throw TaskErrorFactory.taskNotPermittedToEdit()


        // VALIDATE TASK ASSIGNED USER CURRENT STATUS AS MEMBER
        const targetMemberAssigned = await this.memberRepository.findByPublicId(targetMemberAssignedId)

        if (!targetMemberAssigned) throw MemberErrorFactory.memberNotFound()
        if (!targetMemberAssigned.projectId.equals(project.id)) throw MemberErrorFactory.memberNotFound()

        targetMemberAssigned.ensureisActive()


        // VALIDATE MEMBER USER ACCOUNT EXISTENCE AND PERMISSIONS
        const targetUserAccount = await this.userRepository.findById(targetMemberAssigned.userId)

        if (!targetUserAccount) throw UserErrorFactory.userNotFound()

        targetUserAccount.ensureCanOperate()


        // CALL THE SPECIFIC METHOD 
        task.moveToReview(targetMemberAssigned.id)


        const assignedToPublicId = task.assignedToPublicId
        const creatorPublicId = task.creatorPublicId

        if (!creatorPublicId || !assignedToPublicId) {
            throw CommonErrorFactory.commonDataInconsistency(
                `Internal server error: Required public id data in ${task.publicId.value} is missing.`
            )
        }


        // PERSIST ENTITY IN REPOSITORY AND OUTPUT PRIMITIVES TO CLIENT
        const taskUpdated = await this.taskRepository.save(task)

        return this.mapToOutput(taskUpdated, project.publicId, creatorPublicId, assignedToPublicId)
    }

    private mapToOutput(task: TaskEntityClass, projectPublicId: ProjectIdVo, creatorPublicId: MemberIdVo, assignedToPublicId: MemberIdVo | undefined): SetReviewStatusOutput {
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
