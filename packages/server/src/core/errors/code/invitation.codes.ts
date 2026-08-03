export const InvitationErrorCodes = {
    INVITATION_VALIDATION_FAILED: 'INV_ERR_001',
    INVITATION_INVALID_TRANSITION: 'INV_ERR_002',
    INVITATION_NOT_FOUND: 'INV_ERR_003',
    INVITATION_ALREADY_PROCESSED: 'INV_ERR_004',
    INVITATION_EXPIRED: 'INV_ERR_005',
    INVITATION_INVALID_STATE: 'INV_ERR_006'
} as  const

export type InvitationErrorCode = typeof InvitationErrorCodes[keyof typeof InvitationErrorCodes]