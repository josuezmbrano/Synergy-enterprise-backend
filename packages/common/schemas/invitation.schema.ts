import z from 'zod'
import { MEMBER_CONSTRAINTS } from '../constants/member.constants.js'
import { INVITATION_CONSTRAINTS } from '../constants/invitation.constants.js'

export const InviteToProjectSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim(),

    targetUserId: z.uuidv4({ error: 'Target user identification must be a valid UUID' })
        .trim(),

    message: z.string()
        .max(INVITATION_CONSTRAINTS.MESSAGE_MAX_LENGTH, { error: `Invitation message cannot exceed ${INVITATION_CONSTRAINTS.MESSAGE_MAX_LENGTH} characters` })
        .regex(INVITATION_CONSTRAINTS.MESSAGE_REGEX_FORMAT, { error: `Invitation message only accepts standard text, emojis, and line breaks.` }),

    targetRole: z.enum(MEMBER_CONSTRAINTS.ROLE_ALLOWED_OPTIONS)
})
export type InviteToProjectInput = z.infer<typeof InviteToProjectSchema>
export const InviteToProjectBodySchema = InviteToProjectSchema.omit({ actorId: true, projectId: true })



export const AcceptInvitationSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    invitationId: z.uuidv4({ error: 'Invitation identification must be a valid UUID' })
        .trim()
})
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>



export const RejectInvitationSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    invitationId: z.uuidv4({ error: 'Invitation identification must be a valid UUID' })
        .trim()
})
export type RejectInvitationInput = z.infer<typeof RejectInvitationSchema>



export const GetInvitationSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    invitationId: z.uuidv4({ error: 'Invitation identification must be a valid UUID' })
        .trim()
})
export type GetInvitationInput = z.infer<typeof GetInvitationSchema>



export const GetAllInvitationsSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim()
})
export type GetAllInvitationsInput = z.infer<typeof GetAllInvitationsSchema>