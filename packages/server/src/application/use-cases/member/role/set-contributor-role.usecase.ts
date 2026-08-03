import { SetContributorRoleOutput } from 'application/dtos/member/role/set-contributor-role.dto.js';
import { SetContributorRoleInput } from '@project/common/schemas/member.schema.js'
import { BaseUseCase } from 'application/use-cases/base.use-case.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { MemberEntityClass } from 'core/entities/classes/member-entity.class.js';

export class SetContributorRoleCase implements BaseUseCase<SetContributorRoleInput, SetContributorRoleOutput> {

    constructor(
        private readonly memberRepository: IMemberRepository,
        private readonly userRepository: IUserRepository,
        private readonly projectRepository: IProjectRepository
    ) { }

    async execute(input: SetContributorRoleInput): Promise<SetContributorRoleOutput> {

        // INSTANTIATE IDENTIFICATOR VO
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const projectId = ProjectIdVo.fromId(input.projectId)
        const targetMemberId = MemberIdVo.fromId(input.targetMemberId)


        // VALIDATE ACTING USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanOperate()


        // VALIDATE PROJECT EXISTENCE
        const project = await this.projectRepository.findByPublicId(projectId)

        if (!project) throw ProjectErrorFactory.projectNotFound()

        project.ensureIsWritable()


        // VALIDATE TARGET MEMBER EXISTENCE AND LINKAGE TO PROJECT
        const targetMember = await this.memberRepository.findByPublicId(targetMemberId)

        if (!targetMember) throw MemberErrorFactory.memberNotFound()
        if (!targetMember.projectId.equals(project.id)) throw MemberErrorFactory.memberNotFound()


        // VALIDATE ACTING MEMBER EXISTENCE, LINKAGE TO PROJECT
        project.ensureUserIsOwner(userAccount.id)


        // VALIDATE TARGET MEMBER USER ACCOUNT EXISTENCE AND PERMISSIONS
        const targetUserAccount = await this.userRepository.findById(targetMember.userId)

        if (!targetUserAccount) throw UserErrorFactory.userNotFound()
        targetUserAccount.ensureCanOperate()


        // VALIDATE TARGET MEMBER ACCOUNT VERIFICATION
        // VALIDATE TARGET MEMBER IS NOT THE OWNER
        // CALL THE CORRESPONDING METHOD
        const isTargetMemberOwner = project.isOwner(targetUserAccount.id)

        if (isTargetMemberOwner) throw MemberErrorFactory.memberOwnerLocked({
            propToModify: 'role',
            reason: 'OWNER_IMMUTABLE',
            constraint: 'project_owner_cannot_be_demoted'
        })

        const isMemberAccountVerified = targetUserAccount.isVerified()

        if (!isMemberAccountVerified) throw MemberErrorFactory.memberVerificationPending({
            propToModify: 'role',
            reason: 'MEMBER_READ_ONLY',
            constraint: 'cannot_update_members_unverified'
        })

        targetMember.moveToContributor()


        const targetUserPublicId = targetMember.userPublicId

        if (!targetUserPublicId) {
            throw CommonErrorFactory.commonDataInconsistency(
                `Internal server error: Required public id data in ${targetMember.publicId.value} is missing.`
            )
        }


        // PERSIST CHANGES TO REPOSITORY AND OUTPUT PRIMITIVES TO CLIENT
        const targetMemberUpdated = await this.memberRepository.save(targetMember)

        return this.mapToOutput(targetMemberUpdated, project.publicId, targetUserPublicId)
    }

    private mapToOutput(targetMember: MemberEntityClass, projectPublicId: ProjectIdVo, targetUserPublicId: UserIdVo): SetContributorRoleOutput {
        const primitives = targetMember.toPrimitives()

        return {
            id: primitives.publicId,
            projectId: projectPublicId.value,
            userId: targetUserPublicId.value,
            status: primitives.status,
            role: primitives.role,
            createdAt: targetMember.createdAtDate.toISO(),
            updatedAt: targetMember.updatedAtDate.toISO(),
            joinedAt: targetMember.joinedAtDate.toISO()
        }
    }

}