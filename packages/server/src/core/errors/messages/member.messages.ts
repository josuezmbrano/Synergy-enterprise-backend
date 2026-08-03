import { MemberErrorCodes } from '../code/member.codes.js';

export const MemberRuleErrorMessages = {
    [MemberErrorCodes.MEMBER_LINK_INMUTABLE]: 'Error: A member is bound to a project and user ID, and it is permanent and untransferible.',
    [MemberErrorCodes.MEMBER_NOT_ACTIVE]: 'Error: A member cannot be assigned or be updated if current member status is not active.',
    [MemberErrorCodes.MEMBER_NOT_PERMITTED_CHGROLE]: 'Error: A member role is managed exclusively by the project owner.',
    [MemberErrorCodes.MEMBER_NOT_PERMITTED_CHGSTS]: 'Error: A member status is managed exclusively by the project owner.',
    [MemberErrorCodes.MEMBER_ACTIVE_TASKS_REMOVAL]: 'Error: Cannot remove a member if tasks assigned are in: (Doing) status.',
    [MemberErrorCodes.MEMBER_ACTIVE_TASKS_INACTIVATE]: 'Error: Cannot inactivate a member if tasks assigned are in: (Doing) status.',
    [MemberErrorCodes.MEMBER_ACTIVE_TASKS_ON_LEAVE]: 'Error: Please reassign or complete all pending tasks before putting this member on leave.',
    [MemberErrorCodes.MEMBER_VERIFICATION_PENDING]: 'Error: Pending verification is required, entering Read-only mode until verification is completed.',
    [MemberErrorCodes.MEMBER_USER_NOT_ELIGIBLE]: 'Error: User verification is required to be eligible to participate.',
    [MemberErrorCodes.MEMBER_OWNER_ROLE_LOCKED]: 'Error: An owner cannot be degraded from his member role.',
    [MemberErrorCodes.MEMBER_NOT_PERMITTED_TO_CREATE]: 'Error: Members that are not administrators cannot create tasks on current project.'
}