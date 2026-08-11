import { MemberErrorCodes } from '../code/member.codes.js'
import { MemberDomainError } from '../domain/domain-classes.error.js'
import { MemberRuleErrorMessages } from '../messages/member.messages.js'
import { createReverseMap } from '../utils/reverse-map.error.js'

const reverseMap = createReverseMap(MemberErrorCodes)

export const MemberErrorFactory = {

    memberNotFound: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_NOT_FOUND
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            'Error: Member could not be located in the server on current project', internalCode, code, metadata)
    },

    memberAlreadyExists: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_ALREADY_EXISTS
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            'Error: Current user already exists as a member on current project', internalCode, code, metadata)
    },

    memberValidationFailed: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_VALIDATION_FAILED
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            'Error: Member inputs failed validation', internalCode, code, metadata)
    },

    memberLinkInmutable: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_LINK_INMUTABLE
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            MemberRuleErrorMessages.MBR_ERROR_004, internalCode, code, metadata)
    },

    memberNotActive: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_NOT_ACTIVE
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            MemberRuleErrorMessages.MBR_ERROR_005, internalCode, code, metadata)
    },

    memberNotPermittedChgRole: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_NOT_PERMITTED_CHGROLE
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            MemberRuleErrorMessages.MBR_ERROR_006, internalCode, code, metadata)
    },

    memberNotPermittedChgSts: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_NOT_PERMITTED_CHGSTS
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            MemberRuleErrorMessages.MBR_ERROR_007, internalCode, code, metadata)
    },

    memberActiveTasksRemoval: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_ACTIVE_TASKS_REMOVAL
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            MemberRuleErrorMessages.MBR_ERROR_008, internalCode, code, metadata)
    },

    memberActiveTasksInactivate: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_ACTIVE_TASKS_INACTIVATE
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            MemberRuleErrorMessages.MBR_ERROR_009, internalCode, code, metadata)
    },

    memberActiveTasksOnLeave: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_ACTIVE_TASKS_ON_LEAVE
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            MemberRuleErrorMessages.MBR_ERROR_012, internalCode, code, metadata)
    },

    memberVerificationPending: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_VERIFICATION_PENDING
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            MemberRuleErrorMessages.MBR_ERROR_010, internalCode, code, metadata)
    },

    memberUserNotEligible: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_USER_NOT_ELIGIBLE
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            MemberRuleErrorMessages.MBR_ERROR_011, internalCode, code, metadata)
    },

    memberOwnerLocked: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_OWNER_ROLE_LOCKED
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            MemberRuleErrorMessages.MBR_ERROR_013, internalCode, code, metadata)
    },

    memberCreateForbidden: (metadata?: Record<string, unknown>): MemberDomainError => {
        const internalCode = MemberErrorCodes.MEMBER_NOT_PERMITTED_TO_CREATE
        const code = reverseMap(internalCode)

        return new MemberDomainError(
            MemberRuleErrorMessages.MBR_ERROR_014, internalCode, code, metadata)
    }
}