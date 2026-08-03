import { SetOnLeaveStatusOutput } from 'application/dtos/member/status/set-onleave-status.dto.js';
import { SetOnLeaveStatusInput } from '@project/common/schemas/member.schema.js'
import { BaseUseCase } from 'application/use-cases/base.use-case.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { ITaskRepository } from 'core/repositories/task.repository.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { MemberEntityClass } from 'core/entities/classes/member-entity.class.js';

export class SetOnLeaveStatusCase implements BaseUseCase<SetOnLeaveStatusInput, SetOnLeaveStatusOutput> {

    constructor(
        private readonly memberRepository: IMemberRepository,
        private readonly userRepository: IUserRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly taskRepository: ITaskRepository
    ) { }

    async execute(input: SetOnLeaveStatusInput): Promise<SetOnLeaveStatusOutput> {

        // INSTANTIATE IDENTIFICATOR VOs
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const projectId = ProjectIdVo.fromId(input.projectId)
        const targetMemberId = MemberIdVo.fromId(input.targetMemberId)


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


        // VALIDATE ACTING MEMBER EXISTENCE AND LINKAGE TO PROJECT
        const actingMember = await this.memberRepository.findProjectMember(project.id, userAccount.id)
        if (!actingMember || !actingMember.canAccessProject()) throw ProjectErrorFactory.projectNotFound()


        // ENSURE ACTING MEMBER IS OWNER OR ADMIN
        const isActingMemberAdmin = actingMember.hasPrivileges()
        const isOwner = project.isOwner(userAccount.id)

        if (!isOwner && !isActingMemberAdmin) throw ProjectErrorFactory.projectNotOwnerOrAdmin()


        // VALIDATE TARGET MEMBER USER ACCOUNT EXISTENCE AND PERMISSIONS
        const targetUserAccount = await this.userRepository.findById(targetMember.userId)

        if (!targetUserAccount) throw UserErrorFactory.userNotFound()


        // VALIDATE TARGET MEMBER ROLE AND CHECK IF ROLE BACKUP MEETS THE MINIMUM CUOTA
        const isTargetMemberAdmin = targetMember.hasPrivileges()

        if (isTargetMemberAdmin) {
            const currentActiveAdmins = await this.memberRepository.countActiveAdmins(project.id)
            project.ensureExistsBackupAdmin(currentActiveAdmins)
        }

        if (!isTargetMemberAdmin) {
            const currentActiveContributors = await this.memberRepository.countActiveContributors(project.id)
            project.ensureBackupContributorsLimit(currentActiveContributors)
        }


        // RETRIEVE DATA CONCERNING TO TARGET MEMBER
        // CALL THE CORRESPONDING METHOD
        const isTargetMemberVerified = targetUserAccount.isVerified()

        if (!isTargetMemberVerified) throw MemberErrorFactory.memberVerificationPending({
            propToModify: 'status',
            reason: 'MEMBER_READ_ONLY',
            constraint: 'cannot_update_members_unverified'
        })

        const hasPendingTasks = await this.taskRepository.hasUserTaskPendings(project.id, targetMember.id)

        if (hasPendingTasks) throw MemberErrorFactory.memberActiveTasksOnLeave({
            propToModify: 'status',
            reason: 'MEMBER_PENDING_TASKS',
            constraint: 'cannot_on_leave_a_member_active_tasks'
        })


        targetMember.moveToOnLeave()


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

    private mapToOutput(targetMember: MemberEntityClass, projectPublicId: ProjectIdVo, targetUserPublicId: UserIdVo): SetOnLeaveStatusOutput {
        const primitives = targetMember.toPrimitives()

        return {
            id: primitives.publicId,
            userId: targetUserPublicId.value,
            projectId: projectPublicId.value,
            role: primitives.role,
            status: primitives.status,
            createdAt: targetMember.createdAtDate.toISO(),
            updatedAt: targetMember.updatedAtDate.toISO(),
            joinedAt: targetMember.joinedAtDate.toISO()
        }
    }

}