import { CommonErrorCodes } from '../code/common.codes.js'
import { CommonDomainError } from '../domain/domain-classes.error.js'
import { createReverseMap } from '../utils/reverse-map.error.js'

const reverseMap = createReverseMap(CommonErrorCodes)

export const CommonErrorFactory = {

    commonValidationFailed: (message: string, metadata?: Record<string, unknown>): CommonDomainError => {
        const internalCode = CommonErrorCodes.COMMON_VALIDATION_FAILED
        const code = reverseMap(internalCode)

        return new CommonDomainError(
            message, internalCode, code, metadata)
    },

    commonDataInconsistency: (message: string, metadata?: Record<string, unknown>): CommonDomainError => {
        const internalCode = CommonErrorCodes.COMMON_DATA_INCONSISTENCY
        const code = reverseMap(internalCode)

        return new CommonDomainError(
            message, internalCode, code, metadata)
    },

    commonInvalidInputPayload: (metadata?: Record<string, unknown>): CommonDomainError => {
        const internalCode = CommonErrorCodes.COMMON_INVALID_INPUT_PAYLOAD
        const code = reverseMap(internalCode)

        return new CommonDomainError(
            'Error: Invalid request payload', internalCode, code, metadata
        )
    }

}