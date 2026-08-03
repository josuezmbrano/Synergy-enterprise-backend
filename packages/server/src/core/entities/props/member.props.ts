import { DateVo } from 'core/value-objects/common/date.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';

export interface MemberProps {
    publicId: MemberIdVo
    projectId: ProjectIdVo
    userId: UserIdVo
    role: MemberRoleVo
    status: MemberStatusVo
    joinedAt: DateVo
}