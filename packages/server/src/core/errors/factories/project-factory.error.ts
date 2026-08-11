import { ProjectErrorCodes } from '../code/project.codes.js'
import { ProjectRuleErrorMessages } from '../messages/project.messages.js'
import { ProjectDomainError } from '../domain/domain-classes.error.js'
import { createReverseMap } from '../utils/reverse-map.error.js'

const reverseMap = createReverseMap(ProjectErrorCodes)

export const ProjectErrorFactory = {

    projectNotFound: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_NOT_FOUND
        const code = reverseMap(internalCode)

        return new ProjectDomainError(
            'Error: Project not located on the server', internalCode, code, metadata)
    },

    projectAlreadyExists: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_ALREADY_EXISTS
        const code = reverseMap(internalCode)

        return new ProjectDomainError('Error: Project already exists on the server', internalCode, code, metadata)
    },

    projectValidationFailed: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_VALIDATION_FAILED
        const code = reverseMap(internalCode)

        return new ProjectDomainError('Error: Project input validation failed', internalCode, code, metadata)
    },

    projectCategoryInmutable: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_CATEGORY_INMUTABLE
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_004, internalCode, code, metadata)
    },

    projectCompletedLocked: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_COMPLETED_LOCKED
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_005, internalCode, code, metadata)
    },

    projectCompletionPendingTasks: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_COMPLETION_PENDING_TASKS
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_006, internalCode, code, metadata)
    },

    projectArchivedLocked: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_ARCHIVED_LOCKED
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_007, internalCode, code, metadata)
    },

    projectNoBackupAdmin: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_NOBACKUP_ADMIN
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_008, internalCode, code, metadata)
    },

    projectOwnerInmutable: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_OWNER_INMUTABLE
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_009, internalCode, code, metadata)
    },

    projectArchiveInconsistency: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_ARCHIVE_INCONSISTENCY
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_010, internalCode, code, metadata)
    },

    projectNotOwner: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_NOT_OWNER
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_011, internalCode, code, metadata)
    },

    projectNotOwnerOrAdmin: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_NOT_OWNER_OR_ADMIN
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_012, internalCode, code, metadata)
    },

    projectTasksRequired: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_TASKS_REQUIRED
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_013, internalCode, code, metadata)
    },

    projectMembersRequired: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_TASKS_REQUIRED
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_015, internalCode, code, metadata)
    },

    projectInvalidTransition: (message: string, metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_INVALID_TRANSITION
        const code = reverseMap(internalCode)

        return new ProjectDomainError(message, internalCode, code, metadata)
    },

    projectNotMember: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_NOT_MEMBER_ERROR
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_017, internalCode, code, metadata)
    },

    projectWipLimitReached: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_MEMBER_WIP_LIMIT_REACHED
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_018, internalCode, code, metadata)
    },

    projectNoBackupContributors: (metadata?: Record<string, unknown>): ProjectDomainError => {
        const internalCode = ProjectErrorCodes.PROJECT_NOBACKUP_CONTRIBUTORS
        const code = reverseMap(internalCode)

        return new ProjectDomainError(ProjectRuleErrorMessages.PRJ_ERR_019, internalCode, code, metadata)
    },
}