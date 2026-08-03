import { FindMemberOutput } from 'application/dtos/member/find-member.dto.js';
import { FindMemberInput } from '@project/common/schemas/member.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { MemberErrorFactory } from 'core/errors/factories/member-factory.error.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { MemberEntityClass } from 'core/entities/classes/member-entity.class.js';

export class FindMemberCase implements BaseUseCase<FindMemberInput, FindMemberOutput> {

    constructor(
        private readonly memberRepository: IMemberRepository,
        private readonly userRepository: IUserRepository,
        private readonly projectRepository: IProjectRepository
    ) { }

    async execute(input: FindMemberInput): Promise<FindMemberOutput> {

        // INSTANTIATE IDENTIFICATORS VO
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const projectId = ProjectIdVo.fromId(input.projectId)


        // VALIDATE ACTING USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanViewPlatform()


        // VALIDATE PROJECT EXISTENCE
        const project = await this.projectRepository.findByPublicId(projectId)

        if (!project) throw ProjectErrorFactory.projectNotFound()

        project.ensureIsVisible(userAccount.id)


        // VALIDATE ACTING MEMBER EXISTENCE AND LINKAGE TO PROJECT
        const member = await this.memberRepository.findProjectMember(project.id, userAccount.id)
        if (!member || !member.canAccessProject()) throw ProjectErrorFactory.projectNotFound()


        // RETRIEVE TARGET MEMBER
        const targetMemberId = MemberIdVo.fromId(input.memberId)

        const targetMember = await this.memberRepository.findByPublicId(targetMemberId)

        if (!targetMember) throw MemberErrorFactory.memberNotFound()

        if (!targetMember.projectId.equals(project.id)) throw MemberErrorFactory.memberNotFound()


        const targetUserPublicId = targetMember.userPublicId

        if (!targetUserPublicId) {
            throw CommonErrorFactory.commonDataInconsistency(
                `Internal server error: Required public id data in ${targetMember.publicId.value} is missing.`
            )
        }


        // CONVERT TO PRIMITIVES AND OUTPUT RESULT TO CLIENT
        return this.mapToOutput(targetMember, targetUserPublicId, project.publicId)
    }

    private mapToOutput(member: MemberEntityClass, targetUserPublicId: UserIdVo, projectPublicId: ProjectIdVo): FindMemberOutput {
        const primitives = member.toPrimitives()

        return {
            id: primitives.publicId,
            projectId: projectPublicId.value,
            userId: targetUserPublicId.value,
            status: primitives.status,
            role: primitives.role,
            joinedAt: member.joinedAtDate.toISO(),
            createdAt: member.createdAtDate.toISO(),
            updatedAt: member.updatedAtDate.toISO()
        }
    }

}