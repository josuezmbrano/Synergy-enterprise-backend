export const AuthErrorCodes = {
    'AUTH_INVALID_CREDENTIALS': 'AUTH_ERROR_001',
    'AUTH_INVALID_OR_EXPIRED_TOKEN': 'AUTH_ERROR_002'
} as const

export type AuthErrorCode = typeof AuthErrorCodes[keyof typeof AuthErrorCodes]
export type AuthErrorKeys = keyof typeof AuthErrorCodes
