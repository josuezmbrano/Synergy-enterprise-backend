import { FindAllMembersOutput } from 'application/dtos/member/find-all-members.dto.js';
import { FindAllMembersInput } from '@project/common/schemas/member.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IMemberRepository } from 'core/repositories/member.repository.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { IProjectRepository } from 'core/repositories/project.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { ProjectErrorFactory } from 'core/errors/factories/project-factory.error.js';
import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { MemberEntityClass } from 'core/entities/classes/member-entity.class.js';
import { FindMemberOutput } from 'application/dtos/member/find-member.dto.js';

export class FindAllMembersCase implements BaseUseCase<FindAllMembersInput, FindAllMembersOutput> {

    constructor(
        private readonly memberRepository: IMemberRepository,
        private readonly userRepository: IUserRepository,
        private readonly projectRepository: IProjectRepository
    ) { }

    async execute(input: FindAllMembersInput): Promise<FindAllMembersOutput> {

        // INSTANTIATE IDENTIFICATORS VO
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const projectPublicId = ProjectIdVo.fromId(input.projectId)


        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureCanViewPlatform()


        // VALIDATE PROJECT EXISTENCE
        const project = await this.projectRepository.findByPublicId(projectPublicId)

        if (!project) throw ProjectErrorFactory.projectNotFound()

        project.ensureIsVisible(userAccount.id)


        // VALIDATE MEMBER EXISTENCE AND LINKAGE TO PROJECT
        const actingMember = await this.memberRepository.findProjectMember(project.id, userAccount.id)
        if (!actingMember || !actingMember.canAccessProject()) throw ProjectErrorFactory.projectNotFound()


        // FIND ALL MEMBERS
        const members = await this.memberRepository.findAllProjectMembers(project.id)

        const primitiveMembers = members.map(member => {

            const userPublicId = member.userPublicId

            if (!userPublicId) {
                throw CommonErrorFactory.commonDataInconsistency(
                    `Internal server error: Required public id data in ${member.publicId.value} is missing.`
                )
            }

            return this.mapToOutput(member, userPublicId, project.publicId)
        })


        // RETURN RESULTED ARRAY TO CLIENT
        return { members: primitiveMembers }
    }


    private mapToOutput(member: MemberEntityClass, userPublicId: UserIdVo, projectPublicId: ProjectIdVo): FindMemberOutput {
        const primitives = member.toPrimitives()

        return {
            id: primitives.publicId,
            userId: userPublicId.value,
            projectId: projectPublicId.value,
            role: primitives.role,
            status: primitives.status,
            updatedAt: member.updatedAtDate.toISO(),
            createdAt: member.createdAtDate.toISO(),
            joinedAt: member.joinedAtDate.toISO()
        }
    }

}