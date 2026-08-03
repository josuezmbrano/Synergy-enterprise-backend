import { InvitationErrorCodes } from '../code/invitation.codes.js'
import { InvitationDomainError } from '../domain/domain-classes.error.js'
import { createReverseMap } from '../utils/reverse-map.error.js'

const reverseMap = createReverseMap(InvitationErrorCodes)

export const InvitationErrorFactory = {

    invitationValidationFailed: (metaData?: Record<string, unknown>): InvitationDomainError => {
        const internalCode = InvitationErrorCodes.INVITATION_VALIDATION_FAILED
        const code = reverseMap(internalCode)

        return new InvitationDomainError('Error: Invitation input validation failed', internalCode, code, metaData)
    },

    invitationInvalidTransition: (message: string, metaData?: Record<string, unknown>): InvitationDomainError => {
        const internalCode = InvitationErrorCodes.INVITATION_INVALID_TRANSITION
        const code = reverseMap(internalCode)

        return new InvitationDomainError(message, internalCode, code, metaData)
    },

    invitationNotFound: (metaData?: Record<string, unknown>): InvitationDomainError => {
        const internalCode = InvitationErrorCodes.INVITATION_NOT_FOUND
        const code = reverseMap(internalCode)

        return new InvitationDomainError(
            'Error: Invitation could not be located in the server', internalCode, code, metaData)
    },

    invitationAlreadyProcessed: (metaData?: Record<string, unknown>): InvitationDomainError => {
        const internalCode = InvitationErrorCodes.INVITATION_ALREADY_PROCESSED
        const code = reverseMap(internalCode)

        return new InvitationDomainError(
            'Error: The provided invitation to project is invalid or has already been processed.', internalCode, code, metaData)
    },

    invitationExpired: (metaData?: Record<string, unknown>): InvitationDomainError => {
        const internalCode = InvitationErrorCodes.INVITATION_EXPIRED
        const code = reverseMap(internalCode)

        return new InvitationDomainError(
            'Error: The provided invitation has expired. Please request a new one to proceed.', internalCode, code, metaData)
    },

    invitationInvalidState: (metaData?: Record<string, unknown>): InvitationDomainError => {
        const internalCode = InvitationErrorCodes.INVITATION_INVALID_STATE
        const code = reverseMap(internalCode)

        return new InvitationDomainError(
            'Error: The invitation is in an inconsistent state due to missing or corrupted entity relations.', internalCode, code, metaData)
    }

}