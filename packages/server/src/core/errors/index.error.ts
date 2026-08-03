import { AuthErrorCode, AuthErrorCodes } from './code/auth.codes.js';
import { CommonErrorCode, CommonErrorCodes } from './code/common.codes.js';
import { InfraErrorCode, InfraErrorCodes } from './code/infra.codes.js';
import { InvitationErrorCode, InvitationErrorCodes } from './code/invitation.codes.js';
import { MemberErrorCode, MemberErrorCodes } from './code/member.codes.js';
import { ProjectErrorCode, ProjectErrorCodes } from './code/project.codes.js';
import { TaskErrorCode, TaskErrorCodes } from './code/task.codes.js';
import { TokenErrorCode, TokenErrorCodes } from './code/token.codes.js';
import { UserErrorCode, UserErrorCodes } from './code/user.codes.js';

export const DomainErrorCodes = {
    PROJECT: ProjectErrorCodes,
    TASK: TaskErrorCodes,
    MEMBER: MemberErrorCodes,
    USER: UserErrorCodes,
    COMMON: CommonErrorCodes,
    AUTH: AuthErrorCodes,
    TOKEN: TokenErrorCodes,
    INFRA: InfraErrorCodes,
    INVITATION: InvitationErrorCodes
}

export type DomainErrorCode = ProjectErrorCode | TaskErrorCode | MemberErrorCode | UserErrorCode | CommonErrorCode | AuthErrorCode | TokenErrorCode | InfraErrorCode | InvitationErrorCode