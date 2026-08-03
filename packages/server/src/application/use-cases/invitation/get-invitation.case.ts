import { GetInvitationInput } from '@project/common/schemas/invitation.schema.js';
import { BaseUseCase } from '../base.use-case.js';
import { GetInvitationOutput } from 'application/dtos/invitation/get-invitation.dto.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { IInvitationRepository } from 'core/repositories/invitation.repository.js';
import { ITaskRepository } from 'core/repositories/task.repository.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { InvitationIdVo } from 'core/value-objects/common/identifiers/invitation-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { InvitationErrorFactory } from 'core/errors/factories/invitation-factory.error.js';
import { InvitationEntityClass } from 'core/entities/classes/invitation-entity.class.js';
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';
import { ProjectEntityClass } from 'core/entities/classes/project-entity.class.js';

export class GetInvitationCase implements BaseUseCase<GetInvitationInput, GetInvitationOutput> {

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly invitationRepository: IInvitationRepository,
        private readonly taskRepository: ITaskRepository,
        private readonly memberRepository: IMemberRepository,
        private readonly projectRepository: IProjectRepository
    ) { }

    async execute(input: GetInvitationInput): Promise<GetInvitationOutput> {

        // INITIALIZE VO TO ENSURE IS VALID
        const invitationPublicId = InvitationIdVo.fromId(input.invitationId)
        const actingUserPublicId = UserIdVo.fromId(input.actorId)


        // VALIDATE ACTING USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanViewPlatform()


        // VALIDATE INVITATION EXISTENCE AND THAT IT BELONGS TO THE ACTING USER
        const invitation = await this.invitationRepository.findByPublicId(invitationPublicId)

        if (!invitation || !invitation.invitedUserId.equals(userAccount.id)) throw InvitationErrorFactory.invitationNotFound()


        // RECOVER ALL ADDITIONAL DATA 
        const [inviter, project, activeMembers, totaltasks] = await Promise.all([
            this.userRepository.findById(invitation.invitedById),
            this.projectRepository.findById(invitation.projectId),
            this.memberRepository.countActiveMembersByProject(invitation.projectId),
            this.taskRepository.countTasksByProject(invitation.projectId)
        ])


        if (!project) throw InvitationErrorFactory.invitationNotFound()

        if (!inviter) throw InvitationErrorFactory.invitationInvalidState()


        return this.mapToOutput(invitation, inviter, userAccount, project, activeMembers, totaltasks)
    }

    private mapToOutput(invitation: InvitationEntityClass, inviter: UserEntityClass, invitee: UserEntityClass, project: ProjectEntityClass, activeMembers: number, totalTasks: number): GetInvitationOutput {
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
            },
            metrics: {
                activeMembersCount: activeMembers,
                tasksCount: totalTasks
            }
        }
    }

}