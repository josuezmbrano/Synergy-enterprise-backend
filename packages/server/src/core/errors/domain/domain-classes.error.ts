import { BaseDomainError } from '../base-domain.error.js';
import { AuthErrorCode } from '../code/auth.codes.js';
import { CommonErrorCode } from '../code/common.codes.js';
import { InfraErrorCode } from '../code/infra.codes.js';
import { InvitationErrorCode } from '../code/invitation.codes.js';
import { MemberErrorCode } from '../code/member.codes.js';
import { ProjectErrorCode } from '../code/project.codes.js';
import { TaskErrorCode } from '../code/task.codes.js';
import { TokenErrorCode } from '../code/token.codes.js';
import { UserErrorCode } from '../code/user.codes.js';

export class ProjectDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: ProjectErrorCode,
        errorKey: string,
        metaData?: Record<string, unknown>
    ) {
        super(
            message,
            'PROJECT',
            internalCode,
            errorKey,
            true,
            metaData
        )
    }
}

export class TaskDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: TaskErrorCode,
        errorKey: string,
        metaData?: Record<string, unknown>
    ) {
        super(
            message,
            'TASK',
            internalCode,
            errorKey,
            true,
            metaData
        )
    }
}

export class MemberDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: MemberErrorCode,
        errorKey: string,
        metaData?: Record<string, unknown>
    ) {
        super(
            message,
            'MEMBER',
            internalCode,
            errorKey,
            true,
            metaData
        )
    }
}

export class UserDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: UserErrorCode,
        errorKey: string,
        metaData?: Record<string, unknown>
    ) {
        super(
            message,
            'USER',
            internalCode,
            errorKey,
            true,
            metaData
        )
    }
}

export class AuthDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: AuthErrorCode,
        errorKey: string,
        metaData?: Record<string, unknown>
    ) {
        super(
            message,
            'AUTH',
            internalCode,
            errorKey,
            true,
            metaData
        )
    }
}

export class CommonDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: CommonErrorCode,
        errorKey: string,
        metaData?: Record<string, unknown>
    ) {
        super(
            message,
            'COMMON',
            internalCode,
            errorKey,
            true,
            metaData
        )
    }
}

export class TokenDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: TokenErrorCode,
        errorKey: string,
        metaData?: Record<string, unknown>
    ) {
        super(
            message,
            'TOKEN',
            internalCode,
            errorKey,
            true,
            metaData
        )
    }
}

export class InvitationDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: InvitationErrorCode,
        errorKey: string,
        metaData?: Record<string, unknown>
    ) {
        super(
            message,
            'INVITATION',
            internalCode,
            errorKey,
            true,
            metaData
        )
    }
}

export class InfraDomainError extends BaseDomainError {
    constructor(
        message: string,
        internalCode: InfraErrorCode,
        errorKey: string,
        metaData?: Record<string, unknown>
    ) {
        super(
            message,
            'INFRA',
            internalCode,
            errorKey,
            true,
            metaData
        )
    }
}

