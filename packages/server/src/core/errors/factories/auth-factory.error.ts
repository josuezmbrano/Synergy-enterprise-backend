import { AuthErrorCodes } from '../code/auth.codes.js'
import { AuthDomainError } from '../domain/domain-classes.error.js'
import { createReverseMap } from '../utils/reverse-map.error.js'

const reverseMap = createReverseMap(AuthErrorCodes)


export const AuthErrorFactory = {

    invalidCredentials: (metaData?: Record<string, unknown>): AuthDomainError => {
        const internalCode = AuthErrorCodes.AUTH_INVALID_CREDENTIALS
        const code = reverseMap(internalCode)

        return new AuthDomainError(
            'Error: Invalid credentials provided. Please check your credentials and try again.', internalCode, code, metaData)
    },

    invalidOrExpiredToken: (metaData?: Record<string, unknown>): AuthDomainError => {
        const internalCode = AuthErrorCodes.AUTH_INVALID_OR_EXPIRED_TOKEN
        const code = reverseMap(internalCode)

        return new AuthDomainError(
            'Error: Invalid or expired session. Please log in again.', internalCode, code, metaData)
    }

}