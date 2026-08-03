import { z } from 'zod';
import { TASK_CONSTRAINTS } from '../constants/task.constants.js'

export const CreateTaskSchema = z.object({

    actingUserId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim(),

    objective: z.string()
        .min(TASK_CONSTRAINTS.OBJECTIVE_MIN_LENGTH, { error: `Objective must contain at least ${TASK_CONSTRAINTS.OBJECTIVE_MIN_LENGTH} characters` })
        .max(TASK_CONSTRAINTS.OBJECTIVE_MAX_LENGTH, { error: `Objective cannot exceed ${TASK_CONSTRAINTS.OBJECTIVE_MAX_LENGTH} characters` })
        .regex(TASK_CONSTRAINTS.OBJECTIVE_REGEX_FORMAT, { error: 'Objective only accepts alphanumeric characters and basic punctuation (., -, _)' }),

    description: z.string()
        .min(TASK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH, { error: `Description must contain at least ${TASK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH} characters` })
        .max(TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH, { error: `Description cannot exceed ${TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters` })
        .regex(TASK_CONSTRAINTS.DESCRIPTION_REGEX_FORMAT, { error: 'Description only accepts alphanumeric characters and basic punctuation (., -, _)' }),

    priority: z.enum(TASK_CONSTRAINTS.PRIORITY_ALLOWED_OPTIONS),

    assigneeMemberId: z.uuidv4({ error: 'Assignee member identification must be a valid UUID' })
        .trim().optional(),

    dueDate: z.iso.datetime({ error: 'DueDate must be a valid date string format' })
})
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export const CreateTaskBodySchema = CreateTaskSchema.omit({ actingUserId: true, projectId: true })



export const FindAllTasksSchema = z.object({
    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    projectId: z.uuidv4({ error: 'Project identification must be a valid UUID' })
        .trim()
})
export type FindAllTasksInput = z.infer<typeof FindAllTasksSchema>



export const FindTaskSchema = z.object({
    taskId: z.uuidv4({ error: 'Task identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim()
})
export type FindTaskInput = z.infer<typeof FindTaskSchema>



export const RemoveTaskAssigneeSchema = z.object({
    taskId: z.uuidv4({ error: 'Task identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    targetMemberId: z.uuidv4({ error: 'Target member identification must be a valid UUID' })
        .trim()
})
export type RemoveTaskAssigneeInput = z.infer<typeof RemoveTaskAssigneeSchema>
export const RemoveTaskAssigneeBodySchema = RemoveTaskAssigneeSchema.omit({actorId: true, taskId: true})


export const UpdateTaskAssigneeSchema = z.object({
    taskId: z.uuidv4({ error: 'Task identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    assigneeId: z.uuidv4({ error: 'Assignee member identification must be a valid UUID' })
        .trim()
})
export type UpdateTaskAssigneeInput = z.infer<typeof UpdateTaskAssigneeSchema>
export const UpdateTaskAssigneeBodySchema = UpdateTaskAssigneeSchema.omit({actorId: true, taskId: true})


export const UpdateTaskDueDateSchema = z.object({
    taskId: z.uuidv4({ error: 'Task identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    dueDate: z.iso.datetime({ error: 'DueDate must be a valid date string format' })
})
export type UpdateTaskDueDateInput = z.infer<typeof UpdateTaskDueDateSchema>
export const UpdateTaskDueDateBodySchema = UpdateTaskDueDateSchema.omit({actorId: true, taskId: true})



export const UpdateTaskInfoSchema = z.object({
    taskId: z.uuidv4({ error: 'Task identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    objective: z.string()
        .min(TASK_CONSTRAINTS.OBJECTIVE_MIN_LENGTH, { error: `Objective must contain at least ${TASK_CONSTRAINTS.OBJECTIVE_MIN_LENGTH} characters` })
        .max(TASK_CONSTRAINTS.OBJECTIVE_MAX_LENGTH, { error: `Objective cannot exceed ${TASK_CONSTRAINTS.OBJECTIVE_MAX_LENGTH} characters` })
        .regex(TASK_CONSTRAINTS.OBJECTIVE_REGEX_FORMAT, { error: 'Objective only accepts alphanumeric characters and basic punctuation (., -, _)' })
        .optional(),

    description: z.string()
        .min(TASK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH, { error: `Description must contain at least ${TASK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH} characters` })
        .max(TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH, { error: `Description cannot exceed ${TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters` })
        .regex(TASK_CONSTRAINTS.DESCRIPTION_REGEX_FORMAT, { error: 'Description only accepts alphanumeric characters and basic punctuation (., -, _)' })
        .optional()
})
export type UpdateTaskInfoInput = z.infer<typeof UpdateTaskInfoSchema>
export const UpdateTaskInfoBodySchema = UpdateTaskInfoSchema.omit({actorId: true, taskId: true})


export const SetCompletedStatusSchema = z.object({
    taskId: z.uuidv4({ error: 'Task identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    targetMemberId: z.uuidv4({ error: 'Target member identification must be a valid UUID' })
        .trim()
})
export type SetCompletedStatusInput = z.infer<typeof SetCompletedStatusSchema>


export const SetDoingStatusSchema = z.object({
    taskId: z.uuidv4({ error: 'Task identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    targetMemberId: z.uuidv4({ error: 'Target member identification must be a valid UUID' })
        .trim()
})
export type SetDoingStatusInput = z.infer<typeof SetDoingStatusSchema>



export const SetReviewStatusSchema = z.object({
    taskId: z.uuidv4({ error: 'Task identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim(),

    targetMemberId: z.uuidv4({ error: 'Target member identification must be a valid UUID' })
        .trim()
})
export type SetReviewStatusInput = z.infer<typeof SetReviewStatusSchema>



export const SetCriticalPrioritySchema = z.object({
    taskId: z.uuidv4({ error: 'Task identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim()
})
export type SetCriticalPriorityInput = z.infer<typeof SetCriticalPrioritySchema>



export const SetHighPrioritySchema = z.object({
    taskId: z.uuidv4({ error: 'Task identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim()
})
export type SetHighPriorityInput = z.infer<typeof SetHighPrioritySchema>



export const SetMediumPrioritySchema = z.object({
    taskId: z.uuidv4({ error: 'Task identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim()
})
export type SetMediumPriorityInput = z.infer<typeof SetMediumPrioritySchema>



export const SetLowPrioritySchema = z.object({
    taskId: z.uuidv4({ error: 'Task identification must be a valid UUID' })
        .trim(),

    actorId: z.uuidv4({ error: 'Actor identification must be a valid UUID' })
        .trim()
})
export type SetLowPriorityInput = z.infer<typeof SetLowPrioritySchema>


