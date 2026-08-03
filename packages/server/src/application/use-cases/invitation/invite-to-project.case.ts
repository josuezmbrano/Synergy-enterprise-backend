import { InviteToProjectInput } from '@project/common/schemas/invitation.schema.js';
import { BaseUseCase } from '../base.use-case.js';
import { InviteToProjectOutput } from 'application/dtos/invitation/invite-to-project.dto.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { IInvitationRepository } from 'core/repositories/invitation.repository.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { InvitationMessageVo } from 'core/value-objects/invitation/invitation-message.vo.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { InvitationEntityClass } from 'core/entities/classes/invitation-entity.class.js';
import { InvitationIdVo } from 'core/value-objects/common/identifiers/invitation-id.vo.js';
import { InvitationStatusVo } from 'core/value-objects/invitation/invitation-status.vo.js';
import { InvitationExpirationVo } from 'core/value-objects/invitation/invitation-expiration.vo.js';

export class InviteToProjectCase implements BaseUseCase<InviteToProjectInput, InviteToProjectOutput> {

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly memberRepository: IMemberRepository,
        private readonly invitationRepository: IInvitationRepository
    ) { }

    async execute(input: InviteToProjectInput): Promise<InviteToProjectOutput> {

        // INITIALIZE VO TO ENSURE IS VALID
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const targetUserId = UserIdVo.fromId(input.targetUserId)
        const projectId = ProjectIdVo.fromId(input.projectId)
        const internalId = InvitationIdVo.create()
        const invitationPublicId = InvitationIdVo.create()
        const status = InvitationStatusVo.create('pending')
        const targetRole = MemberRoleVo.create(input.targetRole)
        const message = InvitationMessageVo.create(input.message)
        const expiration = InvitationExpirationVo.createDefaultExpiration()


        // VALIDATE ACTING USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanOperate()


        // VALIDATE TARGET USER EXISTENCE AND ACCOUNT STATUS
        const targetUserAccount = await this.userRepository.findByPublicId(targetUserId)

        if (!targetUserAccount) throw UserErrorFactory.userNotFound()
        targetUserAccount.ensureCanOperate()


        // VALIDATE PROJECT EXISTENCE, PROJECT WRITABILITY
        const project = await this.projectRepository.findByPublicId(projectId)

        if (!project) throw ProjectErrorFactory.projectNotFound()

        project.ensureIsWritable()


        // CHECK FOR OWNERSHIP STATUS FOR ACTING USER
        project.ensureUserIsOwner(userAccount.id)


        // CHECK IF TARGET USER IS NOT ALREADY A MEMBER
        const isAlreadyMember = await this.memberRepository.isMember(project.id, targetUserAccount.id)
        if (isAlreadyMember) throw MemberErrorFactory.memberAlreadyExists()


        // CHECK IF REQUESTED ROLE IS ADMIN
        // PROCEED TO VALIDATE USER ADMIN SLOT AVAILABILITY
        if (targetRole.isAdmin()) {
            const adminRolesByNewMember = await this.memberRepository.countAdminRolesByUser(targetUserAccount.id)
            targetUserAccount.ensureCanAcceptAdminRole(adminRolesByNewMember)
        }


        // CREATE INVITATION ENTITY
        const newInvitation = InvitationEntityClass.create({
            publicId: invitationPublicId,
            invitedById: userAccount.id,
            invitedUserId: targetUserAccount.id,
            projectId: project.id,
            status: status,
            targetRole: targetRole,
            message: message,
            expiresAt: expiration
        }, internalId)


        // PERSIST ENTITY TO REPOSITORY AND OUTPUT PRIMITIVE TO CLIENT
        const newInvitationPersisted = await this.invitationRepository.save(newInvitation)

        return this.mapToOutput(newInvitationPersisted, project.publicId, targetUserAccount.publicId, userAccount.publicId)
    }

    private mapToOutput(invitation: InvitationEntityClass, projectPublicId: ProjectIdVo, targetUserPublicId: UserIdVo, actorUserPublicId: UserIdVo): InviteToProjectOutput {
        const primitives = invitation.toPrimitives()

        return {
            id: primitives.publicId,
            projectId: projectPublicId.value,
            invitedUserId: targetUserPublicId.value,
            invitedById: actorUserPublicId.value,
            status: primitives.status,
            createdAt: invitation.createdAtDate.toISO(),
            message: primitives.message,
            targetRole: primitives.targetRole,
            expiresAt: invitation.expiresAtDate.toISO()
        }
    }

}