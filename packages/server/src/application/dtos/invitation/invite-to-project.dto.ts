import { InvitationStatusOptions } from '@project/common/constants/invitation.constants.js'
import { MemberRoleOptions } from '@project/common/constants/member.constants.js'

export interface InviteToProjectOutput {
    id: string // PUBLIC ID
    projectId: string // PUBLIC ID
    invitedUserId: string // PUBLIC ID
    invitedById: string // PUBLIC ID
    status: InvitationStatusOptions
    createdAt: string
    message: string
    targetRole: MemberRoleOptions
    expiresAt: string
}