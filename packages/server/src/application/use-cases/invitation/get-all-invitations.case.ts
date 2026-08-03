import { GetAllInvitationsInput } from '@project/common/schemas/invitation.schema.js';
import { BaseUseCase } from '../base.use-case.js';
import { GetAllInvitationsOutput } from 'application/dtos/invitation/get-all-invitations.dto.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { IInvitationRepository } from 'core/repositories/invitation.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { GetInvitationOutput } from 'application/dtos/invitation/get-invitation.dto.js';
import { InvitationEntityClass } from 'core/entities/classes/invitation-entity.class.js';
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';
import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';

export class GetAllInvitationsCase implements BaseUseCase<GetAllInvitationsInput, GetAllInvitationsOutput> {

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly invitationRepository: IInvitationRepository,
        private readonly projectRepository: IProjectRepository
    ) { }

    async execute(input: GetAllInvitationsInput): Promise<GetAllInvitationsOutput> {

        // INITIALIZE VO TO ENSURE IS VALID
        const actingUserPublicId = UserIdVo.fromId(input.actorId)


        // VALIDATE ACTING USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanViewPlatform()


        // RETRIEVE ALL INVITATIONS BY USER
        const retrievedInvitations = await this.invitationRepository.findAllInvitationsByUser(userAccount.id)


        // FAST RETURN TO AVOID UNNECESSARY CALLS AFTERWARD
        if (retrievedInvitations.length === 0) return { invitations: [] }


        // RECOVER ALL PROJECT IDS AND INVITED BY IDS 
        const projectIds = [...new Set(retrievedInvitations.map(inv => inv.projectId))]
        const invitedByIds = [...new Set(retrievedInvitations.map(inv => inv.invitedById))]


        // BATCH QUERY FOR ADDITIONAL DATA USING THE PROJECT ID AND INVITED BY ID ARRAYS
        const [projects, inviters] = await Promise.all([
            this.projectRepository.findAllByIds(projectIds),
            this.userRepository.findAllUsersByIds(invitedByIds)
        ])


        // Organize the information for each corresponding invitation for the DTO
        const invitationPrimitives: (Omit<GetInvitationOutput, 'metrics'> | null)[] = retrievedInvitations.map(invitation => {

            const inviter = inviters.find(inviter => inviter.id.equals(invitation.invitedById))
            const project = projects.find(project => project.id.equals(invitation.projectId))

            if (!inviter || !project) return null

            return this.mapToOutput(invitation, inviter, userAccount, project)
        })


        // FILTER HEALTHY INVITATIONS AND RETURN RESULTS TO CLIENT
        const healthyInvitations = invitationPrimitives.filter((item): item is Omit<GetInvitationOutput, 'metrics'> => item !== null);

        return {invitations: healthyInvitations}
    }

    private mapToOutput(invitation: InvitationEntityClass, inviter: UserEntityClass, invitee: UserEntityClass, project: ProjectEntityClass): Omit<GetInvitationOutput, 'metrics'> {
        const invitationPrimitives = invitation.toPrimitives()
        const inviterPrimitives = inviter.toPrimitives()
        const inviteePrimitives = invitee.toPrimitives()
        const projectPrimitives = project.toPrimitives()

        return {
            invitation: {
                id: invitationPrimitives.publicId,
                status: invitationPrimitives.status,
                message: invitationPrimitives.message,
                targetRole: invitationPrimitives.targetRole,
                expiresAt: invitationPrimitives.expiresAt.toISOString()
            },
            invitedBy: {
                id: inviterPrimitives.publicId,
                fullname: inviter.fullname,
            },
            invitedUser: {
                id: inviteePrimitives.publicId,
                fullname: invitee.fullname
            },
            project: {
                id: projectPrimitives.publicId,
                title: projectPrimitives.title,
                description: projectPrimitives.description,
                category: projectPrimitives.category,
                status: projectPrimitives.status,
                createdAt: projectPrimitives.createdAt.toISOString()
            }
        }
    }

}