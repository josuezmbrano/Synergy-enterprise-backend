export const CommonErrorCodes = {
    //DOMAIN ERROR
    COMMON_VALIDATION_FAILED: 'COMMON_ERROR_001',
    COMMON_DATA_INCONSISTENCY: 'COMMON_ERROR_002',
    COMMON_INVALID_INPUT_PAYLOAD: 'COMMON_ERROR_003'
} as const

export type CommonErrorCode = typeof CommonErrorCodes[keyof typeof CommonErrorCodes]