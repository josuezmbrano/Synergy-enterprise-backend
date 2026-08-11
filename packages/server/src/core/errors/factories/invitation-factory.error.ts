import { InvitationErrorCodes } from '../code/invitation.codes.js'
import { InvitationDomainError } from '../domain/domain-classes.error.js'
import { createReverseMap } from '../utils/reverse-map.error.js'

const reverseMap = createReverseMap(InvitationErrorCodes)

export const InvitationErrorFactory = {

    invitationValidationFailed: (metadata?: Record<string, unknown>): InvitationDomainError => {
        const internalCode = InvitationErrorCodes.INVITATION_VALIDATION_FAILED
        const code = reverseMap(internalCode)

        return new InvitationDomainError('Error: Invitation input validation failed', internalCode, code, metadata)
    },

    invitationInvalidTransition: (message: string, metadata?: Record<string, unknown>): InvitationDomainError => {
        const internalCode = InvitationErrorCodes.INVITATION_INVALID_TRANSITION
        const code = reverseMap(internalCode)

        return new InvitationDomainError(message, internalCode, code, metadata)
    },

    invitationNotFound: (metadata?: Record<string, unknown>): InvitationDomainError => {
        const internalCode = InvitationErrorCodes.INVITATION_NOT_FOUND
        const code = reverseMap(internalCode)

        return new InvitationDomainError(
            'Error: Invitation could not be located in the server', internalCode, code, metadata)
    },

    invitationAlreadyProcessed: (metadata?: Record<string, unknown>): InvitationDomainError => {
        const internalCode = InvitationErrorCodes.INVITATION_ALREADY_PROCESSED
        const code = reverseMap(internalCode)

        return new InvitationDomainError(
            'Error: The provided invitation to project is invalid or has already been processed.', internalCode, code, metadata)
    },

    invitationExpired: (metadata?: Record<string, unknown>): InvitationDomainError => {
        const internalCode = InvitationErrorCodes.INVITATION_EXPIRED
        const code = reverseMap(internalCode)

        return new InvitationDomainError(
            'Error: The provided invitation has expired. Please request a new one to proceed.', internalCode, code, metadata)
    },

    invitationInvalidState: (metadata?: Record<string, unknown>): InvitationDomainError => {
        const internalCode = InvitationErrorCodes.INVITATION_INVALID_STATE
        const code = reverseMap(internalCode)

        return new InvitationDomainError(
            'Error: The invitation is in an inconsistent state due to missing or corrupted entity relations.', internalCode, code, metadata)
    }

}