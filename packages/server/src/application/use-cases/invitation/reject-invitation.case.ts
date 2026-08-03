import { RejectInvitationInput } from '@project/common/schemas/invitation.schema.js';
import { BaseUseCase } from '../base.use-case.js';
import { RejectInvitationOutput } from 'application/dtos/invitation/reject-invitation.dto.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { IInvitationRepository } from 'core/repositories/invitation.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { InvitationIdVo } from 'core/value-objects/common/identifiers/invitation-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { InvitationErrorFactory } from 'core/errors/factories/invitation-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';

export class RejectInvitationCase implements BaseUseCase<RejectInvitationInput, RejectInvitationOutput> {

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly invitationRepository: IInvitationRepository,
        private readonly projectRepository: IProjectRepository,
    ) { }

    async execute(input: RejectInvitationInput): Promise<RejectInvitationOutput> {

        // INITIALIZE VO TO ENSURE IS VALID
        const invitationPublicId = InvitationIdVo.fromId(input.invitationId)
        const actingUserPublicId = UserIdVo.fromId(input.actorId)


        // VALIDATE ACTING USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanOperate()


        // VALIDATE INVITATION EXISTENCE AND THAT IT BELONGS TO THE ACTING USER
        const invitation = await this.invitationRepository.findByPublicId(invitationPublicId)

        if (!invitation) throw InvitationErrorFactory.invitationNotFound()

        if (!invitation.invitedUserId.equals(userAccount.id)) throw InvitationErrorFactory.invitationNotFound()


        // VALIDATE PROJECT EXISTENCE
        const project = await this.projectRepository.findById(invitation.projectId)

        if (!project) throw ProjectErrorFactory.projectNotFound()

        project.ensureIsWritable()


        // VALIDATE PENDING INVITATION STATUS AND EXPIRY DATE
        invitation.ensureCanBeValidated()


        // PROCESS INVITATION STATUS
        invitation.moveToRejected()


        // PERSIST CHANGES TO REPOSITORY
        const invitationSaved = (await this.invitationRepository.save(invitation)).toPrimitives()


        // CONVERT TO PRIMITIVES AND OUTPUT RESULT TO CLIENT
        return {
            status: invitationSaved.status // REJECTED
        }
    }

}