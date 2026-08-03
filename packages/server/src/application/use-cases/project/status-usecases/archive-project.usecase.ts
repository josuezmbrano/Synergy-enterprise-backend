import { ArchiveProjectOutput } from 'application/dtos/project/status-dtos/archive-project.dto.js';
import { ArchiveProjectInput } from '@project/common/schemas/project.schema.js'
import { BaseUseCase } from 'application/use-cases/base.use-case.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';

export class ArchiveProjectCase implements BaseUseCase<ArchiveProjectInput, ArchiveProjectOutput> {

    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly userRepository: IUserRepository,
        private readonly memberRepository: IMemberRepository
    ) { }

    async execute(input: ArchiveProjectInput): Promise<ArchiveProjectOutput> {

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


        // VALIDATE MEMBER EXISTENCE AND LINKAGE TO PROJECT
        const isMember = await this.memberRepository.isMember(project.id, userAccount.id)
        if (!isMember) throw ProjectErrorFactory.projectNotFound()


        // CALL THE UPDATE METHOD
        project.moveToArchived(userAccount.id)


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

    private mapToOutput(project: ProjectEntityClass, ownerPublicId: UserIdVo): ArchiveProjectOutput {
        const primitives = project.toPrimitives()

        return {
            id: primitives.publicId,
            title: primitives.title,
            description: primitives.description,
            category: primitives.category,
            status: primitives.status,
            ownerId: ownerPublicId.value,
            updatedAt: project.updatedAtDate.toISO(),
            createdAt: project.createdAtDate.toISO(),
            completedAt: project.completedAtDate?.toISO() ?? null,
            archivedAt: project.archivedAtDate?.toISO() ?? null
        }
    }
}