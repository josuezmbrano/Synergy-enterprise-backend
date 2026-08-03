import { TaskPriorityOptions, TaskStatusOptions } from '@project/common/constants/task.constants.js'

export interface SetMediumPriorityOutput {
    id: string // PUBLIC ID
    objective: string
    description: string
    status: TaskStatusOptions
    priority: TaskPriorityOptions
    assignedTo: string | null
    creatorId: string
    projectId: string // PUBLIC ID 
    createdAt: string
    updatedAt: string
    completedAt: string | null
    dueDate: string
}