import { BaseDomainError } from '../base-domain.error.js';
import { AuthErrorCode, AuthErrorKeys } from '../code/auth.codes.js';
import { CommonErrorCode, CommonErrorKeys } from '../code/common.codes.js';
import { InfraErrorCode, InfraErrorKeys } from '../code/infra.codes.js';
import { InvitationErrorCode, InvitationErrorKeys } from '../code/invitation.codes.js';
import { MemberErrorCode, MemberErrorKeys } from '../code/member.codes.js';
import { ProjectErrorCode, ProjectErrorKeys } from '../code/project.codes.js';
import { TaskErrorCode, TaskErrorKeys } from '../code/task.codes.js';
import { TokenErrorCode, TokenErrorKeys } from '../code/token.codes.js';
import { UserErrorCode, UserErrorKeys } from '../code/user.codes.js';

export class ProjectDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: ProjectErrorCode,
        errorKey: ProjectErrorKeys | 'UNKNOWN_DOMAIN_ERROR',
        metadata?: Record<string, unknown>
    ) {
        super(
            message,
            'PROJECT',
            internalCode,
            errorKey,
            true,
            metadata
        )
    }
}

export class TaskDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: TaskErrorCode,
        errorKey: TaskErrorKeys | 'UNKNOWN_DOMAIN_ERROR',
        metadata?: Record<string, unknown>
    ) {
        super(
            message,
            'TASK',
            internalCode,
            errorKey,
            true,
            metadata
        )
    }
}

export class MemberDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: MemberErrorCode,
        errorKey: MemberErrorKeys | 'UNKNOWN_DOMAIN_ERROR',
        metadata?: Record<string, unknown>
    ) {
        super(
            message,
            'MEMBER',
            internalCode,
            errorKey,
            true,
            metadata
        )
    }
}

export class UserDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: UserErrorCode,
        errorKey: UserErrorKeys | 'UNKNOWN_DOMAIN_ERROR',
        metadata?: Record<string, unknown>
    ) {
        super(
            message,
            'USER',
            internalCode,
            errorKey,
            true,
            metadata
        )
    }
}

export class AuthDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: AuthErrorCode,
        errorKey: AuthErrorKeys | 'UNKNOWN_DOMAIN_ERROR',
        metadata?: Record<string, unknown>
    ) {
        super(
            message,
            'AUTH',
            internalCode,
            errorKey,
            true,
            metadata
        )
    }
}

export class CommonDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: CommonErrorCode,
        errorKey: CommonErrorKeys | 'UNKNOWN_DOMAIN_ERROR',
        metadata?: Record<string, unknown>
    ) {
        super(
            message,
            'COMMON',
            internalCode,
            errorKey,
            true,
            metadata
        )
    }
}

export class TokenDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: TokenErrorCode,
        errorKey: TokenErrorKeys | 'UNKNOWN_DOMAIN_ERROR',
        metadata?: Record<string, unknown>
    ) {
        super(
            message,
            'TOKEN',
            internalCode,
            errorKey,
            true,
            metadata
        )
    }
}

export class InvitationDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: InvitationErrorCode,
        errorKey: InvitationErrorKeys | 'UNKNOWN_DOMAIN_ERROR',
        metadata?: Record<string, unknown>
    ) {
        super(
            message,
            'INVITATION',
            internalCode,
            errorKey,
            true,
            metadata
        )
    }
}

export class InfraDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: InfraErrorCode,
        errorKey: InfraErrorKeys | 'UNKNOWN_DOMAIN_ERROR',
        metadata?: Record<string, unknown>
    ) {
        super(
            message,
            'INFRA',
            internalCode,
            errorKey,
            true,
            metadata
        )
    }
}

