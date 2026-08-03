import { z } from 'zod'
import { PROJECT_CONSTRAINTS } from '../constants/project.constants.js'

export const CreateProjectSchema = z.object({

    title: z.string()
        .min(PROJECT_CONSTRAINTS.TITLE_MIN_LENGTH, { error: `Title must contain at least ${PROJECT_CONSTRAINTS.TITLE_MIN_LENGTH} characters` })
        .max(PROJECT_CONSTRAINTS.TITLE_MAX_LENGTH, { error: `Title cannot exceed ${PROJECT_CONSTRAINTS.TITLE_MAX_LENGTH} characters` })
        .regex(PROJECT_CONSTRAINTS.TITLE_REGEX_FORMAT, { error: 'Title only accepts alphanumeric characters and basic punctuation (., -, _)' }),

    description: z.string()
        .max(PROJECT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH, { error: `Description cannot exceed ${PROJECT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters` })
        .regex(PROJECT_CONSTRAINTS.DESCRIPTION_REGEX_FORMAT, { error: 'Description only accepts standard text, emojis, and line breaks.' }),

    category: z.enum(PROJECT_CONSTRAINTS.CATEGORY_ALLOWED_OPTIONS),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),
})
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export const CreateProjectBodySchema = CreateProjectSchema.omit({ actorId: true })



export const FindAllProjectsSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),
})
export type FindAllProjectsInput = z.infer<typeof FindAllProjectsSchema>



export const FindProjectSchema = z.object({

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim()
})
export type FindProjectInput = z.infer<typeof FindProjectSchema>



export const UnarchiveProjectSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim()
})
export type UnarchiveProjectInput = z.infer<typeof UnarchiveProjectSchema>



export const UpdateProjectSchema = z.object({

    title: z.string()
        .min(PROJECT_CONSTRAINTS.TITLE_MIN_LENGTH, { error: `Title must contain at least ${PROJECT_CONSTRAINTS.TITLE_MIN_LENGTH} characters` })
        .max(PROJECT_CONSTRAINTS.TITLE_MAX_LENGTH, { error: `Title cannot exceed ${PROJECT_CONSTRAINTS.TITLE_MAX_LENGTH} characters` })
        .regex(PROJECT_CONSTRAINTS.TITLE_REGEX_FORMAT, { error: 'Title only accepts alphanumeric characters and basic punctuation (., -, _)' })
        .optional(),

    description: z.string()
        .max(PROJECT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH, { error: `Description cannot exceed ${PROJECT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters` })
        .regex(PROJECT_CONSTRAINTS.DESCRIPTION_REGEX_FORMAT, { error: 'Description only accepts standard text, emojis, and line breaks.' })
        .optional(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim()
})
export type UpdateProjectInfoInput = z.infer<typeof UpdateProjectSchema>
export const UpdateProjectInfoBodySchema = UpdateProjectSchema.omit({ projectId: true, actorId: true })



export const ArchiveProjectSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim()
})
export type ArchiveProjectInput = z.infer<typeof ArchiveProjectSchema>



export const CompleteProjectSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim()
})
export type CompleteProjectInput = z.infer<typeof CompleteProjectSchema>



export const StartProjectSchema = z.object({

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim()
})
export type StartProjectInput = z.infer<typeof StartProjectSchema>