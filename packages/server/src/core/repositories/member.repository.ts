import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { IBaseRepository } from './base.repository.js';
import { MemberEntityClass } from 'core/entities/classes/member-entity.class.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';

export interface IMemberRepository extends IBaseRepository<MemberIdVo, MemberEntityClass> {

    isMember(internalProjectId: ProjectIdVo, internalUserId: UserIdVo): Promise<boolean>
    hasTeamMembers(internalProjectId: ProjectIdVo): Promise<boolean>
    findProjectMember(internalProjectId: ProjectIdVo, internalUserId: UserIdVo): Promise<MemberEntityClass | null>
    findAllMembershipsByUser(internalUserId: UserIdVo, options?: {onlyActive?: boolean}): Promise<MemberEntityClass[]>
    findAllProjectMembers(internalProjectId: ProjectIdVo): Promise<MemberEntityClass[]>
    countActiveAdmins(internalProjectId: ProjectIdVo): Promise<number>
    countActiveContributors(internalProjectId: ProjectIdVo): Promise<number>
    countActiveMembersByProject(internalProjectId: ProjectIdVo): Promise<number>
    countAdminRolesByUser(internalUserId: UserIdVo): Promise<number>
}