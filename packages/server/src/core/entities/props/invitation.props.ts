import { InvitationIdVo } from 'core/value-objects/common/identifiers/invitation-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { InvitationExpirationVo } from 'core/value-objects/invitation/invitation-expiration.vo.js';
import { InvitationMessageVo } from 'core/value-objects/invitation/invitation-message.vo.js';
import { InvitationStatusVo } from 'core/value-objects/invitation/invitation-status.vo.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';

export interface InvitationProps {
    publicId: InvitationIdVo
    projectId: ProjectIdVo
    invitedUserId: UserIdVo
    invitedById: UserIdVo
    status: InvitationStatusVo
    message: InvitationMessageVo
    expiresAt: InvitationExpirationVo
    targetRole: MemberRoleVo
}