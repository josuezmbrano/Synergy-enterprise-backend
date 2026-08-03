import { UserErrorCodes } from '../code/user.codes.js'
import { UserDomainError } from '../domain/domain-classes.error.js'
import { UserRuleErrorMessages } from '../messages/user.messages.js'
import { createReverseMap } from '../utils/reverse-map.error.js'

const reverseMap = createReverseMap(UserErrorCodes)

export const UserErrorFactory = {

    userNotFound: (metaData?: Record<string, unknown>): UserDomainError => {
        const internalCode = UserErrorCodes.USER_NOT_FOUND
        const code = reverseMap(internalCode)

        return new UserDomainError(
            'Error: User requested could not be located in the server', internalCode, code, metaData)
    },

    usernameAlreadyExists: (metaData?: Record<string, unknown>): UserDomainError => {
        const internalCode = UserErrorCodes.USER_USERNAME_ALREADY_EXISTS
        const code = reverseMap(internalCode)

        return new UserDomainError(
            'Error: This username is already taken..', internalCode, code, metaData)
    },

    emailAlreadyExists: (metaData?: Record<string, unknown>): UserDomainError => {
        const internalCode = UserErrorCodes.USER_EMAIL_ALREADY_EXISTS
        const code = reverseMap(internalCode)

        return new UserDomainError(
            'Error: This email is already in use..', internalCode, code, metaData)
    },

    userValidationFailed: (metaData?: Record<string, unknown>): UserDomainError => {
        const internalCode = UserErrorCodes.USER_VALIDATION_FAILED
        const code = reverseMap(internalCode)

        return new UserDomainError(
            'Error: User input validation failed', internalCode, code, metaData)
    },

    userNotVerified: (metaData?: Record<string, unknown>): UserDomainError => {
        const internalCode = UserErrorCodes.USER_NOT_VERIFIED
        const code = reverseMap(internalCode)

        return new UserDomainError(
            UserRuleErrorMessages.USER_ERROR_004, internalCode, code, metaData)
    },

    userUsernameChangeLimit: (metaData?: Record<string, unknown>): UserDomainError => {
        const internalCode = UserErrorCodes.USER_USERNAME_CHANGE_LIMIT
        const code = reverseMap(internalCode)

        return new UserDomainError(
            UserRuleErrorMessages.USER_ERROR_005, internalCode, code, metaData)
    },

    userEmailReVerificationRequired: (metaData?: Record<string, unknown>): UserDomainError => {
        const internalCode = UserErrorCodes.USER_EMAIL_REVERIFICATION_REQUIRED
        const code = reverseMap(internalCode)

        return new UserDomainError(
            UserRuleErrorMessages.USER_ERROR_006, internalCode, code, metaData)
    },

    userSuspendedLocked: (metaData?: Record<string, unknown>): UserDomainError => {
        const internalCode = UserErrorCodes.USER_SUSPENDED_LOCKED
        const code = reverseMap(internalCode)

        return new UserDomainError(
            UserRuleErrorMessages.USER_ERROR_007, internalCode, code, metaData)
    },

    userNotActiveForAction: (metaData?: Record<string, unknown>): UserDomainError => {
        const internalCode = UserErrorCodes.USER_NOT_ACTIVE_FOR_ACTION
        const code = reverseMap(internalCode)

        return new UserDomainError(
            UserRuleErrorMessages.USER_ERROR_008, internalCode, code, metaData)
    },

    userMaxAdminRolesReached: (metaData?: Record<string, unknown>): UserDomainError => {
        const internalCode = UserErrorCodes.USER_MAX_ADMIN_ROLES_REACHED
        const code = reverseMap(internalCode)

        return new UserDomainError(
            UserRuleErrorMessages.USER_ERROR_009, internalCode, code, metaData)
    },

    userAlreadyActive: (metaData?: Record<string, unknown>): UserDomainError => {
        const internalCode = UserErrorCodes.USER_ALREADY_ACTIVE
        const code = reverseMap(internalCode)

        return new UserDomainError(
            UserRuleErrorMessages.USER_ERROR_011, internalCode, code, metaData)
    },

    userPasswordReuse: (metaData?: Record<string, unknown>): UserDomainError => {
        const internalCode = UserErrorCodes.USER_PASSWORD_REUSE
        const code = reverseMap(internalCode)

        return new UserDomainError(
            UserRuleErrorMessages.USER_ERROR_012, internalCode, code, metaData)
    },

}