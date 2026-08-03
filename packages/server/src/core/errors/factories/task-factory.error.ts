import { TaskErrorCodes } from '../code/task.codes.js';
import { TaskDomainError } from '../domain/domain-classes.error.js';
import { TaskRuleErrorMessages } from '../messages/task.messages.js';
import { createReverseMap } from '../utils/reverse-map.error.js';

const reverseMap = createReverseMap(TaskErrorCodes)

export const TaskErrorFactory = {

    taskNotFound: (metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_NOT_FOUND
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            'Error: Task not located on the server for current project', internalCode, code, metaData)
    },

    taskAlreadyExists: (metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_ALREADY_EXISTS
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            'Error: Task already exists on the server for current project', internalCode, code, metaData)
    },

    taskValidationFailed: (metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_VALIDATION_FAILED
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            'Error: Task input validation failed', internalCode, code, metaData)
    },

    taskCreatorRequired: (metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_CREATOR_REQUIRED
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_004, internalCode, code, metaData)
    },

    taskDuedateInconsistency: (metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_DUEDATE_INCONSISTENCY
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_005, internalCode, code, metaData)
    },

    taskDoingPendingAssignedTo: (metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_DOING_PENDING_ASSIGNEDTO
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_006, internalCode, code, metaData)
    },

    taskCompletedLocked: (metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_COMPLETED_LOCKED
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_007, internalCode, code, metaData)
    },

    taskNotPermittedToEdit: (metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_USER_NOT_PERMITTED_TOEDIT
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_008, internalCode, code, metaData)
    },

    taskNotPermittedToExtend: (metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_USER_NOT_PERMITTED_TOEXTEND
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_009, internalCode, code, metaData)
    },

    taskProjectInmutable: (metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_PROJECT_INMUTABLE
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_010, internalCode, code, metaData)
    },

    taskOverdueLocked: (metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_OVERDUE_LOCKED
        const code = reverseMap(internalCode)

        return new TaskDomainError(
            TaskRuleErrorMessages.TSK_ERROR_011, internalCode, code, metaData)
    },

    taskInvalidTransition: (message: string, metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_INVALID_TRANSITION
        const code = reverseMap(internalCode)

        return new TaskDomainError(message, internalCode, code, metaData)
    },

    taskReviewLocked: (message: string, metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_REVIEW_LOCKED
        const code = reverseMap(internalCode)

        return new TaskDomainError(message, internalCode, code, metaData)
    },

    taskAssignmentMismatch: (metaData?: Record<string, unknown>): TaskDomainError => {
        const internalCode = TaskErrorCodes.TASK_ASSIGNMENT_MISMATCH
        const code = reverseMap(internalCode)

        return new TaskDomainError(TaskRuleErrorMessages.TSK_ERR_14, internalCode, code, metaData)
    }

}