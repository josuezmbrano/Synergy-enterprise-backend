import { UpdateProjectInfoOutput } from 'application/dtos/project/update-project-info.dto.js';
import { UpdateProjectInfoInput } from '@project/common/schemas/project.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { ProjectTitleVo } from 'core/value-objects/project/project-title.vo.js';
import { ProjectDescriptionVo } from 'core/value-objects/project/project-description.vo.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';


export class UpdateProjectInfoCase implements BaseUseCase<UpdateProjectInfoInput, UpdateProjectInfoOutput> {

    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly userRepository: IUserRepository,
        private readonly memberRepository: IMemberRepository
    ) { }

    async execute(input: UpdateProjectInfoInput): Promise<UpdateProjectInfoOutput> {

        // INSTANTIATE IDENTIFICATORS VO
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const projectId = ProjectIdVo.fromId(input.projectId)


        // INSTANTIATE UPDATES IF INPUTS ARE PRESENT
        const newTitleVo = input.title ? ProjectTitleVo.create(input.title) : null
        const newDescriptionVo = input.description ? ProjectDescriptionVo.create(input.description) : null


        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSIONS
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()

        userAccount.ensureCanOperate()


        // RETRIEVE PROJECT AND VALIDATE EXISTENCE
        const project = await this.projectRepository.findByPublicId(projectId)

        if (!project) throw ProjectErrorFactory.projectNotFound()


        // FIND USER MEMBERSHIP 
        const isMember = await this.memberRepository.isMember(project.id, userAccount.id)
        if (!isMember) throw ProjectErrorFactory.projectNotFound()


        const ownerPublicId = project.ownerPublicId

        if (!ownerPublicId) {
            throw CommonErrorFactory.commonDataInconsistency(
                `Internal server error: Required public owner id data in ${project.publicId.value} is missing.`
            )
        }


        // FAST RETURN IF INPUTS ARE EMPTY
        if (!newTitleVo && !newDescriptionVo) return this.mapToOutput(project, ownerPublicId)



        // CHECK UPDATE INPUTS, CREATE VOs AND CALL THE SPECIFIC METHOD
        if (newTitleVo) {

            const hasChanged = !project.title.equals(newTitleVo)

            if (hasChanged && await this.projectRepository.exists(project.ownerId, newTitleVo)) {
                throw ProjectErrorFactory.projectAlreadyExists({
                    reason: 'RESOURCE_ALREADY_EXISTS',
                    constraint: 'unique_project_title_per_user',
                    title: newTitleVo.value
                })
            }

            project.updateTitle(newTitleVo, userAccount.id)
        }

        if (newDescriptionVo) {
            project.updateDescription(newDescriptionVo, userAccount.id)
        }


        // PERSIST ENTITY ON REPOSITORY AND CONVERT TO PRIMITIVES
        const projectUpdated = await this.projectRepository.save(project)


        //  RETURN THE PRIMITIVES VALUES TO THE CLIENT
        return this.mapToOutput(projectUpdated, ownerPublicId)
    }

    private mapToOutput(project: ProjectEntityClass, ownerPublicId: UserIdVo): UpdateProjectInfoOutput {
        const primitives = project.toPrimitives()

        return {
            id: primitives.publicId,
            title: primitives.title,
            description: primitives.description,
            status: primitives.status,
            category: primitives.category,
            ownerId: ownerPublicId.value,
            createdAt: project.createdAtDate.toISO(),
            updatedAt: project.updatedAtDate.toISO(),
            archivedAt: project.archivedAtDate?.toISO() ?? null,
            completedAt: project.completedAtDate?.toISO() ?? null
        }
    }

}