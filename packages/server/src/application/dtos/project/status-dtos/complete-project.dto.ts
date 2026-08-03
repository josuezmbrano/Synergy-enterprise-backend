import { ProjectCategoryOptions, ProjectStatusOptions } from '@project/common/constants/project.constants.js'

export interface CompleteProjectOutput {
    id: string // PUBLIC ID
    title: string
    description: string
    category: ProjectCategoryOptions
    status: ProjectStatusOptions
    ownerId: string
    createdAt: string
    updatedAt: string
    completedAt: string | null
    archivedAt: string | null
}