import { FindProjectOutput } from 'application/dtos/project/find-project.dto.js';
import { FindProjectInput } from '@project/common/schemas/project.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';



export class FindProjectCase implements BaseUseCase<FindProjectInput, FindProjectOutput> {

    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly memberRepository: IMemberRepository,
        private readonly userRepository: IUserRepository
    ) { }

    async execute(input: FindProjectInput): Promise<FindProjectOutput> {

        // INSTANTIATE IDENTIFICATORS
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const projectId = ProjectIdVo.fromId(input.projectId)
        

        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()

        userAccount.ensureCanViewPlatform()


        // VALIDATE PROJECT EXISTENCE
        const project = await this.projectRepository.findByPublicId(projectId)

        if (!project) {
            throw ProjectErrorFactory.projectNotFound()
        }


        // VALIDATE MEMBER STATUS AND CONNECTION TO PROJECT WITH IDS AND
        const actingMember = await this.memberRepository.findProjectMember(project.id, userAccount.id)

        if (!actingMember || !actingMember.canAccessProject()) {
            throw ProjectErrorFactory.projectNotFound()
        }


        // VALIDATE VISIBILITY IF ITS ARCHIVED
        project.ensureIsVisible(userAccount.id)


        const ownerPublicId = project.ownerPublicId

        if (!ownerPublicId) {
            throw CommonErrorFactory.commonDataInconsistency(
                `Internal server error: Required public owner id data in ${project.publicId.value} is missing.`
            )
        }

        // PRIMITIVE OUTPUT TO CLIENT
        return this.mapToOutput(project, ownerPublicId)
    }

    private mapToOutput(project: ProjectEntityClass, ownerPublicId: UserIdVo): FindProjectOutput {
        const primitives = project.toPrimitives()

        return {
            id: primitives.publicId,
            title: primitives.title,
            description: primitives.description,
            status: primitives.status,
            category: primitives.category,
            ownerId: ownerPublicId.value,
            updatedAt: project.updatedAtDate.toISO(),
            createdAt: project.createdAtDate.toISO(),
            completedAt: project.completedAtDate?.toISO() ?? null,
            archivedAt: project.archivedAtDate?.toISO() ?? null
        }
    }

}