export const TokenErrorCodes = {
    'TOKEN_NOT_FOUND': 'TKN_ERROR_001',
    'TOKEN_EXPIRED': 'TKN_ERROR_002',
    'TOKEN_INVALID_TYPE': 'TKN_ERROR_003',
    'TOKEN_COOLDOWN_LIMIT': 'TKN_ERROR_004',
} as const

export type TokenErrorCode = typeof TokenErrorCodes[keyof typeof TokenErrorCodes]