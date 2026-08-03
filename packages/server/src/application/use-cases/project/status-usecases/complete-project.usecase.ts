import { CompleteProjectOutput } from 'application/dtos/project/status-dtos/complete-project.dto.js';
import { CompleteProjectInput } from '@project/common/schemas/project.schema.js'
import { BaseUseCase } from 'application/use-cases/base.use-case.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { ITaskRepository } from 'core/repositories/task.repository.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';

export class CompleteProjectCase implements BaseUseCase<CompleteProjectInput, CompleteProjectOutput> {

    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly userRepository: IUserRepository,
        private readonly taskRepository: ITaskRepository,
        private readonly memberRepository: IMemberRepository
    ) { }

    async execute(input: CompleteProjectInput): Promise<CompleteProjectOutput> {

        // INSTANTIATE IDENTIFICATORS VO
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const projectId = ProjectIdVo.fromId(input.projectId)


        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanOperate()


        // FIND THE CURRENT PROJECT TO UPDATE
        const project = await this.projectRepository.findByPublicId(projectId)

        if (!project) throw ProjectErrorFactory.projectNotFound()


        // FIND USER MEMBERSHIP AND VALIDATE MEMBER OWNED PRIVILEGE TO UPDATE STATUS 
        const member = await this.memberRepository.findProjectMember(project.id, userAccount.id)

        if (!member || !member.canAccessProject()) throw ProjectErrorFactory.projectNotFound()

        const isAdmin = member.hasPrivileges()
        const isOwner = project.isOwner(userAccount.id)

        if (!isOwner && !isAdmin) throw ProjectErrorFactory.projectNotOwnerOrAdmin()


        // CHECK DATA CONCERNING TASKS AND MEMBERS IN PROJECT
        const hasPendingTasks = await this.taskRepository.hasPendingTasks(project.id)

        if (hasPendingTasks) throw ProjectErrorFactory.projectCompletionPendingTasks({
            project: project.publicId.value,
            propToModify: 'status',
            reason: 'UNFINISHED_TASKS_REMAINING',
            constraint: 'open_tasks_found'
        })


        // CALL THE UPDATE METHOD
        project.moveToCompleted()


        const ownerPublicId = project.ownerPublicId

        if (!ownerPublicId) {
            throw CommonErrorFactory.commonDataInconsistency(
                `Internal server error: Required public owner id data in ${project.publicId.value} is missing.`
            )
        }


        const projectUpdated = await this.projectRepository.save(project)

        // OUTPUT PRIMITIVES TO CLIENT
        return this.mapToOutput(projectUpdated, ownerPublicId)
    }

    private mapToOutput(project: ProjectEntityClass, ownerPublicId: UserIdVo): CompleteProjectOutput {
        const primitives = project.toPrimitives()

        return {
            id: primitives.publicId,
            title: primitives.title,
            description: primitives.description,
            status: primitives.status,
            category: primitives.category,
            ownerId: ownerPublicId.value,
            archivedAt: project.archivedAtDate?.toISO() ?? null,
            completedAt: project.completedAtDate?.toISO() ?? null,
            createdAt: project.createdAtDate.toISO(),
            updatedAt: project.updatedAtDate.toISO()
        }
    }

}