import { AcceptInvitationInput } from '@project/common/schemas/invitation.schema.js';
import { BaseUseCase } from '../base.use-case.js';
import { AcceptInvitationOutput } from 'application/dtos/invitation/accept-invitation.dto.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { IInvitationRepository } from 'core/repositories/invitation.repository.js';
import { InvitationIdVo } from 'core/value-objects/common/identifiers/invitation-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { InvitationErrorFactory } from 'core/errors/factories/invitation-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { MemberEntityClass } from 'core/entities/classes/member-entity.class.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { IBaseUnitOfWork } from '../base.unit-of-work.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';

export class AcceptInvitationCase implements BaseUseCase<AcceptInvitationInput, AcceptInvitationOutput> {

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly memberRepository: IMemberRepository,
        private readonly invitationRepository: IInvitationRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly unitOfWork: IBaseUnitOfWork
    ) { }

    async execute(input: AcceptInvitationInput): Promise<AcceptInvitationOutput> {

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


        // CHECK IF REQUESTED ROLE IS ADMIN
        // PROCEED TO VALIDATE USER ADMIN SLOT AVAILABILITY
        if (invitation.targetRole.isAdmin()) {
            const adminRolesByNewMember = await this.memberRepository.countAdminRolesByUser(userAccount.id)
            userAccount.ensureCanAcceptAdminRole(adminRolesByNewMember)
        }


        // PROCESS INVITATION STATUS
        invitation.moveToAccepted()

        // CREATE NEW MEMBER ENTITY
        const newMember = MemberEntityClass.create({
            publicId: MemberIdVo.create(),
            projectId: invitation.projectId,
            userId: userAccount.id,
            role: invitation.targetRole,
            status: MemberStatusVo.create('active'),
            joinedAt: DateVo.create(),
        }, MemberIdVo.create())


        // RUN AN UNIT OF WORK TO SECURE TRANSACTION OF MULTIPLE OPERATIONS
        const { newMemberPersisted } = await this.unitOfWork.run(async () => {
            // PERSIST ENTITIES ON REPOSITORIES
            const newMemberPersisted = await this.memberRepository.save(newMember)
            await this.invitationRepository.save(invitation)

            return { newMemberPersisted }
        })

        // CONVERT TO PRIMITIVES AND OUTPUT RESULT TO CLIENT
        return this.maptoOutput(newMemberPersisted, userAccount.publicId, project.publicId)
    }

    private maptoOutput(member: MemberEntityClass, userPublicId: UserIdVo, projectPublicId: ProjectIdVo): AcceptInvitationOutput {
        const primitives = member.toPrimitives()

        return {
            id: primitives.publicId,
            projectId: projectPublicId.value,
            userId: userPublicId.value,
            status: primitives.status,
            role: primitives.role,
            joinedAt: member.joinedAtDate.toISO(),
            createdAt: member.createdAtDate.toISO(),
            updatedAt: member.updatedAtDate.toISO()
        }
    }

}
