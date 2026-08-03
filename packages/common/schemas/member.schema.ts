import { z } from 'zod'
import { MEMBER_CONSTRAINTS } from '../constants/member.constants.js'

export const FindAllMembersSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim()
})
export type FindAllMembersInput = z.infer<typeof FindAllMembersSchema>



export const FindMemberSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim(),

    memberId: z.uuidv4({ error: 'Member identification must be a valid UUID' })
        .trim()
})
export type FindMemberInput = z.infer<typeof FindMemberSchema>


export const SetAdminRoleSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim(),

    targetMemberId: z.uuidv4({ error: 'Target member identification must be a valid UUID' })
        .trim()
})
export type SetAdminRoleInput = z.infer<typeof SetAdminRoleSchema>



export const SetContributorRoleSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim(),

    targetMemberId: z.uuidv4({ error: 'Target member identification must be a valid UUID' })
        .trim()
})
export type SetContributorRoleInput = z.infer<typeof SetContributorRoleSchema>


export const SetActiveStatusSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim(),

    targetMemberId: z.uuidv4({ error: 'Target member identification must be a valid UUID' })
        .trim()
})
export type SetActiveStatusInput = z.infer<typeof SetActiveStatusSchema>



export const SetInactiveStatusSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim(),

    targetMemberId: z.uuidv4({ error: 'Target member identification must be a valid UUID' })
        .trim()
})
export type SetInactiveStatusInput = z.infer<typeof SetInactiveStatusSchema>



export const SetOnLeaveStatusSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim(),

    targetMemberId: z.uuidv4({ error: 'Target member identification must be a valid UUID' })
        .trim()
})
export type SetOnLeaveStatusInput = z.infer<typeof SetOnLeaveStatusSchema>
