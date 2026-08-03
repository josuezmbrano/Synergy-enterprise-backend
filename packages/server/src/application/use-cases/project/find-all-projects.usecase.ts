import { FindAllProjectsOutput } from 'application/dtos/project/find-all-projects.dto.js';
import { FindAllProjectsInput } from '@project/common/schemas/project.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { FindProjectOutput } from 'application/dtos/project/find-project.dto.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';


export class FindAllProjectsCase implements BaseUseCase<FindAllProjectsInput, FindAllProjectsOutput> {

    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly userRepository: IUserRepository,
        private readonly memberRepository: IMemberRepository
    ) { }

    async execute(input: FindAllProjectsInput): Promise<FindAllProjectsOutput> {

        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
        const actingUserPublicId = UserIdVo.fromId(input.actorId)

        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()

        userAccount.ensureCanViewPlatform()


        // RETRIEVE USER MEMBERSHIPS (ACTIVE AND ONLEAVE) AND EXTRACT PROJECT IDS RELATED
        const userMemberships = await this.memberRepository.findAllMembershipsByUser(userAccount.id, { onlyActive: true })


        // FAST RETURN IF NO MEMBERSHIPS ARE OBTAINED TO AVOID
        // UNNECESSARY CALLS
        if (userMemberships.length === 0) return {projects: []}


        const projectIDs = userMemberships.map(membership => {
            return membership.projectId
        })


        // RETRIEVE PROJECTS THAT MATCHED THE IDS AND MAPPED THEM AS
        // PRIMITIVES VALUES TO RETURN TO CLIENT 
        const userProjects = await this.projectRepository.findAllVisibleForUser(projectIDs, userAccount.id)

        const projectPrimitives: FindProjectOutput[] = userProjects.map(project => {

            const ownerPublicId = project.ownerPublicId

            if (!ownerPublicId) {
                throw CommonErrorFactory.commonDataInconsistency(
                    `Internal server error: Required public owner id data in ${project.publicId.value} is missing.`
                )
            }

            return this.maptoOutput(project, ownerPublicId)
        })

        return { projects: projectPrimitives }
    }


    private maptoOutput(project: ProjectEntityClass, ownerPublicId: UserIdVo): FindProjectOutput {
        const primitives = project.toPrimitives()

        return {
            id: primitives.publicId,
            title: primitives.title,
            description: primitives.description,
            ownerId: ownerPublicId.value,
            updatedAt: project.updatedAtDate.toISO(),
            createdAt: project.createdAtDate.toISO(),
            completedAt: project.completedAtDate?.toISO() ?? null,
            archivedAt: project.archivedAtDate?.toISO() ?? null,
            status: primitives.status,
            category: primitives.category
        }
    }


}