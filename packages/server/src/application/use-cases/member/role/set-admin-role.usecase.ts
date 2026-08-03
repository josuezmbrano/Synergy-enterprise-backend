import { SetAdminRoleOutput } from 'application/dtos/member/role/set-admin-role.dto.js';
import { SetAdminRoleInput } from '@project/common/schemas/member.schema.js'
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

export class SetAdminRoleCase implements BaseUseCase<SetAdminRoleInput, SetAdminRoleOutput> {

    constructor(
        private readonly memberRepository: IMemberRepository,
        private readonly userRepository: IUserRepository,
        private readonly projectRepository: IProjectRepository
    ) { }

    async execute(input: SetAdminRoleInput): Promise<SetAdminRoleOutput> {

        // INSTANTIATE IDENTIFICATORS VO
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const targetMemberId = MemberIdVo.fromId(input.targetMemberId)
        const projectId = ProjectIdVo.fromId(input.projectId)


        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
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


        // VALIDATE ACTING MEMBER EXISTENCE, LINKAGE TO PROJECT AND CHECK OWNERSHIP PRIVILEGE
        project.ensureUserIsOwner(userAccount.id)


        // VALIDATE TARGET MEMBER USER ACCOUNT EXISTENCE AND PERMISSIONS
        const targetUserAccount = await this.userRepository.findById(targetMember.userId)

        if (!targetUserAccount) throw UserErrorFactory.userNotFound()
        targetUserAccount.ensureCanOperate()


        // CHECK AND VALIDATE TARGET MEMBER ADMIN ROLES COUNT
        const adminRolesByTargetMember = await this.memberRepository.countAdminRolesByUser(targetUserAccount.id)
        targetUserAccount.ensureCanAcceptAdminRole(adminRolesByTargetMember)


        // VALIDATE TARGET MEMBER ACCOUNT VERIFICATION
        // CALL THE CORRESPONDING METHOD
        const isMemberAccountVerified = targetUserAccount.isVerified()

        if (!isMemberAccountVerified) throw MemberErrorFactory.memberVerificationPending({
            propToModify: 'role',
            reason: 'MEMBER_READ_ONLY',
            constraint: 'cannot_update_members_unverified'
        })

        targetMember.moveToAdmin()


        const TargetUserPublicId = targetMember.userPublicId

        if (!TargetUserPublicId) {
            throw CommonErrorFactory.commonDataInconsistency(
                `Internal server error: Required public id data in ${targetMember.publicId.value} is missing.`
            )
        }


        // PERSIST ENTITY TO REPOSITORY AND OUTPUT PRIMITIVES TO CLIENT
        const targetMemberUpdated = await this.memberRepository.save(targetMember)

        return this.mapToOutput(targetMemberUpdated, project.publicId, TargetUserPublicId)
    }

    private mapToOutput(targetMember: MemberEntityClass, projectPublicId: ProjectIdVo, TargetUserPublicId: UserIdVo): SetAdminRoleOutput {
        const primitives = targetMember.toPrimitives()

        return {
            id: primitives.publicId,
            projectId: projectPublicId.value,
            userId: TargetUserPublicId.value,
            status: primitives.status,
            role: primitives.role,
            updatedAt: targetMember.updatedAtDate.toISO(),
            createdAt: targetMember.createdAtDate.toISO(),
            joinedAt: targetMember.joinedAtDate.toISO()
        }
    }
}