import { TokenErrorCodes } from '../code/token.codes.js'
import { TokenDomainError } from '../domain/domain-classes.error.js'
import { createReverseMap } from '../utils/reverse-map.error.js'

const reverseMap = createReverseMap(TokenErrorCodes)


export const TokenErrorFactory = {

    tokenNotFound: (metadata?: Record<string, unknown>): TokenDomainError => {
        const internalCode = TokenErrorCodes.TOKEN_NOT_FOUND
        const code = reverseMap(internalCode)

        return new TokenDomainError(
            'Error: The provided verification token is invalid or has already been used.', internalCode, code, metadata)
    },

    tokenExpired: (metadata?: Record<string, unknown>): TokenDomainError => {
        const internalCode = TokenErrorCodes.TOKEN_EXPIRED
        const code = reverseMap(internalCode)

        return new TokenDomainError(
            'Error: The verification token has expired. Please request a new one to proceed.', internalCode, code, metadata)
    },

    tokenInvalidType: (metadata?: Record<string, unknown>): TokenDomainError => {
        const internalCode = TokenErrorCodes.TOKEN_INVALID_TYPE
        const code = reverseMap(internalCode)

        return new TokenDomainError(
            'Error: This token is not valid for the requested operation.', internalCode, code, metadata)
    },

    tokenCooldownLimit: (metadata?: Record<string, unknown>): TokenDomainError => {
        const internalCode = TokenErrorCodes.TOKEN_COOLDOWN_LIMIT
        const code = reverseMap(internalCode)

        return new TokenDomainError(
            'Error: Too many requests. Please wait 60 seconds before trying again.', internalCode, code, metadata)
    }

}