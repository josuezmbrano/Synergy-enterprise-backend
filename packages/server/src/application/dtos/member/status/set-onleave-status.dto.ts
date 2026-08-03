import { MemberRoleOptions, MemberStatusOptions } from '@project/common/constants/member.constants.js'

export interface SetOnLeaveStatusOutput {
    id: string // PUBLIC ID
    projectId: string // PUBLIC ID
    userId: string // PUBLIC ID
    role: MemberRoleOptions
    status: MemberStatusOptions
    createdAt: string
    updatedAt: string
    joinedAt: string
}