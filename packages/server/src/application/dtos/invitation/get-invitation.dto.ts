import { InvitationStatusOptions } from '@project/common/constants/invitation.constants.js'
import { MemberRoleOptions } from '@project/common/constants/member.constants.js'
import { ProjectCategoryOptions, ProjectStatusOptions } from '@project/common/constants/project.constants.js'

export interface GetInvitationOutput {

    invitation: {
        id: string // PUBLIC ID
        status: InvitationStatusOptions
        message: string
        targetRole: MemberRoleOptions
        expiresAt: string
    }

    invitedBy: {
        id: string // PUBLIC ID
        fullname: string
    }

    invitedUser: {
        id: string // PUBLIC ID
        fullname: string
    }

    project: {
        id: string // PUBLIC ID
        title: string
        description: string
        category: ProjectCategoryOptions
        status: ProjectStatusOptions
        createdAt: string
    },

    metrics: {
        activeMembersCount: number
        tasksCount: number
    }
}