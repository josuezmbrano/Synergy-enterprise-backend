import { DomainErrorCodes } from 'core/errors/index.error.js'

export type DomainNames = keyof typeof DomainErrorCodes

type HttpMapper = {
    [key in DomainNames]: {
        [internalCode: string]: number
    }
}

export const ErrorMapper: HttpMapper = {
    PROJECT: {
        [DomainErrorCodes.PROJECT.PROJECT_VALIDATION_FAILED]:                              400,
        [DomainErrorCodes.PROJECT.PROJECT_ARCHIVE_INCONSISTENCY]:                          400,
        [DomainErrorCodes.PROJECT.PROJECT_CATEGORY_INMUTABLE]:                             403,
        [DomainErrorCodes.PROJECT.PROJECT_NOT_OWNER]:                                      403,
        [DomainErrorCodes.PROJECT.PROJECT_NOT_OWNER_OR_ADMIN]:                             403,
        [DomainErrorCodes.PROJECT.PROJECT_OWNER_INMUTABLE]:                                403,
        [DomainErrorCodes.PROJECT.PROJECT_MEMBER_WIP_LIMIT_REACHED]:                       403,
        [DomainErrorCodes.PROJECT.PROJECT_NOT_FOUND]:                                      404,
        [DomainErrorCodes.PROJECT.PROJECT_ALREADY_EXISTS]:                                 409,
        [DomainErrorCodes.PROJECT.PROJECT_COMPLETION_PENDING_TASKS]:                       409,
        [DomainErrorCodes.PROJECT.PROJECT_TASKS_REQUIRED]:                                 409,
        [DomainErrorCodes.PROJECT.PROJECT_MEMBERS_REQUIRED]:                               409,
        [DomainErrorCodes.PROJECT.PROJECT_INVALID_TRANSITION]:                             409,
        [DomainErrorCodes.PROJECT.PROJECT_NOBACKUP_ADMIN]:                                 409,
        [DomainErrorCodes.PROJECT.PROJECT_NOBACKUP_CONTRIBUTORS]:                          409,
        [DomainErrorCodes.PROJECT.PROJECT_NOT_MEMBER_ERROR]:                               422,
        [DomainErrorCodes.PROJECT.PROJECT_COMPLETED_LOCKED]:                               423,
        [DomainErrorCodes.PROJECT.PROJECT_ARCHIVED_LOCKED]:                                423
    },
    TASK: {
        [DomainErrorCodes.TASK.TASK_VALIDATION_FAILED]:                                    400,
        [DomainErrorCodes.TASK.TASK_CREATOR_REQUIRED]:                                     400,
        [DomainErrorCodes.TASK.TASK_DUEDATE_INCONSISTENCY]:                                400,
        [DomainErrorCodes.TASK.TASK_USER_NOT_PERMITTED_TOEDIT]:                            403,
        [DomainErrorCodes.TASK.TASK_USER_NOT_PERMITTED_TOEXTEND]:                          403,
        [DomainErrorCodes.TASK.TASK_PROJECT_INMUTABLE]:                                    403,
        [DomainErrorCodes.TASK.TASK_NOT_FOUND]:                                            404,
        [DomainErrorCodes.TASK.TASK_ALREADY_EXISTS]:                                       409,
        [DomainErrorCodes.TASK.TASK_DOING_PENDING_ASSIGNEDTO]:                             409,
        [DomainErrorCodes.TASK.TASK_INVALID_TRANSITION]:                                   409,
        [DomainErrorCodes.TASK.TASK_ASSIGNMENT_MISMATCH]:                                  409,
        [DomainErrorCodes.TASK.TASK_COMPLETED_LOCKED]:                                     423,
        [DomainErrorCodes.TASK.TASK_OVERDUE_LOCKED]:                                       423,
        [DomainErrorCodes.TASK.TASK_REVIEW_LOCKED]:                                        423
    },
    MEMBER: {
        [DomainErrorCodes.MEMBER.MEMBER_VALIDATION_FAILED]:                                400,
        [DomainErrorCodes.MEMBER.MEMBER_NOT_PERMITTED_TO_CREATE]:                          403,
        [DomainErrorCodes.MEMBER.MEMBER_LINK_INMUTABLE]:                                   403,
        [DomainErrorCodes.MEMBER.MEMBER_NOT_PERMITTED_CHGROLE]:                            403,
        [DomainErrorCodes.MEMBER.MEMBER_NOT_PERMITTED_CHGSTS]:                             403,
        [DomainErrorCodes.MEMBER.MEMBER_VERIFICATION_PENDING]:                             403,
        [DomainErrorCodes.MEMBER.MEMBER_USER_NOT_ELIGIBLE]:                                403,
        [DomainErrorCodes.MEMBER.MEMBER_OWNER_ROLE_LOCKED]:                                403,
        [DomainErrorCodes.MEMBER.MEMBER_NOT_FOUND]:                                        404,
        [DomainErrorCodes.MEMBER.MEMBER_NOT_ACTIVE]:                                       409,
        [DomainErrorCodes.MEMBER.MEMBER_ALREADY_EXISTS]:                                   409,
        [DomainErrorCodes.MEMBER.MEMBER_ACTIVE_TASKS_REMOVAL]:                             409,
        [DomainErrorCodes.MEMBER.MEMBER_ACTIVE_TASKS_INACTIVATE]:                          409,
        [DomainErrorCodes.MEMBER.MEMBER_ACTIVE_TASKS_ON_LEAVE]:                            409
    },
    USER: {
        [DomainErrorCodes.USER.USER_VALIDATION_FAILED]:                                    400,
        [DomainErrorCodes.USER.USER_PASSWORD_REUSE]:                                       400,
        [DomainErrorCodes.USER.USER_NOT_VERIFIED]:                                         403,
        [DomainErrorCodes.USER.USER_EMAIL_REVERIFICATION_REQUIRED]:                        403,
        [DomainErrorCodes.USER.USER_SUSPENDED_LOCKED]:                                     403,
        [DomainErrorCodes.USER.USER_NOT_ACTIVE_FOR_ACTION]:                                403,
        [DomainErrorCodes.USER.USER_NOT_FOUND]:                                            404,
        [DomainErrorCodes.USER.USER_USERNAME_ALREADY_EXISTS]:                              409,
        [DomainErrorCodes.USER.USER_EMAIL_ALREADY_EXISTS]:                                 409,
        [DomainErrorCodes.USER.USER_MAX_ADMIN_ROLES_REACHED]:                              409,
        [DomainErrorCodes.USER.USER_ALREADY_ACTIVE]:                                       409,
        [DomainErrorCodes.USER.USER_USERNAME_CHANGE_LIMIT]:                                429
    },
    COMMON: {
        [DomainErrorCodes.COMMON.COMMON_VALIDATION_FAILED]:                                400,
        [DomainErrorCodes.COMMON.COMMON_INVALID_INPUT_PAYLOAD]:                            400,
        [DomainErrorCodes.COMMON.COMMON_DATA_INCONSISTENCY]:                               500
    },
    AUTH: {
        [DomainErrorCodes.AUTH.AUTH_INVALID_CREDENTIALS]:                                  401,
        [DomainErrorCodes.AUTH.AUTH_INVALID_OR_EXPIRED_TOKEN]:                             401
    },
    TOKEN: {
        [DomainErrorCodes.TOKEN.TOKEN_INVALID_TYPE]:                                       400,
        [DomainErrorCodes.TOKEN.TOKEN_EXPIRED]:                                            401,
        [DomainErrorCodes.TOKEN.TOKEN_NOT_FOUND]:                                          404,
        [DomainErrorCodes.TOKEN.TOKEN_COOLDOWN_LIMIT]:                                     429
    },
    INFRA: {
        [DomainErrorCodes.INFRA.INFRASTRUCTURE_MAPPING_ERROR]:                             500,
        [DomainErrorCodes.INFRA.INFRASTRUCTURE_PERSISTENCE_ERROR]:                         500,
        [DomainErrorCodes.INFRA.INFRASTRUCTURE_CONNECTION_ERROR]:                          500
    },
    INVITATION: {
        [DomainErrorCodes.INVITATION.INVITATION_VALIDATION_FAILED]:                        400,
        [DomainErrorCodes.INVITATION.INVITATION_NOT_FOUND]:                                404,
        [DomainErrorCodes.INVITATION.INVITATION_INVALID_TRANSITION]:                       409,
        [DomainErrorCodes.INVITATION.INVITATION_INVALID_STATE]:                            500
    }
}


export const getHttpStatusCode = (domain: DomainNames, internalCode: string): number => {

    const domainType = ErrorMapper[domain]

    if (!domainType) return 500

    return domainType[internalCode] || 400
    
}
